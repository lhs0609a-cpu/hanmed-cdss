import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle,
  XCircle,
  Edit,
  Building,
  Phone,
  Mail,
  MapPin,
  User,
  Star,
  RefreshCw,
} from 'lucide-react'
import {
  adminClinicsApi,
  type AdminClinic,
  type PaginatedClinics,
  type GetClinicsParams,
  type ClinicVerificationStatus,
} from '@/services/admin-api'
import { cn } from '@/lib/utils'

// 인증 상태 배지
function VerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="h-3 w-3" />
        인증됨
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
      미인증
    </span>
  )
}

// 액션 메뉴
function ClinicActions({
  clinic,
  onVerify,
  onReject,
  onEdit,
}: {
  clinic: AdminClinic
  onVerify: (id: string) => void
  onReject: (id: string, reason: string) => void
  onEdit: (clinic: AdminClinic) => void
}) {
  const [open, setOpen] = useState(false)

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
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {!clinic.isHanmedVerified && (
              <button
                onClick={() => {
                  onVerify(clinic.id)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                인증 승인
              </button>
            )}

            {clinic.isHanmedVerified && (
              <button
                onClick={() => {
                  const reason = prompt('인증 취소 사유를 입력하세요:')
                  if (reason) {
                    onReject(clinic.id, reason)
                    setOpen(false)
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                인증 취소
              </button>
            )}

            <button
              onClick={() => {
                onEdit(clinic)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-4 w-4" />
              정보 수정
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// 상세 모달
function ClinicDetailModal({
  clinic,
  onClose,
  onSave,
}: {
  clinic: AdminClinic
  onClose: () => void
  onSave: (id: string, data: Partial<AdminClinic>) => void
}) {
  const [formData, setFormData] = useState({
    name: clinic.name,
    businessNumber: clinic.businessNumber || '',
    phone: clinic.phone || '',
    email: clinic.email || '',
    addressRoad: clinic.addressRoad || '',
    addressDetail: clinic.addressDetail || '',
    reservationEnabled: clinic.reservationEnabled,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(clinic.id, formData)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">한의원 정보 수정</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              한의원명
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자등록번호
            </label>
            <input
              type="text"
              value={formData.businessNumber}
              onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                전화번호
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              도로명 주소
            </label>
            <input
              type="text"
              value={formData.addressRoad}
              onChange={(e) => setFormData({ ...formData, addressRoad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상세 주소
            </label>
            <input
              type="text"
              value={formData.addressDetail}
              onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reservationEnabled"
              checked={formData.reservationEnabled}
              onChange={(e) =>
                setFormData({ ...formData, reservationEnabled: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <label htmlFor="reservationEnabled" className="text-sm text-gray-700">
              예약 기능 활성화
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminClinicsPage() {
  const [data, setData] = useState<PaginatedClinics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingClinic, setEditingClinic] = useState<AdminClinic | null>(null)

  // 필터 상태
  const [search, setSearch] = useState('')
  const [verificationFilter, setVerificationFilter] = useState<ClinicVerificationStatus | ''>('')
  const [page, setPage] = useState(1)
  const limit = 20

  const fetchClinics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: GetClinicsParams = {
        page,
        limit,
        ...(search && { search }),
        ...(verificationFilter && { verificationStatus: verificationFilter }),
      }
      const result = await adminClinicsApi.getClinics(params)
      setData(result)
    } catch (err) {
      setError('한의원 목록을 불러오는데 실패했습니다.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, verificationFilter])

  useEffect(() => {
    fetchClinics()
  }, [fetchClinics])

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1)
      fetchClinics()
    }
  }

  const handleVerify = async (id: string) => {
    try {
      await adminClinicsApi.verifyClinic(id)
      fetchClinics()
    } catch (err) {
      alert('인증 승인에 실패했습니다.')
    }
  }

  const handleReject = async (id: string, reason: string) => {
    try {
      await adminClinicsApi.rejectClinic(id, reason)
      fetchClinics()
    } catch (err) {
      alert('인증 취소에 실패했습니다.')
    }
  }

  const handleSave = async (id: string, updates: Partial<AdminClinic>) => {
    try {
      // null 값을 undefined로 변환하여 UpdateClinicParams 타입에 맞춤
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [key, value === null ? undefined : value])
      )
      await adminClinicsApi.updateClinic(id, cleanedUpdates)
      fetchClinics()
    } catch (err) {
      alert('정보 수정에 실패했습니다.')
      throw err
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">한의원 관리</h1>
          <p className="text-gray-500 mt-1">
            전체 {data?.total.toLocaleString() || 0}개의 한의원
          </p>
        </div>
        <button
          onClick={() => fetchClinics()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          새로고침
        </button>
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
              placeholder="한의원명, 주소, 사업자번호로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* 필터들 */}
          <div className="flex gap-2">
            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value as ClinicVerificationStatus | '')
                setPage(1)
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">모든 인증상태</option>
              <option value="verified">인증됨</option>
              <option value="pending">미인증</option>
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
                      한의원
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      사업자번호
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      연락처
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      인증상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      소유자
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      평점
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.clinics.map((clinic) => (
                    <tr key={clinic.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{clinic.name}</p>
                            {clinic.addressRoad && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {clinic.addressRoad}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {clinic.businessNumber || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {clinic.phone && (
                            <p className="flex items-center gap-1 text-gray-600">
                              <Phone className="h-3 w-3" />
                              {clinic.phone}
                            </p>
                          )}
                          {clinic.email && (
                            <p className="flex items-center gap-1 text-gray-500 text-xs">
                              <Mail className="h-3 w-3" />
                              {clinic.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <VerificationBadge verified={clinic.isHanmedVerified} />
                      </td>
                      <td className="px-4 py-3">
                        {clinic.owner ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="h-3 w-3 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-900">{clinic.owner.name}</p>
                              <p className="text-xs text-gray-500">{clinic.owner.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {clinic.ratingAverage.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({clinic.reviewCount})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ClinicActions
                          clinic={clinic}
                          onVerify={handleVerify}
                          onReject={handleReject}
                          onEdit={setEditingClinic}
                        />
                      </td>
                    </tr>
                  ))}
                  {data?.clinics.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>등록된 한의원이 없습니다.</p>
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

      {/* 수정 모달 */}
      {editingClinic && (
        <ClinicDetailModal
          clinic={editingClinic}
          onClose={() => setEditingClinic(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
