import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search,
  BookOpen,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react'
import { CaseSummaryPanel } from '@/components/evidence/CaseSummaryPanel'
import { useAuthStore } from '@/stores/authStore'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { ErrorMessage, SearchCategoryFilter, DEFAULT_SEARCH_CATEGORIES } from '@/components/common'
import { logError } from '@/lib/errors'

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
  if (!gender) return '미상'
  const v = String(gender).toLowerCase()
  if (v === 'm' || v === 'male' || v === '남' || v === '남성') return '남성'
  if (v === 'f' || v === 'female' || v === '여' || v === '여성') return '여성'
  if (v === 'unknown' || v === '미상') return '미상'
  return gender
}

// 케이스 데이터에서 처방명 추출 — 백엔드가 옛 코드(매핑 미반영)인 경우에도 동작하도록
// herbalFormulas[0].formulaName 으로 폴백한다.
function getFormulaName(c: any): string {
  if (c?.formulaName && c.formulaName !== '') return c.formulaName
  if (Array.isArray(c?.herbalFormulas) && c.herbalFormulas[0]?.formulaName) {
    return c.herbalFormulas[0].formulaName
  }
  return ''
}

// 결과 enum/한글 매핑
function getOutcome(c: any): string | null {
  return c?.outcome || c?.treatmentOutcome || null
}

// 변증명 폴백
function getDiagnosis(c: any): string {
  return c?.diagnosis || c?.patternDiagnosis || ''
}

// 체질 폴백
function getConstitution(c: any): string {
  return c?.constitution || c?.patientConstitution || ''
}

// 한자 처리 — 가독성 강화:
//  1) '딸꾹질(吃逆)' → '딸꾹질' (괄호 내 한자 제거)
//  2) '大病後대병후' → '대병후' (한자+한글 병기 중 한자만 제거)
//  3) '丁香 柿蒂 人蔘' 식 순수 한자 단어는 보존 (약재명 — enrich 전엔 그대로 두는 게 안전)
function stripHanja(text: string): string {
  if (!text) return ''
  let out = text
  // 한자(괄호) 제거
  out = out.replace(/[(（]([\u4e00-\u9fff]+)[)）]/g, '')
  // 연속된 한자 뒤 바로 같은 의미의 한글이 오면 한자 부분 제거 — '大病後대병후' → '대병후'
  out = out.replace(/[\u4e00-\u9fff]+([가-힣]+)/g, '$1')
  // 양옆 공백 정리
  return out.replace(/\s{2,}/g, ' ').trim()
}

// (본문 단락 분리/enrich 헬퍼는 별도 PR — formatObservations 가 이미 ①②③ 분리 수행)

// 해시태그 후보 추출 — 증상·체질·변증·결과를 하나의 태그 배열로
function buildHashtags(c: any): string[] {
  const tags: string[] = []
  const constitution = getConstitution(c)
  if (constitution) tags.push(`#${constitution}`)
  const diagnosis = getDiagnosis(c)
  if (diagnosis) tags.push(`#${stripHanja(diagnosis)}`)
  const outcome = getOutcome(c)
  if (outcome) tags.push(`#${outcome}`)
  const symptoms = Array.isArray(c?.symptoms) ? c.symptoms : []
  for (const s of symptoms.slice(0, 4)) {
    const name = typeof s === 'string' ? s : s?.name
    if (name) tags.push(`#${stripHanja(name)}`)
  }
  // 중복 제거
  return Array.from(new Set(tags.filter(Boolean)))
}

// 번호가 붙은 텍스트를 분리하여 포맷팅
function formatObservations(text: string): { number: string; content: string }[] {
  const pattern = /([①②③④⑤⑥⑦⑧⑨⑩])\s*([^①②③④⑤⑥⑦⑧⑨⑩]+)/g
  const matches: { number: string; content: string }[] = []
  let match
  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      number: match[1],
      content: match[2].trim()
    })
  }
  return matches
}

