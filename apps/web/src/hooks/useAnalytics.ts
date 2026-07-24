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
  // 백엔드 /analytics/dashboard 원본에서 그대로 전달 — 추이/오늘 위젯 파생용
  today?: { consultations: number; newPatients: number; prescriptions: number };
  recentActivity?: Array<{ date: string; consultations: number; prescriptions: number }>;
}

// 백엔드 /analytics/dashboard 응답의 실제 형태
interface RawDashboard {
  today?: { consultations?: number; newPatients?: number; prescriptions?: number };
  thisWeek?: { aiUsage?: number };
  thisMonth?: {
    consultations?: number;
    newPatients?: number;
    avgImprovementRate?: number;
    aiAcceptanceRate?: number;
  };
  kpis?: {
    totalPatients?: { value?: number; change?: number };
    returnRate?: { value?: number; change?: number };
  };
  recentActivity?: Array<{ date: string; consultations: number; prescriptions: number }>;
}

/** 백엔드 dashboard 응답을 화면이 기대하는 DashboardMetrics 형태로 매핑 */
function mapDashboard(raw: RawDashboard): DashboardMetrics {
  const totalConsultations = raw.thisMonth?.consultations ?? 0;
  const returnChange = raw.kpis?.returnRate?.change ?? 0;
  const aiUsage = raw.thisWeek?.aiUsage ?? 0;
  const acceptanceRate = raw.thisMonth?.aiAcceptanceRate ?? 0;

  return {
    overview: {
      totalPatients: raw.kpis?.totalPatients?.value ?? 0,
      totalPatientsChange: raw.kpis?.totalPatients?.change ?? 0,
      newPatientsThisMonth: raw.thisMonth?.newPatients ?? 0,
      newPatientsChange: 0,
      totalConsultations,
      totalConsultationsChange: 0,
      avgConsultationsPerDay: Math.round(totalConsultations / 30),
    },
    returnRate: {
      current: raw.kpis?.returnRate?.value ?? 0,
      previous: (raw.kpis?.returnRate?.value ?? 0) - returnChange,
      trend: returnChange > 0 ? 'up' : returnChange < 0 ? 'down' : 'stable',
    },
    aiUsage: {
      totalRecommendations: aiUsage,
      acceptedRecommendations: Math.round((aiUsage * acceptanceRate) / 100),
      acceptanceRate,
      topRecommendedFormulas: [],
    },
    today: {
      consultations: raw.today?.consultations ?? 0,
      newPatients: raw.today?.newPatients ?? 0,
      prescriptions: raw.today?.prescriptions ?? 0,
    },
    recentActivity: raw.recentActivity ?? [],
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

// 백엔드 practice-analytics.service.ts 의 BenchmarkData 와 1:1 로 맞춘다.
// (과거엔 nationalAvg / percentile:object 로 잘못 선언돼 있어 화면이 크래시했다)
export interface BenchmarkMetrics {
  avgConsultationsPerDay: number;
  returnRate: number;
  avgImprovementRate: number;
  aiAcceptanceRate: number;
}

export interface BenchmarkData {
  myMetrics: BenchmarkMetrics;
  nationalAverage: BenchmarkMetrics;
  /** 전국 대비 백분위 — 단일 스칼라 값 */
  percentile: number;
  strengths: string[];
  areasForImprovement: string[];
}

// 백엔드 practice-analytics.service.ts 의 PatternAnalysis 와 1:1.
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
      return { ...mapDashboard((data?.data ?? data) as RawDashboard), _isDemo: false };
    },
    retry: 0, // 실패 시 즉시 에러 폴백 표시 (재시도는 화면의 '다시 시도' 버튼으로)
    staleTime: 60_000,
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
    enabled: false,
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
    refetchInterval: 60000,
  });
}
