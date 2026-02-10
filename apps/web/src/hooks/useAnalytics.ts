import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

// Mock Data for Demo Mode
const MOCK_DASHBOARD_METRICS: DashboardMetrics = {
  overview: {
    totalPatients: 342,
    totalPatientsChange: 8.5,
    newPatientsThisMonth: 28,
    newPatientsChange: 12.3,
    totalConsultations: 856,
    totalConsultationsChange: 5.2,
    avgConsultationsPerDay: 12.4,
    revenueThisMonth: 15680000,
    revenueChange: 7.8,
  },
  returnRate: { current: 68.5, previous: 65.2, trend: 'up' },
  aiUsage: {
    totalRecommendations: 234,
    acceptedRecommendations: 189,
    acceptanceRate: 80.8,
    topRecommendedFormulas: [
      { name: '보중익기탕', count: 45 },
      { name: '소시호탕', count: 38 },
      { name: '귀비탕', count: 32 },
      { name: '반하사심탕', count: 28 },
      { name: '사물탕', count: 25 },
    ],
  },
  patientSatisfaction: { averageRating: 4.6, totalReviews: 87, ratingDistribution: { 5: 52, 4: 28, 3: 5, 2: 1, 1: 1 } },
};

const MOCK_TRENDS: TrendData = {
  consultations: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    count: Math.floor(Math.random() * 8) + 8,
  })),
  patients: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    new: Math.floor(Math.random() * 3) + 1,
    returning: Math.floor(Math.random() * 6) + 5,
  })),
  improvement: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    rate: 65 + Math.random() * 15,
  })),
};

const MOCK_BENCHMARK: BenchmarkData = {
  myMetrics: { returnRate: 68.5, avgImprovementRate: 72.3, aiAcceptanceRate: 80.8, patientsPerMonth: 85, consultationsPerDay: 12.4 },
  nationalAvg: { returnRate: 58.2, avgImprovementRate: 65.5, aiAcceptanceRate: 62.0, patientsPerMonth: 65, consultationsPerDay: 8.5 },
  percentile: { returnRate: 78, avgImprovementRate: 82, aiAcceptanceRate: 91, patientsPerMonth: 75, consultationsPerDay: 85 },
};

const MOCK_PATTERNS: PatternAnalysis = {
  prescriptionPatterns: {
    mostUsedFormulas: [
      { formulaId: 'f1', name: '보중익기탕', count: 45, avgDosage: '6g' },
      { formulaId: 'f2', name: '소시호탕', count: 38, avgDosage: '6g' },
      { formulaId: 'f3', name: '귀비탕', count: 32, avgDosage: '6g' },
    ],
    commonModifications: [
      { original: '보중익기탕', modified: '보중익기탕 가 진피', frequency: 12 },
    ],
    symptomFormulaCorrelation: [
      { symptom: '피로', formulas: ['보중익기탕', '십전대보탕'], effectiveness: 78 },
    ],
  },
  consultationPatterns: {
    busyDays: [
      { dayOfWeek: 1, avgPatients: 14 },
      { dayOfWeek: 2, avgPatients: 12 },
      { dayOfWeek: 3, avgPatients: 15 },
      { dayOfWeek: 4, avgPatients: 11 },
      { dayOfWeek: 5, avgPatients: 13 },
    ],
    busyHours: [
      { hour: 10, avgPatients: 3.2 },
      { hour: 11, avgPatients: 4.1 },
      { hour: 14, avgPatients: 3.8 },
      { hour: 15, avgPatients: 3.5 },
    ],
    avgDuration: 18,
    peakSeasons: [{ month: 3, patientCount: 95 }, { month: 9, patientCount: 102 }],
  },
  patientDemographics: {
    ageDistribution: [
      { range: '20-29', count: 35, percentage: 10.2 },
      { range: '30-39', count: 68, percentage: 19.9 },
      { range: '40-49', count: 89, percentage: 26.0 },
      { range: '50-59', count: 95, percentage: 27.8 },
      { range: '60+', count: 55, percentage: 16.1 },
    ],
    genderDistribution: { male: 145, female: 197 },
    constitutionDistribution: [
      { constitution: '소양인', count: 112 },
      { constitution: '태음인', count: 98 },
      { constitution: '소음인', count: 85 },
      { constitution: '태양인', count: 47 },
    ],
    topConditions: [
      { condition: '소화불량', count: 67 },
      { condition: '요통', count: 54 },
      { condition: '피로', count: 48 },
    ],
  },
};

