import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  User,
  ChevronRight,
  Loader2,
  FileText,
  Edit2,
  Trash2,
  Filter,
  SortDesc,
  Star,
  StarOff,
  Download,
  Upload,
} from 'lucide-react'

// 개인 치험례 인터페이스
interface MyCase {
  id: string
  createdAt: Date
  updatedAt: Date
  // 환자 정보
  patientAge?: number
  patientGender?: 'M' | 'F'
  patientConstitution?: string
  // 증상 및 진단
  chiefComplaint: string
  symptoms: string[]
  diagnosis?: string
  byeonjeung?: string // 변증
  // 처방
  formulaName: string
  herbs: Array<{ name: string; amount: string }>
  modifications?: string // 가감내용
  // 치료 결과
  treatmentDuration?: string
  outcome?: '완치' | '호전' | '무효' | '진행중'
  outcomeDetails?: string
  // 추가 정보
  notes?: string
  tags?: string[]
  isStarred?: boolean
}

// 로컬 스토리지 키
const MY_CASES_STORAGE_KEY = 'ongojishin_my_cases'

export default function MyCasesPage() {
  const [cases, setCases] = useState<MyCase[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOutcome, setFilterOutcome] = useState<string>('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'starred'>('newest')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // 로컬 스토리지에서 케이스 로드
  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = () => {
    setIsLoading(true)
    try {
      const saved = localStorage.getItem(MY_CASES_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setCases(parsed.map((c: MyCase) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })))
      }
    } catch (error) {
      console.error('Failed to load cases:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveCases = (newCases: MyCase[]) => {
    localStorage.setItem(MY_CASES_STORAGE_KEY, JSON.stringify(newCases))
    setCases(newCases)
  }

  const toggleStar = (caseId: string) => {
    const updated = cases.map(c =>
      c.id === caseId ? { ...c, isStarred: !c.isStarred } : c
    )
    saveCases(updated)
  }

  const deleteCase = (caseId: string) => {
    if (confirm('이 치험례를 삭제하시겠습니까?')) {
      const updated = cases.filter(c => c.id !== caseId)
      saveCases(updated)
    }
  }

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
          return b.createdAt.getTime() - a.createdAt.getTime()
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime()
        case 'starred':
          if (a.isStarred === b.isStarred) return b.createdAt.getTime() - a.createdAt.getTime()
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: '호전/완치', value: stats.completed, color: 'bg-green-100 text-green-700' },
          { label: '진행중', value: stats.inProgress, color: 'bg-blue-100 text-blue-700' },
          { label: '즐겨찾기', value: stats.starred, color: 'bg-amber-100 text-amber-700' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-xl ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
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
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {caseItem.chiefComplaint}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{caseItem.createdAt.toLocaleDateString('ko-KR')}</span>
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
                  onClick={() => toggleStar(caseItem.id)}
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
                      ? 'bg-emerald-100 text-emerald-700'
                      : caseItem.outcome === '진행중'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {caseItem.outcome}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Link
                  to={`/my-cases/${caseItem.id}`}
                  className="flex-1 py-2 text-center text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                >
                  상세보기
                </Link>
                <button
                  onClick={() => deleteCase(caseItem.id)}
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
          onSave={(newCase) => {
            const caseWithId: MyCase = {
              ...newCase,
              id: crypto.randomUUID(),
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            saveCases([...cases, caseWithId])
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
  onSave: (data: Omit<MyCase, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.chiefComplaint.trim() || !formData.formulaName.trim()) {
      alert('주소증과 처방명은 필수입니다.')
      return
    }

    onSave({
      patientAge: formData.patientAge ? parseInt(formData.patientAge) : undefined,
      patientGender: formData.patientGender || undefined,
      patientConstitution: formData.patientConstitution || undefined,
      chiefComplaint: formData.chiefComplaint,
      symptoms: formData.symptoms.split(',').map(s => s.trim()).filter(Boolean),
      diagnosis: formData.diagnosis || undefined,
      byeonjeung: formData.byeonjeung || undefined,
      formulaName: formData.formulaName,
      herbs: formData.herbs.split(',').map(h => {
        const parts = h.trim().split(' ')
        return { name: parts[0], amount: parts[1] || '' }
      }).filter(h => h.name),
      modifications: formData.modifications || undefined,
      treatmentDuration: formData.treatmentDuration || undefined,
      outcome: formData.outcome || undefined,
      outcomeDetails: formData.outcomeDetails || undefined,
      notes: formData.notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
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

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
