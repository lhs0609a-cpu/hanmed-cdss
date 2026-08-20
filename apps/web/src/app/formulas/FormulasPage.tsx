import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  BookOpen,
  ChevronRight,
  Loader2,
  Leaf,
  Filter,
  Pill,
  Building2,
} from 'lucide-react'
import { MedicineSchool } from '@/types'
import { SchoolBadge } from '@/components/formula/SchoolBadge'
import { SchoolFilter } from '@/components/formula/SchoolFilter'
import { useMfdsDrugSearch, type MfdsListItem } from '@/hooks/useMfdsDrug'
import { koreanContains, normalizeForSearch } from '@/lib/hangul'
import { api } from '@/services/api'

interface FormulaHerb {
  id: string
  name: string
  amount: string
  role: string
}

interface Formula {
  id: string
  name: string
  hanja: string
  category: string
  source: string
  indication: string
  /** 해설에서 뽑아낸 적응증. 검색과 카드 요약에 쓴다. */
  indications?: string[]
  patternKeywords?: string[]
  patientSummary?: string
  /** 한자명 처방의 한글 독음 — 검색·표시 보조 */
  koreanName?: string
  /** 검색 전용 — 해설 본문까지 미리 정규화해 둔 덩어리. 화면에는 쓰지 않는다. */
  searchText?: string
  herbs: FormulaHerb[]
  school?: MedicineSchool
}

/**
 * 해설에서 뽑아낸 색인. structure-formulas.ts 가 만든다.
 * 원본 6MB JSON 을 덮어쓰지 않고 옆에 두는 이유는 변경분을 검토하기 위해서다.
 */
interface StructuredFormula {
  /** 한자로만 된 처방명의 한글 독음. 18건이 이게 없으면 한글로 안 찾힌다. */
  koreanName?: string
  indications: string[]
  category: string
  patternKeywords: string[]
  contraindications: string[]
  modification: string
  patientSummary: string
}

interface JsonFormulaData {
  id: string
  name: string
  hanja: string
  code?: string
  category: string
  categoryLabel?: string
  source: string
  composition: Array<{
    herb: string
    amount: string
    processing?: string | null
  }>
  indicationText?: string
  indications?: string[]
  compositionExplanation?: string
  comparisonText?: string
  cautions?: string
  usage?: string
  description?: string
  dataSource?: string
}

// 카테고리 매핑
const categoryMap: Record<string, string> = {
  'etc': '기타',
  '해표': '해표제',
  '청열': '청열제',
  '사하': '사하제',
  '화해': '화해제',
  '온리': '온리제',
  '보익': '보익제',
  '고섭': '고삽제',
  '안신': '안신제',
  '이기': '이기제',
  '이혈': '이혈제',
  '치풍': '치풍제',
  '이수': '이수제',
  '화담': '화담제',
  '소도': '소도제',
  '옹양': '옹양제',
  '기타': '기타',
}

// JSON 데이터를 Formula 형식으로 변환
function transformJsonToFormula(
  json: JsonFormulaData,
  structured?: StructuredFormula,
): Formula {
  // 원본의 category 는 429건 전부 'etc' 라 필터가 '기타' 한 칸이 된다.
  // 해설에서 뽑은 분류가 있으면 그쪽을 쓴다.
  const rawCategory = structured?.category || json.category
  const category = categoryMap[rawCategory] || json.categoryLabel || rawCategory || '기타'

  return {
    id: json.id,
    name: json.name,
    hanja: json.hanja || '',
    category: category,
    source: json.source || '',
    // 적응증은 뽑아낸 것을 우선한다. 원본은 429건 중 388건이 비어 있어서
    // 해설 앞 100자로 때우고 있었다 — 문장 중간에서 잘려 읽히지도 않는다.
    indication:
      structured?.indications?.join(', ') ||
      json.indicationText ||
      json.indications?.join(', ') ||
      json.description?.slice(0, 100) ||
      '',
    indications: structured?.indications,
    koreanName: structured?.koreanName,
    patternKeywords: structured?.patternKeywords,
    patientSummary: structured?.patientSummary,
    // 적응증 필드가 429건 중 388건 비어 있어서 화면은 해설 앞 100자로 때운다.
    // 검색까지 그 100자만 보면 본문에 있는 증상이 안 잡힌다 — '소화불량' 이
    // 본문에 128건 나오는데 검색은 52건만 찾았다. 그래서 본문 전체를 따로 쌓는다.
    // koreanContains 는 자모 levenshtein 이라 수 KB 문자열에 쓰면 안 된다.
    // 여기서는 미리 정규화해 두고 단순 부분일치로만 본다.
    searchText: normalizeForSearch(
      [
        json.indicationText,
        json.indications?.join(' '),
        json.description,
        json.compositionExplanation,
        json.comparisonText,
        json.cautions,
        json.usage,
      ]
        .filter(Boolean)
        .join(' '),
    ),
    herbs: json.composition?.map((comp, idx) => ({
      id: String(idx + 1),
      name: comp.herb?.replace(/各[\d\w]+/g, '').trim() || '',
      amount: comp.amount || '',
      role: '',
    })).filter(h => h.name) || [],
  }
}