const MOCK_TOP_FORMULAS = [
  { name: '보중익기탕', count: 45, percentage: 19.2 },
  { name: '소시호탕', count: 38, percentage: 16.2 },
  { name: '귀비탕', count: 32, percentage: 13.7 },
  { name: '반하사심탕', count: 28, percentage: 12.0 },
  { name: '사물탕', count: 25, percentage: 10.7 },
];

const MOCK_TODAY_ACTIVITY = {
  consultationsToday: 8,
  patientsToday: 7,
  prescriptionsToday: 6,
  hourlyBreakdown: [
    { hour: 9, consultations: 1 },
    { hour: 10, consultations: 2 },
    { hour: 11, consultations: 2 },
    { hour: 14, consultations: 2 },
    { hour: 15, consultations: 1 },
  ],
  recentPatients: [
    { id: 'p1', name: '김*민', time: '15:30', status: '진료완료' },
    { id: 'p2', name: '이*영', time: '14:45', status: '진료완료' },
    { id: 'p3', name: '박*수', time: '14:00', status: '진료완료' },
  ],
};

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
    queryFn: async (): Promise<DashboardMetrics> => {
      try {
        const { data } = await api.get('/analytics/dashboard');
        // interceptor가 이미 response.data.data를 unwrap하므로 data가 최종 값
        if (data && data.overview) {
          return data as DashboardMetrics;
        }
        return MOCK_DASHBOARD_METRICS;
      } catch {
        return MOCK_DASHBOARD_METRICS;
      }
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
      try {
        const params = new URLSearchParams();
        params.append('period', period);
        params.append('startDate', startDate);
        params.append('endDate', endDate);

        const { data } = await api.get(`/analytics/statistics?${params.toString()}`);
        if (Array.isArray(data)) {
          return data as PracticeStatistics[];
        }
        return data ? [data] as PracticeStatistics[] : [];
      } catch {
        // 데모 데이터 반환
        return [{
          periodStart: startDate,
          periodEnd: endDate,
          periodType: period,
          metrics: {
            totalPatients: 85,
            newPatients: 28,
            returningPatients: 57,
            returnRate: 67.1,
            totalConsultations: 234,
            avgConsultationTime: 18,
            totalPrescriptions: 198,
            topFormulas: MOCK_TOP_FORMULAS.slice(0, 5),
            topSymptoms: [{ name: '소화불량', count: 67 }, { name: '요통', count: 54 }, { name: '피로', count: 48 }],
            avgImprovementRate: 72.3,
            patientSatisfaction: 4.6,
            aiRecommendationsUsed: 189,
            aiAcceptanceRate: 80.8,
          },
        }];
      }
    },
    enabled: !!startDate && !!endDate,
  });
}

// 벤치마크 비교
export function useBenchmark() {
  return useQuery({
    queryKey: ['analytics-benchmark'],
    queryFn: async (): Promise<BenchmarkData> => {
      try {
        const { data } = await api.get('/analytics/benchmark');
        if (data && data.myMetrics) {
          return data as BenchmarkData;
        }
        return MOCK_BENCHMARK;
      } catch {
        return MOCK_BENCHMARK;
      }
    },
  });
}

