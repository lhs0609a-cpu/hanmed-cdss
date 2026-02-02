import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PrognosisPrediction,
  PrognosisPredictionResult,
  PrognosisEvidence,
  ActualOutcome,
} from '../../database/entities/prognosis-prediction.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { ClinicalCase } from '../../database/entities/clinical-case.entity';

export interface SimilarCaseStats {
  totalCases: number;
  avgDuration: number;
  avgImprovementRate: number;
  topFormulas: Array<{
    name: string;
    count: number;
    successRate: number;
  }>;
  outcomeDistribution: {
    cured: number;
    improved: number;
    noChange: number;
    worsened: number;
  };
}

@Injectable()
export class PrognosisService {
  constructor(
    @InjectRepository(PrognosisPrediction)
    private prognosisRepository: Repository<PrognosisPrediction>,
    @InjectRepository(PatientRecord)
    private patientRecordRepository: Repository<PatientRecord>,
    @InjectRepository(ClinicalCase)
    private clinicalCaseRepository: Repository<ClinicalCase>,
  ) {}

  /**
   * 예후 예측 생성
   * 진료 기록을 기반으로 AI 예후 예측을 생성
   */
  async predictPrognosis(recordId: string): Promise<PrognosisPrediction> {
    // 진료 기록 조회
    const record = await this.patientRecordRepository.findOne({
      where: { id: recordId },
      relations: ['patient', 'prescription'],
    });

    if (!record) {
      throw new NotFoundException('진료 기록을 찾을 수 없습니다.');
    }

    // 기존 예측이 있는지 확인
    const existingPrediction = await this.prognosisRepository.findOne({
      where: { recordId },
    });

    if (existingPrediction) {
      return existingPrediction;
    }

    // 유사 케이스 통계 조회
    const symptoms = record.symptomsSummary?.map(s => s.name) || [];
    const constitution = record.constitutionResult || undefined;
    const formulaName = record.prescription?.formulaName;

    const stats = await this.getSimilarCaseStatistics(symptoms, constitution, formulaName);

    // 예측 결과 계산
    const prediction = this.calculatePrediction(record, stats);
    const evidence = this.calculateEvidence(stats);

    // 예측 저장
    const prognosis = this.prognosisRepository.create({
      recordId,
      patientId: record.patientId,
      prediction,
      evidence,
    });

    return this.prognosisRepository.save(prognosis);
  }

  /**
   * 예측 결과 조회
   */
  async getPrediction(predictionId: string): Promise<PrognosisPrediction> {
    const prediction = await this.prognosisRepository.findOne({
      where: { id: predictionId },
      relations: ['record', 'patient'],
    });

    if (!prediction) {
      throw new NotFoundException('예측 결과를 찾을 수 없습니다.');
    }

    return prediction;
  }

  /**
   * 진료 기록의 예측 조회
   */
  async getPredictionByRecord(recordId: string): Promise<PrognosisPrediction | null> {
    return this.prognosisRepository.findOne({
      where: { recordId },
    });
  }

