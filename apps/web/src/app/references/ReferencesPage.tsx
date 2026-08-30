import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  BookOpen,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { api } from '@/services/api'
import { useSEO } from '@/hooks/useSEO'
import { ErrorMessage } from '@/components/common'
import { logError } from '@/lib/errors'

/**
 * 문헌 자료실.
 *
 * 커뮤니티가 비어 있다는 문제를 게시글을 지어내서 풀지 않기로 한 결과물이다.
 * 여기 있는 것은 전부 출처가 있고 원문 링크가 살아 있다 — 우리가 더한 값어치는
 * 원문이 아니라 한의사에게 맞게 모으고 분류하고 검색되게 해 둔 것이다.
 *
 * 그래서 화면의 두 가지가 특히 중요하다.
 *  1. 근거 수준을 눈에 보이게 한다. 체계적 고찰과 증례보고를 같은 줄에 섞어
 *     놓으면 목록 자체가 임상 판단을 왜곡한다.
 *  2. 원문 링크를 숨기지 않는다. 확인하러 갈 수 없는 자료는 근거가 아니다.
 */

interface ReferenceItem {
  id: string
  source: string
  externalId: string
  title: string
  titleKo: string | null
  abstractPreview: string | null
  authors: string[]
  authorCount: number
  journal: string | null
  publishedYear: number | null
  doi: string | null
  url: string
  keywords: string[]
  category: string
  evidenceType: string
  language: string
}

interface ReferenceDetail extends ReferenceItem {
  abstract: string | null
  publishedAt: string | null
}

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: '', label: '전체' },
  { key: 'acupuncture', label: '침구' },
  { key: 'herbal', label: '한약·본초' },
  { key: 'diagnosis', label: '진단·변증' },
  { key: 'rehab', label: '추나·재활' },
  { key: 'safety', label: '안전성' },
  { key: 'admin', label: '행정·청구' },
]

/**
 * 근거 수준 표시.
 *
 * 색으로 무게를 전한다. 체계적 고찰이 가장 진하고 '미상' 이 가장 옅다 —
 * 옅은 것을 진하게 칠하면 목록이 거짓말을 한다.
 */
const EVIDENCE: Record<string, { label: string; cls: string }> = {
  systematic_review: { label: '체계적 고찰', cls: 'bg-emerald-100 text-emerald-800' },
  rct: { label: 'RCT', cls: 'bg-blue-100 text-blue-800' },
  guideline: { label: '진료지침', cls: 'bg-indigo-100 text-indigo-800' },
  observational: { label: '관찰연구', cls: 'bg-amber-100 text-amber-800' },
  case_report: { label: '증례보고', cls: 'bg-neutral-100 text-neutral-700' },
  review: { label: '종설', cls: 'bg-neutral-100 text-neutral-700' },
  unknown: { label: '미분류', cls: 'bg-neutral-50 text-neutral-400' },
}

const SOURCE_LABEL: Record<string, string> = {
  pubmed: 'PubMed',
  kci: 'KCI',
  oasis: 'OASIS',
  hira: '심평원',
  mfds: '식약처',
}

const ITEMS_PER_PAGE = 20

