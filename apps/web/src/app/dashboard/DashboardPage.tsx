import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { useAppStats } from '@/hooks/useAppStats'
import { useUsage } from '@/hooks/useSubscription'
import TourGuide, { TourRestartButton } from '@/components/common/TourGuide'
import { ExportDialog } from '@/components/common'
import { ValueMetricsDashboard, KillerFeatureHighlight, DashboardCharts } from '@/components/dashboard'
import { parseNaturalQuery, getGenderLabel } from '@/lib/parseNaturalQuery'
import {
  Stethoscope,
  BookOpen,
  Brain,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Zap,
  Search,
  User,
  Calendar,
  Tag,
  Info,
  AlertTriangle,
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

// quickActions는 컴포넌트 내에서 동적으로 생성됨 (아래 참조)

export default function DashboardPage() {
  useSEO(PAGE_SEO.dashboard)
  const appStats = useAppStats()
  const { data: usage } = useUsage()

  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const currentHour = new Date().getHours()

  // 실제 사용량 기반 통계
  const aiUsed = usage?.aiQuery?.used || 0
  const minutesSaved = aiUsed * 5 // AI 분석 1건당 약 5분 절약 추정
  const stats = useMemo(() => [
    {
      name: '이번 달 AI 분석',
      value: `${aiUsed}건`,
      icon: Brain,
      description: 'AI 처방 추천 사용',
    },
    {
      name: '절약한 시간 (추정)',
      value: minutesSaved >= 60
        ? `${Math.floor(minutesSaved / 60)}시간 ${minutesSaved % 60}분`
        : `${minutesSaved}분`,
      icon: Clock,
      description: `분석 ${aiUsed}건 x 5분`,
    },
    {
      name: '치험례 DB',
      value: appStats.formatted.totalCases,
      icon: BookOpen,
      description: '검증된 임상 데이터',
    },
  ], [aiUsed, minutesSaved, appStats.formatted.totalCases])

  // 동적 quickActions (치험례 수 반영)
  const quickActions = useMemo(() => [
    {
      name: '새 진료 시작',
      description: 'AI가 증상을 분석하고 최적의 처방을 추천해드립니다',
      href: '/dashboard/consultation',
      icon: Stethoscope,
      gradient: 'from-teal-500 to-emerald-500',
      shadowColor: 'shadow-teal-500/25',
      badge: 'AI 추천',
    },
    {
      name: '치험례 검색',
      description: `${appStats.formatted.totalCases}의 임상 데이터에서 유사 사례를 찾아보세요`,
      href: '/dashboard/cases',
      icon: BookOpen,
      gradient: 'from-blue-500 to-indigo-500',
      shadowColor: 'shadow-blue-500/25',
      badge: appStats.formatted.totalCases,
    },
    {
      name: '상호작용 검사',
      description: '양약-한약 간 상호작용을 빠르게 확인하세요',
      href: '/dashboard/interactions',
      icon: AlertTriangle,
      gradient: 'from-amber-500 to-orange-500',
      shadowColor: 'shadow-amber-500/25',
      badge: '안전 검사',
    },
  ], [appStats.formatted.totalCases])

  const greeting =
    currentHour < 12 ? '좋은 아침이에요' : currentHour < 18 ? '안녕하세요' : '수고하셨어요'
  const [showTour, setShowTour] = useState(true)
  const [quickSearch, setQuickSearch] = useState('')

  // 자연어 파싱 결과 (실시간)
  const parsed = useMemo(() => parseNaturalQuery(quickSearch), [quickSearch])
  const hasParsedInfo = parsed.symptoms.length > 0 || parsed.age || parsed.gender || parsed.constitution

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickSearch.trim()) return

    // 자연어 파싱 후 AI 상담 페이지로 이동 (파싱된 데이터 전달)
    navigate('/dashboard/consultation', {
      state: {
        naturalQuery: quickSearch.trim(),
        parsedAge: parsed.age,
        parsedGender: parsed.gender,
        parsedConstitution: parsed.constitution,
        parsedSymptoms: parsed.symptoms,
        autoSubmit: true,
      },
    })
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div
        data-tour="welcome-header"
        className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 rounded-3xl p-8 text-white"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-amber-300" />
              <span className="text-sm font-medium text-teal-100">{greeting}</span>
            </div>
            <h1 className="text-3xl font-bold">
              {user?.name}님, 오늘도 파이팅!
            </h1>
            <p className="mt-2 text-teal-100 max-w-md">
              온고지신 AI가 오늘도 임상을 함께합니다.
              새로운 환자 증상을 입력해 보세요.
            </p>
          </div>

          <Link
            to="/dashboard/consultation"
            data-tour="start-consultation"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-colors shadow-lg"
          >
            <Zap className="h-5 w-5" />
            새 진료 시작
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Quick Search Bar - 자연어 통합 검색 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <form onSubmit={handleQuickSearch} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="두통 소화불량 65세 여 ← 이렇게 입력 후 Enter"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all text-[15px]"
            />
          </div>
          <button
            type="submit"
            disabled={!quickSearch.trim()}
            className="px-6 py-3.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI 진단
          </button>
        </form>

        {/* 파싱 미리보기 */}
        {hasParsedInfo && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-400">AI 인식:</span>
            {parsed.symptoms.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg border border-teal-200">
                <Tag className="h-3 w-3" />
                {s}
              </span>
            ))}
            {parsed.age && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200">
                <Calendar className="h-3 w-3" />
                {parsed.age}세
              </span>
            )}
            {parsed.gender && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200">
                <User className="h-3 w-3" />
                {getGenderLabel(parsed.gender)}
              </span>
            )}
            {parsed.constitution && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg border border-amber-200">
                {parsed.constitution}
              </span>
            )}
          </div>
        )}

        {/* 파싱 미리보기가 없을 때 예시 표시 */}
        {!hasParsedInfo && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-400">빠른 입력:</span>
            {['두통 어지러움 50세 여', '소화불량 복통 30대 남', '요통 무릎통 60세', '불면 피로 스트레스'].map((term) => (
              <button
                key={term}
                onClick={() => setQuickSearch(term)}
                className="px-2.5 py-1 bg-gray-50 hover:bg-teal-50 hover:text-teal-600 text-gray-500 text-xs rounded-lg transition-colors border border-gray-200 hover:border-teal-200"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Killer Feature Highlight */}
      <KillerFeatureHighlight />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <span className="text-xs text-gray-400 mt-2 block">{stat.description}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <stat.icon className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div data-tour="quick-actions">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">빠른 실행</h2>
          <ExportDialog />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className={`group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl ${action.shadowColor} transition-all duration-300 overflow-hidden`}
            >
              {/* Gradient overlay on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg ${action.shadowColor}`}
                  >
                    <action.icon className="h-6 w-6" />
                  </div>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                    {action.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                  {action.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {action.description}
                </p>

                <div className="mt-4 flex items-center text-sm font-medium text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  바로가기
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Activity */}
        <div data-tour="recent-activity" className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">최근 활동</h2>
            <Link
              to="/dashboard/statistics"
              className="text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              전체 보기
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 bg-gray-100 rounded-full mb-3">
                <Info className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-1">아직 활동 기록이 없습니다</p>
              <p className="text-xs text-gray-400">AI 진료를 시작하면 여기에 활동 내역이 표시됩니다</p>
              <Link
                to="/dashboard/consultation"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 text-sm font-medium rounded-lg hover:bg-teal-100 transition-colors"
              >
                <Stethoscope className="h-4 w-4" />
                첫 진료 시작하기
              </Link>
            </div>
          </div>
        </div>

        {/* AI Insight Card */}
        <div className="lg:col-span-2 space-y-4">
          {/* Today's Tip */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900">오늘의 임상 팁</h3>
                <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                  겨울철 감기 환자가 많습니다. 소청룡탕과 갈근탕의
                  구분 포인트를 확인해 보세요.
                </p>
                <button
                  onClick={() => navigate('/dashboard/cases?keyword=소청룡탕+갈근탕')}
                  className="mt-3 text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  자세히 보기
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Usage Stats - Value Metrics */}
          <div data-tour="usage-stats" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <ValueMetricsDashboard compact />

            {user?.subscriptionTier === 'free' && (
              <Link
                to="/dashboard/subscription"
                className="block w-full mt-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors text-center"
              >
                Pro로 업그레이드
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tour Guide */}
      {/* Statistics Charts */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">진료 통계</h2>
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
