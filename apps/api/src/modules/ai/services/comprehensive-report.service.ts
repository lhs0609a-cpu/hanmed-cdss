import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { HealthScoreCalculatorService } from './health-score-calculator.service';
import { ScientificRationaleService } from './scientific-rationale.service';
import { PharmacologyReportService } from './pharmacology-report.service';
import { TreatmentStatisticsService } from './treatment-statistics.service';
import {
  ComprehensivePatientReport,
  ComprehensiveReportRequest,
  ReportHealthScoreSection,
  ReportPrescriptionSection,
  ReportScientificEvidenceSection,
  ReportPrognosisSection,
  ReportLifestyleSection,
  ReportHtmlOptions,
  ReportExportFormat,
} from '../types';

@Injectable()
export class ComprehensiveReportService {
  constructor(
    private configService: ConfigService,
    private healthScoreCalculator: HealthScoreCalculatorService,
    private scientificRationaleService: ScientificRationaleService,
    private pharmacologyReportService: PharmacologyReportService,
    private treatmentStatisticsService: TreatmentStatisticsService,
  ) {}

  /**
   * 종합 환자 보고서 생성
   */
  async generateComprehensiveReport(
    request: ComprehensiveReportRequest
  ): Promise<ComprehensivePatientReport> {
    const reportId = uuidv4();
    const includeSections = request.includeSections || {
      healthScore: true,
      prescription: true,
      scientificEvidence: true,
      prognosis: true,
      lifestyle: true,
    };

    // 건강 점수 섹션
    const healthScore = await this.generateHealthScoreSection(request);

    // 처방 섹션
    const prescription = this.generatePrescriptionSection(request);

    // 과학적 근거 섹션
    const scientificEvidence = await this.generateScientificEvidenceSection(request);

    // 예후 섹션
    const prognosis = await this.generatePrognosisSection(request, scientificEvidence);

    // 생활 관리 섹션
    const lifestyle = this.generateLifestyleSection(request, healthScore);

    // 핵심 요약 생성
    const executiveSummary = this.generateExecutiveSummary(
      request,
      healthScore,
      prescription,
      scientificEvidence,
      prognosis
    );

    return {
      reportId,
      reportType: request.reportType || 'consultation',
      title: `${request.patientInfo?.name || '환자'}님의 과학적 진료 보고서`,
      generatedAt: new Date(),
      patientInfo: {
        name: request.patientInfo?.name,
        age: request.patientInfo?.age,
        gender: request.patientInfo?.gender,
        constitution: request.patientInfo?.constitution,
        patientId: request.patientId,
      },
      consultationInfo: {
        date: request.consultationInfo.date,
        chiefComplaint: request.consultationInfo.chiefComplaint,
        symptoms: request.consultationInfo.symptoms.map(s => s.name),
        diagnosis: request.consultationInfo.diagnosis,
        patternDiagnosis: request.consultationInfo.patternDiagnosis,
      },
      healthScore,
      prescription,
      scientificEvidence,
      prognosis,
      lifestyle: includeSections.lifestyle ? lifestyle : undefined,
      executiveSummary,
      metadata: {
        version: '1.0.0',
        generatedBy: '온고지신 AI',
        confidenceLevel: this.calculateOverallConfidence(scientificEvidence),
        dataSources: ['건강 점수 분석', '과학적 근거 DB', '치험례 통계', 'PubMed'],
      },
    };
  }

  /**
   * 건강 점수 섹션 생성
   */
  private async generateHealthScoreSection(
    request: ComprehensiveReportRequest
  ): Promise<ReportHealthScoreSection> {
    // 이미 계산된 점수가 있으면 사용
    if (request.healthScore) {
      return {
        bodyHeatScore: request.healthScore.bodyHeatScore,
        bodyHeatInterpretation: this.interpretBodyHeat(request.healthScore.bodyHeatScore),
        bodyStrengthScore: request.healthScore.bodyStrengthScore,
        bodyStrengthInterpretation: this.interpretBodyStrength(request.healthScore.bodyStrengthScore),
        circulationScore: 70, // 기본값
        organFunctionScores: request.healthScore.organFunctionScores || {
          spleen: 70,
          lung: 75,
          kidney: 72,
          liver: 73,
          heart: 74,
        },
        overallHealthIndex: request.healthScore.overallHealthIndex,
        overallInterpretation: this.interpretOverallHealth(request.healthScore.overallHealthIndex),
      };
    }

    // 증상 기반으로 점수 추정
    const symptoms = request.consultationInfo.symptoms;
    const estimatedScore = await this.estimateHealthScore(symptoms);

    return estimatedScore;
  }

