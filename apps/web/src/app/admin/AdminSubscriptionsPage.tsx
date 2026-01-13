import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CreditCard,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import {
  adminSubscriptionsApi,
  adminUsersApi,
  type SubscriptionStats,
  type PaginatedUsers,
} from '@/services/admin-api'
import { cn } from '@/lib/utils'

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-xl', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminSubscriptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [users, setUsers] = useState<PaginatedUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const tierFilter = searchParams.get('tier') || ''
  const page = parseInt(searchParams.get('page') || '1')

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [statsData, usersData] = await Promise.all([
          adminSubscriptionsApi.getStats(),
          adminUsersApi.getUsers({
            page,
            limit: 20,
            subscriptionTier: tierFilter || undefined,
          }),
        ])
        setStats(statsData)
        setUsers(usersData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [tierFilter, page])

  // 플랜 변경
  const handleChangePlan = async (userId: string, tier: string) => {
    try {
      setActionLoading(true)
      await adminSubscriptionsApi.changeSubscriptionPlan(userId, tier)
      // 새로고침
      const usersData = await adminUsersApi.getUsers({
        page,
        limit: 20,
        subscriptionTier: tierFilter || undefined,
      })
      setUsers(usersData)
      alert('플랜이 변경되었습니다.')
    } catch (err) {
      alert('플랜 변경에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  // 기간 연장
  const handleExtend = async (userId: string) => {
    const days = prompt('연장할 일수를 입력하세요:')
    if (!days || isNaN(parseInt(days))) return

    try {
      setActionLoading(true)
      await adminSubscriptionsApi.extendSubscription(userId, parseInt(days))
      alert(`${days}일 연장되었습니다.`)
    } catch (err) {
      alert('기간 연장에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  // 사용량 초기화
  const handleResetUsage = async (userId: string) => {
    if (!confirm('사용량을 초기화하시겠습니까?')) return

    try {
      setActionLoading(true)
      await adminSubscriptionsApi.resetUsage(userId)
      alert('사용량이 초기화되었습니다.')
    } catch (err) {
      alert('사용량 초기화에 실패했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">구독 관리</h1>
        <p className="text-gray-500 mt-1">사용자 구독 현황을 관리합니다</p>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="전체 사용자"
            value={stats.totalUsers.toLocaleString()}
            icon={Users}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="활성 구독자"
            value={stats.activeSubscribers.toLocaleString()}
            icon={CreditCard}
            color="bg-green-50 text-green-600"
          />
          <StatCard
            title="월간 매출"
            value={`${(stats.monthlyRevenue / 10000).toLocaleString()}만원`}
            icon={TrendingUp}
            color="bg-purple-50 text-purple-600"
          />
          <StatCard
            title="연간 매출"
            value={`${(stats.yearlyRevenue / 10000).toLocaleString()}만원`}
            icon={TrendingUp}
            color="bg-amber-50 text-amber-600"
          />
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-2 flex-wrap">
          {['', 'free', 'basic', 'professional', 'clinic'].map((tier) => (
            <button
              key={tier}
              onClick={() => {
                searchParams.set('tier', tier)
                searchParams.set('page', '1')
                setSearchParams(searchParams)
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tierFilter === tier
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {tier === '' ? '전체' : tier.charAt(0).toUpperCase() + tier.slice(1)}
              {stats && tier !== '' && (
                <span className="ml-1 text-xs opacity-70">
                  ({stats.byTier[tier as keyof typeof stats.byTier]})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  사용자
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  구독
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  만료일
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium capitalize',
                        user.subscriptionTier === 'free' && 'bg-gray-100 text-gray-600',
                        user.subscriptionTier === 'basic' && 'bg-blue-100 text-blue-600',
                        user.subscriptionTier === 'professional' && 'bg-purple-100 text-purple-600',
                        user.subscriptionTier === 'clinic' && 'bg-amber-100 text-amber-600'
                      )}
                    >
                      {user.subscriptionTier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {user.subscriptionExpiresAt
                      ? new Date(user.subscriptionExpiresAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleChangePlan(user.id, e.target.value)
                          }
                        }}
                        disabled={actionLoading}
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          플랜 변경
                        </option>
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="professional">Professional</option>
                        <option value="clinic">Clinic</option>
                      </select>
                      <button
                        onClick={() => handleExtend(user.id)}
                        disabled={actionLoading}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="기간 연장"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleResetUsage(user.id)}
                        disabled={actionLoading}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="사용량 초기화"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {users && users.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {(page - 1) * 20 + 1} - {Math.min(page * 20, users.total)} / {users.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  searchParams.set('page', String(Math.max(1, page - 1)))
                  setSearchParams(searchParams)
                }}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-2 text-sm">
                {page} / {users.totalPages}
              </span>
              <button
                onClick={() => {
                  searchParams.set('page', String(Math.min(users.totalPages, page + 1)))
                  setSearchParams(searchParams)
                }}
                disabled={page === users.totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
