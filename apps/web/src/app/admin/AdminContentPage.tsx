import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  FileText,
  Beaker,
  Leaf,
  AlertTriangle,
  X,
} from 'lucide-react'
import {
  adminContentApi,
  type ClinicalCase,
  type Formula,
  type Herb,
  type DrugHerbInteraction,
  type ContentQueryParams,
  type PaginatedContentResponse,
  type CreateCaseParams,
  type Severity,
} from '@/services/admin-api'
import { cn } from '@/lib/utils'

type TabType = 'cases' | 'formulas' | 'herbs' | 'interactions'

interface Tab {
  id: TabType
  name: string
  icon: React.ComponentType<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'cases', name: '치험례', icon: FileText },
  { id: 'formulas', name: '처방', icon: Beaker },
  { id: 'herbs', name: '약재', icon: Leaf },
  { id: 'interactions', name: '상호작용', icon: AlertTriangle },
]

// 심각도 배지
function SeverityBadge({ severity }: { severity: string }) {
  const styles = {
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
  }
  const labels = {
    critical: '위험',
    warning: '주의',
    info: '정보',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[severity as keyof typeof styles] || 'bg-gray-100 text-gray-600')}>
      {labels[severity as keyof typeof labels] || severity}
    </span>
  )
}

// 공통 테이블 컴포넌트
function DataTable<T extends { id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  loading,
  error,
  emptyMessage,
  emptyIcon: EmptyIcon,
}: {
  data: T[] | null
  columns: Array<{
    key: string
    header: string
    render: (item: T) => React.ReactNode
    className?: string
  }>
  onEdit: (item: T) => void
  onDelete: (id: string) => void
  loading: boolean
  error: string | null
  emptyMessage: string
  emptyIcon: React.ComponentType<{ className?: string }>
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">{error}</div>
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <EmptyIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase', col.className)}
              >
                {col.header}
              </th>
            ))}
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
              액션
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3', col.className)}>
                  {col.render(item)}
                </td>
              ))}
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-blue-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('정말 삭제하시겠습니까?')) {
                        onDelete(item.id)
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 모달 컴포넌트
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// 치험례 탭
function CasesTab() {
  const [data, setData] = useState<PaginatedContentResponse<ClinicalCase> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingItem, setEditingItem] = useState<ClinicalCase | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const limit = 20

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: ContentQueryParams = { page, limit, ...(search && { search }) }
      const result = await adminContentApi.getCases(params)
      setData(result)
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    try {
      await adminContentApi.deleteCase(id)
      fetchData()
    } catch (err) {
      alert('삭제에 실패했습니다.')
    }
  }

  const columns = [
    {
      key: 'sourceId',
      header: '기록번호',
      render: (item: ClinicalCase) => (
        <span className="text-sm font-medium text-gray-900">{item.sourceId}</span>
      ),
    },
    {
      key: 'year',
      header: '기록년도',
      render: (item: ClinicalCase) => <span className="text-sm text-gray-600">{item.recordedYear}</span>,
    },
    {
      key: 'chiefComplaint',
      header: '주소증',
      render: (item: ClinicalCase) => (
        <span className="text-sm text-gray-600 line-clamp-2 max-w-xs">{item.chiefComplaint}</span>
      ),
    },
    {
      key: 'pattern',
      header: '변증',
      render: (item: ClinicalCase) => (
        <span className="text-sm text-gray-600">{item.patternDiagnosis || '-'}</span>
      ),
    },
    {
      key: 'outcome',
      header: '결과',
      render: (item: ClinicalCase) => (
        <span className="text-sm text-gray-600">{item.treatmentOutcome || '-'}</span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            placeholder="검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          추가
        </button>
      </div>

      <DataTable
        data={data?.items || null}
        columns={columns}
        onEdit={setEditingItem}
        onDelete={handleDelete}
        loading={loading}
        error={error}
        emptyMessage="등록된 치험례가 없습니다."
        emptyIcon={FileText}
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {(page - 1) * limit + 1} - {Math.min(page * limit, data.total)} / {data.total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 text-sm">{page} / {data.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {(editingItem || isCreating) && (
        <CaseFormModal
          item={editingItem}
          onClose={() => { setEditingItem(null); setIsCreating(false); }}
          onSave={() => { setEditingItem(null); setIsCreating(false); fetchData(); }}
        />
      )}
    </div>
  )
}