  /**
   * 처방 섹션 생성
   */
  private generatePrescriptionSection(
    request: ComprehensiveReportRequest
  ): ReportPrescriptionSection {
    const herbs = request.prescription.herbs.map(h => ({
      name: h.name,
      amount: h.amount,
      role: h.role as '군' | '신' | '좌' | '사' | undefined,
      effect: this.getHerbEffect(h.name),
    }));

    return {
      formulaName: request.prescription.formulaName,
      formulaHanja: request.prescription.formulaHanja,
      herbs,
      purpose: this.inferPrescriptionPurpose(request),
      treatmentMethod: this.inferTreatmentMethod(request),
      dosageInstructions: request.prescription.dosageInstructions || '1일 2-3회, 식후 30분에 복용',
      precautions: this.generatePrecautions(request),
    };
  }

  /**
   * 과학적 근거 섹션 생성
   */
  private async generateScientificEvidenceSection(
    request: ComprehensiveReportRequest
  ): Promise<ReportScientificEvidenceSection> {
    // 과학적 근거 서비스 호출
    const rationale = await this.scientificRationaleService.generateScientificRationale({
      formulaNameOrId: request.prescription.formulaName,
      herbs: request.prescription.herbs,
      patientContext: {
        chiefComplaint: request.consultationInfo.chiefComplaint,
        symptoms: request.consultationInfo.symptoms.map(s => s.name),
      },
      detailLevel: 'standard',
    });

    // 통계 서비스 호출
    const statistics = await this.treatmentStatisticsService.getSimilarPatientStatistics({
      chiefComplaint: request.consultationInfo.chiefComplaint,
      symptoms: request.consultationInfo.symptoms,
      diagnosis: request.consultationInfo.diagnosis,
    });

    // 약리 보고서 호출
    const pharmacology = await this.pharmacologyReportService.generatePharmacologyReport({
      herbs: request.prescription.herbs,
      formulaName: request.prescription.formulaName,
      detailLevel: 'brief',
    });

    return {
      traditionalEvidence: {
        sources: rationale.traditionalEvidence?.classicalSources?.map(s => s.name) || ['동의보감', '상한론'],
        summary: rationale.summary?.patientFriendlyExplanation || '전통 한의학에 기반한 처방입니다.',
      },
      modernEvidence: {
        keyMechanisms: pharmacology.patientSummary?.keyPoints || [],
        activeCompounds: pharmacology.herbs.flatMap(h =>
          h.activeCompounds.slice(0, 2).map(c => ({
            name: c.name,
            herb: h.name,
            effect: c.mainEffects?.[0] || '약리 작용',
          }))
        ).slice(0, 5),
        summary: pharmacology.patientSummary?.howItWorks || '현대 약리학적 연구가 진행 중입니다.',
      },
      statisticalEvidence: {
        similarCases: statistics.totalSimilarPatients,
        successRate: statistics.overallSuccessRate,
        outcomeDistribution: statistics.outcomeDistribution,
        averageDuration: statistics.averageTreatmentDuration,
      },
      overallEvidenceLevel: rationale.statisticalEvidence?.overallEvidenceLevel as 'A' | 'B' | 'C' | 'D' || 'C',
      keyStudies: rationale.statisticalEvidence?.clinicalStudies?.slice(0, 3).map(s => ({
        title: s.title,
        year: s.year,
        pmid: s.pmid || undefined,
        finding: s.mainFindings,
      })) || [],
    };
  }

