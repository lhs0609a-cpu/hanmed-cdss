import { useState, useEffect, useCallback } from 'react'
import { FileText, ExternalLink, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

/**
 * 치험례 화면에 붙는 학술 증례보고 패널.
 *
 * 왜 여기에 두는가:
 *   문헌 자료실(clinical_references)에는 증례보고가 4,300건 넘게 들어와 있다.
 *   대한한방내과학회지 846건, 한방안이비인후피부과학회지 315건, 사상체질면역
 *   의학회지 228건… 그런데 한의사가 "역류성 식도염"으로 치험례를 검색하면
 *   그중 한 건도 안 보인다. 자료실 탭을 따로 열어 evidenceType 을 손으로
 *   골라야만 나온다. 있는 걸 못 찾게 해 둔 셈이었다.
 *
 * 왜 clinical_cases 에 합치지 않는가:
 *   이쪽은 초록까지다. 변증의 근거와 가감의 이유, 회차별 경과가 없다.
 *   같은 목록에 섞으면 한 줄을 읽고 처방을 정하려던 사람이 "치험례인 줄 알았는데
 *   초록이네" 를 매번 겪는다. 근거의 무게가 다르면 자리도 달라야 한다.
 *   그래서 별도 패널로 두고, 원문 링크를 항상 같이 준다.
 */

interface LiteratureCase {
  id: string
  title: string
  titleKo: string | null
  abstractPreview: string | null
  journal: string | null
  publishedYear: number | null
  url: string
  language: string
  source: string
}

interface Props {
  /** 치험례 검색어 — 같은 말로 학술 증례보고도 찾는다 */
  search: string
  apiBase: string
  /** 자료실은 인증한 한의사에게만 열려 있다 */
  token: string | null
}

const PAGE_SIZE = 5

export function LiteratureCaseReports({ search, apiBase, token }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<LiteratureCase[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        evidenceType: 'case_report',
        sort: 'recent',
        limit: String(PAGE_SIZE),
        page: '1',
      })
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`${apiBase}/references?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setItems(json.data ?? [])
      setTotal(json.meta?.total ?? 0)
    } catch (e) {
      setError('학술 증례보고를 불러오지 못했습니다')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [search, apiBase, token])

  // 패널을 펼친 적이 있을 때만 부른다. 치험례 목록이 주인공이고
  // 이건 곁들이는 자료라, 열지도 않은 패널 때문에 매 검색마다 요청이
  // 한 번 더 나가는 것은 값을 못 한다.
  useEffect(() => {
    if (open) void load()
  }, [open, load])

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0" />
          <span className="text-[14px] font-semibold text-neutral-900">
            학술 증례보고
          </span>
          <span className="text-[12px] text-neutral-500 truncate">
            {search.trim()
              ? `‘${search.trim()}’ 관련 학회지 증례`
              : '학회지에 실린 증례보고'}
            {total > 0 && ` · ${total.toLocaleString()}건`}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-neutral-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-5 py-4 space-y-3">
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            초록까지만 제공합니다. 변증 근거·가감·경과는 원문을 보십시오.
          </p>

          {loading && (
            <div className="flex items-center gap-2 py-6 justify-center text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[13px]">불러오는 중…</span>
            </div>
          )}

          {error && <p className="text-[13px] text-red-600 py-3">{error}</p>}

          {!loading && !error && items.length === 0 && (
            <p className="text-[13px] text-neutral-500 py-3">
              해당하는 학술 증례보고가 없습니다.
            </p>
          )}

          {!loading &&
            items.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-neutral-150 p-3.5 hover:border-neutral-300 hover:bg-neutral-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-semibold text-neutral-900 leading-snug flex-1">
                    {r.titleKo || r.title}
                  </p>
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-300 group-hover:text-neutral-500 flex-shrink-0 mt-0.5" />
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-500">
                  {r.journal && <span className="truncate">{r.journal}</span>}
                  {r.publishedYear && (
                    <span className="tabular flex-shrink-0">{r.publishedYear}</span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium flex-shrink-0">
                    증례보고
                  </span>
                </div>
                {r.abstractPreview && (
                  <p className="mt-2 text-[12px] text-neutral-600 leading-relaxed line-clamp-2">
                    {r.abstractPreview}
                  </p>
                )}
              </a>
            ))}

          {total > items.length && (
            <a
              href={`/references?evidenceType=case_report${
                search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''
              }`}
              className="block text-center text-[12px] font-semibold text-primary py-2 hover:underline"
            >
              문헌 자료실에서 {total.toLocaleString()}건 모두 보기
            </a>
          )}
        </div>
      )}
    </div>
  )
}
