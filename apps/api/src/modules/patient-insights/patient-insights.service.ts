import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { HealthJournal } from '../../database/entities/health-journal.entity';
import { MedicationLog, MedicationLogStatus } from '../../database/entities/medication-log.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientHealthScore } from '../../database/entities/patient-health-score.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { Reservation } from '../../database/entities/reservation.entity';

export interface SymptomTrend {
  name: string;
  currentSeverity: number;
  previousSeverity: number;
  changeRate: number;
  trend: 'improving' | 'stable' | 'worsening';
  dailyData: Array<{ date: string; severity: number }>;
}

export interface SymptomSummary {
  patientId: string;
  period: { start: string; end: string };
  totalEntries: number;
  symptomTrends: SymptomTrend[];
  overallStatus: 'improving' | 'stable' | 'worsening';
  insights: string[];
}

export interface PreVisitAnalysis {
  patientId: string;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  recentSymptomSummary: {
    topSymptoms: Array<{ name: string; avgSeverity: number; frequency: number }>;
    newSymptoms: string[];
    resolvedSymptoms: string[];
  };
  adherenceRate: number;
  healthScoreChange: {
    current: number;
    previous: number;
    change: number;
  } | null;
  aiAnalysis: {
    summary: string;
    focusAreas: string[];
    suggestedQuestions: string[];
  };
}

export interface AdherenceReport {
  patientId: string;
  prescriptionId: string | null;
  adherenceRate: number;
  medicationLog: {
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    skipReasons: Array<{ reason: string; count: number }>;
  };
  pattern: {
    bestTime: string;
    worstTime: string;
    weekdayVsWeekend: {
      weekdayRate: number;
      weekendRate: number;
    };
  };
  suggestions: string[];
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'symptom_worsening' | 'low_adherence' | 'missed_appointment' | 'health_score_drop';
  severity: 'low' | 'medium' | 'high';
  message: string;
  createdAt: string;
}

@Injectable()
export class PatientInsightsService {
  constructor(
    @InjectRepository(HealthJournal)
    private healthJournalRepository: Repository<HealthJournal>,
    @InjectRepository(MedicationLog)
    private medicationLogRepository: Repository<MedicationLog>,
    @InjectRepository(PatientRecord)
    private patientRecordRepository: Repository<PatientRecord>,
    @InjectRepository(PatientHealthScore)
    private healthScoreRepository: Repository<PatientHealthScore>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
  ) {}

  /**
   * 환자 증상 트렌드 요약 (한의사용)
   */
  async getPatientSymptomSummary(
    patientId: string,
    practitionerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SymptomSummary> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 기본 30일

    // 환자 존재 확인
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('환자를 찾을 수 없습니다.');
    }

    // 건강 일지 조회
    const journals = await this.healthJournalRepository.find({
      where: {
        patientId,
        recordedDate: Between(start, end),
      },
      order: { recordedDate: 'ASC' },
    });

    // 증상별 데이터 집계
    const symptomMap = new Map<string, Array<{ date: Date; severity: number }>>();

    journals.forEach(journal => {
      if (journal.symptoms) {
        journal.symptoms.forEach((symptom: { name: string; severity?: number }) => {
          const existing = symptomMap.get(symptom.name) || [];
          existing.push({
            date: journal.recordedDate,
            severity: symptom.severity || 5,
          });
          symptomMap.set(symptom.name, existing);
        });
      }
    });

    // 증상 트렌드 계산
    const symptomTrends: SymptomTrend[] = [];

