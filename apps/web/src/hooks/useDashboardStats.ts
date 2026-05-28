import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

/**
 * 대시보드 상단 3개 카드용 통계.
 *
 * 백엔드 /analytics/dashboard 를 호출해 실제 진료 데이터를 매핑한다.
 * 인증 실패(게스트) 등으로 호출이 실패하면 데모 데이터로 폴백하고
 * _isDemo 플래그로 배너 표시 여부를 판단한다.
 * 인증된 사용자가 데이터가 없는 경우(신규 가입)에는 0 을 그대로 표시한다(_isDemo=false).
 */

export interface DashboardStats {
  todaySavedMinutes: number | null
  monthlyConsultations: number | null
  aiRecommendationsUsed: number | null
  _isDemo: boolean
}

interface DashboardData {
  today?: { consultations?: number }
  thisWeek?: { aiUsage?: number }
  thisMonth?: { consultations?: number }
}

const DEMO_STATS: DashboardStats = {
  todaySavedMinutes: null,
  monthlyConsultations: 0,
  aiRecommendationsUsed: 0,
  _isDemo: true,
}

// 진료 1건당 평균 절약 시간(분) 가정 — 실제 시간 추적 endpoint 도입 시 교체.
const MINUTES_SAVED_PER_CONSULTATION = 7

async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const { data } = await api.get<{ success?: boolean; data?: DashboardData }>(
      '/analytics/dashboard',
    )
    const root = data?.data ?? (data as unknown as DashboardData)

    const todayConsultations = root?.today?.consultations ?? 0

    return {
      todaySavedMinutes: todayConsultations * MINUTES_SAVED_PER_CONSULTATION,
      monthlyConsultations: root?.thisMonth?.consultations ?? 0,
      aiRecommendationsUsed: root?.thisWeek?.aiUsage ?? 0,
      _isDemo: false,
    }
  } catch (e) {
    // 401(게스트), 500 등 — 데모로 폴백
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
