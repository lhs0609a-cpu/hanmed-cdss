import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
import {
  fetchPendingFollowUps,
  recordVisitOutcome,
  type PendingFollowUp,
  type VisitOutcome,
} from '@/services/myPatients'
import { logError } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * 경과 확인 카드 — 처방을 낸 뒤 결과를 기록하게 만드는 자리.
 *
 * 처방만 저장되고 결과가 남지 않으면 그 진료는 치험례가 되지 못한다.
 * "나중에 정리해야지" 로는 아무도 안 적으므로, 매일 여는 첫 화면에서
 * 두 번 클릭으로 끝나게 둔다.
 *
 * 확인할 게 없으면 카드 자체를 숨긴다 — 빈 카드가 매일 자리를 차지하면
 * 화면만 무거워지고 정작 뜰 때 눈에 안 띈다.
 */

const OUTCOMES: VisitOutcome[] = ['완치', '호전', '진행중', '무효', '악화']

const OUTCOME_TONE: Record<VisitOutcome, string> = {
  완치: 'border-green-200 bg-green-50 text-green-700',
  호전: 'border-amber-200 bg-amber-50 text-amber-700',
  진행중: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  무효: 'border-neutral-200 bg-neutral-50 text-neutral-600',
  악화: 'border-red-200 bg-red-50 text-red-700',
}

export function FollowUpCard() {
  const [items, setItems] = useState<PendingFollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await fetchPendingFollowUps())
    } catch (err) {
      logError(err, 'FollowUpCard')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async (visitId: string, outcome: VisitOutcome) => {
    if (saving) return
    setSaving(true)
    try {
      await recordVisitOutcome(visitId, { outcome, outcomeNotes: note || null })
      // 기록한 항목만 목록에서 뺀다 — 전체 재조회는 화면이 튄다.
      setItems((prev) => prev.filter((v) => v.id !== visitId))
      setOpenId(null)
      setNote('')
    } catch (err) {
      logError(err, 'FollowUpCard.record')
    } finally {
      setSaving(false)
    }
  }

  if (loading || items.length === 0) return null

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-amber-600" aria-hidden="true" />
        <h2 className="text-[15px] font-bold text-neutral-900">
          경과 확인 {items.length}건
        </h2>
      </div>
      <p className="mb-3 text-[13px] leading-relaxed text-neutral-600">
        처방 후 결과가 기록되지 않은 진료입니다. 경과를 남기면 그대로 선생님의
        치험례가 되고, 다음 진료에서 근거로 쓰입니다.
      </p>

      <ul className="space-y-2">
        {items.slice(0, 5).map((v) => (
          <li key={v.id} className="rounded-xl border border-neutral-200 bg-white p-3.5">
            <button
              type="button"
              onClick={() => setOpenId(openId === v.id ? null : v.id)}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-neutral-900">
                  {v.patientName ?? '이름 없는 진료'}
                  {v.formulaName && (
                    <span className="ml-2 font-normal text-neutral-500">{v.formulaName}</span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-neutral-500">
                  {v.chiefComplaint || '주소증 기록 없음'} · {v.daysSince}일 전
                </p>
              </div>
              <ChevronRight
                className={cn(
                  'h-4 w-4 flex-shrink-0 text-neutral-300 transition-transform',
                  openId === v.id && 'rotate-90',
                )}
              />
            </button>

            {openId === v.id && (
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <div className="flex flex-wrap gap-2">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => void submit(v.id, o)}
                      disabled={saving}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50',
                        OUTCOME_TONE[o],
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="가감한 이유, 환자 반응 등 (선택)"
                  className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {items.length > 5 && (
        <p className="mt-2 text-[12px] text-neutral-500">
          외 {items.length - 5}건 — 환자 화면에서 계속 기록할 수 있습니다.
        </p>
      )}
    </section>
  )
}

export default FollowUpCard