export default function ReferencesPage() {
  useSEO({
    title: '문헌 자료실 | 온고지신',
    description:
      '침구·한약·진단·안전성 문헌을 근거 수준별로 모아 검색합니다. 모든 항목에 원문 링크가 있습니다.',
  })

  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [debounced, setDebounced] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sort, setSort] = useState<'recent' | 'evidence'>(
    (searchParams.get('sort') as 'recent' | 'evidence') || 'recent',
  )
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10))

  const [items, setItems] = useState<ReferenceItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<ReferenceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // setSearchParams 는 렌더마다 새로 만들어진다. 의존성에 넣으면 아래 effect 들이
  // 다시 돌면서 페이지를 1로 되돌린다 — CasesPage 에서 같은 함정을 밟았다.
  const setParamsRef = useRef(setSearchParams)
  setParamsRef.current = setSearchParams

  const syncParams = useCallback((next: Record<string, string | number>) => {
    setParamsRef.current(
      (prev) => {
        const p = new URLSearchParams(prev)
        Object.entries(next).forEach(([k, v]) => {
          if (v && v !== '' && !(k === 'page' && v === 1)) p.set(k, String(v))
          else p.delete(k)
        })
        return p
      },
      { replace: true },
    )
  }, [])

  // 검색어 디바운스
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced((prev) => {
        if (prev === query) return prev
        setPage(1)
        syncParams({ q: query, category, sort, page: 1 })
        return query
      })
    }, 300)
    return () => clearTimeout(t)
  }, [query, category, sort, syncParams])

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
        sort,
      })
      if (debounced) params.set('search', debounced)
      if (category) params.set('category', category)

      const { data } = await api.get(`/references?${params}`)
      setItems(Array.isArray(data?.data) ? data.data : [])
      setTotal(data?.meta?.total || 0)
      setTotalPages(data?.meta?.totalPages || 0)
    } catch (err) {
      // 조회 실패를 빈 목록으로 덮지 않는다. 자료가 없는 것과 못 불러온 것은
      // 다른 상태이고, 섞으면 "자료실이 비었다" 로 잘못 읽힌다.
      logError(err, 'ReferencesPage')
      setItems([])
      setTotal(0)
      setTotalPages(0)
      setError('문헌을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [page, debounced, category, sort])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openDetail = useCallback(async (item: ReferenceItem) => {
    setSelected({ ...item, abstract: null, publishedAt: null })
    setDetailLoading(true)
    try {
      const { data } = await api.get<ReferenceDetail>(`/references/${item.id}`)
      setSelected(data)
    } catch {
      // 목록에 있던 정보만으로도 원문 링크는 열 수 있다. 상세를 못 받았다고
      // 모달을 닫아 버리면 사용자는 아무것도 못 하게 된다.
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const changePage = useCallback(
    (next: number) => {
      setPage(next)
      syncParams({ q: debounced, category, sort, page: next })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [debounced, category, sort, syncParams],
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <header>
        <h1 className="text-[24px] font-bold tracking-tight text-neutral-900">
          문헌 자료실
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          침구·한약·진단·안전성 문헌을 근거 수준별로 모았습니다. 모든 항목에 원문
          링크가 있습니다.
        </p>
      </header>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="증상, 처방, 혈위, 저자 등으로 검색"
          className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-[15px] outline-none focus:border-neutral-400"
        />
      </div>

      {/* 분류 + 정렬 */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key || 'all'}
            onClick={() => {
              setCategory(c.key)
              setPage(1)
              syncParams({ q: debounced, category: c.key, sort, page: 1 })
            }}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              category === c.key
                ? 'bg-neutral-900 text-white'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {c.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {(['recent', 'evidence'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setSort(s)
                setPage(1)
                syncParams({ q: debounced, category, sort: s, page: 1 })
              }}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
                sort === s
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {s === 'recent' ? '최신순' : '근거수준순'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-neutral-100 bg-white py-16 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-neutral-300" />
          <p className="text-[14px] text-neutral-500">문헌을 불러오는 중…</p>
        </div>
      )}

      {error && !loading && (
        <ErrorMessage
          severity="warning"
          message={error}
          onRetry={fetchList}
          isRetrying={false}
        />
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-neutral-100 bg-white py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-neutral-200" />
          <p className="text-[14px] text-neutral-500">검색 결과가 없습니다</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-2">
          {items.map((r) => {
            const ev = EVIDENCE[r.evidenceType] ?? EVIDENCE.unknown
            return (
              <article
                key={r.id}
                onClick={() => openDetail(r)}
                className="cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
              >
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${ev.cls}`}
                  >
                    {ev.label}
                  </span>
                  <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                    {SOURCE_LABEL[r.source] ?? r.source}
                  </span>
                  {r.publishedYear && (
                    <span className="text-[11px] text-neutral-400">
                      {r.publishedYear}
                    </span>
                  )}
                  {r.journal && (
                    <span className="truncate text-[11px] text-neutral-400">
                      · {r.journal}
                    </span>
                  )}
                </div>

                <h2 className="text-[15px] font-semibold leading-snug text-neutral-900">
                  {r.titleKo || r.title}
                </h2>
                {r.titleKo && (
                  <p className="mt-0.5 text-[12px] text-neutral-400">{r.title}</p>
                )}

                {r.abstractPreview && (
                  <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 line-clamp-2">
                    {r.abstractPreview}
                  </p>
                )}

                {r.authors.length > 0 && (
                  <p className="mt-2 text-[12px] text-neutral-400">
                    {r.authors.slice(0, 3).join(', ')}
                    {r.authorCount > 3 && ` 외 ${r.authorCount - 3}명`}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => changePage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-[14px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>
          <span className="px-2 text-[13px] text-neutral-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => changePage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-[14px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {!loading && !error && total > 0 && (
        <p className="text-center text-[13px] text-neutral-400">
          문헌 {total.toLocaleString()}건
        </p>
      )}

      {/* 상세 모달 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      (EVIDENCE[selected.evidenceType] ?? EVIDENCE.unknown).cls
                    }`}
                  >
                    {(EVIDENCE[selected.evidenceType] ?? EVIDENCE.unknown).label}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {SOURCE_LABEL[selected.source] ?? selected.source}
                    {selected.publishedYear && ` · ${selected.publishedYear}`}
                  </span>
                </div>
                <h2 className="text-[18px] font-bold leading-snug text-neutral-900">
                  {selected.titleKo || selected.title}
                </h2>
                {selected.journal && (
                  <p className="mt-1 text-[13px] text-neutral-500">{selected.journal}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="flex-shrink-0 rounded-lg p-2 hover:bg-neutral-100"
                aria-label="닫기"
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {selected.authors.length > 0 && (
                <p className="text-[13px] text-neutral-600">
                  {selected.authors.join(', ')}
                </p>
              )}

              {detailLoading && (
                <p className="text-[13px] text-neutral-400">초록을 불러오는 중…</p>
              )}

              {selected.abstract && (
                <section>
                  <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-neutral-500">
                    초록
                  </h3>
                  {/* 원문 그대로 보여준다. 요약하거나 번역하지 않는다 —
                      인용의 근거는 원문이어야 한다. */}
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-neutral-800">
                    {selected.abstract}
                  </p>
                </section>
              )}

              {selected.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.keywords.map((k, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-neutral-100 px-2 py-1 text-[12px] text-neutral-600"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-neutral-100 px-6 py-4">
              {/* 원문 링크를 숨기지 않는다. 확인하러 갈 수 없는 자료는 근거가 아니다. */}
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-neutral-800"
              >
                원문 보기
                <ExternalLink className="h-4 w-4" />
              </a>
              {selected.doi && (
                <span className="ml-3 text-[12px] text-neutral-400">
                  DOI {selected.doi}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
