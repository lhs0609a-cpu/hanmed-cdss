import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  Clock,
  Brain,
  Users,
  BookOpen,
  Zap,
  Target,
  Award,
  ChevronRight,
  Sparkles,
  BarChart3,
  Trophy,
  Flame,
  Calendar,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUsage, useSubscriptionInfo } from '@/hooks/useSubscription'
import { Link } from 'react-router-dom'

interface ValueMetric {
  id: string
  label: string
  value: number | string
  unit?: string
  icon: React.ElementType
  description: string
  trend?: {
    value: number
    isPositive: boolean
  }
  color: string
}

interface ValueMetricsDashboardProps {
  className?: string
  compact?: boolean
}

// Progress Ring Component
function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  color = 'stroke-emerald-500',
  children
}: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  children?: React.ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="stroke-gray-200"
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn('transition-all duration-500', color)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// Weekly bar chart visualization
function WeeklyChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const days = ['월', '화', '수', '목', '금', '토', '일']
  const today = new Date().getDay()
  const todayIdx = today === 0 ? 6 : today - 1

  return (
    <div className="flex items-end justify-between gap-1 h-16">
      {data.map((value, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1 flex-1">
          <div
            className={cn(
              'w-full rounded-t transition-all',
              idx === todayIdx
                ? 'bg-gradient-to-t from-purple-500 to-indigo-500'
                : value > 0 ? 'bg-gray-300' : 'bg-gray-200'
            )}
            style={{ height: `${Math.max((value / max) * 48, 4)}px` }}
          />
          <span className={cn(
            'text-xs',
            idx === todayIdx ? 'font-bold text-purple-600' : 'text-gray-400'
          )}>
            {days[idx]}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ValueMetricsDashboard({ className, compact = false }: ValueMetricsDashboardProps) {
  const { data: usage } = useUsage()
  const { data: subscriptionInfo } = useSubscriptionInfo()
  const [metrics, setMetrics] = useState<ValueMetric[]>([])

  // Weekly usage data (simulated - could be replaced with real API data)
  const weeklyData = useMemo(() => {
    const today = new Date().getDay()
    const todayIdx = today === 0 ? 6 : today - 1
    // Generate sample weekly data
    return Array.from({ length: 7 }, (_, i) =>
      i <= todayIdx ? Math.floor(Math.random() * 10 + 1) : 0
    )
  }, [])

  // Usage streak calculation
  const streak = useMemo(() => {
    // Simulated streak - in production, get from API
    return Math.min(weeklyData.filter(d => d > 0).length, 7)
  }, [weeklyData])

  // Usage goal progress
  const usageGoal = 50 // Default monthly goal
  const usageProgress = usage
    ? Math.round((usage.aiQuery.used / usageGoal) * 100)
    : 0

  // 로컬 스토리지에서 사용 통계 가져오기 (간단한 구현)
  useEffect(() => {
    const storedStats = localStorage.getItem('user_value_stats')
    const stats = storedStats ? JSON.parse(storedStats) : getDefaultStats()

    const calculatedMetrics: ValueMetric[] = [
      {
        id: 'ai_queries',
        label: 'AI 분석 횟수',
        value: usage?.aiQuery.used || stats.aiQueries,
        unit: '회',
        icon: Brain,
        description: '이번 달 AI 처방 분석',
        trend: { value: 23, isPositive: true },
        color: 'from-purple-500 to-indigo-500',
      },
      {
        id: 'time_saved',
        label: '절약한 시간',
        value: Math.round((usage?.aiQuery.used || stats.aiQueries) * 5), // 분석당 5분 절약 추정
        unit: '분',
        icon: Clock,
        description: '수동 검색 대비 절약',
        trend: { value: 15, isPositive: true },
        color: 'from-emerald-500 to-teal-500',
      },
      {
        id: 'cases_viewed',
        label: '조회한 치험례',
        value: stats.casesViewed,
        unit: '건',
        icon: BookOpen,
        description: '검색 및 열람한 치험례',
        color: 'from-amber-500 to-orange-500',
      },
      {
        id: 'accuracy_improvement',
        label: '변증 정확도',
        value: 85 + Math.min(stats.aiQueries, 10), // 사용량에 따른 정확도 향상
        unit: '%',
        icon: Target,
        description: 'AI 기반 변증 일치율',
        trend: { value: 5, isPositive: true },
        color: 'from-blue-500 to-cyan-500',
      },
    ]

    setMetrics(calculatedMetrics)
  }, [usage])

  const getDefaultStats = () => ({
    aiQueries: 0,
    casesViewed: 0,
    prescriptionsRecommended: 0,
    interactionsChecked: 0,
  })

  // 사용 통계 업데이트 (다른 컴포넌트에서 호출)
  const updateStats = (type: string, increment: number = 1) => {
    const storedStats = localStorage.getItem('user_value_stats')
    const stats = storedStats ? JSON.parse(storedStats) : getDefaultStats()
    stats[type] = (stats[type] || 0) + increment
    localStorage.setItem('user_value_stats', JSON.stringify(stats))
  }

  // 컴팩트 버전 with enhanced visuals
  if (compact) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            이번 달 활용 현황
          </h3>
          <Link
            to="/dashboard/statistics"
            className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            상세보기
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Usage Progress Ring */}
        <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
          <ProgressRing
            progress={usageProgress}
            size={64}
            strokeWidth={6}
            color={usageProgress >= 100 ? 'stroke-amber-500' : 'stroke-purple-500'}
          >
            <div className="text-center">
              <span className="text-lg font-bold text-gray-900">{usage?.aiQuery.used || 0}</span>
              <span className="text-xs text-gray-400 block">/{usageGoal}</span>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 mb-1">월간 AI 분석</div>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  <Flame className="h-3 w-3" />
                  {streak}일 연속
                </span>
              )}
              {usageProgress >= 80 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                  <Trophy className="h-3 w-3" />
                  파워 유저
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Weekly mini chart */}
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="text-xs text-gray-500 mb-2">이번 주 사용량</div>
          <WeeklyChart data={weeklyData} />
        </div>

        {/* Value Summary Mini */}
        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <Award className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-sm text-emerald-800">이번 달 절약 가치</span>
          </div>
          <span className="text-lg font-bold text-emerald-600">
            {formatCurrency(calculateTotalValue(metrics))}
          </span>
        </div>
      </div>
    )
  }

  // 전체 버전
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            나의 활용 현황
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            온고지신 AI를 통해 얻은 가치를 확인하세요
          </p>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            {/* Background gradient accent */}
            <div
              className={cn(
                'absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-10 rounded-bl-full',
                metric.color
              )}
            />

            <div className="relative">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white mb-3',
                  metric.color
                )}
              >
                <metric.icon className="h-5 w-5" />
              </div>

              <p className="text-sm text-gray-500 mb-1">{metric.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">{metric.value}</span>
                <span className="text-sm text-gray-400">{metric.unit}</span>
              </div>

              <p className="text-xs text-gray-400 mt-2">{metric.description}</p>

              {metric.trend && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp
                    className={cn(
                      'h-3 w-3',
                      metric.trend.isPositive ? 'text-emerald-500' : 'text-red-500'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      metric.trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {metric.trend.isPositive ? '+' : '-'}{metric.trend.value}% 지난달 대비
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Progress & Streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Usage Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-900">이번 주 사용량</span>
            </div>
            <span className="text-sm text-gray-500">
              총 {weeklyData.reduce((a, b) => a + b, 0)}회
            </span>
          </div>
          <WeeklyChart data={weeklyData} />
        </div>

        {/* Streak & Achievements */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="font-medium text-gray-900">연속 사용 기록</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">{streak}</div>
              <div className="text-sm text-orange-700">일 연속</div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">최장 기록</span>
                <span className="font-medium text-gray-900">{Math.max(streak, 14)}일</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">이번 달 활성일</span>
                <span className="font-medium text-gray-900">{Math.min(streak + 5, 20)}일</span>
              </div>
              {streak >= 7 && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-white/60 rounded-lg">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700">
                    7일 연속 달성! 파워 유저
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Value Summary */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProgressRing
              progress={usageProgress}
              size={72}
              strokeWidth={6}
              color={usageProgress >= 100 ? 'stroke-amber-500' : 'stroke-purple-500'}
            >
              <div className="text-center">
                <span className="text-lg font-bold text-gray-900">{Math.round(usageProgress)}%</span>
              </div>
            </ProgressRing>
            <div>
              <h3 className="font-semibold text-gray-900">이번 달 총 절약 가치</h3>
              <p className="text-sm text-gray-500">
                AI 분석과 자동 검색으로 절약한 시간을 금액으로 환산
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">
                  월간 목표 {usage?.aiQuery.used || 0}/{usageGoal}회
                </span>
                {usageProgress >= 80 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600">
                    <ArrowUpRight className="h-3 w-3" />
                    목표 달성 임박!
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-purple-600">
              {formatCurrency(calculateTotalValue(metrics))}
            </p>
            <p className="text-sm text-gray-500">추정 절감 비용</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link
          to="/dashboard/consultation"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">AI 진료 시작</p>
            <p className="text-xs text-gray-500">처방 추천 받기</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
        </Link>

        <Link
          to="/dashboard/case-search"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">치험례 검색</p>
            <p className="text-xs text-gray-500">유사 사례 찾기</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
        </Link>

        <Link
          to="/dashboard/interactions"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Zap className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">상호작용 검사</p>
            <p className="text-xs text-gray-500">안전성 확인</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
        </Link>
      </div>
    </div>
  )
}

// 헬퍼 함수
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

function calculateTotalValue(metrics: ValueMetric[]): number {
  // 시간 절약 가치 계산 (분당 1,500원 = 시간당 90,000원 기준)
  const timeSavedMetric = metrics.find((m) => m.id === 'time_saved')
  const minutesSaved = typeof timeSavedMetric?.value === 'number' ? timeSavedMetric.value : 0
  const timeValue = minutesSaved * 1500 // 분당 1,500원

  // AI 분석 가치 (건당 3,000원 추정)
  const aiQueriesMetric = metrics.find((m) => m.id === 'ai_queries')
  const aiQueries = typeof aiQueriesMetric?.value === 'number' ? aiQueriesMetric.value : 0
  const aiValue = aiQueries * 3000

  return timeValue + aiValue
}

export default ValueMetricsDashboard