    symptomMap.forEach((data, name) => {
      if (data.length < 2) return;

      const midpoint = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, midpoint);
      const secondHalf = data.slice(midpoint);

      const previousSeverity = firstHalf.reduce((sum, d) => sum + d.severity, 0) / firstHalf.length;
      const currentSeverity = secondHalf.reduce((sum, d) => sum + d.severity, 0) / secondHalf.length;
      const changeRate = previousSeverity > 0
        ? ((currentSeverity - previousSeverity) / previousSeverity) * 100
        : 0;

      let trend: 'improving' | 'stable' | 'worsening';
      if (changeRate < -10) trend = 'improving';
      else if (changeRate > 10) trend = 'worsening';
      else trend = 'stable';

      symptomTrends.push({
        name,
        currentSeverity: Math.round(currentSeverity * 10) / 10,
        previousSeverity: Math.round(previousSeverity * 10) / 10,
        changeRate: Math.round(changeRate),
        trend,
        dailyData: data.map(d => ({
          date: d.date.toISOString().split('T')[0],
          severity: d.severity,
        })),
      });
    });

    // 전반적 상태 판단
    const improvingCount = symptomTrends.filter(t => t.trend === 'improving').length;
    const worseningCount = symptomTrends.filter(t => t.trend === 'worsening').length;

    let overallStatus: 'improving' | 'stable' | 'worsening';
    if (improvingCount > worseningCount * 2) overallStatus = 'improving';
    else if (worseningCount > improvingCount * 2) overallStatus = 'worsening';
    else overallStatus = 'stable';

    // 인사이트 생성
    const insights = this.generateSymptomInsights(symptomTrends, journals.length);

    return {
      patientId,
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      totalEntries: journals.length,
      symptomTrends: symptomTrends.sort((a, b) => b.currentSeverity - a.currentSeverity),
      overallStatus,
      insights,
    };
  }

  /**
   * 다음 진료 전 AI 사전 분석
   */
  async generatePreVisitAnalysis(
    patientId: string,
    upcomingReservationId?: string,
  ): Promise<PreVisitAnalysis> {
    // 마지막 진료 기록 조회
    const lastRecord = await this.patientRecordRepository.findOne({
      where: { patientId },
      order: { visitDate: 'DESC' },
    });

    const lastVisitDate = lastRecord?.visitDate
      ? new Date(lastRecord.visitDate).toISOString().split('T')[0]
      : null;
    const daysSinceLastVisit = lastRecord?.visitDate
      ? Math.floor((Date.now() - new Date(lastRecord.visitDate).getTime()) / (24 * 60 * 60 * 1000))
      : null;

    // 최근 30일 증상 요약
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentJournals = await this.healthJournalRepository.find({
      where: {
        patientId,
        recordedDate: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    // 증상 집계
    const symptomStats = new Map<string, { total: number; count: number }>();
    const recentSymptoms = new Set<string>();
    const previousSymptoms = new Set<string>(
      lastRecord?.symptomsSummary?.map((s: { name: string }) => s.name) || []
    );

    recentJournals.forEach(journal => {
      if (journal.symptoms) {
        journal.symptoms.forEach((symptom: { name: string; severity?: number }) => {
          recentSymptoms.add(symptom.name);
          const existing = symptomStats.get(symptom.name) || { total: 0, count: 0 };
          existing.total += symptom.severity || 5;
          existing.count++;
          symptomStats.set(symptom.name, existing);
        });
      }
    });

    const topSymptoms = Array.from(symptomStats.entries())
      .map(([name, stats]) => ({
        name,
        avgSeverity: Math.round((stats.total / stats.count) * 10) / 10,
        frequency: stats.count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const newSymptoms = Array.from(recentSymptoms).filter(s => !previousSymptoms.has(s));
    const resolvedSymptoms = Array.from(previousSymptoms).filter(s => !recentSymptoms.has(s));

    // 복약 순응도 조회
    const adherenceReport = await this.getMedicationAdherenceReport(patientId);

    // 건강 점수 변화 조회
    const healthScores = await this.healthScoreRepository.find({
      where: { patientId },
      order: { evaluatedAt: 'DESC' },
      take: 2,
    });

    const healthScoreChange = healthScores.length >= 2
      ? {
          current: healthScores[0].overallHealthIndex,
          previous: healthScores[1].overallHealthIndex,
          change: healthScores[0].overallHealthIndex - healthScores[1].overallHealthIndex,
        }
      : healthScores.length === 1
        ? {
            current: healthScores[0].overallHealthIndex,
            previous: healthScores[0].overallHealthIndex,
            change: 0,
          }
        : null;

    // AI 분석 생성
    const aiAnalysis = this.generatePreVisitAiAnalysis(
      topSymptoms,
      newSymptoms,
      resolvedSymptoms,
      adherenceReport.adherenceRate,
      healthScoreChange,
      daysSinceLastVisit,
    );

    return {
      patientId,
      lastVisitDate,
      daysSinceLastVisit,
      recentSymptomSummary: {
        topSymptoms,
        newSymptoms,
        resolvedSymptoms,
      },
      adherenceRate: adherenceReport.adherenceRate,
      healthScoreChange,
      aiAnalysis,
    };
  }

  /**
   * 복약 순응도 리포트
   */
  async getMedicationAdherenceReport(
    patientId: string,
    prescriptionId?: string,
  ): Promise<AdherenceReport> {
    // 복약 기록 조회
    const queryBuilder = this.medicationLogRepository.createQueryBuilder('log')
      .where('log.patientId = :patientId', { patientId });

    if (prescriptionId) {
      queryBuilder.andWhere('log.prescriptionId = :prescriptionId', { prescriptionId });
    }

    const logs = await queryBuilder
      .orderBy('log.takenAt', 'DESC')
      .getMany();

    const totalDoses = logs.length;
    const takenDoses = logs.filter(l => l.status === MedicationLogStatus.TAKEN).length;
    const missedDoses = logs.filter(l => l.status === MedicationLogStatus.SKIPPED || l.status === MedicationLogStatus.DELAYED).length;

    // 스킵 사유 집계 (notes 필드 사용)
    const skipReasonMap = new Map<string, number>();
    logs.filter(l => l.status === MedicationLogStatus.SKIPPED && l.notes).forEach(l => {
      const count = skipReasonMap.get(l.notes!) || 0;
      skipReasonMap.set(l.notes!, count + 1);
    });

    const skipReasons = Array.from(skipReasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // 시간대별 분석
    const timeStats = new Map<string, { taken: number; total: number }>();
    logs.forEach(l => {
      const hour = new Date(l.takenAt).getHours();
      const timeSlot = hour < 12 ? '아침' : hour < 18 ? '점심' : '저녁';
      const existing = timeStats.get(timeSlot) || { taken: 0, total: 0 };
      existing.total++;
      if (l.status === MedicationLogStatus.TAKEN) existing.taken++;
      timeStats.set(timeSlot, existing);
    });

    const timeRates = Array.from(timeStats.entries())
      .map(([time, stats]) => ({
        time,
        rate: stats.total > 0 ? (stats.taken / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate);

    const bestTime = timeRates[0]?.time || '데이터 없음';
    const worstTime = timeRates[timeRates.length - 1]?.time || '데이터 없음';

    // 주중/주말 분석
    let weekdayTaken = 0, weekdayTotal = 0, weekendTaken = 0, weekendTotal = 0;
    logs.forEach(l => {
      const day = new Date(l.takenAt).getDay();
      const isWeekend = day === 0 || day === 6;
      if (isWeekend) {
        weekendTotal++;
        if (l.status === MedicationLogStatus.TAKEN) weekendTaken++;
      } else {
        weekdayTotal++;
        if (l.status === MedicationLogStatus.TAKEN) weekdayTaken++;
      }
    });

    const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

    // 개선 제안 생성
    const suggestions = this.generateAdherenceSuggestions(
      adherenceRate,
      skipReasons,
      bestTime,
      worstTime,
    );

    return {
      patientId,
      prescriptionId: prescriptionId || null,
      adherenceRate,
      medicationLog: {
        totalDoses,
        takenDoses,
        missedDoses,
        skipReasons,
      },
      pattern: {
        bestTime,
        worstTime,
        weekdayVsWeekend: {
          weekdayRate: weekdayTotal > 0 ? Math.round((weekdayTaken / weekdayTotal) * 100) : 100,
          weekendRate: weekendTotal > 0 ? Math.round((weekendTaken / weekendTotal) * 100) : 100,
        },
      },
      suggestions,
    };
  }

  /**
   * 환자별 알림 트리거 (이상 징후 감지)
   */
  async checkPatientAlerts(patientId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      return alerts;
    }

    const patientName = patient.name || '환자';

    // 1. 증상 악화 체크
    const symptomSummary = await this.getPatientSymptomSummary(patientId, '');
    const worseningSymptoms = symptomSummary.symptomTrends.filter(t => t.trend === 'worsening');

    if (worseningSymptoms.length > 0) {
      alerts.push({
        id: `alert-symptom-${patientId}-${Date.now()}`,
        patientId,
        patientName,
        type: 'symptom_worsening',
        severity: worseningSymptoms.length >= 3 ? 'high' : 'medium',
        message: `${worseningSymptoms.map(s => s.name).join(', ')} 증상이 악화되고 있습니다.`,
        createdAt: new Date().toISOString(),
      });
    }

    // 2. 복약 순응도 체크
    const adherence = await this.getMedicationAdherenceReport(patientId);
    if (adherence.adherenceRate < 70) {
      alerts.push({
        id: `alert-adherence-${patientId}-${Date.now()}`,
        patientId,
        patientName,
        type: 'low_adherence',
        severity: adherence.adherenceRate < 50 ? 'high' : 'medium',
        message: `복약 순응도가 ${adherence.adherenceRate}%로 낮습니다.`,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. 건강 점수 급락 체크
    const healthScores = await this.healthScoreRepository.find({
      where: { patientId },
      order: { evaluatedAt: 'DESC' },
      take: 2,
    });

    if (healthScores.length >= 2) {
      const change = healthScores[0].overallHealthIndex - healthScores[1].overallHealthIndex;
      if (change < -15) {
        alerts.push({
          id: `alert-health-${patientId}-${Date.now()}`,
          patientId,
          patientName,
          type: 'health_score_drop',
          severity: change < -25 ? 'high' : 'medium',
          message: `건강 점수가 ${Math.abs(change)}점 하락했습니다.`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return alerts;
  }

  /**
   * 한의사의 모든 환자 알림 조회
   */
  async getAllPatientAlerts(practitionerId: string): Promise<Alert[]> {
    // 한의사의 환자 목록 조회 (최근 진료 환자)
    const recentRecords = await this.patientRecordRepository.find({
      where: { practitionerId },
      select: ['patientId'],
      order: { visitDate: 'DESC' },
      take: 100,
    });

    const patientIds = [...new Set(recentRecords.map(r => r.patientId))];

    // 각 환자의 알림 수집
    const allAlerts: Alert[] = [];
    for (const patientId of patientIds.slice(0, 50)) { // 최대 50명 체크
      const alerts = await this.checkPatientAlerts(patientId);
      allAlerts.push(...alerts);
    }

    // 심각도 순, 최신 순 정렬
    return allAlerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // Private helper methods

  private generateSymptomInsights(trends: SymptomTrend[], totalEntries: number): string[] {
    const insights: string[] = [];

    if (totalEntries < 5) {
      insights.push('기록이 충분하지 않아 정확한 분석이 어렵습니다. 꾸준한 증상 기록을 권장합니다.');
      return insights;
    }

    const improving = trends.filter(t => t.trend === 'improving');
    const worsening = trends.filter(t => t.trend === 'worsening');

    if (improving.length > 0) {
      insights.push(`${improving.map(t => t.name).join(', ')} 증상이 호전되고 있습니다.`);
    }

    if (worsening.length > 0) {
      insights.push(`${worsening.map(t => t.name).join(', ')} 증상에 주의가 필요합니다.`);
    }

    const severeSymptoms = trends.filter(t => t.currentSeverity >= 7);
    if (severeSymptoms.length > 0) {
      insights.push(`${severeSymptoms.map(t => t.name).join(', ')}의 심각도가 높습니다.`);
    }

    return insights;
  }

  private generatePreVisitAiAnalysis(
    topSymptoms: Array<{ name: string; avgSeverity: number; frequency: number }>,
    newSymptoms: string[],
    resolvedSymptoms: string[],
    adherenceRate: number,
    healthScoreChange: { current: number; previous: number; change: number } | null,
    daysSinceLastVisit: number | null,
  ): { summary: string; focusAreas: string[]; suggestedQuestions: string[] } {
    const focusAreas: string[] = [];
    const suggestedQuestions: string[] = [];

    // 요약 생성
    let summaryParts: string[] = [];

    if (daysSinceLastVisit !== null) {
      summaryParts.push(`마지막 진료 후 ${daysSinceLastVisit}일이 경과했습니다.`);
    }

    if (newSymptoms.length > 0) {
      summaryParts.push(`새로운 증상(${newSymptoms.join(', ')})이 나타났습니다.`);
      focusAreas.push('신규 증상 평가');
      suggestedQuestions.push(`${newSymptoms[0]}은(는) 언제부터 시작되었나요?`);
    }

    if (resolvedSymptoms.length > 0) {
      summaryParts.push(`${resolvedSymptoms.join(', ')} 증상이 호전되었습니다.`);
    }

    if (adherenceRate < 80) {
      focusAreas.push('복약 순응도 개선');
      suggestedQuestions.push('약을 복용하기 어려운 이유가 있으신가요?');
    }

    if (healthScoreChange && healthScoreChange.change < -10) {
      focusAreas.push('건강 상태 변화 원인 파악');
      suggestedQuestions.push('최근 생활 습관이나 환경에 변화가 있었나요?');
    }

    if (topSymptoms.length > 0) {
      const mainSymptom = topSymptoms[0];
      if (mainSymptom.avgSeverity >= 6) {
        focusAreas.push(`${mainSymptom.name} 집중 관리`);
        suggestedQuestions.push(`${mainSymptom.name}이(가) 일상생활에 어떤 영향을 미치나요?`);
      }
    }

    const summary = summaryParts.length > 0
      ? summaryParts.join(' ')
      : '특이 사항 없이 안정적인 상태입니다.';

    return {
      summary,
      focusAreas: focusAreas.slice(0, 3),
      suggestedQuestions: suggestedQuestions.slice(0, 3),
    };
  }

  private generateAdherenceSuggestions(
    adherenceRate: number,
    skipReasons: Array<{ reason: string; count: number }>,
    bestTime: string,
    worstTime: string,
  ): string[] {
    const suggestions: string[] = [];

    if (adherenceRate >= 90) {
      suggestions.push('복약 순응도가 우수합니다. 현재 패턴을 유지해 주세요.');
      return suggestions;
    }

    if (adherenceRate < 70) {
      suggestions.push('복약 알림 설정을 확인하고 조정하는 것을 권장합니다.');
    }

    // 스킵 사유 기반 제안
    const topReason = skipReasons[0];
    if (topReason) {
      if (topReason.reason.includes('잊어') || topReason.reason.includes('깜빡')) {
        suggestions.push('복약 시간에 알림을 설정하면 도움이 됩니다.');
      } else if (topReason.reason.includes('외출') || topReason.reason.includes('바빠')) {
        suggestions.push('외출 시 약을 휴대하는 습관을 들이세요.');
      } else if (topReason.reason.includes('부작용') || topReason.reason.includes('불편')) {
        suggestions.push('부작용이 있다면 한의사와 상담하여 처방을 조정하세요.');
      }
    }

    // 시간대 기반 제안
    if (bestTime !== worstTime) {
      suggestions.push(`${bestTime} 시간대의 복약이 가장 잘 지켜지고 있습니다. ${worstTime} 시간대에 특별히 주의해 주세요.`);
    }

    return suggestions;
  }
}
