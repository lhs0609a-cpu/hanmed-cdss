import { useEffect, useState } from 'react'
import {
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity,
  Building,
  Brain,
  UserPlus,
} from 'lucide-react'
import { adminDashboardApi, type DashboardData, type DashboardStats } from '@/services/admin-api'
import { cn } from '@/lib/utils'

// 통계 카드 컴포넌트
function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
}: {
  title: string
  value: string | number
  subValue?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down'
  trendValue?: string
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className={cn('p-3 rounded-xl', colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && trendValue && (
        <div className="flex items-center gap-1 mt-3">
          {trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={cn('text-sm font-medium', trend === 'up' ? 'text-green-600' : 'text-red-600')}>
            {trendValue}
          </span>
          <span className="text-sm text-gray-400">vs 지난달</span>
        </div>
      )}
    </div>
  )
}

// 구독 분포 차트
function SubscriptionChart({ data }: { data: DashboardStats['subscriptionsByTier'] }) {
  const total = data.free + data.basic + data.professional + data.clinic
  const tiers = [
    { name: 'Free', value: data.free, color: 'bg-gray-400' },
    { name: 'Basic', value: data.basic, color: 'bg-blue-500' },
    { name: 'Professional', value: data.professional, color: 'bg-purple-500' },
    { name: 'Clinic', value: data.clinic, color: 'bg-amber-500' },
  ]

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">구독 분포</h3>
      <div className="space-y-3">
        {tiers.map((tier) => {
          const percentage = total > 0 ? Math.round((tier.value / total) * 100) : 0
          return (
            <div key={tier.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">{tier.name}</span>
                <span className="font-medium text-gray-900">
                  {tier.value.toLocaleString()}명 ({percentage}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', tier.color)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 최근 활동 목록
function RecentActivities({ activities }: { activities: DashboardData['recentActivities'] }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 관리자 활동</h3>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">활동 내역이 없습니다</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.adminName}</span>
                  <span className="text-gray-500">님이 </span>
                  {activity.description}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(activity.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// 일별 가입자 차트 (간단한 막대 그래프)
function DailySignupsChart({ data }: { data: DashboardData['dailySignups'] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const last7Days = data.slice(-7)

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 가입자 (최근 7일)</h3>
      <div className="flex items-end justify-between gap-2 h-32">
        {last7Days.map((day) => {
          const height = (day.count / maxCount) * 100
          const date = new Date(day.date)
          const dayName = date.toLocaleDateString('ko-KR', { weekday: 'short' })

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{day.count}</span>
              <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100px' }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{dayName}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const dashboardData = await adminDashboardApi.getDashboard()
        setData(dashboardData)
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || '데이터를 불러올 수 없습니다.'}</p>
      </div>
    )
  }

  const { stats, recentActivities, dailySignups } = data

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="text-gray-500 mt-1">온고지신 CDSS 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="전체 사용자"
          value={stats.totalUsers.toLocaleString()}
          subValue={`오늘 +${stats.newUsersToday}`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="활성 구독자"
          value={stats.activeSubscribers.toLocaleString()}
          subValue={`전체의 ${Math.round((stats.activeSubscribers / stats.totalUsers) * 100)}%`}
          icon={CreditCard}
          color="green"
        />
        <StatCard
          title="이번 달 매출"
          value={`${(stats.revenueThisMonth / 10000).toLocaleString()}만원`}
          icon={TrendingUp}
          trend={stats.revenueGrowthRate >= 0 ? 'up' : 'down'}
          trendValue={`${Math.abs(stats.revenueGrowthRate).toFixed(1)}%`}
          color="purple"
        />
        <StatCard
          title="AI 쿼리 (이번 달)"
          value={stats.aiQueriesThisMonth.toLocaleString()}
          subValue={`총 ${stats.totalAiQueries.toLocaleString()}건`}
          icon={Brain}
          color="amber"
        />
      </div>

      {/* 두 번째 행 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="신규 가입 (이번 달)"
          value={stats.newUsersThisMonth}
          subValue={`이번 주 +${stats.newUsersThisWeek}`}
          icon={UserPlus}
          color="blue"
        />
        <StatCard
          title="전체 환자"
          value={stats.totalPatients.toLocaleString()}
          subValue={`이번 달 +${stats.newPatientsThisMonth}`}
          icon={Users}
          color="green"
        />
        <StatCard
          title="등록 한의원"
          value={stats.totalClinics}
          subValue={`인증 완료 ${stats.verifiedClinics}`}
          icon={Building}
          color="purple"
        />
        <StatCard
          title="인증 대기"
          value={stats.pendingVerification}
          subValue="한의원 인증 요청"
          icon={Building}
          color={stats.pendingVerification > 0 ? 'red' : 'green'}
        />
      </div>

      {/* 차트 & 활동 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriptionChart data={stats.subscriptionsByTier} />
        <DailySignupsChart data={dailySignups} />
      </div>

      {/* 최근 활동 */}
      <RecentActivities activities={recentActivities} />
    </div>
  )
}