export default function CasesPage() {
  useSEO(PAGE_SEO.cases)

  const token = useAuthStore((state) => state.accessToken)
  const [searchParams, setSearchParams] = useSearchParams()

  // URL 파라미터에서 초기값 로드 (뒤로가기 시 상태 유지)
  const initialSearch = searchParams.get('q') || searchParams.get('keyword') || ''
  const initialCategory = searchParams.get('category') || 'all'
  const initialConstitution = searchParams.get('constitution') || ''
  const initialOutcome = searchParams.get('outcome') || ''
  const initialPage = parseInt(searchParams.get('page') || '1', 10)

  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [searchCategory, setSearchCategory] = useState(initialCategory)
  const [selectedConstitution, setSelectedConstitution] = useState(initialConstitution)
  const [selectedOutcome, setSelectedOutcome] = useState(initialOutcome)
  // 검색 모드 — 'text' (ILIKE) / 'ai' (임베딩 cosine similarity)
  // 기본은 ai — CDSS 의 핵심 가치. 임베딩 미생성 시 백엔드가 안내 메시지 반환.
  const [searchMode, setSearchMode] = useState<'text' | 'ai'>(
    (searchParams.get('mode') as 'text' | 'ai') || 'ai',
  )
  const [aiMeta, setAiMeta] = useState<{ error?: string; candidates?: number } | null>(null)

  // API 데이터 상태
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [totalCases, setTotalCases] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(0)
  const [stats, setStats] = useState({ cured: 0, improved: 0, total: 0 })
  const ITEMS_PER_PAGE = 20

  // 상세 모달
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // 디바운스된 검색어
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)

  /**
   * URL 파라미터 업데이트.
   *
   * searchParams 를 의존성에 넣으면 안 된다 — 페이지를 바꿀 때마다 이 함수의
   * 정체성이 바뀌고, 이 함수를 의존하는 아래 useEffect 들이 다시 돌면서
   * setCurrentPage(1) 로 되돌려 버린다. 실제로 2페이지로 넘어가지지 않았다.
   * 갱신 함수 형태를 쓰면 이전 값을 인자로 받으므로 의존성이 필요 없다.
   */
  // setSearchParams 는 react-router 안에서 렌더마다 새로 만들어진다. 의존성에 넣으면
  // 이 함수도 같이 불안정해지고, 결국 아래 effect 들이 다시 돌아 페이지를 1로
  // 되돌린다(2페이지를 눌러도 page=2 요청 직후 page=1 이 다시 나갔다).
  // ref 로 최신 것을 들고만 있고 의존성은 비운다.
  const setSearchParamsRef = useRef(setSearchParams)
  setSearchParamsRef.current = setSearchParams

  const updateSearchParams = useCallback((updates: Record<string, string | number>) => {
    setSearchParamsRef.current(
      (prev) => {
        const newParams = new URLSearchParams(prev)
        Object.entries(updates).forEach(([key, value]) => {
          if (value && value !== '' && value !== 'all' && value !== 1) {
            newParams.set(key, String(value))
          } else {
            newParams.delete(key)
          }
        })
        return newParams
      },
      // replace: true로 설정하여 히스토리 스택 오염 방지
      { replace: true },
    )
  }, [])

  // 검색어 디바운스 + URL 업데이트
  useEffect(() => {
    const timer = setTimeout(() => {
      // 검색어가 실제로 바뀐 게 아니면 페이지를 건드리지 않는다.
      // (첫 렌더에서도 돌기 때문에 ?page=3 으로 들어온 링크가 1페이지로 튄다)
      setDebouncedSearch((prev) => {
        if (prev === searchQuery) return prev
        setCurrentPage(1)
        updateSearchParams({ q: searchQuery, page: 1 })
        return searchQuery
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, updateSearchParams])

  // 필터 변경 시 첫 페이지로 + URL 업데이트.
  // 첫 렌더에서는 건너뛴다 — 필터를 바꾼 게 아니라 화면이 처음 뜬 것뿐인데
  // 페이지를 1로 돌리면 ?page=3 링크로 들어온 사람이 1페이지를 보게 된다.
  const filtersMounted = useRef(false)
  useEffect(() => {
    if (!filtersMounted.current) {
      filtersMounted.current = true
      return
    }
    setCurrentPage(1)
    updateSearchParams({
      category: searchCategory,
      constitution: selectedConstitution,
      outcome: selectedOutcome,
      page: 1,
    })
  }, [selectedConstitution, selectedOutcome, searchCategory, updateSearchParams])

  // 페이지 변경 시 URL 업데이트
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage)
    updateSearchParams({ page: newPage })
    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [updateSearchParams])

  // API에서 데이터 가져오기
  const fetchCases = useCallback(async (isManualRetry = false) => {
    if (isManualRetry) {
      setIsRetrying(true)
    } else {
      setLoading(true)
    }
    setError(null)
    setAiMeta(null)

    try {
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      // AI 유사도 검색 모드 — 검색어가 있을 때만 (빈 검색은 일반 list 로)
      if (searchMode === 'ai' && debouncedSearch && debouncedSearch.trim().length > 0) {
        const response = await fetch(`${AI_ENGINE_URL}/api/v1/cases/search-similar`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: debouncedSearch,
            topK: ITEMS_PER_PAGE,
            threshold: 0.25,
            constitution: selectedConstitution || undefined,
            outcome: selectedOutcome || undefined,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`AI 검색 응답 오류 (${response.status})`)
        }
        const json = await response.json()
        const wrapped = (json && typeof json === 'object' && 'data' in json) ? json.data : json
        // 임베딩 미생성 / 키 미설정 등은 results=[] + meta.error
        if (wrapped?.meta?.error) {
          setAiMeta({ error: wrapped.meta.error, candidates: wrapped.meta.candidates })
        } else {
          setAiMeta({ candidates: wrapped?.meta?.candidates })
        }
        const items = Array.isArray(wrapped?.results) ? wrapped.results : []
        setCases(items)
        setTotalCases(items.length)
        setTotalPages(1)
        setRetryCount(0)
        setStats({ cured: 0, improved: 0, total: items.length })
        setLoading(false)
        setIsRetrying(false)
        return
      }

      // === 일반 텍스트 검색 (기본 list) ===
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      })

      if (debouncedSearch) {
        params.append('search', debouncedSearch)
        // 검색 카테고리 필터 적용
        if (searchCategory !== 'all') {
          params.append('searchField', searchCategory)
        }
      }
      if (selectedConstitution) params.append('constitution', selectedConstitution)
      if (selectedOutcome) params.append('outcome', selectedOutcome)

      const response = await fetch(`${AI_ENGINE_URL}/api/v1/cases?${params}`, {
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (${response.status})`)
      }

      const json = await response.json()
      // TransformInterceptor 가 { success, data: <원본> } 으로 감쌈
      const wrapped = (json && typeof json === 'object' && 'data' in json) ? json.data : json
      // CasesService.findAll → { data: cases[], meta: { total, totalPages } }
      const cases = Array.isArray(wrapped?.data) ? wrapped.data : []
      const meta = wrapped?.meta || {}

      setCases(cases)
      setTotalCases(meta.total || 0)
      setTotalPages(meta.totalPages || 0)
      setRetryCount(0)

      // 통계 계산 — 백엔드는 treatmentOutcome enum 사용. 프론트 표시값과 매핑.
      const cured = cases.filter((c: any) => c.treatmentOutcome === '완치' || c.outcome === '완치').length
      const improved = cases.filter((c: any) => c.treatmentOutcome === '호전' || c.outcome === '호전').length
      setStats({ cured, improved, total: meta.total || 0 })
    } catch (err) {
      // 조회 실패를 목데이터로 덮지 않는다.
      // 예전에는 MOCK_CASES 20건을 띄우면서 총계는 BASE_STATS.cases(6,000) 로 표시했다.
      // 한의사가 2페이지를 누르는 순간 들통나고, 그 시점에 제품 전체 신뢰가 무너진다.
      // 실패는 실패로 보여주고 재시도 경로만 제공한다.
      logError(err, 'CasesPage')
      setCases([])
      setTotalCases(0)
      setTotalPages(0)
      setStats({ cured: 0, improved: 0, total: 0 })
      setError('치험례를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }, [currentPage, debouncedSearch, searchCategory, selectedConstitution, selectedOutcome, searchMode, token])

  // 수동 재시도 핸들러
  const handleRetry = useCallback(() => {
    fetchCases(true)
  }, [fetchCases])

  useEffect(() => {
    fetchCases(false)
  }, [fetchCases])

  const openDetailModal = useCallback((caseItem: CaseRecord) => {
    setSelectedCase(caseItem)
    setShowDetailModal(true)
  }, [])

  const getOutcomeColor = useCallback((outcome: string | null) => {
    // Toss 톤 — 채도 줄이고 의미 구분만 유지 (성공=초록, 부분=호박, 실패=빨강)
    switch (outcome) {
      case '완치':
        return 'bg-green-50 text-green-700'
      case '호전':
        return 'bg-amber-50 text-amber-700'
      case '무효':
      case '악화':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-neutral-100 text-neutral-600'
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">
          치험례
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          {totalCases > 0 ? `${totalCases.toLocaleString()}건의 치험례에서 검색합니다.` : '치험례 데이터를 불러오는 중…'}
        </p>
      </div>

      {/* 중복 데모 모드 배너 제거 — 상단에 이미 표시됨 */}

      {/* Search & Filters */}
      <div className="glass-surface sticky top-4 z-20 rounded-2xl border shadow-[var(--shadow-2)] p-6 space-y-4">
        {/* Search Category Filter - Pills */}
        <SearchCategoryFilter
          selectedCategory={searchCategory}
          onCategoryChange={setSearchCategory}
          variant="pills"
        />

        {/* Search Input & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={DEFAULT_SEARCH_CATEGORIES.find(c => c.id === searchCategory)?.placeholder || '검색어 입력...'}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
            />
          </div>
          <select
            value={selectedConstitution}
            onChange={(e) => setSelectedConstitution(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
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
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
          >
            <option value="">전체 결과</option>
            <option value="완치">완치</option>
            <option value="호전">호전</option>
            <option value="무효">무효</option>
          </select>
        </div>

        {/* 검색 모드 토글 + 카테고리 안내 */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex rounded-lg bg-neutral-100 p-0.5">
            <button
              onClick={() => setSearchMode('ai')}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                searchMode === 'ai'
                  ? 'bg-white text-neutral-900 shadow-soft'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              AI 유사 검색
            </button>
            <button
              onClick={() => setSearchMode('text')}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                searchMode === 'text'
                  ? 'bg-white text-neutral-900 shadow-soft'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              텍스트 검색
            </button>
          </div>
          {searchCategory !== 'all' && (
            <p className="text-[11px] text-neutral-500">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded-md font-medium mr-1">
                {DEFAULT_SEARCH_CATEGORIES.find(c => c.id === searchCategory)?.label}
              </span>
              필드에서만 검색합니다
            </p>
          )}
        </div>
      </div>

      {/* AI 모드 안내 — 임베딩 미생성 시 명확한 액션 안내 */}
      {aiMeta?.error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-900">
          <p className="font-semibold mb-1">AI 검색을 사용할 수 없습니다</p>
          <p className="text-[12px] text-amber-800 leading-relaxed">{aiMeta.error}</p>
          <p className="text-[11px] text-amber-700 mt-2">
            관리자: OPENAI_API_KEY 설정 후 <code className="bg-amber-100 px-1 rounded">pnpm --filter @hanmed/api embed:cases</code> 실행
          </p>
        </div>
      )}

      {/* Stats — Toss 톤: 검색 결과 한 줄로 텍스트로만, 카드 그리드 제거 */}
      <div className="flex items-baseline gap-2 px-1">
        <span className="text-[14px] text-neutral-500">
          {debouncedSearch || selectedConstitution || selectedOutcome ? '검색 결과' : '전체'}
        </span>
        <span className="text-[16px] font-bold text-neutral-900 tabular">
          {totalCases.toLocaleString()}건
        </span>
        {(stats.cured > 0 || stats.improved > 0) && (
          <span className="text-[12px] text-neutral-400 ml-2">
            완치 {stats.cured} · 호전 {stats.improved}
          </span>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">치험례를 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태 - 자동 재시도 포함 */}
        {error && !loading && (
          <ErrorMessage
            severity="warning"
            message={error}
            description={
              retryCount > 2
                ? '여러 번 시도했지만 연결에 실패했습니다. 네트워크 상태를 확인해 주세요.'
                : '잠시 후 자동으로 다시 연결을 시도합니다.'
            }
            suggestion={
              retryCount > 2
                ? '문제가 지속되면 support@ongojisin.ai로 문의해 주세요.'
                : '인터넷 연결을 확인하시거나 잠시 기다려 주세요.'
            }
            onRetry={handleRetry}
            autoRetrySeconds={retryCount > 2 ? 0 : 10}
            isRetrying={isRetrying}
          />
        )}

        {/* 결과 목록 — Toss 톤: 핵심 정보 + 해시태그 칩, 군더더기 제거 */}
        {!loading && !error && cases.map((caseItem: any) => {
          const formulaName = getFormulaName(caseItem)
          const constitution = getConstitution(caseItem)
          const outcome = getOutcome(caseItem)
          const diagnosis = getDiagnosis(caseItem)
          const tags = buildHashtags(caseItem)
          const genderText = formatGender(caseItem.patientGender)
          const ageText = caseItem.patientAge ? `${caseItem.patientAge}세` : ''

          return (
            <button
              key={caseItem.id}
              type="button"
              onClick={() => openDetailModal(caseItem)}
              className="w-full text-left bg-white rounded-2xl border border-neutral-200 shadow-[var(--shadow-2)] p-5 hover:border-neutral-300 hover:shadow-[var(--shadow-3)] hover:-translate-y-0.5 transition-all group"
            >
              {/* 헤더: 처방명 + 결과 배지 + AI 매칭 % */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {/* AI 매칭 % 배지 — searchMode='ai' 일 때만 노출 */}
                    {typeof caseItem.matchPercent === 'number' && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md tabular ${
                          caseItem.matchPercent >= 85
                            ? 'bg-primary text-white'
                            : caseItem.matchPercent >= 70
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                        title={`코사인 유사도 ${caseItem.rawScore ?? ''}`}
                      >
                        {caseItem.matchPercent}% 일치
                      </span>
                    )}
                    <h3 className="font-bold text-[16px] text-neutral-900 truncate group-hover:text-primary transition-colors">
                      {formulaName || '처방 미기재'}
                    </h3>
                  </div>
                  {/* 정리된 한 줄 요약이 있으면 그걸 쓴다. 원문에서 잘라 온
                      주소증은 문장 중간에서 시작하는 경우가 많다("은 풍치와…"). */}
                  <p className="text-[12px] text-neutral-500 mt-0.5 line-clamp-1">
                    {(caseItem as { summaryOneLine?: string | null }).summaryOneLine ||
                      stripHanja(caseItem.chiefComplaint || '') ||
                      '주소증 미기재'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {outcome && (
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${getOutcomeColor(outcome)}`}>
                      {outcome}
                    </span>
                  )}
                  {constitution && (
                    <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-neutral-100 text-neutral-700">
                      {constitution}
                    </span>
                  )}
                </div>
              </div>

              {/* 해시태그 */}
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {tags.slice(0, 6).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium text-neutral-600 bg-neutral-50 hover:bg-neutral-100 px-2 py-0.5 rounded-md transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 메타 정보 한 줄 */}
              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[12px] text-neutral-500">
                <div className="flex items-center gap-3">
                  <span>
                    {genderText !== '미상' || ageText ? `${genderText} ${ageText}`.trim() : ''}
                  </span>
                  {diagnosis && (
                    <span className="truncate max-w-[200px]">
                      변증 · {stripHanja(diagnosis)}
                    </span>
                  )}
                </div>
                <span className="text-primary font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  상세 <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          )
        })}

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
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium ${
                      currentPage === pageNum
                        ? 'bg-primary text-white'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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

      {/* 상세 정보 모달 — Toss 톤 단정한 카드형. 컬러 박스 줄이고 정보 위계로 구분 */}
      {showDetailModal && selectedCase && (() => {
        const c = selectedCase as any
        const formulaName = getFormulaName(c)
        const constitution = getConstitution(c)
        const outcome = getOutcome(c)
        const diagnosis = getDiagnosis(c)
        const genderText = formatGender(c.patientGender)
        const ageText = c.patientAge ? `${c.patientAge}세` : ''
        const tags = buildHashtags(c)
        const symptomList: string[] = (() => {
          if (Array.isArray(c.symptoms)) {
            return c.symptoms
              .map((s: any) => (typeof s === 'string' ? s : s?.name))
              .filter(Boolean) as string[]
          }
          return []
        })()
        const observations = formatObservations(c.originalText || '')

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-detail-title"
            onClick={() => setShowDetailModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col border border-neutral-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 — 흰 배경, 정보 위계 */}
              <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    {outcome && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${getOutcomeColor(outcome)}`}>
                        {outcome}
                      </span>
                    )}
                    {constitution && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                        {constitution}
                      </span>
                    )}
                    {(genderText !== '미상' || ageText) && (
                      <span className="text-[11px] text-neutral-500">
                        {`${genderText} ${ageText}`.trim()}
                      </span>
                    )}
                  </div>
                  <h2 id="case-detail-title" className="text-[22px] font-bold tracking-tight text-neutral-900">
                    {formulaName || '처방 미기재'}
                  </h2>
                  {c.formulaHanja && (
                    <p className="text-neutral-500 mt-0.5 text-[14px]">{c.formulaHanja}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-shrink-0 p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  aria-label="닫기"
                >
                  <X className="h-5 w-5 text-neutral-500" />
                </button>
              </div>

              {/* 본문 */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* 정리된 요약이 먼저 — 원문은 한 덩어리라 진료 중에 읽을 수 없다.
                    아직 정리 전인 치험례에서는 아무것도 그리지 않는다. */}
                <CaseSummaryPanel
                  summary={{
                    summaryOneLine: c.summaryOneLine,
                    keyFindings: c.keyFindings,
                    patternReasoning: c.patternReasoning,
                    modification: c.modification,
                    courseSteps: c.courseSteps,
                    distinctive: c.distinctive,
                    verifiedFormulaName: c.verifiedFormulaName,
                    formulaMismatch: c.formulaMismatch,
                    hasMixedContent: c.hasMixedContent,
                  }}
                  storedFormulaName={formulaName}
                  className="pb-1"
                />

                {/* 해시태그 한 줄 — 가장 빠른 컨텍스트 */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[12px] font-medium text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 주요 증상 */}
                {c.chiefComplaint && (
                  <section>
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      주요 증상
                    </h3>
                    <p className="text-[15px] text-neutral-800 leading-relaxed whitespace-pre-wrap">
                      {stripHanja(c.chiefComplaint)}
                    </p>
                  </section>
                )}

                {/* 변증 */}
                {diagnosis && (
                  <section className="pt-4 border-t border-neutral-100">
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      변증
                    </h3>
                    <p className="text-[15px] text-neutral-800">{stripHanja(diagnosis)}</p>
                  </section>
                )}

                {/* 증상 칩 — 해시태그와 다르게 증상만 깔끔히 */}
                {symptomList.length > 0 && (
                  <section className="pt-4 border-t border-neutral-100">
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      증상
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {symptomList.map((s, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-md text-[13px]"
                        >
                          {stripHanja(s)}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* 치료 결과 */}
                {c.result && (
                  <section className="pt-4 border-t border-neutral-100">
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      치료 결과 / 경과
                    </h3>
                    <p className="text-[15px] text-neutral-800 leading-relaxed whitespace-pre-wrap">
                      {c.result}
                    </p>
                  </section>
                )}

                {/* 세부 관찰 사항 ①②③ — 번호 위주, 시각 노이즈 줄임 */}
                {observations.length > 0 && (
                  <section className="pt-4 border-t border-neutral-100">
                    <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-3">
                      세부 관찰 사항
                    </h3>
                    <ol className="space-y-2">
                      {observations.map((obs, idx) => (
                        <li key={idx} className="flex gap-3 text-[14px] leading-relaxed">
                          <span className="flex-shrink-0 w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-[13px]">
                            {idx + 1}
                          </span>
                          <p className="text-neutral-800 flex-1">{stripHanja(obs.content)}</p>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {/* 원문 전체 — 접힘 (기본 닫힘, 클릭으로 펼침) */}
                {c.originalText && (
                  <details className="pt-4 border-t border-neutral-100 group">
                    <summary className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-neutral-700 select-none flex items-center justify-between">
                      <span>원문 전체</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                    </summary>
                    <pre className="mt-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-[13px] text-neutral-700 leading-relaxed whitespace-pre-wrap font-sans max-h-[400px] overflow-y-auto">
                      {c.originalText}
                    </pre>
                  </details>
                )}

                {c.dataSource && (
                  <p className="pt-2 text-[11px] text-neutral-400">
                    출처 · {c.dataSource}
                  </p>
                )}
              </div>

              {/* 푸터 — Toss 톤 검정 단색 */}
              <div className="px-6 py-4 border-t border-neutral-100 flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 h-11 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-semibold text-[14px]"
                >
                  닫기
                </button>
                <Link
                  to={`/dashboard/consultation?formula=${encodeURIComponent(formulaName || '')}`}
                  className="flex-1 h-11 leading-[44px] accent-gradient accent-glow rounded-xl transition-all font-semibold text-[14px] text-center"
                >
                  이 처방으로 진료 시작
                </Link>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
