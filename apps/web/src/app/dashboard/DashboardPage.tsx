import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  Stethoscope,
  BookOpen,
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react'

const stats = [
  {
    name: '오늘 절약한 시간',
    value: '2시간 15분',
    icon: Clock,
    change: '+15%',
    changeType: 'positive',
    description: '상담 45분 x 3건',
  },
  {
    name: '이번 달 진료',
    value: '47건',
    icon: Users,
    change: '+23%',
    changeType: 'positive',
    description: 'AI 추천 활용',
  },
  {
    name: 'AI 정확도',
    value: '94.2%',
    icon: TrendingUp,
    change: '+2.1%',
    changeType: 'positive',
    description: '처방 채택률 기준',
  },
]

const quickActions = [
  {
    name: '새 진료 시작',
    description: 'AI가 증상을 분석하고 최적의 처방을 추천해드립니다',
    href: '/consultation',
    icon: Stethoscope,
    gradient: 'from-teal-500 to-emerald-500',
    shadowColor: 'shadow-teal-500/25',
    badge: 'AI 추천',
  },
  {
    name: '치험례 검색',
    description: '6,000건의 임상 데이터에서 유사 사례를 찾아보세요',
    href: '/cases',
    icon: BookOpen,
    gradient: 'from-blue-500 to-indigo-500',
    shadowColor: 'shadow-blue-500/25',
    badge: '6,000건',
  },
  {
    name: '상호작용 검사',
    description: '양약-한약 간 상호작용을 빠르게 확인하세요',
    href: '/interactions',
    icon: AlertTriangle,
    gradient: 'from-amber-500 to-orange-500',
    shadowColor: 'shadow-amber-500/25',
    badge: '안전 검사',
  },
]

const recentActivities = [
  {
    type: 'consultation',
    title: 'AI 처방 추천 사용',
    description: '소화불량, 복부 냉증 환자 - 이중탕 추천',
    time: '30분 전',
    icon: Stethoscope,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
  },
  {
    type: 'search',
    title: '치험례 검색',
    description: '"두통 + 어지러움" 관련 치험례 12건 열람',
    time: '2시간 전',
    icon: BookOpen,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    type: 'warning',
    title: '상호작용 경고 확인',
    description: '와파린 복용 환자 - 당귀 금기 알림',
    time: '어제',
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
]

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? '좋은 아침이에요' : currentHour < 18 ? '안녕하세요' : '수고하셨어요'

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 rounded-3xl p-8 text-white">
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
            to="/consultation"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-colors shadow-lg"
          >
            <Zap className="h-5 w-5" />
            새 진료 시작
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

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
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      stat.changeType === 'positive'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-400">{stat.description}</span>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <stat.icon className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">빠른 실행</h2>
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
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">최근 활동</h2>
            <button className="text-sm font-medium text-teal-600 hover:text-teal-700">
              전체 보기
            </button>
          </div>

          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className={`p-2.5 ${activity.iconBg} rounded-xl`}>
                  <activity.icon className={`h-5 w-5 ${activity.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
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
                <button className="mt-3 text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
                  자세히 보기
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">이번 달 사용량</h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-600">AI 추천</span>
                  <span className="font-medium text-gray-900">47 / 100회</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-[47%] bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-600">치험례 검색</span>
                  <span className="font-medium text-gray-900">128 / 무제한</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-600">상호작용 검사</span>
                  <span className="font-medium text-gray-900">23 / 무제한</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                </div>
              </div>
            </div>

            {user?.subscriptionTier === 'starter' && (
              <button className="w-full mt-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
                Pro로 업그레이드
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
