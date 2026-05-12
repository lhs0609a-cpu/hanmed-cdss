import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { useAppStats } from '@/hooks/useAppStats'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import TourGuide, { TourRestartButton } from '@/components/common/TourGuide'
import { ExportDialog } from '@/components/common'
import { ValueMetricsDashboard, KillerFeatureHighlight, DashboardCharts } from '@/components/dashboard'
import {
  Stethoscope,
  BookOpen,
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Search,
  Info,
} from 'lucide-react'

const dashboardTourSteps = [
  {
    target: '[data-tour="welcome-header"]',
    title: '환영합니다!',
    content: '온고지신 AI 대시보드입니다. 여기서 오늘의 진료 현황과 AI 활용 통계를 한눈에 볼 수 있어요.',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="start-consultation"]',
    title: '새 진료 시작',
    content: '이 버튼을 클릭하면 AI 진료 상담 페이지로 이동합니다. 환자 증상을 입력하면 AI가 최적의 처방을 추천해드려요.',
    placement: 'bottom' as const,
    tip: '가장 자주 사용하게 될 버튼이에요!',
  },
  {
    target: '[data-tour="quick-actions"]',
    title: '빠른 실행 메뉴',
    content: '자주 사용하는 기능에 빠르게 접근할 수 있어요. AI 진료, 치험례 검색, 상호작용 검사를 바로 시작하세요.',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="recent-activity"]',
    title: '최근 활동',
    content: '최근 진료 기록과 검색 이력을 확인할 수 있어요. 이전 환자의 기록을 빠르게 찾아볼 수 있습니다.',
    placement: 'right' as const,
  },
  {
    target: '[data-tour="usage-stats"]',
    title: '사용량 현황',
    content: '이번 달 AI 추천, 검색 사용량을 확인하세요. Pro 플랜은 월 300회, Clinic 플랜은 월 1,500회까지 사용 가능합니다.',
    placement: 'left' as const,
    tip: '사이드바 메뉴로 다른 기능들도 탐색해보세요!',
  },
]

// stats 카드 메타데이터 — 값은 useDashboardStats 훅에서 동적으로 주입.
const statsMeta = [
  {
    key: 'todaySavedMinutes' as const,
    name: '오늘 절약한 시간',
    icon: Clock,
    description: '진료 시작 시 자동 집계',
    suffix: '분',
  },
  {
    key: 'monthlyConsultations' as const,
    name: '이번 달 진료',
    icon: Users,
    description: '진료 기록 기준',
    suffix: '건',
  },
  {
    key: 'aiRecommendationsUsed' as const,
    name: 'AI 추천 활용',
    icon: TrendingUp,
    description: 'AI 처방 추천 기준',
    suffix: '회',
  },
]

// quickActions는 컴포넌트 내에서 동적으로 생성됨 (아래 참조)

interface RecentActivityItem {
  type: 'consultation' | 'prescription'
  title: string
  description: string
  time: string
  patientId?: string
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs)) return ''
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

function useRecentActivities() {
  return useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/recent-activity?limit=8')
      return data.data as RecentActivityItem[]
    },
    staleTime: 60_000,
  })
}

