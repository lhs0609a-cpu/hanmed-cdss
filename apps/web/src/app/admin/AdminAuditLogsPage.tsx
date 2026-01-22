import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  FileText,
  User,
  RefreshCw,
} from 'lucide-react'
import { adminAuditLogsApi, type AuditLog } from '@/services/admin-api'
import { cn } from '@/lib/utils'

interface PaginatedAuditLogs {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// 액션 타입 라벨
const actionLabels: Record<string, { label: string; color: string }> = {
  USER_CREATE: { label: '사용자 생성', color: 'bg-green-100 text-green-700' },
  USER_UPDATE: { label: '사용자 수정', color: 'bg-blue-100 text-blue-700' },
  USER_DELETE: { label: '사용자 삭제', color: 'bg-red-100 text-red-700' },
  USER_SUSPEND: { label: '사용자 정지', color: 'bg-yellow-100 text-yellow-700' },
  USER_BAN: { label: '사용자 차단', color: 'bg-red-100 text-red-700' },
  USER_ACTIVATE: { label: '사용자 활성화', color: 'bg-green-100 text-green-700' },
  USER_ROLE_CHANGE: { label: '역할 변경', color: 'bg-purple-100 text-purple-700' },
  SUBSCRIPTION_CHANGE: { label: '구독 변경', color: 'bg-amber-100 text-amber-700' },
  SUBSCRIPTION_EXTEND: { label: '구독 연장', color: 'bg-blue-100 text-blue-700' },
  SUBSCRIPTION_CANCEL: { label: '구독 취소', color: 'bg-gray-100 text-gray-700' },
  PASSWORD_RESET: { label: '비밀번호 초기화', color: 'bg-orange-100 text-orange-700' },
  CLINIC_VERIFY: { label: '한의원 인증', color: 'bg-green-100 text-green-700' },
  CLINIC_REJECT: { label: '한의원 거절', color: 'bg-red-100 text-red-700' },
  CONTENT_CREATE: { label: '콘텐츠 생성', color: 'bg-green-100 text-green-700' },
  CONTENT_UPDATE: { label: '콘텐츠 수정', color: 'bg-blue-100 text-blue-700' },
  CONTENT_DELETE: { label: '콘텐츠 삭제', color: 'bg-red-100 text-red-700' },
}

// 대상 타입 라벨
const targetTypeLabels: Record<string, string> = {
  user: '사용자',
  subscription: '구독',
  clinic: '한의원',
  case: '치험례',
  formula: '처방',
  herb: '약재',
  interaction: '상호작용',
}

function ActionBadge({ action }: { action: string }) {
  const config = actionLabels[action] || { label: action, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
      {config.label}
    </span>
  )
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function JsonViewer({ data, title }: { data: Record<string, any> | null; title: string }) {
  const [expanded, setExpanded] = useState(false)

  if (!data || Object.keys(data).length === 0) {
    return <span className="text-gray-400 text-xs">-</span>
  }

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-600 hover:text-blue-700 underline"
      >
        {expanded ? '접기' : '보기'}
      </button>
      {expanded && (
        <div className="absolute z-10 top-6 left-0 w-72 bg-gray-900 text-gray-100 rounded-lg shadow-lg p-3 text-xs">
          <div className="font-medium text-gray-400 mb-2">{title}</div>
          <pre className="whitespace-pre-wrap break-all overflow-auto max-h-48">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function AdminAuditLogsPage() {
  const [data, setData] = useState<PaginatedAuditLogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 필터 상태
  const [actionFilter, setActionFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await adminAuditLogsApi.getLogs({
        page,
        limit,
        ...(actionFilter && { action: actionFilter }),
        ...(targetTypeFilter && { targetType: targetTypeFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })
      setData(result)
    } catch (err) {
      setError('감사 로그를 불러오는데 실패했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, targetTypeFilter, startDate, endDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleRefresh = () => {
    fetchLogs()
  }

  const clearFilters = () => {
    setActionFilter('')
    setTargetTypeFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
          <p className="text-gray-500 mt-1">관리자 활동 기록 조회 (SUPER_ADMIN 전용)</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          새로고침
        </button>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">필터</span>
          {(actionFilter || targetTypeFilter || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-blue-600 hover:text-blue-700"
            >
              필터 초기화
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 액션 타입 필터 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">액션 타입</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">모든 액션</option>
              {Object.entries(actionLabels).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 대상 타입 필터 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">대상 타입</label>
            <select
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">모든 대상</option>
              {Object.entries(targetTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 시작일 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">시작일</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* 종료일 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">종료일</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
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
                      관리자
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      액션
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      대상
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      이전 값
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      변경 값
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      시간
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.admin.name}</p>
                            <p className="text-xs text-gray-500">{log.admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {log.targetType && (
                            <span className="text-gray-600">
                              {targetTypeLabels[log.targetType] || log.targetType}
                            </span>
                          )}
                          {log.targetId && (
                            <p className="text-xs text-gray-400 font-mono truncate max-w-[120px]">
                              {log.targetId.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <JsonViewer data={log.oldValue} title="이전 값" />
                      </td>
                      <td className="px-4 py-3">
                        <JsonViewer data={log.newValue} title="변경 값" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {data?.logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>감사 로그가 없습니다.</p>
                      </td>
                    </tr>
                  )}
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
