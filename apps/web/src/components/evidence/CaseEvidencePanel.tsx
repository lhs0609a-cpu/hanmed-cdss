import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import { logError } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * 치험례 근거 패널 — 처방·변증 어디에나 같은 모양으로 붙인다.
 *
 * 이 제품의 축은 치험례다. 처방 카탈로그나 변증 도구가 이름만 나열하면
 * 한의사에게는 종이 사전과 다를 게 없다. 무엇을 보든 "실제로 몇 건 쓰였고
 * 어떻게 끝났는지" 가 같이 보여야 한다.
 *
 * 근거가 없으면 숨기지 않고 "기록 없음" 을 말한다 — 없는 걸 있는 척하는 순간
 * 나머지 근거도 같이 의심받는다.
 */

interface EvidenceCase {
  id: string
  chiefComplaint: string
  patternDiagnosis: string
  outcome: string | null
  constitution: string | null
  formulaName: string
  ageRange: string | null
  gender: string | null
}

interface EvidenceResponse {
  name: string
  kind: 'formula' | 'pattern'
  total: number
  gradedCount: number
  successRate: number | null
  outcomeBreakdown: Record<string, number>
  cases: EvidenceCase[]
}

const OUTCOME_TONE: Record<string, string> = {
  완치: 'bg-green-50 text-green-700',
  호전: 'bg-amber-50 text-amber-700',
  무효: 'bg-neutral-100 text-neutral-600',
  악화: 'bg-red-50 text-red-700',
}

export function CaseEvidencePanel({
  kind,
  name,
  limit = 4,
  compact = false,
  className,
}: {
  kind: 'formula' | 'pattern'
  name: string
  limit?: number
  /** 목록 카드 안에 넣을 때 — 건수 요약만 한 줄로 */
  compact?: boolean
  className?: string
}) {
  const [data, setData] = useState<EvidenceResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!name?.trim()) {
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get<EvidenceResponse>('/cases/evidence', { params: { kind, name, limit } })
      .then(({ data: res }) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        logError(err, 'CaseEvidencePanel')
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind, name, limit])

  const label = kind === 'formula' ? '이 처방' : '이 변증'

  if (loading) {
    return compact ? (
      <span className="inline-flex items-center gap-1 text-[12px] text-neutral-400">
        <Loader2 className="h-3 w-3 animate-spin" /> 치험례 확인 중
      </span>
    ) : (
      <div className={cn('rounded-2xl border border-neutral-200 bg-white p-5', className)}>
        <p className="text-[13px] text-neutral-500">치험례 근거를 불러오는 중…</p>
      </div>
    )
  }

  if (!data || data.total === 0) {
    return compact ? (
      <span className="text-[12px] text-neutral-400">치험례 기록 없음</span>
    ) : (
      <div className={cn('rounded-2xl border border-neutral-200 bg-white p-5', className)}>
        <div className="mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          <h3 className="text-[15px] font-bold text-neutral-900">치험례 근거</h3>
        </div>
        <p className="text-[13px] leading-relaxed text-neutral-500">
          {label}이 쓰인 치험례가 아직 데이터베이스에 없습니다. 진료 후 직접 공유하시면
          다음 진료의 근거가 됩니다.
        </p>
      </div>
    )
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px]">
        <BookOpen className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
        <span className="font-semibold text-neutral-700">치험례 {data.total}건</span>
        {data.successRate !== null && (
          <span className="text-neutral-500">· 완치·호전 {data.successRate}%</span>
        )}
      </span>
    )
  }

  return (
    <div className={cn('rounded-2xl border border-neutral-200 bg-white p-5', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          <h3 className="text-[15px] font-bold text-neutral-900">치험례 근거</h3>
        </div>
        <span className="text-[13px] text-neutral-500">
          {label}이 쓰인 기록{' '}
          <strong className="font-bold text-neutral-900">{data.total.toLocaleString()}건</strong>
        </span>
      </div>

      {/* 경과 분포 — 성공률은 경과 기록이 5건 이상일 때만 낸다(백엔드에서 결정). */}
      {Object.keys(data.outcomeBreakdown).length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {Object.entries(data.outcomeBreakdown).map(([k, v]) => (
            <span
              key={k}
              className={cn(
                'rounded-lg px-2 py-1 text-[12px] font-medium',
                OUTCOME_TONE[k] ?? 'bg-neutral-100 text-neutral-600',
              )}
            >
              {k} {v}건
            </span>
          ))}
          {data.successRate !== null ? (
            <span className="text-[12px] text-neutral-500">
              경과 기록 {data.gradedCount}건 중 완치·호전 {data.successRate}%
            </span>
          ) : (
            <span className="text-[12px] text-neutral-400">
              경과 기록이 적어 성공률은 내지 않습니다
            </span>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {data.cases.map((c) => (
          <li key={c.id} className="rounded-xl border border-neutral-200 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 line-clamp-2 text-[13.5px] font-medium leading-snug text-neutral-900">
                {c.chiefComplaint || '(주소증 기록 없음)'}
              </p>
              {c.outcome && (
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold',
                    OUTCOME_TONE[c.outcome] ?? 'bg-neutral-100 text-neutral-600',
                  )}
                >
                  {c.outcome}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[12px] text-neutral-500">
              {[
                c.ageRange,
                c.gender,
                c.constitution,
                c.patternDiagnosis && `변증 ${c.patternDiagnosis}`,
                kind === 'pattern' && c.formulaName && `처방 ${c.formulaName}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </li>
        ))}
      </ul>

      <Link
        to={`/dashboard/cases?q=${encodeURIComponent(name)}`}
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
      >
        {name} 치험례 전체 보기
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

export default CaseEvidencePanel
