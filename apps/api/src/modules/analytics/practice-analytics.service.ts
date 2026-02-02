import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PracticeStatistics,
  StatisticsPeriodType,
  PracticeMetrics,
} from '../../database/entities/practice-statistics.entity';
import { PatientRecord } from '../../database/entities/patient-record.entity';
import { PatientPrescription } from '../../database/entities/patient-prescription.entity';
import { PatientAccount } from '../../database/entities/patient-account.entity';
import { User } from '../../database/entities/user.entity';
import { UsageTracking } from '../../database/entities/usage-tracking.entity';

export interface DashboardData {
  today: {
    consultations: number;
    newPatients: number;
    prescriptions: number;
  };
  thisWeek: {
    consultations: number;
    newPatients: number;
    prescriptions: number;
    aiUsage: number;
  };
  thisMonth: {
    consultations: number;
    newPatients: number;
    returningPatients: number;
    avgImprovementRate: number;
    aiAcceptanceRate: number;
  };
  kpis: {
    totalPatients: { value: number; change: number };
    returnRate: { value: number; change: number };
    avgImprovement: { value: number; change: number };
    aiUsageRate: { value: number; change: number };
  };
  recentActivity: Array<{
    date: string;
    consultations: number;
    prescriptions: number;
  }>;
}

export interface BenchmarkData {
  myMetrics: {
    avgConsultationsPerDay: number;
    returnRate: number;
    avgImprovementRate: number;
    aiAcceptanceRate: number;
  };
  nationalAverage: {
    avgConsultationsPerDay: number;
    returnRate: number;
    avgImprovementRate: number;
    aiAcceptanceRate: number;
  };
  percentile: number;
  strengths: string[];
  areasForImprovement: string[];
}

export interface PatternAnalysis {
  topFormulas: Array<{
    rank: number;
    name: string;
    count: number;
    percentage: number;
    avgSuccessRate: number;
  }>;
  topSymptoms: Array<{
    rank: number;
    name: string;
    count: number;
    percentage: number;
    topFormula: string;
  }>;
  constitutionDistribution: Array<{
    constitution: string;
    count: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    consultations: number;
    prescriptions: number;
    newPatients: number;
  }>;
}

