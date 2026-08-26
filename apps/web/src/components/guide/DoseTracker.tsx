import { useState } from 'react'
import { Check, CalendarCheck } from 'lucide-react'
import {
  startDosing,
  toggleDoseToday,
  type Dosing,
} from '@/services/publicGuide'
import { logError } from '@/lib/errors'

interface Props {
  token: string
  dosing: Dosing
  totalDays: number | null
  onChange: (next: Dosing) => void
}

/**
 * 복용 체크.
 *
 * 며칠째인지는 처방일이 아니라 환자가 실제로 먹기 시작한 날부터 센다. 약을
 * 받아 가고 이틀 뒤에 시작하는 일이 흔한데, 그 이틀을 복용일로 세면 순응도도
 * 경과도 틀린다.
 *
 * 기록은 서버에 저장된다. 예전에는 이 기기에만 있어서 휴대폰을 바꾸거나 카톡
 * 링크를 다른 기기에서 열면 사라졌다. 한의사도 이 기록을 본다 — 나아지지
 * 않는 이유가 처방인지 미복용인지 구분하려면 필요하다.
 */
export function DoseTracker({ token, dosing, totalDays, onChange }: Props) {
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<Dosing>) => {
    if (busy) return
    setBusy(true)
    try {
      onChange(await fn())
    } catch (err) {
      logError(err, 'DoseTracker')
    } finally {
      setBusy(false)
    }
  }

  if (!dosing.startedOn) {
    return (
      <>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => startDosing(token))}
          className="w-full rounded-xl border border-neutral-300 py-3.5 text-[16px] font-semibold text-neutral-800 disabled:opacity-50"
        >
          오늘부터 복용 시작
        </button>
        {/* 무엇이 한의원에 넘어가는지는 누르기 전에 알아야 한다.
            누른 뒤에 안내하면 그건 통보지 선택이 아니다. */}
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
          복용한 날짜는 한의원에서도 봅니다. 경과가 더딜 때 약을 바꿀 문제인지
          거른 날이 많았던 것인지 구분하는 데 쓰입니다. 기록하지 않으셔도 안내서는
          그대로 보실 수 있습니다.
        </p>
      </>
    )
  }

  const left =
    totalDays != null && dosing.dayIndex != null
      ? Math.max(0, totalDays - dosing.dayIndex)
      : null

  return (
    <>
      <p className="text-[15px] text-neutral-800">
        복용 <strong>{dosing.dayIndex}일째</strong>
        {left != null && <span className="text-neutral-500"> · {left}일 남음</span>}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(() => toggleDoseToday(token))}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold disabled:opacity-60 ${
          dosing.takenToday
            ? 'bg-green-50 text-green-700'
            : 'bg-neutral-900 text-white'
        }`}
      >
        {dosing.takenToday ? (
          <>
            <Check className="h-5 w-5" aria-hidden="true" />
            오늘 복용 완료
          </>
        ) : (
          <>
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
            오늘 먹었어요
          </>
        )}
      </button>
      <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
        지금까지 {dosing.takenDates.length}일 복용하셨습니다.
        {dosing.adherence != null && ` (기간 대비 ${dosing.adherence}%)`} 이 기록은
        한의원에서도 볼 수 있습니다.
      </p>
    </>
  )
}

export default DoseTracker