// 처방 패턴 분석
export function usePrescriptionPatterns() {
  return useQuery({
    queryKey: ['analytics-patterns'],
    queryFn: async (): Promise<PatternAnalysis> => {
      try {
        const { data } = await api.get('/analytics/patterns');
        if (data && data.prescriptionPatterns) {
          return data as PatternAnalysis;
        }
        return MOCK_PATTERNS;
      } catch {
        return MOCK_PATTERNS;
      }
    },
  });
}

// 트렌드 데이터
export function useTrends(startDate: string, endDate: string, granularity: 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: ['analytics-trends', startDate, endDate, granularity],
    queryFn: async (): Promise<TrendData> => {
      try {
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        params.append('granularity', granularity);

        const { data } = await api.get(`/analytics/trends?${params.toString()}`);
        if (data && data.consultations) {
          return data as TrendData;
        }
        return MOCK_TRENDS;
      } catch {
        return MOCK_TRENDS;
      }
    },
    enabled: !!startDate && !!endDate,
  });
}

// 상위 항목들
export function useTopItems(category: 'formulas' | 'symptoms' | 'herbs', limit: number = 10) {
  return useQuery({
    queryKey: ['analytics-top', category, limit],
    queryFn: async (): Promise<Array<{ name: string; count: number; percentage: number }>> => {
      try {
        const { data } = await api.get(`/analytics/top/${category}?limit=${limit}`);
        if (Array.isArray(data)) {
          return data as Array<{ name: string; count: number; percentage: number }>;
        }
        return MOCK_TOP_FORMULAS.slice(0, limit);
      } catch {
        return MOCK_TOP_FORMULAS.slice(0, limit);
      }
    },
  });
}

// 환자 통계
export function usePatientAnalytics() {
  return useQuery({
    queryKey: ['analytics-patients'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/analytics/patients');
        if (data && data.totalActive !== undefined) {
          return data as {
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
        }
        // API 응답이 예상과 다른 경우 데모 데이터
        return {
          totalActive: 342,
          newThisMonth: 28,
          churned: 12,
          churnRate: 3.5,
          avgVisitsPerPatient: 4.2,
          avgTreatmentDuration: 45,
          retentionCohorts: [
            { cohortMonth: '2024-01', totalPatients: 45, retained: { '2024-02': 38, '2024-03': 32 } },
            { cohortMonth: '2024-02', totalPatients: 52, retained: { '2024-03': 44 } },
            { cohortMonth: '2024-03', totalPatients: 48, retained: {} },
          ],
        };
      } catch {
        return {
          totalActive: 342,
          newThisMonth: 28,
          churned: 12,
          churnRate: 3.5,
          avgVisitsPerPatient: 4.2,
          avgTreatmentDuration: 45,
          retentionCohorts: [
            { cohortMonth: '2024-01', totalPatients: 45, retained: { '2024-02': 38, '2024-03': 32 } },
            { cohortMonth: '2024-02', totalPatients: 52, retained: { '2024-03': 44 } },
            { cohortMonth: '2024-03', totalPatients: 48, retained: {} },
          ],
        };
      }
    },
  });
}

