import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, Loader2, Search, BookOpen } from 'lucide-react'
import { koreanContains } from '@/lib/hangul'
import { cn } from '@/lib/utils'

/**
 * 처방 비교 — 방약합편 해설에 있는 "○○과 비교하면" 대목을 그대로 보여준다.
 *
 * 예전 이 화면은 처방 8개와 비교쌍 4개가 코드에 박혀 있었다. 데이터 파일도
 * DB 도 읽지 않아서 "왜 이렇게 적으냐" 는 말이 나올 수밖에 없었다.
 *
 * 그런데 해설에는 비교 대목이 274,000자 들어 있었다. 이미 가진 것을 안 쓰고
 * 있었던 것이다. build-formula-comparisons.ts 가 1,246쌍으로 뽑아 두었다.
 *
 * 지어낸 문장은 없다 — 본문에 있는 대목을 잘라 담았을 뿐이다. 그래서 감별
 * 설명은 원문 그대로 인용하고, 우리가 계산한 것(구성 약재의 공통/차이)만
 * 따로 표시한다. 무엇이 문헌이고 무엇이 계산인지 섞으면 안 된다.
 */

interface ComparisonRow {
  fromId: string
  from: string
  to: string
  toId: string | null
  text: string
}

interface FormulaLite {
  id: string
  name: string
  hanja?: string
  composition?: Array<{ herb: string; amount?: string }>
}

interface StructuredLite {
  koreanName?: string
  indications?: string[]
  category?: string
}

async function fetchAll(): Promise<{
  formulas: FormulaLite[]
  comparisons: ComparisonRow[]
  structured: Record<string, StructuredLite>
}> {
  const [fRes, cRes, sRes] = await Promise.all([
    fetch('/data/formulas/all-formulas.json'),
    fetch('/data/formulas/formula-comparisons.json'),
    fetch('/data/formulas/formula-structured.json').catch(() => null),
  ])
  if (!fRes.ok) throw new Error(`처방 데이터를 불러오지 못했습니다 (${fRes.status})`)
  if (!cRes.ok) throw new Error(`비교 데이터를 불러오지 못했습니다 (${cRes.status})`)

  const formulas = (await fRes.json()) as FormulaLite[]
  const comparisons = (await cRes.json()) as ComparisonRow[]
  let structured: Record<string, StructuredLite> = {}
  if (sRes?.ok) {
    try {
      structured = (await sRes.json()) as Record<string, StructuredLite>
    } catch {
      structured = {}
    }
  }
  return { formulas, comparisons, structured }
}

/** "各五分" 같은 표기를 걷어내고 약재명만 남긴다. 구성 대조에 쓴다. */
function herbName(raw: string): string {
  return raw
    .replace(/各[\d\w一二三四五六七八九十半]+/g, '')
    .replace(/[(（][^)）]*[)）]/g, '')
    .trim()
}

