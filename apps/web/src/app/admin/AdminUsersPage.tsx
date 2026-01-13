import { useEffect, useState } from 'react'
import {
  Search,
  MoreVertical,
  UserX,
  UserCheck,
  Shield,
  Key,
  ChevronLeft,
  ChevronRight,
  Ban,
} from 'lucide-react'
import { adminUsersApi, type AdminUser, type PaginatedUsers, type GetUsersParams } from '@/services/admin-api'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: AdminUser['status'] }) {
  const styles = {
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-yellow-100 text-yellow-700',
    banned: 'bg-red-100 text-red-700',
    pending_verification: 'bg-gray-100 text-gray-700',
  }

  const labels = {
    active: '활성',
    suspended: '정지',
    banned: '차단',
    pending_verification: '대기',
  }

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[status])}>
      {labels[status]}
    </span>
  )
}

// 역할 배지 컴포넌트
function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    super_admin: 'bg-red-100 text-red-700',
    admin: 'bg-purple-100 text-purple-700',
    support: 'bg-blue-100 text-blue-700',
    content_manager: 'bg-amber-100 text-amber-700',
    user: 'bg-gray-100 text-gray-600',
  }

  const labels: Record<UserRole, string> = {
    super_admin: '최고관리자',
    admin: '관리자',
    support: '고객지원',
    content_manager: '콘텐츠',
    user: '일반',
  }

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[role])}>
      {labels[role]}
    </span>
  )
}

// 구독 배지 컴포넌트
function SubscriptionBadge({ tier }: { tier: AdminUser['subscriptionTier'] }) {
  const styles = {
    free: 'bg-gray-100 text-gray-600',
    basic: 'bg-blue-100 text-blue-700',
    professional: 'bg-purple-100 text-purple-700',
    clinic: 'bg-amber-100 text-amber-700',
  }

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', styles[tier])}>
      {tier}
    </span>
  )
}

// 사용자 행 액션 메뉴
function UserActions({
  user,
  onSuspend,
  onActivate,
  onBan,
  onResetPassword,
  onChangeRole,
  currentUserRole,
}: {
  user: AdminUser
  onSuspend: (id: string, reason: string) => void
  onActivate: (id: string) => void
  onBan: (id: string, reason: string) => void
  onResetPassword: (id: string) => void
  onChangeRole: (id: string, role: UserRole) => void
  currentUserRole?: UserRole
}) {
  const [open, setOpen] = useState(false)

  const canChangeRole = currentUserRole === 'super_admin'
  const canModify = currentUserRole === 'admin' || currentUserRole === 'super_admin'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {canModify && user.status === 'active' && (
              <button
                onClick={() => {
                  const reason = prompt('정지 사유를 입력하세요:')
                  if (reason) {
                    onSuspend(user.id, reason)
                    setOpen(false)
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 transition-colors"
              >
                <UserX className="h-4 w-4" />
                계정 정지
              </button>
            )}

            {canModify && user.status === 'suspended' && (
              <button
                onClick={() => {
                  onActivate(user.id)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
              >
                <UserCheck className="h-4 w-4" />
                계정 활성화
              </button>
            )}

            {canModify && user.status !== 'banned' && (
              <button
                onClick={() => {
                  const reason = prompt('차단 사유를 입력하세요:')
                  if (reason) {
                    onBan(user.id, reason)
                    setOpen(false)
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Ban className="h-4 w-4" />
                영구 차단
              </button>
            )}

            {canModify && (
              <button
                onClick={() => {
                  if (confirm('임시 비밀번호를 발급하시겠습니까?')) {
                    onResetPassword(user.id)
                    setOpen(false)
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Key className="h-4 w-4" />
                비밀번호 초기화
              </button>
            )}

            {canChangeRole && (
              <button
                onClick={() => {
                  const roles: UserRole[] = ['user', 'support', 'content_manager', 'admin', 'super_admin']
                  const newRole = prompt(
                    `새 역할을 입력하세요:\n${roles.join(', ')}\n\n현재: ${user.role}`
                  ) as UserRole
                  if (newRole && roles.includes(newRole)) {
                    onChangeRole(user.id, newRole)
                    setOpen(false)
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
              >
                <Shield className="h-4 w-4" />
                역할 변경
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore()
  const [data, setData] = useState<PaginatedUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 필터 상태
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [tierFilter, setTierFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  // 데이터 가져오기
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params: GetUsersParams = {
        page,
        limit,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter as UserRole }),
        ...(statusFilter && { status: statusFilter }),
        ...(tierFilter && { subscriptionTier: tierFilter }),
      }
      const result = await adminUsersApi.getUsers(params)
      setData(result)
    } catch (err) {
      setError('사용자 목록을 불러오는데 실패했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, roleFilter, statusFilter, tierFilter])

  // 검색 핸들러 (Enter 키)
  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1)
      fetchUsers()
    }
  }

  // 액션 핸들러들
  const handleSuspend = async (id: string, reason: string) => {
    try {
      await adminUsersApi.suspendUser(id, reason)
      fetchUsers()
    } catch (err) {
      alert('계정 정지에 실패했습니다.')
    }
  }

  const handleActivate = async (id: string) => {
    try {
      await adminUsersApi.activateUser(id)
      fetchUsers()
    } catch (err) {
      alert('계정 활성화에 실패했습니다.')
    }
  }

  const handleBan = async (id: string, reason: string) => {
    try {
      await adminUsersApi.banUser(id, reason)
      fetchUsers()
    } catch (err) {
      alert('계정 차단에 실패했습니다.')
    }
  }

  const handleResetPassword = async (id: string) => {
    try {
      const result = await adminUsersApi.resetPassword(id)
      alert(`임시 비밀번호: ${result.temporaryPassword}`)
    } catch (err) {
      alert('비밀번호 초기화에 실패했습니다.')
    }
  }

  const handleChangeRole = async (id: string, role: UserRole) => {
    try {
      await adminUsersApi.changeUserRole(id, role)
      fetchUsers()
    } catch (err) {
      alert('역할 변경에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        <p className="text-gray-500 mt-1">
          전체 {data?.total.toLocaleString() || 0}명의 사용자
        </p>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 검색 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="이름 또는 이메일로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* 필터들 */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">모든 역할</option>
              <option value="super_admin">최고관리자</option>
              <option value="admin">관리자</option>
              <option value="support">고객지원</option>
              <option value="content_manager">콘텐츠</option>
              <option value="user">일반</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">모든 상태</option>
              <option value="active">활성</option>
              <option value="suspended">정지</option>
              <option value="banned">차단</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">모든 구독</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="clinic">Clinic</option>
            </select>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      사용자
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      역할
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      구독
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      가입일
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.users.map((user) => (
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
                        <RoleBadge role={user.role || 'user'} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-3">
                        <SubscriptionBadge tier={user.subscriptionTier} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserActions
                          user={user}
                          onSuspend={handleSuspend}
                          onActivate={handleActivate}
                          onBan={handleBan}
                          onResetPassword={handleResetPassword}
                          onChangeRole={handleChangeRole}
                          currentUserRole={currentUser?.role}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  {(page - 1) * limit + 1} - {Math.min(page * limit, data.total)} / {data.total}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 py-2 text-sm">
                    {page} / {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
