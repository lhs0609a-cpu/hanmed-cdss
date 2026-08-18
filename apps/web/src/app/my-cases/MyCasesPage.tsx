import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  User,
  Loader2,
  Trash2,
  Star,
  StarOff,
  Download,
  ChevronDown,
} from 'lucide-react'
import {
  fetchMyCases,
  createMyCase,
  updateMyCase,
  deleteMyCase,
  importLocalCases,
  type MyCase,
  type NewMyCasePayload,
} from '@/services/myCases'
import { logError } from '@/lib/errors'

export default function MyCasesPage() {
  const [cases, setCases] = useState<MyCase[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOutcome, setFilterOutcome] = useState<string>('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'starred'>('newest')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [migratedCount, setMigratedCount] = useState(0)

  /**
   * 서버에서 치험례를 불러온다.
   * 예전 브라우저 저장분이 남아 있으면 먼저 서버로 올린 뒤 조회한다 —
   * 순서를 바꾸면 이관한 기록이 이번 화면에서는 안 보인다.
   */
  const loadCases = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const moved = await importLocalCases()
      if (moved > 0) setMigratedCount(moved)
      setCases(await fetchMyCases())
    } catch (error) {
      logError(error, 'MyCasesPage.load')
      setLoadError('치험례를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCases()
  }, [loadCases])

  const toggleStar = async (caseId: string) => {
    const target = cases.find((c) => c.id === caseId)
    if (!target) return
    const next = !target.isStarred
    // 먼저 화면을 바꾸고 서버에 보낸다 — 별표는 실패해도 잃을 게 없다.
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, isStarred: next } : c)))
    try {
      await updateMyCase(caseId, { isStarred: next })
    } catch (error) {
      logError(error, 'MyCasesPage.star')
      setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, isStarred: !next } : c)))
    }
  }

  const deleteCase = async (caseId: string) => {
    if (!confirm('이 치험례를 삭제하시겠습니까?')) return
    try {
      await deleteMyCase(caseId)
      setCases((prev) => prev.filter((c) => c.id !== caseId))
    } catch (error) {
      logError(error, 'MyCasesPage.delete')
      alert('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  /** 내보내기 — 서버에 있는 내 치험례를 그대로 파일로 뽑는다. */
  const exportCases = () => {
    const dataStr = JSON.stringify(cases, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my_cases_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  // 필터링 및 정렬
  const filteredCases = cases
    .filter(c => {
      const matchesSearch = !searchQuery ||
        c.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.formulaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.symptoms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesOutcome = !filterOutcome || c.outcome === filterOutcome

      return matchesSearch && matchesOutcome
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.localeCompare(a.createdAt)
        case 'oldest':
          return a.createdAt.localeCompare(b.createdAt)
        case 'starred':
          if (a.isStarred === b.isStarred) return b.createdAt.localeCompare(a.createdAt)
          return a.isStarred ? -1 : 1
        default:
          return 0
      }
    })

  // 통계
  const stats = {
    total: cases.length,
    completed: cases.filter(c => c.outcome === '완치' || c.outcome === '호전').length,
    inProgress: cases.filter(c => c.outcome === '진행중').length,
    starred: cases.filter(c => c.isStarred).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-indigo-500" />
            내 치험례
          </h1>
          <p className="mt-1 text-gray-500">
            나만의 임상 경험을 기록하고 축적하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCases}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            title="내보내기"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            치험례 추가
          </button>
        </div>
      </div>

      {/* 이관 결과 — 예전 브라우저 저장분을 옮겼을 때만 뜬다. */}
      {migratedCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-blue-800">
            이 브라우저에만 있던 치험례 <strong>{migratedCount}건</strong>을 계정으로 옮겼습니다.
            이제 다른 PC에서 로그인해도 그대로 보입니다.
          </p>
        </div>
      )}

      {loadError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[13px] leading-relaxed text-red-800">{loadError}</p>
          <button
            onClick={() => void loadCases()}
            className="shrink-0 text-[13px] font-semibold text-red-700 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체', value: stats.total, accent: 'text-neutral-700 dark:text-neutral-200' },
          { label: '호전/완치', value: stats.completed, accent: 'text-green-600' },
          { label: '진행중', value: stats.inProgress, accent: 'text-blue-600' },
          { label: '즐겨찾기', value: stats.starred, accent: 'text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="glass-tile rounded-2xl p-4">
            <p className={`text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
            <p className="text-sm text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="surface-card rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="주소증, 처방명, 증상으로 검색..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Outcome Filter */}
          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">모든 결과</option>
            <option value="완치">완치</option>
            <option value="호전">호전</option>
            <option value="진행중">진행중</option>
            <option value="무효">무효</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="starred">즐겨찾기 우선</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {cases.length === 0 ? '아직 기록된 치험례가 없습니다' : '검색 결과가 없습니다'}
          </h3>
          <p className="text-gray-500 mb-6">
            {cases.length === 0
              ? '첫 번째 치험례를 추가하여 나만의 임상 경험을 축적하세요'
              : '다른 검색어를 시도해보세요'}
          </p>
          {cases.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              첫 치험례 추가하기
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="surface-card rounded-2xl p-5 hover:shadow-md transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {caseItem.chiefComplaint}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(caseItem.createdAt).toLocaleDateString('ko-KR')}</span>
                    {caseItem.patientAge && (
                      <>
                        <span className="text-gray-300">|</span>
                        <User className="h-3.5 w-3.5" />
                        <span>
                          {caseItem.patientAge}세 {caseItem.patientGender === 'M' ? '남' : '여'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void toggleStar(caseItem.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {caseItem.isStarred ? (
                    <Star className="h-5 w-5 text-amber-500 fill-current" />
                  ) : (
                    <StarOff className="h-5 w-5 text-gray-300" />
                  )}
                </button>
              </div>

              {/* Symptoms */}
              {caseItem.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {caseItem.symptoms.slice(0, 4).map((symptom, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md"
                    >
                      {symptom}
                    </span>
                  ))}
                  {caseItem.symptoms.length > 4 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-md">
                      +{caseItem.symptoms.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Formula & Outcome */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                  {caseItem.formulaName}
                </span>
                {caseItem.outcome && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    caseItem.outcome === '완치'
                      ? 'bg-green-100 text-green-700'
                      : caseItem.outcome === '호전'
                      ? 'bg-green-100 text-green-700'
                      : caseItem.outcome === '진행중'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {caseItem.outcome}
                  </span>
                )}
              </div>

              {/* Actions */}
              {/* 펼쳐서 본다 — 예전에는 없는 라우트(/my-cases/:id)로 보내는
                  '상세보기' 링크라 눌러도 빈 화면이었다. */}
              {expandedId === caseItem.id && (
                <dl className="mb-3 space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
                  {caseItem.byeonjeung && (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-gray-500">변증</dt>
                      <dd className="text-gray-800">{caseItem.byeonjeung}</dd>
                    </div>
                  )}
                  {caseItem.herbs.length > 0 && (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-gray-500">약재</dt>
                      <dd className="text-gray-800">
                        {caseItem.herbs.map((h) => `${h.name}${h.amount ? ` ${h.amount}` : ''}`).join(', ')}
                      </dd>
                    </div>
                  )}
                  {caseItem.modifications && (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-gray-500">가감</dt>
                      <dd className="text-gray-800">{caseItem.modifications}</dd>
                    </div>
                  )}
                  {caseItem.treatmentDuration && (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-gray-500">치료 기간</dt>
                      <dd className="text-gray-800">{caseItem.treatmentDuration}</dd>
                    </div>
                  )}
                  {caseItem.outcomeDetails && (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-gray-500">경과</dt>
                      <dd className="text-gray-800">{caseItem.outcomeDetails}</dd>
                    </div>
                  )}
                  {caseItem.notes && (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-gray-500">메모</dt>
                      <dd className="whitespace-pre-wrap text-gray-800">{caseItem.notes}</dd>
                    </div>
                  )}
                </dl>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setExpandedId(expandedId === caseItem.id ? null : caseItem.id)}
                  className="flex flex-1 items-center justify-center gap-1 py-2 text-center text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                >
                  {expandedId === caseItem.id ? '접기' : '자세히'}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expandedId === caseItem.id ? 'rotate-180' : ''}`}
                  />
                </button>
                <button
                  onClick={() => void deleteCase(caseItem.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Case Modal */}
      {showAddModal && (
        <AddCaseModal
          onClose={() => setShowAddModal(false)}
          onSave={async (newCase) => {
            const saved = await createMyCase(newCase)
            setCases((prev) => [saved, ...prev])
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

// 치험례 추가 모달
function AddCaseModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: NewMyCasePayload) => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    patientAge: '',
    patientGender: '' as '' | 'M' | 'F',
    patientConstitution: '',
    chiefComplaint: '',
    symptoms: '',
    diagnosis: '',
    byeonjeung: '',
    formulaName: '',
    herbs: '',
    modifications: '',
    treatmentDuration: '',
    outcome: '' as '' | '완치' | '호전' | '무효' | '진행중',
    outcomeDetails: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    if (!formData.chiefComplaint.trim() || !formData.formulaName.trim()) {
      setSaveError('주소증과 처방명은 필수입니다.')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      await onSave({
        patientAge: formData.patientAge ? parseInt(formData.patientAge) : null,
        patientGender: formData.patientGender || null,
        patientConstitution: formData.patientConstitution || null,
        chiefComplaint: formData.chiefComplaint.trim(),
        symptoms: formData.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        diagnosis: formData.diagnosis || null,
        byeonjeung: formData.byeonjeung || null,
        formulaName: formData.formulaName.trim(),
        herbs: formData.herbs.split(',').map(h => {
          const parts = h.trim().split(' ')
          return { name: parts[0], amount: parts[1] || '' }
        }).filter(h => h.name),
        modifications: formData.modifications || null,
        treatmentDuration: formData.treatmentDuration || null,
        outcome: formData.outcome || null,
        outcomeDetails: formData.outcomeDetails || null,
        notes: formData.notes || null,
      })
    } catch (error) {
      logError(error, 'MyCasesPage.create')
      setSaveError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass-surface border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">새 치험례 추가</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          {/* Patient Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">나이</label>
              <input
                type="number"
                value={formData.patientAge}
                onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                placeholder="예: 45"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
              <select
                value={formData.patientGender}
                onChange={(e) => setFormData({ ...formData, patientGender: e.target.value as typeof formData.patientGender })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">선택</option>
                <option value="M">남성</option>
                <option value="F">여성</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">체질</label>
              <select
                value={formData.patientConstitution}
                onChange={(e) => setFormData({ ...formData, patientConstitution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">미상</option>
                <option value="태양인">태양인</option>
                <option value="태음인">태음인</option>
                <option value="소양인">소양인</option>
                <option value="소음인">소음인</option>
              </select>
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">주소증 *</label>
            <textarea
              value={formData.chiefComplaint}
              onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              placeholder="환자의 주된 호소 증상"
              rows={2}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">동반 증상 (쉼표로 구분)</label>
            <input
              type="text"
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              placeholder="예: 두통, 어지러움, 피로"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Diagnosis & Byeonjeung */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">진단명</label>
              <input
                type="text"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="예: 두통, 현훈"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">변증</label>
              <input
                type="text"
                value={formData.byeonjeung}
                onChange={(e) => setFormData({ ...formData, byeonjeung: e.target.value })}
                placeholder="예: 간양상항"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Formula */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">처방명 *</label>
            <input
              type="text"
              value={formData.formulaName}
              onChange={(e) => setFormData({ ...formData, formulaName: e.target.value })}
              placeholder="예: 반하백출천마탕"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Herbs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">구성 약재 (약재명 용량, 쉼표로 구분)</label>
            <input
              type="text"
              value={formData.herbs}
              onChange={(e) => setFormData({ ...formData, herbs: e.target.value })}
              placeholder="예: 반하 6g, 백출 9g, 천마 6g"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Treatment Result */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">치료 기간</label>
              <input
                type="text"
                value={formData.treatmentDuration}
                onChange={(e) => setFormData({ ...formData, treatmentDuration: e.target.value })}
                placeholder="예: 2주"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">치료 결과</label>
              <select
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value as typeof formData.outcome })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">선택</option>
                <option value="완치">완치</option>
                <option value="호전">호전</option>
                <option value="진행중">진행중</option>
                <option value="무효">무효</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="치료 과정, 가감 내용, 특이사항 등"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100">
          {saveError && (
            <p className="mb-3 text-sm text-red-600">{saveError}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-60"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