export default function FormulaComparePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['formula-compare'],
    queryFn: fetchAll,
    staleTime: 1000 * 60 * 30,
  })

  const [query, setQuery] = useState('')
  const [baseId, setBaseId] = useState<string | null>(null)
  const [targetKey, setTargetKey] = useState<string | null>(null)

  const formulas = data?.formulas ?? []
  const comparisons = data?.comparisons ?? []
  const structured = data?.structured ?? {}

  const byId = useMemo(() => {
    const m = new Map<string, FormulaLite>()
    for (const f of formulas) m.set(f.id, f)
    return m
  }, [formulas])

  const byName = useMemo(() => {
    const m = new Map<string, FormulaLite>()
    for (const f of formulas) m.set(f.name, f)
    return m
  }, [formulas])

  /** 비교 대목을 가진 처방만 고를 수 있게 한다 — 골라도 볼 게 없으면 안 된다. */
  const comparableIds = useMemo(() => {
    const s = new Set<string>()
    for (const c of comparisons) s.add(c.fromId)
    return s
  }, [comparisons])

  const selectable = useMemo(() => {
    const list = formulas.filter((f) => comparableIds.has(f.id))
    if (!query.trim()) return list
    return list.filter(
      (f) =>
        koreanContains(f.name, query) ||
        koreanContains(structured[f.id]?.koreanName ?? '', query) ||
        koreanContains(f.hanja ?? '', query),
    )
  }, [formulas, comparableIds, query, structured])

  /** 첫 진입에 아무것도 안 고른 화면을 주지 않는다. */
  useEffect(() => {
    if (!baseId && selectable.length > 0) setBaseId(selectable[0].id)
  }, [baseId, selectable])

  const base = baseId ? byId.get(baseId) : undefined
  const baseComparisons = useMemo(
    () => comparisons.filter((c) => c.fromId === baseId),
    [comparisons, baseId],
  )

  useEffect(() => {
    setTargetKey(baseComparisons.length ? baseComparisons[0].to : null)
  }, [baseId, baseComparisons])

  const active = baseComparisons.find((c) => c.to === targetKey) ?? baseComparisons[0]
  const target = active ? (active.toId ? byId.get(active.toId) : byName.get(active.to)) : undefined

  /** 구성 약재 대조 — 이건 우리가 계산한 것이라 문헌 인용과 구분해 표시한다. */
  const herbDiff = useMemo(() => {
    if (!base || !target) return null
    const a = new Set((base.composition ?? []).map((c) => herbName(c.herb)).filter(Boolean))
    const b = new Set((target.composition ?? []).map((c) => herbName(c.herb)).filter(Boolean))
    if (a.size === 0 || b.size === 0) return null
    return {
      shared: [...a].filter((h) => b.has(h)),
      onlyA: [...a].filter((h) => !b.has(h)),
      onlyB: [...b].filter((h) => !a.has(h)),
    }
  }, [base, target])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        처방 비교 자료를 불러오는 중…
      </div>
    )
  }

  if (error) {
    return (
      <div className="surface-card rounded-2xl p-6 text-[14px] text-red-700">
        {(error as Error).message}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowLeftRight className="h-7 w-7 text-blue-500" />
          처방 비교
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          방약합편 해설의 감별 대목 {comparisons.length.toLocaleString()}건 · 처방{' '}
          {comparableIds.size.toLocaleString()}건
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        {/* 기준 처방 고르기 */}
        <div className="surface-card rounded-2xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="처방명으로 찾기"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-3 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <ul className="mt-3 max-h-[560px] space-y-0.5 overflow-y-auto">
            {selectable.map((f) => {
              const n = comparisons.filter((c) => c.fromId === f.id).length
              return (
                <li key={f.id}>
                  <button
                    onClick={() => setBaseId(f.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[14px] transition-colors',
                      f.id === baseId
                        ? 'bg-blue-50 font-semibold text-blue-700'
                        : 'text-neutral-700 hover:bg-neutral-50',
                    )}
                  >
                    <span className="truncate">
                      {structured[f.id]?.koreanName || f.name}
                    </span>
                    <span className="shrink-0 text-[12px] text-neutral-400">{n}</span>
                  </button>
                </li>
              )
            })}
            {selectable.length === 0 && (
              <li className="px-3 py-6 text-center text-[13.5px] text-neutral-500">
                찾는 처방이 없습니다
              </li>
            )}
          </ul>
        </div>

        {/* 비교 내용 */}
        <div className="space-y-4">
          {!base || !active ? (
            <div className="surface-card rounded-2xl p-8 text-center text-[14px] text-neutral-500">
              왼쪽에서 처방을 고르면 문헌에 기록된 감별 내용을 보여드립니다.
            </div>
          ) : (
            <>
              {/* 상대 처방 탭 — 한 처방에 여러 비교가 있다 */}
              <div className="surface-card rounded-2xl p-4">
                <div className="mb-2 text-[13px] font-semibold text-neutral-500">
                  {structured[base.id]?.koreanName || base.name}과(와) 견주어 볼 처방
                </div>
                <div className="flex flex-wrap gap-2">
                  {baseComparisons.map((c) => (
                    <button
                      key={c.to}
                      onClick={() => setTargetKey(c.to)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors',
                        c.to === active.to
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300',
                      )}
                    >
                      {c.to}
                      {!c.toId && (
                        <span className="ml-1 text-[11px] opacity-70">미수록</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 문헌 감별 — 원문 인용 */}
              <div className="surface-card rounded-2xl p-5">
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-neutral-400" />
                  <h2 className="text-[15px] font-bold text-neutral-900">
                    {base.name} vs {active.to}
                  </h2>
                </div>
                <p className="whitespace-pre-line text-[15px] leading-[1.9] text-neutral-800">
                  {active.text}
                </p>
                <p className="mt-4 border-t border-neutral-100 pt-3 text-[12px] leading-relaxed text-neutral-400">
                  방약합편 해설에서 인용했습니다. 원문 그대로이며 요약하지 않았습니다.
                </p>
              </div>

              {/* 구성 대조 — 계산한 값이라 위와 구분한다.
                  423건 중 44건은 원본에 구성 약재가 없어 대조가 뜨지 않는다.
                  조용히 빼면 왜 없는지 알 수 없으므로 이유를 적는다. */}
              {!herbDiff && (
                <div className="surface-card rounded-2xl px-5 py-4 text-[13.5px] leading-relaxed text-neutral-500">
                  두 처방 중 한쪽의 구성 약재가 원본에 없어 대조를 만들지 못했습니다.
                </div>
              )}
              {herbDiff && (
                <div className="surface-card rounded-2xl p-5">
                  <h3 className="mb-3 text-[15px] font-bold text-neutral-900">
                    구성 약재 대조
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <div className="mb-2 text-[12.5px] font-semibold text-neutral-500">
                        공통 {herbDiff.shared.length}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {herbDiff.shared.map((h) => (
                          <span
                            key={h}
                            className="rounded-md bg-neutral-100 px-2 py-1 text-[13px] text-neutral-700"
                          >
                            {h}
                          </span>
                        ))}
                        {herbDiff.shared.length === 0 && (
                          <span className="text-[13px] text-neutral-400">없음</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[12.5px] font-semibold text-blue-600">
                        {base.name}에만 {herbDiff.onlyA.length}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {herbDiff.onlyA.map((h) => (
                          <span
                            key={h}
                            className="rounded-md bg-blue-50 px-2 py-1 text-[13px] text-blue-700"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[12.5px] font-semibold text-amber-600">
                        {active.to}에만 {herbDiff.onlyB.length}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {herbDiff.onlyB.map((h) => (
                          <span
                            key={h}
                            className="rounded-md bg-amber-50 px-2 py-1 text-[13px] text-amber-700"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 border-t border-neutral-100 pt-3 text-[12px] leading-relaxed text-neutral-400">
                    이 대조는 두 처방의 구성에서 계산한 것입니다. 위 감별 설명과 달리 문헌 인용이 아닙니다.
                  </p>
                </div>
              )}

              {/* 적응증 — 색인이 있을 때만 */}
              {(structured[base.id]?.indications?.length ||
                (target && structured[target.id]?.indications?.length)) && (
                <div className="surface-card rounded-2xl p-5">
                  <h3 className="mb-3 text-[15px] font-bold text-neutral-900">적응증</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-[12.5px] font-semibold text-blue-600">
                        {base.name}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(structured[base.id]?.indications ?? []).map((s) => (
                          <span
                            key={s}
                            className="rounded-md bg-blue-50 px-2 py-1 text-[13px] text-blue-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[12.5px] font-semibold text-amber-600">
                        {active.to}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {target ? (
                          (structured[target.id]?.indications ?? []).map((s) => (
                            <span
                              key={s}
                              className="rounded-md bg-amber-50 px-2 py-1 text-[13px] text-amber-700"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[13px] text-neutral-400">
                            카탈로그에 아직 없는 처방입니다
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