function CaseFormModal({
  item,
  onClose,
  onSave,
}: {
  item: ClinicalCase | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    sourceId: item?.sourceId || '',
    recordedYear: item?.recordedYear || new Date().getFullYear(),
    recorderName: item?.recorderName || '',
    chiefComplaint: item?.chiefComplaint || '',
    patternDiagnosis: item?.patternDiagnosis || '',
    treatmentOutcome: (item?.treatmentOutcome || '') as '' | '완치' | '호전' | '악화' | '불변',
    originalText: item?.originalText || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const submitData: Partial<CreateCaseParams> = {
        ...formData,
        treatmentOutcome: formData.treatmentOutcome || undefined,
      }
      if (item) {
        await adminContentApi.updateCase(item.id, submitData)
      } else {
        await adminContentApi.createCase(submitData as CreateCaseParams)
      }
      onSave()
    } catch (err) {
      alert('저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={item ? '치험례 수정' : '치험례 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">기록번호 *</label>
            <input
              type="text"
              required
              value={formData.sourceId}
              onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">기록년도 *</label>
            <input
              type="number"
              required
              value={formData.recordedYear}
              onChange={(e) => setFormData({ ...formData, recordedYear: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">기록자</label>
          <input
            type="text"
            value={formData.recorderName}
            onChange={(e) => setFormData({ ...formData, recorderName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">주소증 *</label>
          <textarea
            required
            rows={3}
            value={formData.chiefComplaint}
            onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">변증 진단</label>
            <input
              type="text"
              value={formData.patternDiagnosis}
              onChange={(e) => setFormData({ ...formData, patternDiagnosis: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">치료 결과</label>
            <select
              value={formData.treatmentOutcome}
              onChange={(e) => setFormData({ ...formData, treatmentOutcome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">선택</option>
              <option value="완치">완치</option>
              <option value="호전">호전</option>
              <option value="불변">불변</option>
              <option value="악화">악화</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">원본 텍스트 *</label>
          <textarea
            required
            rows={5}
            value={formData.originalText}
            onChange={(e) => setFormData({ ...formData, originalText: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// 처방 탭
function FormulasTab() {
  const [data, setData] = useState<PaginatedContentResponse<Formula> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingItem, setEditingItem] = useState<Formula | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const limit = 20

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: ContentQueryParams = { page, limit, ...(search && { search }) }
      const result = await adminContentApi.getFormulas(params)
      setData(result)
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    try {
      await adminContentApi.deleteFormula(id)
      fetchData()
    } catch (err) {
      alert('삭제에 실패했습니다.')
    }
  }

  const columns = [
    {
      key: 'name',
      header: '처방명',
      render: (item: Formula) => (
        <div>
          <span className="text-sm font-medium text-gray-900">{item.name}</span>
          {item.hanja && <span className="text-xs text-gray-500 ml-1">({item.hanja})</span>}
        </div>
      ),
    },
    {
      key: 'category',
      header: '분류',
      render: (item: Formula) => <span className="text-sm text-gray-600">{item.category}</span>,
    },
    {
      key: 'source',
      header: '출전',
      render: (item: Formula) => <span className="text-sm text-gray-600">{item.source || '-'}</span>,
    },
    {
      key: 'herbs',
      header: '약재',
      render: (item: Formula) => (
        <span className="text-sm text-gray-600">{item.formulaHerbs?.length || 0}종</span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            placeholder="검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          추가
        </button>
      </div>

      <DataTable
        data={data?.items || null}
        columns={columns}
        onEdit={setEditingItem}
        onDelete={handleDelete}
        loading={loading}
        error={error}
        emptyMessage="등록된 처방이 없습니다."
        emptyIcon={Beaker}
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {(page - 1) * limit + 1} - {Math.min(page * limit, data.total)} / {data.total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 text-sm">{page} / {data.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {(editingItem || isCreating) && (
        <FormulaFormModal
          item={editingItem}
          onClose={() => { setEditingItem(null); setIsCreating(false); }}
          onSave={() => { setEditingItem(null); setIsCreating(false); fetchData(); }}
        />
      )}
    </div>
  )
}

function FormulaFormModal({
  item,
  onClose,
  onSave,
}: {
  item: Formula | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    hanja: item?.hanja || '',
    category: item?.category || '',
    source: item?.source || '',
    indication: item?.indication || '',
    pathogenesis: item?.pathogenesis || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (item) {
        await adminContentApi.updateFormula(item.id, formData)
      } else {
        await adminContentApi.createFormula(formData as any)
      }
      onSave()
    } catch (err) {
      alert('저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={item ? '처방 수정' : '처방 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">처방명 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">한자명</label>
            <input
              type="text"
              value={formData.hanja}
              onChange={(e) => setFormData({ ...formData, hanja: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">분류 *</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="해표제, 청열제 등"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">출전</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="상한론, 동의보감 등"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">주치</label>
          <textarea
            rows={3}
            value={formData.indication}
            onChange={(e) => setFormData({ ...formData, indication: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">병기</label>
          <textarea
            rows={3}
            value={formData.pathogenesis}
            onChange={(e) => setFormData({ ...formData, pathogenesis: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// 약재 탭
function HerbsTab() {
  const [data, setData] = useState<PaginatedContentResponse<Herb> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingItem, setEditingItem] = useState<Herb | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const limit = 20

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: ContentQueryParams = { page, limit, ...(search && { search }) }
      const result = await adminContentApi.getHerbs(params)
      setData(result)
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    try {
      await adminContentApi.deleteHerb(id)
      fetchData()
    } catch (err) {
      alert('삭제에 실패했습니다.')
    }
  }

  const columns = [
    {
      key: 'name',
      header: '약재명',
      render: (item: Herb) => (
        <div>
          <span className="text-sm font-medium text-gray-900">{item.standardName}</span>
          {item.hanjaName && <span className="text-xs text-gray-500 ml-1">({item.hanjaName})</span>}
        </div>
      ),
    },
    {
      key: 'category',
      header: '분류',
      render: (item: Herb) => <span className="text-sm text-gray-600">{item.category}</span>,
    },
    {
      key: 'meridian',
      header: '귀경',
      render: (item: Herb) => (
        <span className="text-sm text-gray-600">{item.meridianTropism?.join(', ') || '-'}</span>
      ),
    },
    {
      key: 'efficacy',
      header: '효능',
      render: (item: Herb) => (
        <span className="text-sm text-gray-600 line-clamp-1 max-w-xs">{item.efficacy || '-'}</span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            placeholder="검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          추가
        </button>
      </div>

      <DataTable
        data={data?.items || null}
        columns={columns}
        onEdit={setEditingItem}
        onDelete={handleDelete}
        loading={loading}
        error={error}
        emptyMessage="등록된 약재가 없습니다."
        emptyIcon={Leaf}
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {(page - 1) * limit + 1} - {Math.min(page * limit, data.total)} / {data.total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 text-sm">{page} / {data.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {(editingItem || isCreating) && (
        <HerbFormModal
          item={editingItem}
          onClose={() => { setEditingItem(null); setIsCreating(false); }}
          onSave={() => { setEditingItem(null); setIsCreating(false); fetchData(); }}
        />
      )}
    </div>
  )
}

function HerbFormModal({
  item,
  onClose,
  onSave,
}: {
  item: Herb | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    standardName: item?.standardName || '',
    hanjaName: item?.hanjaName || '',
    category: item?.category || '',
    meridianTropism: item?.meridianTropism?.join(', ') || '',
    efficacy: item?.efficacy || '',
    contraindications: item?.contraindications || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...formData,
        meridianTropism: formData.meridianTropism
          ? formData.meridianTropism.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      }
      if (item) {
        await adminContentApi.updateHerb(item.id, payload)
      } else {
        await adminContentApi.createHerb(payload as any)
      }
      onSave()
    } catch (err) {
      alert('저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={item ? '약재 수정' : '약재 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">약재명 *</label>
            <input
              type="text"
              required
              value={formData.standardName}
              onChange={(e) => setFormData({ ...formData, standardName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">한자명</label>
            <input
              type="text"
              value={formData.hanjaName}
              onChange={(e) => setFormData({ ...formData, hanjaName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">분류 *</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="해표약, 청열약 등"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">귀경</label>
            <input
              type="text"
              value={formData.meridianTropism}
              onChange={(e) => setFormData({ ...formData, meridianTropism: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="쉼표로 구분 (폐, 위, 대장)"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">효능</label>
          <textarea
            rows={3}
            value={formData.efficacy}
            onChange={(e) => setFormData({ ...formData, efficacy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">금기사항</label>
          <textarea
            rows={2}
            value={formData.contraindications}
            onChange={(e) => setFormData({ ...formData, contraindications: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// 상호작용 탭
function InteractionsTab() {
  const [data, setData] = useState<PaginatedContentResponse<DrugHerbInteraction> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingItem, setEditingItem] = useState<DrugHerbInteraction | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const limit = 20

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: ContentQueryParams = { page, limit, ...(search && { search }) }
      const result = await adminContentApi.getInteractions(params)
      setData(result)
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    try {
      await adminContentApi.deleteInteraction(id)
      fetchData()
    } catch (err) {
      alert('삭제에 실패했습니다.')
    }
  }

  const columns = [
    {
      key: 'drug',
      header: '양약명',
      render: (item: DrugHerbInteraction) => (
        <span className="text-sm font-medium text-gray-900">{item.drugName}</span>
      ),
    },
    {
      key: 'herb',
      header: '약재',
      render: (item: DrugHerbInteraction) => (
        <span className="text-sm text-gray-600">{item.herb?.standardName || '-'}</span>
      ),
    },
    {
      key: 'type',
      header: '유형',
      render: (item: DrugHerbInteraction) => {
        const typeLabels = { increase: '효과 증강', decrease: '효과 감소', dangerous: '위험' }
        return (
          <span className="text-sm text-gray-600">
            {typeLabels[item.interactionType as keyof typeof typeLabels] || item.interactionType}
          </span>
        )
      },
    },
    {
      key: 'severity',
      header: '심각도',
      render: (item: DrugHerbInteraction) => <SeverityBadge severity={item.severity} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            placeholder="검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          추가
        </button>
      </div>

      <DataTable
        data={data?.items || null}
        columns={columns}
        onEdit={setEditingItem}
        onDelete={handleDelete}
        loading={loading}
        error={error}
        emptyMessage="등록된 상호작용 정보가 없습니다."
        emptyIcon={AlertTriangle}
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {(page - 1) * limit + 1} - {Math.min(page * limit, data.total)} / {data.total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 text-sm">{page} / {data.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {(editingItem || isCreating) && (
        <InteractionFormModal
          item={editingItem}
          onClose={() => { setEditingItem(null); setIsCreating(false); }}
          onSave={() => { setEditingItem(null); setIsCreating(false); fetchData(); }}
        />
      )}
    </div>
  )
}

function InteractionFormModal({
  item,
  onClose,
  onSave,
}: {
  item: DrugHerbInteraction | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    drugName: item?.drugName || '',
    drugAtcCode: item?.drugAtcCode || '',
    herbId: item?.herbId || '',
    interactionType: item?.interactionType || 'warning',
    severity: (item?.severity || 'warning') as Severity,
    mechanism: item?.mechanism || '',
    recommendation: item?.recommendation || '',
  })
  const [loading, setLoading] = useState(false)
  const [herbs, setHerbs] = useState<Herb[]>([])

  useEffect(() => {
    // 약재 목록 로드
    adminContentApi.getHerbs({ limit: 1000 }).then((res) => setHerbs(res.items)).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (item) {
        await adminContentApi.updateInteraction(item.id, formData as any)
      } else {
        await adminContentApi.createInteraction(formData as any)
      }
      onSave()
    } catch (err) {
      alert('저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={item ? '상호작용 수정' : '상호작용 추가'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">양약명 *</label>
            <input
              type="text"
              required
              value={formData.drugName}
              onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ATC 코드</label>
            <input
              type="text"
              value={formData.drugAtcCode}
              onChange={(e) => setFormData({ ...formData, drugAtcCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">약재 *</label>
          <select
            required
            value={formData.herbId}
            onChange={(e) => setFormData({ ...formData, herbId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">선택</option>
            {herbs.map((herb) => (
              <option key={herb.id} value={herb.id}>
                {herb.standardName} {herb.hanjaName && `(${herb.hanjaName})`}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상호작용 유형 *</label>
            <select
              required
              value={formData.interactionType}
              onChange={(e) => setFormData({ ...formData, interactionType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="increase">효과 증강</option>
              <option value="decrease">효과 감소</option>
              <option value="dangerous">위험</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">심각도 *</label>
            <select
              required
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value as Severity })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="critical">위험 (병용 금기)</option>
              <option value="warning">주의 요망</option>
              <option value="info">참고 정보</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상호작용 기전</label>
          <textarea
            rows={3}
            value={formData.mechanism}
            onChange={(e) => setFormData({ ...formData, mechanism: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">권고사항</label>
          <textarea
            rows={2}
            value={formData.recommendation}
            onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// 메인 컴포넌트
export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<TabType>('cases')

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">콘텐츠 관리</h1>
        <p className="text-gray-500 mt-1">치험례, 처방, 약재, 상호작용 데이터 관리</p>
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="p-6">
          {activeTab === 'cases' && <CasesTab />}
          {activeTab === 'formulas' && <FormulasTab />}
          {activeTab === 'herbs' && <HerbsTab />}
          {activeTab === 'interactions' && <InteractionsTab />}
        </div>
      </div>
    </div>
  )
}
