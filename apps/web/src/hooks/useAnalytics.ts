import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

// Types
export interface DashboardMetrics {
  overview: {
    totalPatients: number;
    totalPatientsChange: number;
    newPatientsThisMonth: number;
    newPatientsChange: number;
    totalConsultations: number;
    totalConsultationsChange: number;
    avgConsultationsPerDay: number;
    revenueThisMonth?: number;
    revenueChange?: number;
  };
  returnRate: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
  };
  aiUsage: {
    totalRecommendations: number;
    acceptedRecommendations: number;
    acceptanceRate: number;
    topRecommendedFormulas: Array<{ name: string; count: number }>;
  };
  patientSatisfaction?: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  };
}

export interface PracticeStatistics {
  periodStart: string;
  periodEnd: string;
  periodType: 'daily' | 'weekly' | 'monthly';
  metrics: {
    totalPatients: number;
    newPatients: number;
    returningPatients: number;
    returnRate: number;
    totalConsultations: number;
    avgConsultationTime: number;
    totalPrescriptions: number;
    topFormulas: Array<{ name: string; count: number }>;
    topSymptoms: Array<{ name: string; count: number }>;
    avgImprovementRate: number;
    patientSatisfaction: number;
    aiRecommendationsUsed: number;
    aiAcceptanceRate: number;
  };
}

export interface BenchmarkData {
  myMetrics: {
    returnRate: number;
    avgImprovementRate: number;
    aiAcceptanceRate: number;
    patientsPerMonth: number;
    consultationsPerDay: number;
  };
  nationalAvg: {
    returnRate: number;
    avgImprovementRate: number;
    aiAcceptanceRate: number;
    patientsPerMonth: number;
    consultationsPerDay: number;
  };
  percentile: {
    returnRate: number;
    avgImprovementRate: number;
    aiAcceptanceRate: number;
    patientsPerMonth: number;
    consultationsPerDay: number;
  };
}

export interface PatternAnalysis {
  prescriptionPatterns: {
    mostUsedFormulas: Array<{ formulaId: string; name: string; count: number; avgDosage: string }>;
    commonModifications: Array<{ original: string; modified: string; frequency: number }>;
    symptomFormulaCorrelation: Array<{ symptom: string; formulas: string[]; effectiveness: number }>;
  };
  consultationPatterns: {
    busyDays: Array<{ dayOfWeek: number; avgPatients: number }>;
    busyHours: Array<{ hour: number; avgPatients: number }>;
    avgDuration: number;
    peakSeasons: Array<{ month: number; patientCount: number }>;
  };
  patientDemographics: {
    ageDistribution: Array<{ range: string; count: number; percentage: number }>;
    genderDistribution: { male: number; female: number };
    constitutionDistribution: Array<{ constitution: string; count: number }>;
    topConditions: Array<{ condition: string; count: number }>;
  };
}

export interface TrendData {
  consultations: Array<{ date: string; count: number }>;
  patients: Array<{ date: string; new: number; returning: number }>;
  revenue?: Array<{ date: string; amount: number }>;
  improvement: Array<{ date: string; rate: number }>;
}

// 대시보드 메트릭스
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/dashboard');
      return data.data as DashboardMetrics;
    },
  });
}

// 기간별 통계
export function useStatistics(
  period: 'daily' | 'weekly' | 'monthly',
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['analytics-statistics', period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('period', period);
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const { data } = await api.get(`/analytics/statistics?${params.toString()}`);
      return data.data as PracticeStatistics[];
    },
    enabled: !!startDate && !!endDate,
  });
}

// 벤치마크 비교
export function useBenchmark() {
  return useQuery({
    queryKey: ['analytics-benchmark'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/benchmark');
      return data.data as BenchmarkData;
    },
  });
}

// 처방 패턴 분석
export function usePrescriptionPatterns() {
  return useQuery({
    queryKey: ['analytics-patterns'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/patterns');
      return data.data as PatternAnalysis;
    },
  });
}

// 트렌드 데이터
export function useTrends(startDate: string, endDate: string, granularity: 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: ['analytics-trends', startDate, endDate, granularity],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('granularity', granularity);

      const { data } = await api.get(`/analytics/trends?${params.toString()}`);
      return data.data as TrendData;
    },
    enabled: !!startDate && !!endDate,
  });
}

// 상위 항목들
export function useTopItems(category: 'formulas' | 'symptoms' | 'herbs', limit: number = 10) {
  return useQuery({
    queryKey: ['analytics-top', category, limit],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/top/${category}?limit=${limit}`);
      return data.data as Array<{ name: string; count: number; percentage: number }>;
    },
  });
}

// 환자 통계
export function usePatientAnalytics() {
  return useQuery({
    queryKey: ['analytics-patients'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/patients');
      return data.data as {
        totalActive: number;
        newThisMonth: number;
        churned: number;
        churnRate: number;
        avgVisitsPerPatient: number;
        avgTreatmentDuration: number;
        retentionCohorts: Array<{
          cohortMonth: string;
          totalPatients: number;
          retained: { [month: string]: number };
        }>;
      };
    },
  });
}

// AI 사용 분석
export function useAIAnalytics() {
  return useQuery({
    queryKey: ['analytics-ai'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/ai-usage');
      return data.data as {
        totalRecommendations: number;
        acceptedRecommendations: number;
        acceptanceRate: number;
        byType: Array<{ type: string; total: number; accepted: number }>;
        trend: Array<{ date: string; total: number; accepted: number }>;
        topAcceptedFormulas: Array<{ name: string; acceptCount: number }>;
        feedback: {
          helpful: number;
          notHelpful: number;
          noFeedback: number;
        };
      };
    },
  });
}

// 세금 리포트 다운로드
export function useTaxReport(year: number) {
  return useQuery({
    queryKey: ['tax-report', year],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/export/tax-report?year=${year}`, {
        responseType: 'blob',
      });
      return data;
    },
    enabled: false, // 수동으로 트리거
  });
}

// 월간 리포트
export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: ['monthly-report', year, month],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/reports/monthly?year=${year}&month=${month}`);
      return data.data as {
        summary: PracticeStatistics;
        highlights: string[];
        recommendations: string[];
        comparisonWithPrevious: {
          metric: string;
          current: number;
          previous: number;
          change: number;
        }[];
      };
    },
    enabled: !!year && !!month,
  });
}

// 실시간 활동 (오늘)
export function useTodayActivity() {
  return useQuery({
    queryKey: ['analytics-today'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/today');
      return data.data as {
        consultationsToday: number;
        patientsToday: number;
        prescriptionsToday: number;
        hourlyBreakdown: Array<{ hour: number; consultations: number }>;
        recentPatients: Array<{ id: string; name: string; time: string; status: string }>;
      };
    },
    refetchInterval: 60000, // 1분마다 갱신
  });
}