export default function DashboardPage() {
  useSEO(PAGE_SEO.dashboard)
  const appStats = useAppStats()
  const dashboardStatsQuery = useDashboardStats()
  const dashboardStats = dashboardStatsQuery.data
  const isStatsLoading = dashboardStatsQuery.isLoading
  const isStatsDemo = dashboardStats?._isDemo === true

  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const currentHour = new Date().getHours()
  const recentActivityQuery = useRecentActivities()
  const recentActivities = recentActivityQuery.data ?? []

  // 빠른 실행 — 단일 톤. 아이콘 배경/배지도 모두 neutral 정렬.
  const quickActions = useMemo(() => [
    {
      name: '새 진료 시작',
      description: '환자 증상을 입력하면 변증·처방 후보를 보여드립니다.',
      href: '/dashboard/consultation',
      icon: Stethoscope,
      badge: '추천',
    },
    {
      name: '치험례 검색',
      description: `${appStats.formatted.totalCases}의 임상 데이터에서 유사 사례를 찾아보세요.`,
      href: '/dashboard/cases',
      icon: BookOpen,
      badge: appStats.formatted.totalCases,
    },
    {
      name: '상호작용 검사',
      description: '양약과 한약 간 상호작용을 빠르게 확인합니다.',
      href: '/dashboard/interactions',
      icon: AlertTriangle,
      badge: '안전',
    },
  ], [appStats.formatted.totalCases])

  const greeting =
    currentHour < 12 ? '좋은 아침이에요' : currentHour < 18 ? '안녕하세요' : '수고하셨어요'
  const [showTour, setShowTour] = useState(true)
  const [quickSearch, setQuickSearch] = useState('')

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (quickSearch.trim()) {
      navigate(`/dashboard/cases?keyword=${encodeURIComponent(quickSearch.trim())}`)
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header — 단정한 그레이톤 */}
      <div
        data-tour="welcome-header"
        className="rounded-lg bg-white border border-neutral-200 p-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-[13px] text-neutral-500">{greeting}</p>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mt-1">
              {user?.name}님, 안녕하세요
            </h1>
            <p className="mt-2 text-[15px] text-neutral-600 max-w-md">
              오늘 진료를 시작하기 좋은 시간입니다.
            </p>
          </div>

          <Link
            to="/dashboard/consultation"
            data-tour="start-consultation"
            className="inline-flex items-center gap-2 h-12 px-5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md font-semibold transition-colors active:scale-[0.99]"
          >
            새 진료 시작
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Quick Search Bar */}
      <div className="bg-white rounded-md border border-neutral-200 p-3">
        <form onSubmit={handleQuickSearch} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="증상, 처방명, 약재명으로 검색"
              className="w-full h-12 pl-11 pr-4 bg-neutral-50 rounded-md text-[15px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-primary focus:shadow-focus border border-transparent transition"
            />
          </div>
          <button
            type="submit"
            className="h-12 px-5 bg-primary hover:bg-brand-600 text-white text-[14px] font-semibold rounded-md transition-colors active:scale-[0.99]"
          >
            검색
          </button>
        </form>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="text-[12px] text-neutral-400">자주 찾는 키워드</span>
          {['두통', '요통', '불면', '소화불량', '보중익기탕'].map((term) => (
            <button
              key={term}
              onClick={() => navigate(`/dashboard/cases?keyword=${encodeURIComponent(term)}`)}
              className="h-7 px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[12px] font-medium rounded-sm transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Killer Feature Highlight */}
      <KillerFeatureHighlight />

      {/* Stats Grid */}
      <div>
        {isStatsDemo && (
          <div className="mb-3 flex items-start gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-md text-[13px] text-amber-800">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <span>
              아직 실제 진료 기록이 없어 <strong>샘플 통계</strong>를 표시합니다.
              첫 진료를 등록하면 실제 수치로 자동 갱신됩니다.
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {statsMeta.map((stat) => {
            const raw = dashboardStats?.[stat.key]
            const display =
              raw === null || raw === undefined
                ? '—'
                : `${raw.toLocaleString('ko-KR')}${stat.suffix}`
            return (
              <div
                key={stat.name}
                className="bg-white rounded-md p-6 border border-neutral-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-neutral-500">{stat.name}</p>
                    {isStatsLoading ? (
                      <div
                        className="mt-2 h-9 w-24 rounded bg-neutral-100 animate-pulse"
                        aria-label="불러오는 중"
                      />
                    ) : (
                      <p className="text-[28px] font-extrabold tabular text-neutral-900 mt-2 tracking-tight">
                        {display}
                      </p>
                    )}
                    <p className="text-[12px] text-neutral-400 mt-1.5">{stat.description}</p>
                  </div>
                  <stat.icon className="h-5 w-5 text-neutral-400 ml-2 flex-shrink-0" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div data-tour="quick-actions">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900">빠른 실행</h2>
          <ExportDialog />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="group block bg-white rounded-md p-6 border border-neutral-200 hover:border-neutral-900 transition-colors"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="inline-flex w-10 h-10 rounded-md bg-neutral-100 text-neutral-900 items-center justify-center">
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[11px] font-semibold rounded-sm">
                  {action.badge}
                </span>
              </div>

              <h3 className="text-[17px] font-bold text-neutral-900">
                {action.name}
              </h3>
              <p className="mt-1.5 text-[13px] text-neutral-500 leading-relaxed">
                {action.description}
              </p>

              <div className="mt-4 inline-flex items-center text-[13px] font-medium text-neutral-900">
                시작하기
                <ChevronRight className="h-3.5 w-3.5 ml-0.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Recent Activity */}
        <div data-tour="recent-activity" className="lg:col-span-3 bg-white rounded-md border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-neutral-900">최근 활동</h2>
            <Link
              to="/dashboard/statistics"
              className="text-[13px] font-medium text-neutral-500 hover:text-neutral-900"
            >
              전체 보기
            </Link>
          </div>

          <div className="space-y-1">
            {recentActivityQuery.isLoading ? (
              <div className="text-center py-8 text-neutral-500">
                <p className="text-[16px] font-semibold">불러오는 중…</p>
                <p className="text-[13px] mt-1 text-neutral-400">최근 진료 기록을 가져오고 있어요</p>
              </div>
            ) : recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => {
                const isConsultation = activity.type === 'consultation'
                const Icon = isConsultation ? Stethoscope : BookOpen
                return (
                  <div
                    key={index}
                    onClick={() =>
                      activity.patientId &&
                      navigate(`/dashboard/patients/${activity.patientId}`)
                    }
                    className="flex items-start gap-3 p-3 -mx-3 rounded-md hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] text-neutral-900">{activity.title}</p>
                      <p className="text-[13px] text-neutral-500 mt-0.5 truncate">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-[12px] text-neutral-400 whitespace-nowrap mt-1">
                      {formatRelativeTime(activity.time)}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-neutral-400">
                <Stethoscope className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-[13px] font-medium text-neutral-500">아직 활동 기록이 없습니다</p>
                <p className="text-[12px] mt-1">새 진료를 시작하면 여기에 표시돼요.</p>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:col-span-2 space-y-3">
          {/* Today's Tip — 단정한 회색 카드 */}
          <div className="rounded-md border border-neutral-200 bg-white p-6">
            <p className="text-[12px] font-semibold text-primary">오늘의 임상 팁</p>
            <h3 className="font-bold text-neutral-900 mt-1.5">
              감기 환자, 소청룡탕 vs 갈근탕
            </h3>
            <p className="text-[13px] text-neutral-600 mt-2 leading-relaxed">
              겨울철에 자주 보는 두 처방의 구분 포인트를 정리했어요.
            </p>
            <button
              onClick={() => navigate('/dashboard/cases?keyword=소청룡탕+갈근탕')}
              className="mt-4 inline-flex items-center text-[13px] font-medium text-neutral-900"
            >
              자세히 보기
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </button>
          </div>

          {/* Usage Stats - Value Metrics */}
          <div data-tour="usage-stats" className="bg-white rounded-md border border-neutral-200 p-6">
            <ValueMetricsDashboard compact />

            {user?.subscriptionTier === 'free' && (
              <Link
                to="/dashboard/subscription"
                className="block w-full mt-4 h-11 leading-[44px] bg-neutral-900 text-white text-[14px] font-semibold rounded-md hover:bg-neutral-800 transition-colors text-center"
              >
                Pro로 업그레이드
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Charts */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-neutral-900 mb-4">진료 통계</h2>
        <DashboardCharts />
      </div>

      {showTour && (
        <TourGuide
          tourId="dashboard"
          steps={dashboardTourSteps}
          onComplete={() => setShowTour(false)}
        />
      )}

      {/* Restart Tour Button */}
      <TourRestartButton tourId="dashboard" onClick={() => setShowTour(true)} />
    </div>
  )
}
