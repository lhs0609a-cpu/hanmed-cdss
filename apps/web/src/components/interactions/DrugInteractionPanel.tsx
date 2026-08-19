import { useCallback, useEffect, useState } from 'react'
import { Pill, Plus, X, ShieldAlert, ShieldCheck, Check } from 'lucide-react'
import { api } from '@/services/api'
import { updateMyPatient, recordInteractionNotice } from '@/services/myPatients'
import { logError } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * 한약-양약 병용 점검과 설명 기록.
 *
 * 대법원은 양약을 복용 중인 환자에게 한약을 처방할 때 상호작용 위험을 설명할
 * 의무를 인정했다. 그러려면 (1) 무엇을 먹고 있는지 알아야 하고 (2) 처방 약재와
 * 대조해야 하며 (3) 설명했다는 사실이 남아야 한다. 셋 중 하나라도 빠지면
 * 실제 진료에서도, 나중에 다툴 때도 쓸모가 없다.
 *
 * 복용 약물은 환자 단위로 서버에 저장한다 — 매 진료마다 다시 묻지 않게.
 */

type Severity = 'critical' | 'major' | 'moderate' | 'minor'

interface InteractionItem {
  drug: string
  herb: string
  severity: Severity
  mechanism?: string
  recommendation?: string
  clinicalManagement?: string
}

interface CheckResult {
  hasInteractions: boolean
  totalCount: number
  bySeverity: Partial<Record<Severity, InteractionItem[]>>
}

const SEVERITY_ORDER: Severity[] = ['critical', 'major', 'moderate', 'minor']

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: '병용 금기',
  major: '주의 요망',
  moderate: '경과 관찰',
  minor: '참고',
}

const SEVERITY_TONE: Record<Severity, string> = {
  critical: 'border-red-200 bg-red-50 text-red-800',
  major: 'border-amber-200 bg-amber-50 text-amber-800',
  moderate: 'border-blue-200 bg-blue-50 text-blue-800',
  minor: 'border-neutral-200 bg-neutral-50 text-neutral-700',
}

interface Props {
  patientId: string
  medications: string[]
  onMedicationsChange: (next: string[]) => void
  /** 대조할 처방 — 없으면 약물 목록만 관리한다. */
  visit?: {
    id: string
    formulaName: string
    interactionNoticeGivenAt?: string | null
  } | null
  className?: string
}