  /**
   * 유사 케이스 통계 조회
   */
  async getSimilarCaseStatistics(
    symptoms: string[],
    constitution?: string,
    formula?: string,
  ): Promise<SimilarCaseStats> {
    // 유사 케이스 검색을 위한 쿼리 빌더
    const queryBuilder = this.clinicalCaseRepository.createQueryBuilder('case');

    // 기본 조건: 증상 일치
    if (symptoms.length > 0) {
      queryBuilder.where(
        `case.symptoms::text ILIKE ANY(ARRAY[:...symptoms])`,
        { symptoms: symptoms.map(s => `%${s}%`) },
      );
    }

    // 체질 필터
    if (constitution) {
      queryBuilder.andWhere('case.constitution = :constitution', { constitution });
    }

    // 처방 필터
    if (formula) {
      queryBuilder.andWhere('case.treatment ILIKE :formula', { formula: `%${formula}%` });
    }

    const cases = await queryBuilder.getMany();

    // 통계 계산
    const totalCases = cases.length;

    if (totalCases === 0) {
      return {
        totalCases: 0,
        avgDuration: 0,
        avgImprovementRate: 0,
        topFormulas: [],
        outcomeDistribution: { cured: 0, improved: 0, noChange: 0, worsened: 0 },
      };
    }

    // 결과 분포 계산
    const outcomeDistribution = {
      cured: cases.filter(c => c.treatmentOutcome === '완치').length,
      improved: cases.filter(c => c.treatmentOutcome === '호전').length,
      noChange: cases.filter(c => c.treatmentOutcome === '불변').length,
      worsened: cases.filter(c => c.treatmentOutcome === '악화').length,
    };

    // 처방별 통계
    const formulaStats = new Map<string, { count: number; successCount: number }>();
    cases.forEach(c => {
      const treatmentName = c.herbalFormulas?.[0]?.formulaName || '기타';
      const existing = formulaStats.get(treatmentName) || { count: 0, successCount: 0 };
      existing.count++;
      if (c.treatmentOutcome === '완치' || c.treatmentOutcome === '호전') {
        existing.successCount++;
      }
      formulaStats.set(treatmentName, existing);
    });

    const topFormulas = Array.from(formulaStats.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        successRate: Math.round((stats.successCount / stats.count) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 평균 호전율 계산
    const successCases = outcomeDistribution.cured + outcomeDistribution.improved;
    const avgImprovementRate = Math.round((successCases / totalCases) * 100);

    // 평균 치료 기간 (기본값 사용, 실제 데이터가 있으면 계산)
    const avgDuration = 21; // 기본 3주

    return {
      totalCases,
      avgDuration,
      avgImprovementRate,
      topFormulas,
      outcomeDistribution,
    };
  }

  /**
   * 실제 결과 기록
   */
  async recordActualOutcome(
    predictionId: string,
    outcome: { actualDuration: number; actualImprovement: number; notes?: string },
  ): Promise<PrognosisPrediction> {
    const prediction = await this.prognosisRepository.findOne({
      where: { id: predictionId },
    });

    if (!prediction) {
      throw new NotFoundException('예측 결과를 찾을 수 없습니다.');
    }

    if (prediction.actualOutcome) {
      throw new BadRequestException('이미 실제 결과가 기록되어 있습니다.');
    }

    const actualOutcome: ActualOutcome = {
      recordedAt: new Date(),
      actualDuration: outcome.actualDuration,
      actualImprovement: outcome.actualImprovement,
      notes: outcome.notes || '',
    };

    prediction.actualOutcome = actualOutcome;

    return this.prognosisRepository.save(prediction);
  }

  /**
   * 예후 리포트 PDF 데이터 생성
   */
  async generatePrognosisReportData(predictionId: string): Promise<{
    prediction: PrognosisPrediction;
    reportData: {
      title: string;
      summary: string;
      timeline: Array<{ week: number; expectedImprovement: number }>;
      factors: Array<{ factor: string; impact: string; description: string }>;
      recommendations: string[];
    };
  }> {
    const prediction = await this.getPrediction(predictionId);

    const timeline = [
      { week: 1, expectedImprovement: prediction.prediction.improvementRate.week1 },
      { week: 2, expectedImprovement: prediction.prediction.improvementRate.week2 },
      { week: 4, expectedImprovement: prediction.prediction.improvementRate.week4 },
      { week: 8, expectedImprovement: prediction.prediction.improvementRate.week8 },
    ];

    const factors = prediction.prediction.factors.map(f => ({
      factor: f.factor,
      impact: f.impact === 'positive' ? '긍정적' : '부정적',
      description: this.getFactorDescription(f.factor, f.impact),
    }));

    const recommendations = this.getRecommendations(prediction.prediction);

    const summary = this.generateSummary(prediction.prediction);

    return {
      prediction,
      reportData: {
        title: '예후 예측 리포트',
        summary,
        timeline,
        factors,
        recommendations,
      },
    };
  }

  /**
   * 예측 결과 계산
   */
  private calculatePrediction(
    record: PatientRecord,
    stats: SimilarCaseStats,
  ): PrognosisPredictionResult {
    // 기본 치료 기간 계산 (유사 케이스 평균 기반)
    const baseDuration = stats.avgDuration || 21;

    // 환자 특성에 따른 조정
    const factors: PrognosisPredictionResult['factors'] = [];

    // 체질 분석
    if (record.constitutionResult) {
      factors.push({
        factor: `${record.constitutionResult} 체질`,
        impact: 'positive',
        weight: 0.1,
      });
    }

    // 체열 분석
    if (record.bodyHeatScore !== null && record.bodyHeatScore !== undefined) {
      const heatImpact = Math.abs(record.bodyHeatScore) > 5 ? 'negative' : 'positive';
      factors.push({
        factor: record.bodyHeatScore < 0 ? '한증 경향' : '열증 경향',
        impact: heatImpact,
        weight: 0.15,
      });
    }

    // 근실도 분석
    if (record.bodyStrengthScore !== null && record.bodyStrengthScore !== undefined) {
      const strengthImpact = record.bodyStrengthScore < -3 ? 'negative' : 'positive';
      factors.push({
        factor: record.bodyStrengthScore < 0 ? '허증 경향' : '실증 경향',
        impact: strengthImpact,
        weight: 0.15,
      });
    }

    // 증상 복잡도 분석
    const symptomCount = record.symptomsSummary?.length || 0;
    if (symptomCount > 5) {
      factors.push({
        factor: '복잡한 증상 패턴',
        impact: 'negative',
        weight: 0.2,
      });
    } else if (symptomCount <= 2) {
      factors.push({
        factor: '단순한 증상 패턴',
        impact: 'positive',
        weight: 0.2,
      });
    }

    // 조정 계수 계산
    const positiveWeight = factors
      .filter(f => f.impact === 'positive')
      .reduce((sum, f) => sum + f.weight, 0);
    const negativeWeight = factors
      .filter(f => f.impact === 'negative')
      .reduce((sum, f) => sum + f.weight, 0);
    const adjustmentFactor = 1 + (positiveWeight - negativeWeight);

    // 치료 기간 계산
    const typicalDuration = Math.round(baseDuration * adjustmentFactor);
    const optimisticDuration = Math.round(typicalDuration * 0.7);
    const conservativeDuration = Math.round(typicalDuration * 1.5);

    // 호전율 계산
    const baseImprovementRate = stats.avgImprovementRate || 70;
    const improvementRate = {
      week1: Math.min(100, Math.round(baseImprovementRate * 0.25 * adjustmentFactor)),
      week2: Math.min(100, Math.round(baseImprovementRate * 0.5 * adjustmentFactor)),
      week4: Math.min(100, Math.round(baseImprovementRate * 0.8 * adjustmentFactor)),
      week8: Math.min(100, Math.round(baseImprovementRate * adjustmentFactor)),
    };

    // 신뢰도 계산 (유사 케이스 수 기반)
    const confidenceScore = Math.min(0.95, 0.5 + (stats.totalCases / 200) * 0.45);

    // 재발 확률 계산
    const relapseProbability = Math.max(0.05, 0.3 - (stats.avgImprovementRate / 100) * 0.2);

    return {
      expectedDuration: {
        optimistic: optimisticDuration,
        typical: typicalDuration,
        conservative: conservativeDuration,
      },
      improvementRate,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      relapseProbability: Math.round(relapseProbability * 100) / 100,
      factors,
    };
  }

  /**
   * 근거 데이터 계산
   */
  private calculateEvidence(stats: SimilarCaseStats): PrognosisEvidence {
    return {
      similarCases: stats.totalCases,
      avgOutcome: stats.avgImprovementRate,
      dataSource: 'clinical_cases_database',
      modelVersion: '1.0.0',
    };
  }

  /**
   * 요인 설명 생성
   */
  private getFactorDescription(factor: string, impact: 'positive' | 'negative'): string {
    const descriptions: Record<string, Record<string, string>> = {
      '한증 경향': {
        positive: '온화한 한증으로 치료 반응이 양호할 것으로 예상됩니다.',
        negative: '심한 한증으로 치료 기간이 길어질 수 있습니다.',
      },
      '열증 경향': {
        positive: '온화한 열증으로 치료 반응이 양호할 것으로 예상됩니다.',
        negative: '심한 열증으로 치료 기간이 길어질 수 있습니다.',
      },
      '허증 경향': {
        positive: '경미한 허증으로 보법 치료에 잘 반응할 것입니다.',
        negative: '심한 허증으로 회복에 시간이 더 필요할 수 있습니다.',
      },
      '실증 경향': {
        positive: '체력이 좋아 치료 반응이 빠를 것으로 예상됩니다.',
        negative: '울체가 심해 치료에 시간이 필요합니다.',
      },
      '복잡한 증상 패턴': {
        positive: '체계적인 치료로 개선이 가능합니다.',
        negative: '다양한 증상으로 종합적인 접근이 필요합니다.',
      },
      '단순한 증상 패턴': {
        positive: '명확한 증상으로 효과적인 치료가 가능합니다.',
        negative: '증상이 적어 원인 파악이 어려울 수 있습니다.',
      },
    };

    return descriptions[factor]?.[impact] || `${factor}이(가) 치료 결과에 ${impact === 'positive' ? '긍정적' : '부정적'} 영향을 미칩니다.`;
  }

  /**
   * 추천사항 생성
   */
  private getRecommendations(prediction: PrognosisPredictionResult): string[] {
    const recommendations: string[] = [];

    // 신뢰도 기반 추천
    if (prediction.confidenceScore < 0.6) {
      recommendations.push('예측 신뢰도가 낮으므로 정기적인 경과 관찰이 중요합니다.');
    }

    // 재발 확률 기반 추천
    if (prediction.relapseProbability > 0.25) {
      recommendations.push('재발 가능성이 있으므로 증상 호전 후에도 관리가 필요합니다.');
    }

    // 기본 추천사항
    recommendations.push('처방된 약물을 규칙적으로 복용하세요.');
    recommendations.push('증상 변화가 있으면 기록하고 다음 진료 시 알려주세요.');
    recommendations.push('충분한 휴식과 균형 잡힌 식사가 회복에 도움이 됩니다.');

    return recommendations;
  }

  /**
   * 요약문 생성
   */
  private generateSummary(prediction: PrognosisPredictionResult): string {
    const { expectedDuration, improvementRate, confidenceScore } = prediction;

    const durationText = `${expectedDuration.optimistic}~${expectedDuration.conservative}일`;
    const improvementText = `${improvementRate.week4}%`;
    const confidenceText = confidenceScore >= 0.7 ? '높은' : confidenceScore >= 0.5 ? '중간' : '낮은';

    return `유사 사례 분석 결과, 치료 기간은 약 ${durationText}로 예상되며, 4주 후 ${improvementText}의 호전율이 기대됩니다. 이 예측은 ${confidenceText} 신뢰도를 가지고 있습니다.`;
  }
}