  /**
   * 예후 섹션 생성
   */
  private async generatePrognosisSection(
    request: ComprehensiveReportRequest,
    evidence: ReportScientificEvidenceSection
  ): Promise<ReportPrognosisSection> {
    const successRate = evidence.statisticalEvidence.successRate;

    let expectedOutcome = '호전';
    if (successRate >= 90) expectedOutcome = '완치 또는 현저호전 기대';
    else if (successRate >= 80) expectedOutcome = '호전 기대';
    else if (successRate >= 70) expectedOutcome = '경미한 호전 기대';
    else expectedOutcome = '개선 가능';

    const positiveFactors: string[] = [];
    const cautionFactors: string[] = [];

    // 증상 수에 따른 요인 분석
    const symptomCount = request.consultationInfo.symptoms.length;
    if (symptomCount <= 3) {
      positiveFactors.push('증상 수가 적어 치료 집중도가 높습니다.');
    } else {
      cautionFactors.push('다수의 증상이 있어 치료 기간이 길어질 수 있습니다.');
    }

    // 유사 케이스 수에 따른 요인
    if (evidence.statisticalEvidence.similarCases >= 50) {
      positiveFactors.push('충분한 유사 케이스 데이터가 있어 예측 신뢰도가 높습니다.');
    }

    // 성공률에 따른 요인
    if (successRate >= 85) {
      positiveFactors.push('높은 치료 성공률이 보고되고 있습니다.');
    }

    return {
      expectedOutcome,
      expectedDuration: evidence.statisticalEvidence.averageDuration,
      confidence: Math.min(1, evidence.statisticalEvidence.similarCases / 100),
      positiveFactors: positiveFactors.length > 0 ? positiveFactors : ['일반적인 예후 예상'],
      cautionFactors,
      recommendations: [
        '처방된 약을 꾸준히 복용해 주세요.',
        '증상 변화가 있으면 기록해 주세요.',
        '다음 진료 시 경과를 알려주세요.',
      ],
      followUp: {
        recommended: true,
        timing: '2주 후',
        reason: '치료 경과 확인 및 처방 조정',
      },
    };
  }

  /**
   * 생활 관리 섹션 생성
   */
  private generateLifestyleSection(
    request: ComprehensiveReportRequest,
    healthScore: ReportHealthScoreSection
  ): ReportLifestyleSection {
    const isHot = healthScore.bodyHeatScore > 2;
    const isCold = healthScore.bodyHeatScore < -2;
    const isDeficient = healthScore.bodyStrengthScore < -2;

    const diet = {
      recommended: [] as string[],
      avoid: [] as string[],
      tips: [] as string[],
    };

    const exercise = {
      recommended: [] as string[],
      avoid: [] as string[],
      tips: [] as string[],
    };

    const lifestyle = {
      recommended: [] as string[],
      avoid: [] as string[],
    };

    // 체열에 따른 식이 권고
    if (isHot) {
      diet.recommended.push('서늘한 성질의 음식 (오이, 수박, 녹두)');
      diet.avoid.push('맵고 뜨거운 음식');
      diet.tips.push('충분한 수분 섭취가 중요합니다.');
    } else if (isCold) {
      diet.recommended.push('따뜻한 성질의 음식 (생강차, 대추)');
      diet.avoid.push('찬 음식, 생것');
      diet.tips.push('음식을 따뜻하게 데워 드세요.');
    } else {
      diet.recommended.push('균형 잡힌 식단');
      diet.tips.push('과식을 피하고 규칙적으로 식사하세요.');
    }

    // 근실도에 따른 운동 권고
    if (isDeficient) {
      exercise.recommended.push('가벼운 산책', '스트레칭', '요가');
      exercise.avoid.push('격렬한 운동');
      exercise.tips.push('무리하지 않는 범위에서 활동하세요.');
    } else {
      exercise.recommended.push('규칙적인 유산소 운동', '가벼운 근력 운동');
      exercise.tips.push('주 3-4회 30분 이상 운동을 권장합니다.');
    }

    // 일반적인 생활 습관
    lifestyle.recommended.push(
      '규칙적인 수면 (밤 11시 이전 취침)',
      '적절한 스트레스 관리',
      '금연, 절주',
    );
    lifestyle.avoid.push(
      '과로 및 과도한 스트레스',
      '불규칙한 식사',
    );

    return {
      diet,
      exercise,
      lifestyle,
      seasonalAdvice: this.getSeasonalAdvice(),
    };
  }

  /**
   * 핵심 요약 생성
   */
  private generateExecutiveSummary(
    request: ComprehensiveReportRequest,
    healthScore: ReportHealthScoreSection,
    prescription: ReportPrescriptionSection,
    evidence: ReportScientificEvidenceSection,
    prognosis: ReportPrognosisSection
  ): ComprehensivePatientReport['executiveSummary'] {
    const patientName = request.patientInfo?.name || '환자';

    const oneLiner = `${patientName}님은 ${request.consultationInfo.chiefComplaint}으로 내원하셨으며, ${prescription.formulaName}을 처방받으셨습니다. 유사 환자 ${evidence.statisticalEvidence.similarCases}명 중 ${evidence.statisticalEvidence.successRate}%가 호전되었습니다.`;

    const keyPoints = [
      `종합 건강지수: ${healthScore.overallHealthIndex}점`,
      `처방: ${prescription.formulaName}`,
      `치료 성공률: ${evidence.statisticalEvidence.successRate}%`,
      `예상 치료 기간: ${prognosis.expectedDuration}`,
    ];

    const actionItems = [
      '처방된 약을 꾸준히 복용하세요.',
      '증상 변화를 기록해 주세요.',
      `${prognosis.followUp?.timing || '2주'} 후 재진 예약을 권장합니다.`,
    ];

    return { oneLiner, keyPoints, actionItems };
  }

