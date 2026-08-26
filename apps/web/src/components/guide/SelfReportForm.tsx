import { useState } from 'react'
import { AlertTriangle, Check, ClipboardCheck } from 'lucide-react'
import { submitReport } from '@/services/publicGuide'
import { logError } from '@/lib/errors'

interface Props {
  /** 기록은 언제나 '지금 먹는 안내서' 에 붙는다 */
  token: string
  adverseFlagOptions: string[]
  onSent: () => void | Promise<void>
}

/**
 * 오늘 어떠셨나요 — 복용 중 자가 기록.
 *
 * 소비자원 한방 피해구제 신청 사유 1위가 부작용(45.7%)이었고 그중 간 기능
 * 이상을 호소한 사례가 있었다. 문제는 환자가 이상을 느껴도 다음 내원까지
 * 말할 데가 없다는 것이다. 여기서 남긴 것은 한의사 대시보드에 바로 뜨고,
 * 이상반응이 붙은 기록이 먼저 보인다.
 *
 * 다만 이 화면이 응급 창구처럼 읽히면 안 된다 — 누가 즉시 보고 있지는 않다.
 */
export function SelfReportForm({ token, adverseFlagOptions, onSent }: Props) {
  const [score, setScore] = useState(5)
  const [flags, setFlags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (sending) return
    setSending(true)
    setError(null)
    try {
      await submitReport(token, {
        symptomScore: score,
        adverseFlags: flags,
        note: note.trim() || null,
      })
      setSent(true)
      await onSent()
    } catch (err) {
      logError(err, 'SelfReportForm')
      setError('기록을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-2xl border-2 border-neutral-900 p-5">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        <h2 className="text-[15px] font-bold">오늘 어떠셨나요?</h2>
      </div>

      {sent ? (
        <div className="flex items-start gap-2 py-2">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
          <div>
            <p className="text-[15px] leading-relaxed text-neutral-700">
              한의원에 전달했습니다. 이상반응을 표시하셨다면 한의원에서 먼저
              확인합니다. 불편이 심하면 복용을 멈추고 바로 연락해 주세요.
            </p>
            {/* 매일 먹는 약이다. 다시 남기려고 새로고침하게 두지 않는다. */}
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setFlags([])
                setNote('')
              }}
              className="mt-3 text-[15px] font-semibold text-neutral-900 underline"
            >
              다시 기록하기
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-4 text-[14px] leading-relaxed text-neutral-600">
            남겨 두시면 다음 진료 때 한의사가 보고 처방을 조정합니다.
          </p>

          <label className="mb-1 block text-[14px] font-medium">
            증상 정도: <span className="font-bold">{score}</span> / 10
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={score}
            onChange={(e) => setScore(parseInt(e.target.value, 10))}
            className="w-full accent-neutral-900"
          />
          <div className="mb-4 flex justify-between text-[12px] text-neutral-400">
            <span>0 · 괜찮음</span>
            <span>10 · 매우 심함</span>
          </div>

          <p className="mb-2 text-[14px] font-medium">이런 증상이 있나요? (있는 것만)</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {adverseFlagOptions.map((f) => {
              const on = flags.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    setFlags((prev) => (on ? prev.filter((x) => x !== f) : [...prev, f]))
                  }
                  className={`rounded-full border px-3 py-2 text-[14px] transition-colors ${
                    on
                      ? 'border-red-500 bg-red-50 font-semibold text-red-700'
                      : 'border-neutral-300 text-neutral-700'
                  }`}
                >
                  {f}
                </button>
              )
            })}
          </div>

          {flags.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <p className="text-[14px] leading-relaxed text-red-800">
                증상이 심하거나 눈·피부가 노래지면 <strong>복용을 멈추고</strong> 한의원
                또는 가까운 의료기관에 바로 연락해 주세요. 이 기록만으로는 즉시 조치가
                되지 않습니다.
              </p>
            </div>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="더 하고 싶은 말씀 (선택)"
            className="mb-3 w-full resize-none rounded-xl border border-neutral-300 px-3 py-2 text-[15px] focus:border-neutral-900 focus:outline-none"
          />

          {error && <p className="mb-2 text-[14px] text-red-700">{error}</p>}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={sending}
            className="w-full rounded-xl bg-neutral-900 py-3.5 text-[16px] font-semibold text-white disabled:opacity-50"
          >
            {sending ? '보내는 중…' : '한의원에 보내기'}
          </button>
        </>
      )}
    </section>
  )
}

export default SelfReportForm