async function fetchAllFormulas(): Promise<Formula[]> {
  // 색인 파일이 아직 없거나 못 읽어도 처방 목록 자체는 떠야 한다.
  const [res, structuredRes] = await Promise.all([
    fetch('/data/formulas/all-formulas.json'),
    fetch('/data/formulas/formula-structured.json').catch(() => null),
  ])
  if (!res.ok) {
    throw new Error(`처방 데이터를 불러오지 못했습니다 (${res.status})`)
  }
  const data = (await res.json()) as JsonFormulaData[]

  let structured: Record<string, StructuredFormula> = {}
  if (structuredRes?.ok) {
    try {
      structured = (await structuredRes.json()) as Record<string, StructuredFormula>
    } catch {
      structured = {}
    }
  }

  return data.map((f) => transformJsonToFormula(f, structured[f.id]))
}

const categories = [
  '전체',
  '해표제',
  '청열제',
  '보익제',
  '이기제',
  '화담제',
  '이수제',
  '온리제',
  '소도제',
  '고섭제',
  '기타',
]

const ITEMS_PER_PAGE = 12

export default function FormulasPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedSchool, setSelectedSchool] = useState<MedicineSchool | 'all'>('all')
  const [page, setPage] = useState(1)
  const [mfdsEnabled, setMfdsEnabled] = useState(false)
  const [submittedQuery, setSubmittedQuery] = useState('')

  const {
    data: allFormulas = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['formulas-static-bundle'],
    queryFn: fetchAllFormulas,
    staleTime: 24 * 60 * 60 * 1000, // 정적 자산 — 24시간 캐시
    gcTime: 7 * 24 * 60 * 60 * 1000,
  })

  // 필터링된 데이터
  const filteredFormulas = useMemo(() => {
    let result = allFormulas

    // 카테고리 필터
    if (selectedCategory !== '전체') {
      result = result.filter(f => f.category === selectedCategory)
    }

    // 학파 필터
    if (selectedSchool !== 'all') {
      result = result.filter(f => f.school === selectedSchool)
    }

    // 검색어 필터 — 자모 정규화/초성/오타 1-2개 포용 (lib/hangul.koreanContains).
    if (searchQuery.trim()) {
      const query = searchQuery.trim()
      // 이름·한자·적응증·약재명은 오타를 포용하는 퍼지 일치.
      // 해설 본문(searchText)은 뽑아낸 적응증이 없는 처방에만 보조로 쓴다.
      // 본문을 항상 훑으면 429건 중 143건이 걸려 정밀도가 무너진다 —
      // 해설이 긴 임상 에세이라 증상이 스치듯 언급된 것까지 잡히기 때문이다.
      const normalized = normalizeForSearch(query)
      result = result.filter(f => {
        if (
          koreanContains(f.name, query) ||
          koreanContains(f.koreanName ?? '', query) ||
          koreanContains(f.hanja, query) ||
          koreanContains(f.indication, query) ||
          f.patternKeywords?.some(k => koreanContains(k, query)) ||
          f.herbs.some(h => koreanContains(h.name, query))
        ) {
          return true
        }
        if (f.indications?.length) return false
        return !!normalized && !!f.searchText && f.searchText.includes(normalized)
      })
    }

    return result
  }, [allFormulas, selectedCategory, selectedSchool, searchQuery])

  // 페이지네이션
  const totalPages = Math.ceil(filteredFormulas.length / ITEMS_PER_PAGE)
  const paginatedFormulas = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredFormulas.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredFormulas, page])

  const handleSearch = () => {
    setPage(1)
    setSubmittedQuery(searchQuery.trim())
  }

  const mfdsQuery = mfdsEnabled && submittedQuery ? submittedQuery : null
  const {
    data: mfdsData,
    isLoading: mfdsLoading,
    isError: mfdsError,
  } = useMfdsDrugSearch(mfdsQuery, { limit: 12 })

  const mfdsItems: MfdsListItem[] = (mfdsData?.items || []).filter(
    (it) => !it.CANCEL_NAME || it.CANCEL_NAME === '정상',
  )

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setPage(1)
  }

  const handleSchoolChange = (school: MedicineSchool | 'all') => {
    setSelectedSchool(school)
    setPage(1)
  }


  // 치험례 건수 — 처방 이름만 나열하면 종이 사전이다.
  // "이 처방이 실제로 몇 건에서 쓰였는가" 가 목록에서 바로 보여야 한다.
  const [caseCounts, setCaseCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    const names = paginatedFormulas.map((f) => f.name).filter(Boolean)
    if (names.length === 0) return
    let cancelled = false
    api
      .get<Record<string, number>>('/cases/evidence-counts', {
        params: { kind: 'formula', names: names.join(',') },
      })
      .then(({ data }) => {
        if (!cancelled && data) setCaseCounts((prev) => ({ ...prev, ...data }))
      })
      .catch(() => {
        /* 건수는 부가 정보 — 실패해도 목록은 그대로 보여준다 */
      })
    return () => {
      cancelled = true
    }
  }, [paginatedFormulas])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="hanja mb-1 text-[10.5px] tracking-[0.3em] text-ink-faint">方 劑</div>
        <h1 className="font-serif text-[27px] font-bold text-ink flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-blue-500" />
          처방(방제) 검색
        </h1>
        <p className="mt-1 text-gray-500">
          한의학 처방의 구성 약재와 적응증을 확인하세요 ({allFormulas.length}개 처방)
        </p>
      </div>

      {/* Search & Filter */}
      <div className="surface-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="처방명, 적응증, 약재명으로 검색..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
            >
              검색
            </button>
          </div>
        </div>

        {/* MFDS toggle */}
        <div className="mt-3 flex items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-600 select-none">
            <input
              type="checkbox"
              checked={mfdsEnabled}
              onChange={(e) => setMfdsEnabled(e.target.checked)}
              className="rounded border-gray-300 text-blue-500 focus:ring-blue-400"
            />
            <Pill className="h-4 w-4 text-blue-500" />
            식약처 시판 의약품(NEDRUG)도 함께 검색
          </label>
        </div>

        {/* Category Filter */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* School Filter */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">학파별 분류</span>
          </div>
          <SchoolFilter
            selected={selectedSchool}
            onChange={handleSchoolChange}
          />
        </div>
      </div>

      {/* MFDS results panel */}
      {mfdsEnabled && submittedQuery && (
        <div className="surface-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Pill className="h-5 w-5 text-blue-500" />
              식약처 시판 의약품 ({mfdsItems.length}건)
            </h2>
            <span className="text-xs text-gray-400">검색어: "{submittedQuery}"</span>
          </div>

          {mfdsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : mfdsError ? (
            <p className="text-sm text-gray-500 py-4">
              식약처 정보를 불러오지 못했습니다.
            </p>
          ) : mfdsItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              일치하는 시판 의약품이 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mfdsItems.slice(0, 10).map((it) => (
                <Link
                  key={it.ITEM_SEQ}
                  to={`/formulas?mfds=${encodeURIComponent(it.ITEM_NAME)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    setSearchQuery(it.ITEM_NAME)
                    setSubmittedQuery(it.ITEM_NAME)
                  }}
                  className="border border-gray-100 rounded-xl p-3 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {it.ITEM_NAME}
                    </h3>
                    {it.SPCLTY_PBLC && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded shrink-0">
                        {it.SPCLTY_PBLC}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {it.ENTP_NAME}
                  </p>
                  {it.ITEM_INGR_NAME && (
                    <p className="text-xs text-gray-400 line-clamp-1 mt-1">
                      성분: {it.ITEM_INGR_NAME}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            * 일치하는 처방을 누르면 처방 상세 페이지에서 식약처 허가 정보 전체를 확인할 수 있습니다.
          </p>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : isError ? (
        <div className="text-center py-20">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">처방 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
      ) : paginatedFormulas.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">검색 결과가 없습니다</p>
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="text-sm text-gray-500">
            총 {filteredFormulas.length}개 처방 중 {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, filteredFormulas.length)}개 표시
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedFormulas.map((formula) => (
              <Link
                key={formula.id}
                to={`/dashboard/formulas/${formula.id}`}
                className="group surface-card rounded-2xl p-6 hover:shadow-lg hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {/* 18건은 이름이 한자뿐이다. 독음이 있으면 그걸 제목으로
                        올리고 한자는 아래로 내린다 — 한의사는 한글로 읽는다. */}
                    <h3 className="font-serif text-[19px] font-bold text-ink group-hover:text-blue-600 transition-colors">
                      {formula.koreanName || formula.name}
                    </h3>
                    {/* 한자는 전용 서체로. 한글보다 작게, 회색으로 — 읽는 순서를 흐리지 않는다. */}
                    <p className="hanja text-[14px] text-ink-faint">
                      {formula.koreanName ? formula.name : formula.hanja}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
                      {formula.category}
                    </span>
                    {formula.school && (
                      <SchoolBadge school={formula.school} size="sm" />
                    )}
                  </div>
                </div>

                {formula.source && (
                  <p className="text-xs text-gray-400 mb-2">출전: {formula.source}</p>
                )}

                {/* 임상 근거 — 건수가 0이면 "기록 없음" 으로 정직하게 */}
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                  {caseCounts[formula.name] === undefined ? (
                    <span className="text-gray-300">치험례 확인 중</span>
                  ) : caseCounts[formula.name] > 0 ? (
                    <span className="font-semibold text-gray-700">
                      치험례 {caseCounts[formula.name].toLocaleString()}건
                    </span>
                  ) : (
                    <span className="text-gray-400">치험례 기록 없음</span>
                  )}
                </p>

                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {formula.indication}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {formula.herbs.slice(0, 6).map((herb, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md"
                    >
                      <Leaf className="h-3 w-3" />
                      {herb.name}
                    </span>
                  ))}
                  {formula.herbs.length > 6 && (
                    <span className="px-2 py-1 bg-gray-50 text-gray-400 text-xs rounded-md">
                      +{formula.herbs.length - 6}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  상세 보기
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