export function DrugInteractionPanel({
  patientId,
  medications,
  onMedicationsChange,
  visit,
  className,
}: Props) {
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [noticeAt, setNoticeAt] = useState<string | null>(
    visit?.interactionNoticeGivenAt ?? null,
  )

  useEffect(() => {
    setNoticeAt(visit?.interactionNoticeGivenAt ?? null)
  }, [visit?.interactionNoticeGivenAt])

  const save = async (next: string[]) => {
    setSaving(true)
    try {
      await updateMyPatient(patientId, { medications: next })
      onMedicationsChange(next)
    } catch (err) {
      logError(err, 'DrugInteractionPanel.save')
    } finally {
      setSaving(false)
    }
  }

  const add = async () => {
    const value = input.trim()
    // 같은 약을 두 번 넣으면 상호작용도 두 번 뜬다.
    if (!value || medications.includes(value)) return
    setInput('')
    await save([...medications, value])
  }

  const remove = async (name: string) => {
    await save(medications.filter((m) => m !== name))
  }

  /** 처방 약재 ↔ 복용 양약 대조 */
  const check = useCallback(async () => {
    if (medications.length === 0 || !visit?.formulaName) {
      setResult(null)
      return
    }
    setChecking(true)
    try {
      const { data: search } = await api.get<{ data: Array<{ id: string }> }>(
        '/formulas/search',
        { params: { q: visit.formulaName, limit: 1 } },
      )
      const hit = search?.data?.[0]
      if (!hit) {
        setResult(null)
        return
      }
      const { data: detail } = await api.get<{ herbs?: Array<{ name?: string }> }>(
        `/formulas/${hit.id}`,
      )
      const herbs = (detail.herbs ?? [])
        .map((h) => h.name)
        .filter((n): n is string => Boolean(n))
      if (herbs.length === 0) {
        setResult(null)
        return
      }
      const { data } = await api.post<CheckResult>('/interactions/check', {
        herbs,
        drugs: medications,
      })
      setResult(data)
    } catch (err) {
      logError(err, 'DrugInteractionPanel.check')
      setResult(null)
    } finally {
      setChecking(false)
    }
  }, [medications, visit?.formulaName])

  useEffect(() => {
    void check()
  }, [check])

  const markExplained = async () => {
    if (!visit) return
    try {
      const saved = await recordInteractionNotice(visit.id)
      setNoticeAt(saved.interactionNoticeGivenAt)
    } catch (err) {
      logError(err, 'DrugInteractionPanel.notice')
    }
  }

  const items = SEVERITY_ORDER.flatMap((s) =>
    (result?.bySeverity?.[s] ?? []).map((i) => ({ ...i, severity: s })),
  )

  return (
    <section className={cn('rounded-2xl border border-neutral-200 bg-white p-5', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Pill className="h-4 w-4 text-blue-600" aria-hidden="true" />
        <h3 className="text-[15px] font-bold text-neutral-900">복용 양약 · 병용 점검</h3>
      </div>

      {/* 복용 약물 — 환자 단위로 저장해 다음 진료에서 다시 묻지 않는다 */}
      <div className="mb-3 flex flex-wrap gap-2">
        {medications.map((m) => (
          <span
            key={m}
            className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[13px] text-blue-800"
          >
            {m}
            <button
              type="button"
              onClick={() => void remove(m)}
              disabled={saving}
              aria-label={`${m} 삭제`}
              className="text-blue-400 hover:text-blue-700 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {medications.length === 0 && (
          <p className="text-[13px] text-neutral-500">
            복용 중인 양약을 적어 두면 처방할 때마다 자동으로 대조합니다.
          </p>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void add()
            }
          }}
          placeholder="예: 와파린, 메트포르민"
          className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={saving || !input.trim()}
          className="flex items-center gap-1 rounded-xl bg-neutral-100 px-3 py-2 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          추가
        </button>
      </div>

      {/* 점검 결과 */}
      {checking ? (
        <p className="text-[13px] text-neutral-500">상호작용을 확인하는 중…</p>
      ) : !visit?.formulaName ? (
        <p className="text-[13px] text-neutral-500">
          처방 기록이 있으면 그 약재와 대조해 드립니다.
        </p>
      ) : medications.length === 0 ? null : items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" />
          <p className="text-[13px] text-green-800">
            «{visit.formulaName}» 구성 약재와 등록된 양약 사이에 알려진 상호작용은
            없습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <p className="text-[13px] font-semibold text-neutral-900">
              «{visit.formulaName}» 기준 {items.length}건
            </p>
          </div>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li
                key={`${it.drug}-${it.herb}-${i}`}
                className={cn('rounded-xl border px-3 py-2.5', SEVERITY_TONE[it.severity])}
              >
                <p className="text-[13px] font-bold">
                  {it.herb} × {it.drug} · {SEVERITY_LABEL[it.severity]}
                </p>
                {it.mechanism && (
                  <p className="mt-1 text-[12px] leading-relaxed opacity-90">
                    {it.mechanism}
                  </p>
                )}
                {(it.recommendation || it.clinicalManagement) && (
                  <p className="mt-1 text-[12px] font-medium leading-relaxed">
                    → {it.recommendation || it.clinicalManagement}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {/* 설명의무 이행 기록 — 남겨 두지 않으면 다툴 때 방어가 안 된다 */}
          <div className="mt-3 border-t border-neutral-100 pt-3">
            {noticeAt ? (
              <p className="flex items-center gap-1.5 text-[13px] text-neutral-600">
                <Check className="h-4 w-4 text-green-500" />
                {new Date(noticeAt).toLocaleString('ko-KR')}에 환자에게 설명함으로 기록됨
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void markExplained()}
                className="text-[13px] font-semibold text-blue-600 hover:text-blue-700"
              >
                환자에게 설명했습니다 — 기록으로 남기기 →
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default DrugInteractionPanel
