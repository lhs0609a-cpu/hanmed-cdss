import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

/**
 * 대시보드 상단 3개 카드용 통계.
 *
 * 백엔드 /analytics/dashboard-metrics 또는 /analytics/dashboard-stats 를 호출하고,
 * 실패 시 데모 데이터로 폴백한다. _isDemo 플래그로 배너 표시 여부 판단.
 */

export interface DashboardStats {
  todaySavedMinutes: number | null
  monthlyConsultations: number | null
  aiRecommendationsUsed: number | null
  _isDemo: boolean
}

interface RawMetricsResponse {
  overview?: {
    totalConsultations?: number
    avgConsultationsPerDay?: number
  }
  aiUsage?: {
    totalRecommendations?: number
  }
  // 일부 백엔드 응답은 { data: { ... } } 로 한 단계 래핑됨
  data?: RawMetricsResponse
}

const DEMO_STATS: DashboardStats = {
  todaySavedMinutes: null,
  monthlyConsultations: 0,
  aiRecommendationsUsed: 0,
  _isDemo: true,
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  // 우선 통합 endpoint 시도. 없으면 분석 dashboard-metrics 로 폴백.
  try {
    const { data } = await api.get<RawMetricsResponse | { data: RawMetricsResponse }>(
      '/analytics/dashboard-metrics',
    )
    const root = (data as { data?: RawMetricsResponse }).data ?? (data as RawMetricsResponse)

    const monthly = root.overview?.totalConsultations
    const ai = root.aiUsage?.totalRecommendations

    // 모든 값이 비어 있으면 데모로 간주
    if (monthly === undefined && ai === undefined) {
      return DEMO_STATS
    }

    // todaySavedMinutes 는 임시로 진료 1건당 7분 절약 가정 — 실제 추적 endpoint
    // (`/analytics/time-saved`) 가 생기면 그쪽으로 교체.
    const todaySaved =
      typeof root.overview?.avgConsultationsPerDay === 'number'
        ? Math.round(root.overview.avgConsultationsPerDay * 7)
        : null

    return {
      todaySavedMinutes: todaySaved,
      monthlyConsultations: monthly ?? 0,
      aiRecommendationsUsed: ai ?? 0,
      _isDemo: false,
    }
  } catch (e) {
    // 401, 404, 500 등 — 데모로 폴백
    return DEMO_STATS
  }
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 60_000,
    retry: 1,
  })
}