  /**
   * 보고서를 HTML로 변환
   */
  async generateReportHtml(
    report: ComprehensivePatientReport,
    options: ReportHtmlOptions = {}
  ): Promise<string> {
    const theme = options.theme || 'light';
    const clinicName = options.clinicName || '온고지신 한의원';

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans KR', -apple-system, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      ${theme === 'dark' ? 'color: #ffffff;' : ''}
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header {
      text-align: center;
      border-bottom: 2px solid #2196F3;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 24px; color: #2196F3; margin-bottom: 10px; }
    .header .meta { font-size: 14px; color: #666; }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background: ${theme === 'dark' ? '#2a2a2a' : '#f8f9fa'};
      border-radius: 12px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #2196F3;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .score-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
    }
    .score-item {
      text-align: center;
      padding: 15px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .score-value { font-size: 28px; font-weight: 700; color: #2196F3; }
    .score-label { font-size: 12px; color: #666; margin-top: 4px; }
    .evidence-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
    }
    .evidence-A { background: #4CAF50; }
    .evidence-B { background: #2196F3; }
    .evidence-C { background: #FF9800; }
    .evidence-D { background: #9E9E9E; }
    .herb-list { list-style: none; }
    .herb-list li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
    }
    .stats-bar {
      height: 24px;
      background: #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
    }
    .stats-bar .success { background: #4CAF50; }
    .stats-bar .improved { background: #8BC34A; }
    .stats-bar .moderate { background: #03A9F4; }
    .stats-bar .unchanged { background: #FF9800; }
    .stats-bar .worsened { background: #F44336; }
    .summary-box {
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: #fff;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .summary-box h2 { font-size: 20px; margin-bottom: 15px; }
    .summary-box .key-points { margin: 15px 0; }
    .summary-box .key-points li { margin: 8px 0; }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${report.title}</h1>
      <div class="meta">
        ${clinicName} | 진료일: ${report.consultationInfo.date} | 생성일: ${new Date(report.generatedAt).toLocaleDateString('ko-KR')}
      </div>
    </header>

    <!-- 핵심 요약 -->
    <div class="summary-box">
      <h2>진료 요약</h2>
      <p>${report.executiveSummary.oneLiner}</p>
      <ul class="key-points">
        ${report.executiveSummary.keyPoints.map(p => `<li>${p}</li>`).join('')}
      </ul>
    </div>

    <!-- 건강 점수 섹션 -->
    <section class="section">
      <h3 class="section-title">건강 점수</h3>
      <div class="score-grid">
        <div class="score-item">
          <div class="score-value">${report.healthScore.overallHealthIndex}</div>
          <div class="score-label">종합 건강지수</div>
        </div>
        <div class="score-item">
          <div class="score-value">${report.healthScore.bodyHeatScore > 0 ? '+' : ''}${report.healthScore.bodyHeatScore}</div>
          <div class="score-label">체열 (${report.healthScore.bodyHeatInterpretation.level})</div>
        </div>
        <div class="score-item">
          <div class="score-value">${report.healthScore.bodyStrengthScore > 0 ? '+' : ''}${report.healthScore.bodyStrengthScore}</div>
          <div class="score-label">근실도 (${report.healthScore.bodyStrengthInterpretation.level})</div>
        </div>
        <div class="score-item">
          <div class="score-value">${report.healthScore.circulationScore}</div>
          <div class="score-label">기혈순환도</div>
        </div>
      </div>
      <p style="margin-top: 15px; font-size: 14px; color: #666;">
        ${report.healthScore.overallInterpretation}
      </p>
    </section>

    <!-- 처방 섹션 -->
    <section class="section">
      <h3 class="section-title">처방: ${report.prescription.formulaName} ${report.prescription.formulaHanja ? `(${report.prescription.formulaHanja})` : ''}</h3>
      <p style="margin-bottom: 15px;">${report.prescription.purpose}</p>
      <ul class="herb-list">
        ${report.prescription.herbs.map(h => `
          <li>
            <span>${h.name} ${h.role ? `(${h.role})` : ''}</span>
            <span>${h.amount || ''}</span>
          </li>
        `).join('')}
      </ul>
      <div style="margin-top: 15px; padding: 10px; background: #fff3e0; border-radius: 8px;">
        <strong>복용법:</strong> ${report.prescription.dosageInstructions}
      </div>
    </section>

    <!-- 과학적 근거 섹션 -->
    <section class="section">
      <h3 class="section-title">
        과학적 근거
        <span class="evidence-badge evidence-${report.scientificEvidence.overallEvidenceLevel}">
          ${report.scientificEvidence.overallEvidenceLevel}등급
        </span>
      </h3>
      <div style="margin-bottom: 15px;">
        <strong>통계적 근거:</strong> 유사 환자 ${report.scientificEvidence.statisticalEvidence.similarCases}명 중
        <strong style="color: #4CAF50;">${report.scientificEvidence.statisticalEvidence.successRate}%</strong>가 호전
      </div>
      <div class="stats-bar">
        ${this.generateStatsBarHtml(report.scientificEvidence.statisticalEvidence.outcomeDistribution)}
      </div>
      <p style="margin-top: 15px; font-size: 14px;">
        <strong>현대 약리학:</strong> ${report.scientificEvidence.modernEvidence.summary}
      </p>
    </section>

    <!-- 예후 섹션 -->
    <section class="section">
      <h3 class="section-title">예후 및 권고</h3>
      <p><strong>예상 결과:</strong> ${report.prognosis.expectedOutcome}</p>
      <p><strong>예상 기간:</strong> ${report.prognosis.expectedDuration}</p>
      <div style="margin-top: 15px;">
        <strong>권고 사항:</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          ${report.prognosis.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    </section>

    <footer class="footer">
      <p>본 보고서는 ${report.metadata.generatedBy}에 의해 자동 생성되었습니다.</p>
      <p>의료적 판단은 담당 의료진과 상담해 주세요.</p>
    </footer>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * 통계 바 HTML 생성
   */
  private generateStatsBarHtml(distribution: ReportScientificEvidenceSection['statisticalEvidence']['outcomeDistribution']): string {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return '';

    const segments = [
      { key: 'cured', class: 'success', value: distribution.cured },
      { key: 'markedlyImproved', class: 'improved', value: distribution.markedlyImproved },
      { key: 'improved', class: 'moderate', value: distribution.improved },
      { key: 'noChange', class: 'unchanged', value: distribution.noChange },
      { key: 'worsened', class: 'worsened', value: distribution.worsened },
    ];

    return segments
      .filter(s => s.value > 0)
      .map(s => `<div class="${s.class}" style="width: ${(s.value / total) * 100}%"></div>`)
      .join('');
  }

  // ============ 유틸리티 메서드 ============

  private interpretBodyHeat(score: number): ReportHealthScoreSection['bodyHeatInterpretation'] {
    if (score <= -7) return { level: '극한', traditional: '양기 부족, 대사 저하', modern: '기초대사율 저하, 갑상선 기능 저하 가능성' };
    if (score <= -3) return { level: '한', traditional: '찬 것 싫어함, 따뜻한 것 선호', modern: '말초순환 저하, 체온 조절 기능 저하' };
    if (score <= 2) return { level: '평', traditional: '한열 균형', modern: '체온 조절 기능 정상' };
    if (score <= 6) return { level: '열', traditional: '더운 것 싫어함, 찬 것 선호', modern: '염증 반응 활성화, 대사 항진' };
    return { level: '극열', traditional: '심한 열감, 갈증', modern: '급성 염증 반응, 고대사 상태' };
  }

  private interpretBodyStrength(score: number): ReportHealthScoreSection['bodyStrengthInterpretation'] {
    if (score <= -7) return { level: '극허', traditional: '극심한 기력 저하', modern: '심각한 면역 기능 저하, 영양 결핍' };
    if (score <= -3) return { level: '허', traditional: '피로감, 소화력 약함', modern: '면역력 저하, 에너지 대사 저하' };
    if (score <= 2) return { level: '평', traditional: '허실 균형', modern: '정상적인 체력 및 면역 기능' };
    if (score <= 6) return { level: '실', traditional: '체력 충만, 울체 경향', modern: '대사산물 축적, 혈액점도 증가' };
    return { level: '극실', traditional: '과잉/정체/울체', modern: '심한 울혈, 자율신경 불균형' };
  }

  private interpretOverallHealth(index: number): string {
    if (index >= 80) return '전반적으로 건강한 상태입니다. 현재의 건강 관리를 유지해 주세요.';
    if (index >= 60) return '양호한 상태이나 일부 개선이 필요합니다. 권고 사항을 참고해 주세요.';
    if (index >= 40) return '건강 관리가 필요한 상태입니다. 적극적인 치료와 생활 관리를 권장합니다.';
    return '전문적인 진료와 치료가 필요한 상태입니다. 담당 의료진과 상담해 주세요.';
  }

  private async estimateHealthScore(symptoms: { name: string; severity?: number }[]): Promise<ReportHealthScoreSection> {
    // 증상 기반 추정
    let heatScore = 0;
    let strengthScore = 0;

    symptoms.forEach(s => {
      const name = s.name.toLowerCase();
      const severity = s.severity || 5;

      // 열 관련 증상
      if (name.includes('열') || name.includes('더위') || name.includes('갈증')) {
        heatScore += severity / 3;
      }
      if (name.includes('한') || name.includes('추위') || name.includes('냉')) {
        heatScore -= severity / 3;
      }

      // 허실 관련 증상
      if (name.includes('피로') || name.includes('무력') || name.includes('식욕부진')) {
        strengthScore -= severity / 3;
      }
      if (name.includes('팽만') || name.includes('울체') || name.includes('답답')) {
        strengthScore += severity / 3;
      }
    });

    heatScore = Math.max(-10, Math.min(10, heatScore));
    strengthScore = Math.max(-10, Math.min(10, strengthScore));

    const baseHealth = 70 - symptoms.length * 3;
    const overallHealth = Math.max(30, Math.min(90, baseHealth));

    return {
      bodyHeatScore: Math.round(heatScore * 10) / 10,
      bodyHeatInterpretation: this.interpretBodyHeat(heatScore),
      bodyStrengthScore: Math.round(strengthScore * 10) / 10,
      bodyStrengthInterpretation: this.interpretBodyStrength(strengthScore),
      circulationScore: 70,
      organFunctionScores: { spleen: 70, lung: 72, kidney: 68, liver: 71, heart: 73 },
      overallHealthIndex: overallHealth,
      overallInterpretation: this.interpretOverallHealth(overallHealth),
    };
  }

  private getHerbEffect(herbName: string): string {
    const effects: Record<string, string> = {
      '인삼': '기력 보충, 면역 증강',
      '황기': '기력 보충, 면역 조절',
      '당귀': '혈액 순환 개선, 보혈',
      '백출': '비위 강화, 습기 제거',
      '감초': '조화, 해독',
      '생강': '온경, 소화 촉진',
      '대추': '비위 보양, 진정',
      '복령': '이뇨, 진정',
    };
    return effects[herbName] || '약리 작용';
  }

  private inferPrescriptionPurpose(request: ComprehensiveReportRequest): string {
    return `${request.consultationInfo.chiefComplaint} 치료를 위한 처방입니다.`;
  }

  private inferTreatmentMethod(request: ComprehensiveReportRequest): ReportPrescriptionSection['treatmentMethod'] {
    return {
      name: '변증시치',
      hanja: '辨證施治',
      description: '환자의 증상과 체질을 분석하여 맞춤 치료를 적용합니다.',
    };
  }

  private generatePrecautions(request: ComprehensiveReportRequest): string[] {
    return [
      '복용 중 이상 증상이 나타나면 복용을 중단하고 상담하세요.',
      '다른 약물과 함께 복용 시 반드시 알려주세요.',
      '임신 중이거나 수유 중인 경우 반드시 알려주세요.',
    ];
  }

  private getSeasonalAdvice(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '봄철에는 간 기능 관리에 신경 쓰세요. 산나물, 봄채소가 좋습니다.';
    if (month >= 6 && month <= 8) return '여름철에는 수분 섭취와 더위 관리에 주의하세요.';
    if (month >= 9 && month <= 11) return '가을철에는 폐 기능 관리에 신경 쓰세요. 배, 도라지가 좋습니다.';
    return '겨울철에는 신장 기능 관리와 보온에 주의하세요.';
  }

  private calculateOverallConfidence(evidence: ReportScientificEvidenceSection): number {
    let confidence = 0.5;
    if (evidence.statisticalEvidence.similarCases >= 50) confidence += 0.2;
    if (evidence.keyStudies.length >= 2) confidence += 0.1;
    if (evidence.overallEvidenceLevel === 'A' || evidence.overallEvidenceLevel === 'B') confidence += 0.1;
    return Math.min(1, confidence);
  }
}
