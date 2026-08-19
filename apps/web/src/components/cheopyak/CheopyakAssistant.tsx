import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Copy, Check, AlertTriangle } from 'lucide-react'
import { fetchCheopyakQuota, type CheopyakQuota } from '@/services/myPatients'
import { CHEOPYAK_DISEASES, CHEOPYAK_NOTICE } from '@/data/cheopyak-codes'
import { logError } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * 첩약 건강보험 시범사업 도우미.
 *
 * 경기도한의사회 설문(2025.5, 675명)에서 "체크리스트 등 번거로운 행정절차"를
 * 76%가 애로로 꼽았다. 그중 기록만으로 해결되는 두 가지를 여기서 처리한다.
 *
 *  1. 남은 한도 — 연간 2개 질환, 질환당 20일분. 넘겨 처방하면 삭감되는데
 *     지금은 지난 처방을 기억해서 센다. 서버에 쌓인 진료 기록으로 계산한다.
 *  2. 체크리스트 초안 — 환자 상태·치료계획을 청구 전에 따로 제출해야 한다.
 *     차트에 이미 적은 내용을 옮겨 적게 두지 않는다.
 *
 * 청구 코드는 만들어 주지 않는다. 내부 가칭 코드를 코드처럼 보여 주면
 * 그대로 청구서에 옮겨 적게 되고, 그건 삭감이다.
 */

export interface CheopyakVisitSummary {
  visitedAt: string
  symptoms: string[]
  diagnosis: string
  formulaName: string
  pulseNote?: string
  painScore?: number | null
}

interface Props {
  patientId: string
  patientName: string
  patientAgeGender?: string
  /** 체크리스트 초안의 재료가 되는 최근 진료. 없으면 초안은 안 만든다. */
  latestVisit?: CheopyakVisitSummary | null
  className?: string
}

const PILOT_DISEASES = CHEOPYAK_DISEASES.filter((d) => d.isPilotCovered !== false)

export function CheopyakAssistant({
  patientId,
  patientName,
  patientAgeGender,
  latestVisit,
  className,
}: Props) {
  const [quota, setQuota] = useState<CheopyakQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>(PILOT_DISEASES[0]?.name ?? '')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      setQuota(await fetchCheopyakQuota(patientId))
    } catch (err) {
      logError(err, 'CheopyakAssistant')
      setQuota(null)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void load()
  }, [load])

  const used = quota?.diseases.find((d) => d.disease === selected)
  const daysPerDisease = quota?.daysPerDisease ?? 20
  const slotsTotal = quota?.diseaseSlotsTotal ?? 2
  const slotsUsed = quota?.diseaseSlotsUsed ?? 0
  const remaining = used ? used.daysRemaining : daysPerDisease

  /** 새 질환인데 올해 질환 칸이 이미 다 찼는지 */
  const slotBlocked = !used && slotsUsed >= slotsTotal

  const checklist = useMemo(() => {
    if (!latestVisit) return ''
    const v = latestVisit
    const lines = [
      `[첩약 시범사업 진단 체크리스트 초안]`,
      `대상 질환: ${selected}`,
      `환자: ${patientName}${patientAgeGender ? ` (${patientAgeGender})` : ''}`,
      `진료일: ${v.visitedAt.slice(0, 10)}`,
      ``,
      `1. 환자 상태`,
      `   - 주요 증상: ${v.symptoms.length ? v.symptoms.join(', ') : '(차트에 기록 없음)'}`,
      `   - 변증/진단: ${v.diagnosis || '(차트에 기록 없음)'}`,
      v.pulseNote ? `   - 맥진 소견: ${v.pulseNote}` : null,
      v.painScore != null ? `   - 통증 점수(VAS): ${v.painScore}/10` : null,
      ``,
      `2. 치료 계획`,
      `   - 처방: ${v.formulaName || '(차트에 기록 없음)'}`,
      `   - 투여 예정: ${Math.min(remaining, daysPerDisease)}일분 (연간 한도 ${daysPerDisease}일 중 잔여)`,
      `   - 재평가: 투여 종료 후 경과 확인 및 필요 시 처방 조정`,
      ``,
      `※ 차트 기록에서 뽑은 초안입니다. 제출 전 반드시 확인·보완해 주세요.`,
    ].filter((l) => l !== null)
    return lines.join(String.fromCharCode(10))
  }, [latestVisit, selected, patientName, patientAgeGender, remaining, daysPerDisease])

  const copy = async () => {
    if (!checklist) return
    try {
      await navigator.clipboard.writeText(checklist)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      logError(err, 'CheopyakAssistant.copy')
    }
  }

  if (loading) return null

  return (
    <section className={cn('rounded-2xl border border-neutral-200 bg-white p-5', className)}>
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-blue-600" aria-hidden="true" />
        <h3 className="text-[15px] font-bold text-neutral-900">첩약 건강보험</h3>
        {quota && (
          <span className="ml-auto text-[12px] text-neutral-500">
            {quota.year}년 · 질환 {slotsUsed}/{slotsTotal}
          </span>
        )}
      </div>

      {/* 올해 사용 현황 — 이미 쓴 질환이 있으면 그것부터 보여 준다 */}
      {quota && quota.diseases.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {quota.diseases.map((d) => (
            <li
              key={d.disease}
              className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-[13px]"
            >
              <span className="font-medium text-neutral-800">{d.disease}</span>
              <span
                className={cn(
                  'font-semibold',
                  d.daysRemaining === 0 ? 'text-red-600' : 'text-neutral-600',
                )}
              >
                {d.daysUsed}일 사용 · 잔여 {d.daysRemaining}일
              </span>
            </li>
          ))}
        </ul>
      )}

      <label className="mb-1 block text-[13px] font-medium text-neutral-700">
        처방할 대상 질환
      </label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mb-3 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {PILOT_DISEASES.map((d) => (
          <option key={d.pilotCode} value={d.name}>
            {d.name}
          </option>
        ))}
      </select>

      {/* 한도 판정 — 처방 전에 알아야 삭감을 막는다 */}
      {slotBlocked ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-red-800">
            올해 급여 질환 {slotsTotal}개를 이미 사용했습니다. 이 질환으로 추가 청구하면
            삭감됩니다.
          </p>
        </div>
      ) : remaining === 0 ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-red-800">
            이 질환의 올해 {daysPerDisease}일분을 모두 사용했습니다.
          </p>
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
          <p className="text-[13px] leading-relaxed text-blue-900">
            <strong>{remaining}일분</strong> 남았습니다. 본인부담 30%(한의원 기준).
          </p>
        </div>
      )}

      {/* 체크리스트 초안 */}
      {latestVisit ? (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-neutral-700">
              진단 체크리스트 초안
            </span>
            <button
              type="button"
              onClick={() => void copy()}
              className="flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> 복사됨
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> 복사
                </>
              )}
            </button>
          </div>
          <pre className="mb-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-[12px] leading-relaxed text-neutral-700">
            {checklist}
          </pre>
        </>
      ) : (
        <p className="mb-3 text-[13px] text-neutral-500">
          진료 기록이 있으면 체크리스트 초안을 만들어 드립니다.
        </p>
      )}

      <p className="text-[12px] leading-relaxed text-neutral-500">{CHEOPYAK_NOTICE}</p>
    </section>
  )
}

export default CheopyakAssistant
