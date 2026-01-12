import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  BookOpen,
  X,
  User,
  Pill,
  ChevronRight,
  TrendingUp,
  Activity,
  Brain,
  ChevronLeft,
  Loader2,
  FileText,
  Hash,
} from 'lucide-react'

// API에서 반환하는 케이스 타입
interface CaseFromAPI {
  id: string
  title: string
  chiefComplaint: string
  symptoms: string[]
  formulaName: string
  formulaHanja: string
  constitution: string
  diagnosis: string
  patientAge: number | null
  patientGender: string | null
  outcome: '완치' | '호전' | '무효' | null
  result: string
  originalText: string
  dataSource: string
}

// 상세 보기용 확장 타입
interface CaseRecord extends CaseFromAPI {
  // 상세 정보는 추후 별도 API에서 가져올 수 있음
}

// AI Engine API URL
const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL || 'https://api.ongojisin.co.kr'

// 성별 표시 함수
function formatGender(gender: string | null): string {
  if (!gender) return ''
  if (gender === 'M' || gender === 'male') return '남성'
  if (gender === 'F' || gender === 'female') return '여성'
  return gender
}

// 텍스트를 문단으로 분리 (줄바꿈 기준)
function formatTextWithParagraphs(text: string): string[] {
  if (!text) return []
  // 연속 줄바꿈을 기준으로 분리하되, 빈 문단 제거
  return text.split(/\n\n+/).filter(p => p.trim().length > 0)
}

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConstitution, setSelectedConstitution] = useState('')
  const [selectedOutcome, setSelectedOutcome] = useState('')

  // API 데이터 상태
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCases, setTotalCases] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [stats, setStats] = useState({ cured: 0, improved: 0, total: 0 })
  const ITEMS_PER_PAGE = 20

  // 상세 모달
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // 디바운스된 검색어
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // 검색 시 첫 페이지로
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 필터 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedConstitution, selectedOutcome])

  // API에서 데이터 가져오기
  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: ITEMS_PER_PAGE.toString(),
        })

        if (debouncedSearch) params.append('search', debouncedSearch)
        if (selectedConstitution) params.append('constitution', selectedConstitution)
        if (selectedOutcome) params.append('outcome', selectedOutcome)

        const response = await fetch(`${AI_ENGINE_URL}/api/v1/cases/list?${params}`)

        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다')
        }

        const data = await response.json()
        const result = data.data || data // NestJS 래퍼 형식 대응

        setCases(result.cases || [])
        setTotalCases(result.total || 0)
        setTotalPages(result.total_pages || 0)

        // 통계 계산
        const cured = (result.cases || []).filter((c: CaseRecord) => c.outcome === '완치').length
        const improved = (result.cases || []).filter((c: CaseRecord) => c.outcome === '호전').length
        setStats({ cured, improved, total: result.total || 0 })
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다')
        setCases([])
      } finally {
        setLoading(false)
      }
    }

    fetchCases()
  }, [currentPage, debouncedSearch, selectedConstitution, selectedOutcome])

  const openDetailModal = useCallback((caseItem: CaseRecord) => {
    setSelectedCase(caseItem)
    setShowDetailModal(true)
  }, [])

  const getOutcomeColor = useCallback((outcome: string | null) => {
    switch (outcome) {
      case '완치':
        return 'bg-green-100 text-green-700 border-green-200'
      case '호전':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case '무효':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-amber-500" />
          치험례 검색
        </h1>
        <p className="mt-1 text-gray-600">
          {totalCases > 0 ? `${totalCases.toLocaleString()}건의 치험례 데이터를 검색합니다.` : '치험례 데이터를 불러오는 중...'}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="증상, 처방명, 변증으로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={selectedConstitution}
            onChange={(e) => setSelectedConstitution(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          >
            <option value="">전체 체질</option>
            <option value="태양인">태양인</option>
            <option value="태음인">태음인</option>
            <option value="소양인">소양인</option>
            <option value="소음인">소음인</option>
          </select>
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          >
            <option value="">전체 결과</option>
            <option value="완치">완치</option>
            <option value="호전">호전</option>
            <option value="무효">무효</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">검색 결과</p>
          <p className="text-2xl font-bold text-gray-900">{totalCases.toLocaleString()}건</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">완치</p>
          <p className="text-2xl font-bold text-green-600">{stats.cured}건</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">호전</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.improved}건</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">전체 DB</p>
          <p className="text-2xl font-bold text-amber-600">{totalCases.toLocaleString()}건</p>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="h-12 w-12 text-amber-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">치험례를 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-red-100">
            <BookOpen className="h-12 w-12 text-red-300 mx-auto mb-4" />
            <p className="text-red-500">{error}</p>
            <p className="text-sm text-gray-400 mt-1">AI Engine 서버가 실행 중인지 확인해주세요</p>
          </div>
        )}

        {/* 결과 목록 */}
        {!loading && !error && cases.map((caseItem) => (
          <div
            key={caseItem.id}
            onClick={() => openDetailModal(caseItem)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                    {caseItem.formulaName || '처방 미상'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {caseItem.dataSource}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {caseItem.constitution && (
                  <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">
                    {caseItem.constitution}
                  </span>
                )}
                {caseItem.outcome && (
                  <span className={`text-sm px-2 py-1 rounded-lg font-medium ${getOutcomeColor(caseItem.outcome)}`}>
                    {caseItem.outcome}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-2">
                <Activity className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-gray-500 block">증상</span>
                  <span className="text-sm text-gray-700 line-clamp-2">
                    {caseItem.chiefComplaint || '-'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Pill className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-gray-500 block">처방</span>
                  <span className="text-sm text-amber-600 font-medium">{caseItem.formulaName || '-'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-gray-500 block">환자</span>
                  <span className="text-sm text-gray-700">
                    {formatGender(caseItem.patientGender)}
                    {caseItem.patientAge ? ` ${caseItem.patientAge}세` : ''}
                    {!caseItem.patientGender && !caseItem.patientAge && '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {caseItem.diagnosis && (
                  <>
                    <Brain className="h-4 w-4 inline mr-1" />
                    {caseItem.diagnosis}
                  </>
                )}
              </span>
              <span className="text-sm text-amber-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                상세 보기 <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}

        {/* 빈 결과 */}
        {!loading && !error && cases.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">검색 결과가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">다른 검색어로 시도해보세요</p>
          </div>
        )}

        {/* 페이지네이션 */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium ${
                      currentPage === pageNum
                        ? 'bg-amber-500 text-white'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 페이지 정보 */}
        {!loading && !error && totalCases > 0 && (
          <div className="text-center text-sm text-gray-500 pt-2">
            {totalCases.toLocaleString()}건 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, totalCases)}건 표시
          </div>
        )}
      </div>

      {/* 상세 정보 모달 - 전체 내용 표시 + 가독성 개선 */}
      {showDetailModal && selectedCase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-detail-title"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-white/20 rounded">{selectedCase.dataSource}</span>
                    {selectedCase.outcome && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          selectedCase.outcome === '완치'
                            ? 'bg-green-400 text-green-900'
                            : selectedCase.outcome === '호전'
                              ? 'bg-yellow-400 text-yellow-900'
                              : 'bg-red-400 text-red-900'
                        }`}
                      >
                        {selectedCase.outcome}
                      </span>
                    )}
                    {selectedCase.constitution && (
                      <span className="text-xs px-2 py-0.5 bg-purple-400 text-purple-900 rounded">
                        {selectedCase.constitution}
                      </span>
                    )}
                  </div>
                  <h2 id="case-detail-title" className="text-xl font-bold">{selectedCase.formulaName || '처방 미상'}</h2>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="닫기"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* 모달 본문 - 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 환자 정보 + 주요 증상 - 2열 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 환자 정보 */}
                <div className="bg-blue-50 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    환자 정보
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-blue-100">
                      <span className="text-gray-600">성별</span>
                      <span className="font-medium text-gray-900">
                        {formatGender(selectedCase.patientGender) || '-'}
                      </span>
                    </div>
                    {selectedCase.patientAge && (
                      <div className="flex justify-between items-center py-2 border-b border-blue-100">
                        <span className="text-gray-600">나이</span>
                        <span className="font-medium text-gray-900">{selectedCase.patientAge}세</span>
                      </div>
                    )}
                    {selectedCase.constitution && (
                      <div className="flex justify-between items-center py-2 border-b border-blue-100">
                        <span className="text-gray-600">체질</span>
                        <span className="font-medium text-purple-600">{selectedCase.constitution}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">출처</span>
                      <span className="font-medium text-gray-700 text-sm">{selectedCase.dataSource}</span>
                    </div>
                  </div>
                </div>

                {/* 처방 정보 */}
                <div className="bg-teal-50 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Pill className="h-5 w-5 text-teal-500" />
                    처방
                  </h3>
                  <p className="text-teal-700 font-bold text-xl mb-3">
                    {selectedCase.formulaName || '-'}
                    {selectedCase.formulaHanja && (
                      <span className="ml-2 text-base font-normal text-teal-600">({selectedCase.formulaHanja})</span>
                    )}
                  </p>
                  {selectedCase.diagnosis && (
                    <div className="mt-4 pt-4 border-t border-teal-200">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Brain className="h-4 w-4 text-purple-500" />
                        변증: <span className="font-medium text-purple-700">{selectedCase.diagnosis}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 주요 증상 - 전체 표시 */}
              {selectedCase.chiefComplaint && (
                <div className="bg-amber-50 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-amber-600" />
                    주요 증상
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-amber-200">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-[15px]">
                      {selectedCase.chiefComplaint}
                    </p>
                  </div>
                </div>
              )}

              {/* 증상 태그 */}
              {Array.isArray(selectedCase.symptoms) && selectedCase.symptoms.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Hash className="h-5 w-5 text-blue-500" />
                    증상 태그
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCase.symptoms.map((symptom, i) => (
                      <span key={i} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 치료 결과/경과 */}
              {selectedCase.result && (
                <div className="bg-green-50 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    치료 결과 / 경과
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-[15px]">
                      {selectedCase.result}
                    </p>
                  </div>
                </div>
              )}

              {/* 원문 전체 내용 */}
              {selectedCase.originalText && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    원문 전체
                  </h3>
                  <div className="bg-white rounded-lg p-5 border border-gray-200 max-h-[500px] overflow-y-auto">
                    {formatTextWithParagraphs(selectedCase.originalText).map((paragraph, idx) => (
                      <p key={idx} className="text-gray-700 leading-[1.8] text-[15px] mb-4 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0 bg-gray-50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium border border-gray-200"
              >
                닫기
              </button>
              <Link
                to={`/consultation?formula=${encodeURIComponent(selectedCase.formulaName || '')}`}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all font-medium text-center"
              >
                이 처방으로 진료 시작
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