@Injectable()
export class PracticeAnalyticsService {
  constructor(
    @InjectRepository(PracticeStatistics)
    private statisticsRepository: Repository<PracticeStatistics>,
    @InjectRepository(PatientRecord)
    private patientRecordRepository: Repository<PatientRecord>,
    @InjectRepository(PatientPrescription)
    private prescriptionRepository: Repository<PatientPrescription>,
    @InjectRepository(PatientAccount)
    private patientRepository: Repository<PatientAccount>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UsageTracking)
    private usageTrackingRepository: Repository<UsageTracking>,
  ) {}

  /**
   * 기간별 통계 조회
   */
  async getStatistics(
    practitionerId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date,
  ): Promise<PracticeStatistics[]> {
    const periodType = period === 'daily'
      ? StatisticsPeriodType.DAILY
      : period === 'weekly'
        ? StatisticsPeriodType.WEEKLY
        : StatisticsPeriodType.MONTHLY;

    return this.statisticsRepository.find({
      where: {
        practitionerId,
        periodType,
        periodStart: MoreThanOrEqual(startDate),
        periodEnd: LessThanOrEqual(endDate),
      },
      order: { periodStart: 'ASC' },
    });
  }

  /**
   * 실시간 대시보드 데이터
   */
  async getDashboardData(practitionerId: string): Promise<DashboardData> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // 오늘 통계
    const todayRecords = await this.patientRecordRepository.count({
      where: {
        practitionerId,
        visitDate: today,
      },
    });

    const todayNewPatients = await this.getNewPatientsCount(practitionerId, today, now);
    const todayPrescriptions = await this.getPrescriptionsCount(practitionerId, today, now);

    // 이번 주 통계
    const weekRecords = await this.patientRecordRepository.count({
      where: {
        practitionerId,
        visitDate: Between(weekStart, now),
      },
    });

    const weekNewPatients = await this.getNewPatientsCount(practitionerId, weekStart, now);
    const weekPrescriptions = await this.getPrescriptionsCount(practitionerId, weekStart, now);
    const weekAiUsage = await this.getAiUsageCount(practitionerId, weekStart, now);

    // 이번 달 통계
    const monthRecords = await this.patientRecordRepository.count({
      where: {
        practitionerId,
        visitDate: Between(monthStart, now),
      },
    });

    const monthNewPatients = await this.getNewPatientsCount(practitionerId, monthStart, now);
    const monthReturning = monthRecords - monthNewPatients;

    // 지난 달 통계 (비교용)
    const lastMonthRecords = await this.patientRecordRepository.count({
      where: {
        practitionerId,
        visitDate: Between(lastMonthStart, lastMonthEnd),
      },
    });

    const lastMonthNewPatients = await this.getNewPatientsCount(
      practitionerId,
      lastMonthStart,
      lastMonthEnd,
    );

    // 총 환자 수
    const totalPatients = await this.getTotalPatientsCount(practitionerId);
    const lastMonthTotalPatients = totalPatients - monthNewPatients;

    // 재방문율 계산
    const returnRate = monthRecords > 0 ? Math.round((monthReturning / monthRecords) * 100) : 0;
    const lastReturnRate = lastMonthRecords > 0
      ? Math.round(((lastMonthRecords - lastMonthNewPatients) / lastMonthRecords) * 100)
      : 0;

    // 최근 7일 활동
    const recentActivity: DashboardData['recentActivity'] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const consultations = await this.patientRecordRepository.count({
        where: {
          practitionerId,
          visitDate: date,
        },
      });

      const prescriptions = await this.getPrescriptionsCount(practitionerId, date, nextDate);

      recentActivity.push({
        date: date.toISOString().split('T')[0],
        consultations,
        prescriptions,
      });
    }

    return {
      today: {
        consultations: todayRecords,
        newPatients: todayNewPatients,
        prescriptions: todayPrescriptions,
      },
      thisWeek: {
        consultations: weekRecords,
        newPatients: weekNewPatients,
        prescriptions: weekPrescriptions,
        aiUsage: weekAiUsage,
      },
      thisMonth: {
        consultations: monthRecords,
        newPatients: monthNewPatients,
        returningPatients: monthReturning,
        avgImprovementRate: 75, // 실제 데이터에서 계산 필요
        aiAcceptanceRate: 68, // 실제 데이터에서 계산 필요
      },
      kpis: {
        totalPatients: {
          value: totalPatients,
          change: lastMonthTotalPatients > 0
            ? Math.round(((totalPatients - lastMonthTotalPatients) / lastMonthTotalPatients) * 100)
            : 0,
        },
        returnRate: {
          value: returnRate,
          change: returnRate - lastReturnRate,
        },
        avgImprovement: {
          value: 75,
          change: 3,
        },
        aiUsageRate: {
          value: 68,
          change: 5,
        },
      },
      recentActivity,
    };
  }

  /**
   * 벤치마크 비교
   */
  async getBenchmark(practitionerId: string): Promise<BenchmarkData> {
    // 나의 지표 계산
    const dashboard = await this.getDashboardData(practitionerId);

    const myMetrics = {
      avgConsultationsPerDay: Math.round(dashboard.thisMonth.consultations / 30),
      returnRate: dashboard.kpis.returnRate.value,
      avgImprovementRate: dashboard.thisMonth.avgImprovementRate,
      aiAcceptanceRate: dashboard.thisMonth.aiAcceptanceRate,
    };

    // 전국 평균 (실제로는 DB에서 집계)
    const nationalAverage = {
      avgConsultationsPerDay: 8,
      returnRate: 45,
      avgImprovementRate: 72,
      aiAcceptanceRate: 55,
    };

    // 백분위 계산 (간단한 근사)
    const percentileScore = Math.round(
      (
        (myMetrics.avgConsultationsPerDay / nationalAverage.avgConsultationsPerDay) * 25 +
        (myMetrics.returnRate / nationalAverage.returnRate) * 25 +
        (myMetrics.avgImprovementRate / nationalAverage.avgImprovementRate) * 25 +
        (myMetrics.aiAcceptanceRate / nationalAverage.aiAcceptanceRate) * 25
      ) / 4 * 100
    );
    const percentile = Math.min(99, Math.max(1, percentileScore));

    // 강점 및 개선점 분석
    const strengths: string[] = [];
    const areasForImprovement: string[] = [];

    if (myMetrics.returnRate > nationalAverage.returnRate) {
      strengths.push('재방문율이 전국 평균보다 높습니다.');
    } else {
      areasForImprovement.push('재방문율 개선이 필요합니다.');
    }

    if (myMetrics.avgImprovementRate > nationalAverage.avgImprovementRate) {
      strengths.push('환자 호전율이 우수합니다.');
    } else {
      areasForImprovement.push('치료 효과 개선을 고려해 보세요.');
    }

    if (myMetrics.aiAcceptanceRate > nationalAverage.aiAcceptanceRate) {
      strengths.push('AI 추천을 적극 활용하고 있습니다.');
    } else {
      areasForImprovement.push('AI 추천 기능 활용도를 높여보세요.');
    }

    return {
      myMetrics,
      nationalAverage,
      percentile,
      strengths,
      areasForImprovement,
    };
  }

  /**
   * 처방 패턴 분석
   */
  async getPrescriptionPatterns(practitionerId: string): Promise<PatternAnalysis> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // 최근 6개월 진료 기록 조회
    const records = await this.patientRecordRepository.find({
      where: {
        practitionerId,
        visitDate: MoreThanOrEqual(sixMonthsAgo),
      },
      relations: ['prescription'],
    });

    // 처방 통계
    const formulaMap = new Map<string, { count: number; successCount: number }>();
    const symptomMap = new Map<string, { count: number; formulas: Map<string, number> }>();
    const constitutionMap = new Map<string, number>();
    const monthlyMap = new Map<string, { consultations: number; prescriptions: number; newPatients: Set<string> }>();

    records.forEach(record => {
      // 처방 통계
      if (record.prescription?.formulaName) {
        const name = record.prescription.formulaName;
        const existing = formulaMap.get(name) || { count: 0, successCount: 0 };
        existing.count++;
        // 성공 여부는 실제 데이터에서 판단 필요
        existing.successCount++;
        formulaMap.set(name, existing);
      }

      // 증상 통계
      if (record.symptomsSummary) {
        record.symptomsSummary.forEach((symptom: { name: string }) => {
          const existing = symptomMap.get(symptom.name) || { count: 0, formulas: new Map() };
          existing.count++;
          if (record.prescription?.formulaName) {
            const formulaCount = existing.formulas.get(record.prescription.formulaName) || 0;
            existing.formulas.set(record.prescription.formulaName, formulaCount + 1);
          }
          symptomMap.set(symptom.name, existing);
        });
      }

      // 체질 통계
      if (record.constitutionResult) {
        const count = constitutionMap.get(record.constitutionResult) || 0;
        constitutionMap.set(record.constitutionResult, count + 1);
      }

      // 월별 통계
      const month = new Date(record.visitDate).toISOString().slice(0, 7);
      const monthData = monthlyMap.get(month) || { consultations: 0, prescriptions: 0, newPatients: new Set<string>() };
      monthData.consultations++;
      if (record.prescription) monthData.prescriptions++;
      monthData.newPatients.add(record.patientId);
      monthlyMap.set(month, monthData);
    });

    const totalRecords = records.length;

    // TOP 10 처방
    const topFormulas = Array.from(formulaMap.entries())
      .map(([name, stats], index) => ({
        rank: 0,
        name,
        count: stats.count,
        percentage: Math.round((stats.count / totalRecords) * 100),
        avgSuccessRate: Math.round((stats.successCount / stats.count) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // TOP 10 증상
    const topSymptoms = Array.from(symptomMap.entries())
      .map(([name, stats]) => {
        let topFormula = '-';
        let maxCount = 0;
        stats.formulas.forEach((count, formula) => {
          if (count > maxCount) {
            maxCount = count;
            topFormula = formula;
          }
        });
        return {
          rank: 0,
          name,
          count: stats.count,
          percentage: Math.round((stats.count / totalRecords) * 100),
          topFormula,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    // 체질별 분포
    const constitutionDistribution = Array.from(constitutionMap.entries())
      .map(([constitution, count]) => ({
        constitution,
        count,
        percentage: Math.round((count / totalRecords) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // 월별 추이
    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        consultations: data.consultations,
        prescriptions: data.prescriptions,
        newPatients: data.newPatients.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      topFormulas,
      topSymptoms,
      constitutionDistribution,
      monthlyTrend,
    };
  }

  /**
   * 일일 통계 계산 (스케줄러)
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async calculateDailyStatistics(): Promise<void> {
    console.log('Running daily statistics calculation...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    // 모든 한의사 조회
    const practitioners = await this.userRepository.find({
      where: { role: 'user' as any },
      select: ['id'],
    });

    for (const practitioner of practitioners) {
      await this.calculateAndSaveStatistics(
        practitioner.id,
        StatisticsPeriodType.DAILY,
        yesterday,
        today,
      );
    }

    console.log('Daily statistics calculation completed.');
  }

  /**
   * 세금 신고용 리포트 생성
   */
  async generateTaxReportData(
    practitionerId: string,
    year: number,
  ): Promise<{
    year: number;
    practitionerId: string;
    summary: {
      totalConsultations: number;
      totalPrescriptions: number;
      totalPatients: number;
      newPatients: number;
    };
    monthly: Array<{
      month: number;
      consultations: number;
      prescriptions: number;
      newPatients: number;
    }>;
  }> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // 연간 통계 조회
    const records = await this.patientRecordRepository.find({
      where: {
        practitionerId,
        visitDate: Between(startDate, endDate),
      },
    });

    const prescriptions = await this.prescriptionRepository.count({
      where: {
        practitionerId,
        createdAt: Between(startDate, endDate),
      },
    });

    const patientIds = new Set(records.map(r => r.patientId));
    const totalPatients = patientIds.size;

    // 신규 환자 계산 (해당 연도에 첫 방문)
    let newPatients = 0;
    for (const patientId of patientIds) {
      const firstVisit = await this.patientRecordRepository.findOne({
        where: { practitionerId, patientId },
        order: { visitDate: 'ASC' },
      });
      if (firstVisit && new Date(firstVisit.visitDate) >= startDate) {
        newPatients++;
      }
    }

    // 월별 통계
    const monthly: Array<{ month: number; consultations: number; prescriptions: number; newPatients: number }> = [];

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

      const monthRecords = records.filter(r => {
        const visitDate = new Date(r.visitDate);
        return visitDate >= monthStart && visitDate <= monthEnd;
      });

      const monthPrescriptions = await this.prescriptionRepository.count({
        where: {
          practitionerId,
          createdAt: Between(monthStart, monthEnd),
        },
      });

      const monthPatientIds = new Set(monthRecords.map(r => r.patientId));
      let monthNewPatients = 0;
      for (const patientId of monthPatientIds) {
        const firstVisit = await this.patientRecordRepository.findOne({
          where: { practitionerId, patientId },
          order: { visitDate: 'ASC' },
        });
        if (firstVisit && new Date(firstVisit.visitDate) >= monthStart && new Date(firstVisit.visitDate) <= monthEnd) {
          monthNewPatients++;
        }
      }

      monthly.push({
        month: month + 1,
        consultations: monthRecords.length,
        prescriptions: monthPrescriptions,
        newPatients: monthNewPatients,
      });
    }

    return {
      year,
      practitionerId,
      summary: {
        totalConsultations: records.length,
        totalPrescriptions: prescriptions,
        totalPatients,
        newPatients,
      },
      monthly,
    };
  }

  // Private helper methods

  private async getNewPatientsCount(
    practitionerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // 해당 기간에 첫 방문한 환자 수
    const records = await this.patientRecordRepository.find({
      where: {
        practitionerId,
        visitDate: Between(startDate, endDate),
      },
      select: ['patientId'],
    });

    const patientIds = [...new Set(records.map(r => r.patientId))];
    let newPatients = 0;

    for (const patientId of patientIds) {
      const firstVisit = await this.patientRecordRepository.findOne({
        where: { practitionerId, patientId },
        order: { visitDate: 'ASC' },
      });

      if (firstVisit && new Date(firstVisit.visitDate) >= startDate) {
        newPatients++;
      }
    }

    return newPatients;
  }

  private async getPrescriptionsCount(
    practitionerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.prescriptionRepository.count({
      where: {
        practitionerId,
        createdAt: Between(startDate, endDate),
      },
    });
  }

  private async getTotalPatientsCount(practitionerId: string): Promise<number> {
    const result = await this.patientRecordRepository
      .createQueryBuilder('record')
      .select('COUNT(DISTINCT record.patientId)', 'count')
      .where('record.practitionerId = :practitionerId', { practitionerId })
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  private async getAiUsageCount(
    practitionerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.usageTrackingRepository.count({
      where: {
        userId: practitionerId,
        createdAt: Between(startDate, endDate),
      },
    });
  }

  private async calculateAndSaveStatistics(
    practitionerId: string,
    periodType: StatisticsPeriodType,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    // 기존 통계 확인
    const existing = await this.statisticsRepository.findOne({
      where: {
        practitionerId,
        periodType,
        periodStart,
      },
    });

    if (existing) {
      return; // 이미 존재하면 스킵
    }

    // 통계 계산
    const records = await this.patientRecordRepository.find({
      where: {
        practitionerId,
        visitDate: Between(periodStart, periodEnd),
      },
      relations: ['prescription'],
    });

    const patientIds = [...new Set(records.map(r => r.patientId))];
    const newPatients = await this.getNewPatientsCount(practitionerId, periodStart, periodEnd);
    const returningPatients = patientIds.length - newPatients;

    // 처방 통계
    const formulaMap = new Map<string, number>();
    const symptomMap = new Map<string, number>();

    records.forEach(record => {
      if (record.prescription?.formulaName) {
        const count = formulaMap.get(record.prescription.formulaName) || 0;
        formulaMap.set(record.prescription.formulaName, count + 1);
      }
      if (record.symptomsSummary) {
        record.symptomsSummary.forEach((s: { name: string }) => {
          const count = symptomMap.get(s.name) || 0;
          symptomMap.set(s.name, count + 1);
        });
      }
    });

    const topFormulas = Array.from(formulaMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topSymptoms = Array.from(symptomMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const metrics: PracticeMetrics = {
      totalPatients: patientIds.length,
      newPatients,
      returningPatients,
      returnRate: patientIds.length > 0 ? Math.round((returningPatients / patientIds.length) * 100) : 0,
      totalConsultations: records.length,
      avgConsultationTime: 15,
      totalPrescriptions: records.filter(r => r.prescription).length,
      topFormulas,
      topSymptoms,
      avgImprovementRate: 75,
      patientSatisfaction: 4.2,
      aiRecommendationsUsed: 0,
      aiAcceptanceRate: 0,
    };

    const statistics = this.statisticsRepository.create({
      practitionerId,
      periodType,
      periodStart,
      periodEnd,
      metrics,
      benchmark: null,
    });

    await this.statisticsRepository.save(statistics);
  }
}
