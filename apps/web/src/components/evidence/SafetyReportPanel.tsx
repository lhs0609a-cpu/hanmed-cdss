import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import { logError } from '@/lib/errors'

/**
 * 한약 이상반응 증례 패널 — 이 제품에서 유일하게 '하지 말 것'을 말하는 자리.
 *
 * 왜 만들었나:
 *   해외 증례보고를 세어 보니 한약 관련 7,402건 중 4,068건이 독성·약인성
 *   간손상 같은 이상반응이었다(2026-09 실측). 치험례를 모으는 입장에서는
 *   걸러낼 잡음으로 보였지만, 진료실에서 더 급한 물음은 "이 처방을 쓰면
 *   낫는가" 보다 "이 환자에게 이 약재를 써도 되는가" 다.
 *
 *   국내 자료에는 이만한 규모의 이상반응 증례가 없다. 치험례 옆에 나란히
 *   두는 것이 이 코퍼스의 값어치다.
 *
 * 왜 학명으로 찾나:
 *   수집된 증례는 영문 초록이다. '감초'로 찾으면 한 건도 안 걸린다.
 *   herbs_master 의 scientificName 에서 속명+종소명을 뽑아 그걸로 찾는다.
 *
 * 없으면 숨기지 않고 "보고 없음"을 말한다 — 경고가 안 보이는 것과 경고가
 * 없는 것은 다르고, 그 차이를 한의사가 알아야 한다.
 */

interface SafetyReport {
  id: string
  title: string
  titleKo: string | null
  abstractPreview: string | null
  journal: string | null
  publishedYear: number | null
  url: string
}

interface Props {
  /** herbs_master.scientificName — 여러 학명이 / 와 줄바꿈으로 섞여 들어온다 */
  scientificName?: string | null
  /** 화면에 보여줄 한글 약재명 */
  herbName: string
  limit?: number
}

/**
 * 학명 문자열에서 속명+종소명 하나를 뽑는다.
 *
 * 원자료가 지저분하다 — "Cinnamomum cassia (L.) J.Presl Cinnamomum cassia
 * (L.) D.Don / Cinnamomum cassia Blume" 처럼 이명(異名)이 슬래시와 줄바꿈으로
 * 이어 붙어 있고 "틀림:" 같은 편집 메모까지 섞인다.
 *
 * 명명자(authority)까지 넣어 검색하면 초록과 안 맞는다. 속명+종소명 두 낱말만
 * 쓴다 — 그게 논문 초록이 실제로 적는 형태다.
 *
 * 잡종 기호(×)를 건너뛰는 이유: 목단피 'Paeonia × suffruticosa', 지각
 * 'Citrus × aurantium' 처럼 상용 약재가 잡종 표기를 쓴다. 이걸 안 받으면
 * 실제 자료가 있는 약재에서 패널이 통째로 사라진다. 논문 초록은 대개 ×
 * 없이 'Paeonia suffruticosa' 로 적으므로 기호는 빼고 맞춘다.
 *
 * 광물성 약재(자석 'Magnetite', 은박 'Ag')는 학명이 없어 null 이 된다.
 * 그게 맞다 — 없는 것을 억지로 만들어 엉뚱한 논문을 물어오면 안 된다.
 *
 * 실측: herbs_master 학명 563건 중 557건(98.9%) 파싱(2026-09).
 */
export function toBinomial(scientificName?: string | null): string | null {
  if (!scientificName) return null
  const first = scientificName.split(/[/\r\n]/)[0].trim()
  const m = first.match(/^([A-Z][a-z]+)\s+(?:[×x]\s+)?([a-z-]{3,})/)
  if (!m) return null
  return `${m[1]} ${m[2]}`
}

export function SafetyReportPanel({ scientificName, herbName, limit = 4 }: Props) {
  const [items, setItems] = useState<SafetyReport[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const binomial = toBinomial(scientificName)

  useEffect(() => {
    if (!binomial) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setFailed(false)
    api
      .get('/references', {
        params: {
          search: binomial,
          category: 'safety',
          evidenceType: 'case_report',
          sort: 'recent',
          limit,
        },
      })
      .then((res: any) => {
        if (!alive) return
        setItems(res.data?.data ?? [])
        setTotal(res.data?.meta?.total ?? 0)
      })
      .catch((err) => {
        if (!alive) return
        logError(err, 'SafetyReportPanel')
        setFailed(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [binomial, limit])

  // 학명을 모르면 찾을 방법이 없다. 조용히 빠진다 — 여기서 "보고 없음"이라고
  // 하면 찾아보지도 않고 안전하다고 말하는 셈이 된다.
  if (!binomial) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
      <h2 className="font-bold text-amber-900 mb-1 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        이상반응 보고
      </h2>
      <p className="text-[12px] text-amber-800 mb-4">
        {herbName}(<span className="italic">{binomial}</span>) 관련 해외 증례보고
        {total > 0 && ` · ${total.toLocaleString()}건`}
      </p>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-amber-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[13px]">확인 중…</span>
        </div>
      )}

      {failed && (
        <p className="text-[13px] text-amber-900 py-2">
          이상반응 보고를 불러오지 못했습니다. 없다는 뜻이 아니므로 다시
          시도하거나 원문을 직접 확인하십시오.
        </p>
      )}

      {!loading && !failed && items.length === 0 && (
        <p className="text-[13px] text-amber-900 py-2">
          수집된 이상반응 증례보고가 없습니다. 안전하다는 뜻은 아닙니다 —
          이 자료실에 보고가 없다는 것까지가 사실입니다.
        </p>
      )}

      <div className="space-y-2.5">
        {!loading &&
          items.map((r) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-amber-200 bg-white p-3.5 hover:border-amber-400 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-semibold text-neutral-900 leading-snug flex-1">
                  {r.titleKo || r.title}
                </p>
                <ExternalLink className="h-3.5 w-3.5 text-amber-400 group-hover:text-amber-600 flex-shrink-0 mt-0.5" />
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-500">
                {r.journal && <span className="truncate">{r.journal}</span>}
                {r.publishedYear && (
                  <span className="tabular flex-shrink-0">{r.publishedYear}</span>
                )}
              </div>
              {r.abstractPreview && (
                <p className="mt-2 text-[12px] text-neutral-600 leading-relaxed line-clamp-2">
                  {r.abstractPreview}
                </p>
              )}
            </a>
          ))}
      </div>

      {total > items.length && (
        <a
          href={`/references?category=safety&evidenceType=case_report&search=${encodeURIComponent(binomial)}`}
          className="block text-center text-[12px] font-semibold text-amber-800 pt-3 hover:underline"
        >
          {total.toLocaleString()}건 모두 보기
        </a>
      )}
    </div>
  )
}