// AI 사용 분석
export function useAIAnalytics() {
  return useQuery({
    queryKey: ['analytics-ai'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/analytics/ai-usage');
        if (data && data.totalRecommendations !== undefined) {
          return data as {
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
        }
        // API 응답이 예상과 다른 경우 데모 데이터
        return {
          totalRecommendations: 234,
          acceptedRecommendations: 189,
          acceptanceRate: 80.8,
          byType: [
            { type: '처방 추천', total: 156, accepted: 128 },
            { type: '변증 분석', total: 45, accepted: 38 },
            { type: '약물 상호작용', total: 33, accepted: 23 },
          ],
          trend: Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
            total: Math.floor(Math.random() * 10) + 10,
            accepted: Math.floor(Math.random() * 8) + 7,
          })),
          topAcceptedFormulas: [
            { name: '보중익기탕', acceptCount: 45 },
            { name: '소시호탕', acceptCount: 38 },
            { name: '귀비탕', acceptCount: 32 },
            { name: '반하사심탕', acceptCount: 28 },
            { name: '사물탕', acceptCount: 25 },
          ],
          feedback: {
            helpful: 156,
            notHelpful: 12,
            noFeedback: 66,
          },
        };
      } catch {
        return {
          totalRecommendations: 234,
          acceptedRecommendations: 189,
          acceptanceRate: 80.8,
          byType: [
            { type: '처방 추천', total: 156, accepted: 128 },
            { type: '변증 분석', total: 45, accepted: 38 },
            { type: '약물 상호작용', total: 33, accepted: 23 },
          ],
          trend: Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
            total: Math.floor(Math.random() * 10) + 10,
            accepted: Math.floor(Math.random() * 8) + 7,
          })),
          topAcceptedFormulas: [
            { name: '보중익기탕', acceptCount: 45 },
            { name: '소시호탕', acceptCount: 38 },
            { name: '귀비탕', acceptCount: 32 },
            { name: '반하사심탕', acceptCount: 28 },
            { name: '사물탕', acceptCount: 25 },
          ],
          feedback: {
            helpful: 156,
            notHelpful: 12,
            noFeedback: 66,
          },
        };
      }
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
      try {
        const { data } = await api.get(`/analytics/reports/monthly?year=${year}&month=${month}`);
        if (data && data.summary) {
          return data as {
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
        }
        // API 응답이 예상과 다른 경우 데모 데이터
        return {
          summary: {
            periodStart: `${year}-${String(month).padStart(2, '0')}-01`,
            periodEnd: `${year}-${String(month).padStart(2, '0')}-28`,
            periodType: 'monthly' as const,
            metrics: {
              totalPatients: 85,
              newPatients: 28,
              returningPatients: 57,
              returnRate: 67.1,
              totalConsultations: 234,
              avgConsultationTime: 18,
              totalPrescriptions: 198,
              topFormulas: MOCK_TOP_FORMULAS.slice(0, 5),
              topSymptoms: [{ name: '소화불량', count: 67 }],
              avgImprovementRate: 72.3,
              patientSatisfaction: 4.6,
              aiRecommendationsUsed: 189,
              aiAcceptanceRate: 80.8,
            },
          },
          highlights: [
            '재방문율이 전월 대비 5.1% 상승했습니다.',
            'AI 추천 채택율이 80%를 돌파했습니다.',
            '신규 환자 유입이 12% 증가했습니다.',
          ],
          recommendations: [
            '소화기 질환 환자가 증가하고 있습니다. 관련 처방 준비를 권장합니다.',
            '오후 2-4시 진료 집중 시간대입니다. 예약 관리를 고려하세요.',
            '장기 미방문 환자 89명에 대한 리텐션 캠페인을 추천합니다.',
          ],
          comparisonWithPrevious: [
            { metric: '총 환자', current: 85, previous: 78, change: 8.9 },
            { metric: '재방문율', current: 67.1, previous: 63.8, change: 5.2 },
            { metric: 'AI 채택율', current: 80.8, previous: 75.2, change: 7.4 },
            { metric: '평균 만족도', current: 4.6, previous: 4.5, change: 2.2 },
          ],
        };
      } catch {
        return undefined;
      }
    },
    enabled: !!year && !!month,
  });
}

// 실시간 활동 (오늘)
export function useTodayActivity() {
  return useQuery({
    queryKey: ['analytics-today'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/analytics/today');
        if (data && data.consultationsToday !== undefined) {
          return data as {
            consultationsToday: number;
            patientsToday: number;
            prescriptionsToday: number;
            hourlyBreakdown: Array<{ hour: number; consultations: number }>;
            recentPatients: Array<{ id: string; name: string; time: string; status: string }>;
          };
        }
        return MOCK_TODAY_ACTIVITY;
      } catch {
        return MOCK_TODAY_ACTIVITY;
      }
    },
    refetchInterval: 60000, // 1분마다 갱신
  });
}
