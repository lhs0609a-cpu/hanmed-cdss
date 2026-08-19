import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  Leaf,
  ShieldAlert,
  BookOpen,
  Receipt,
  ClipboardCheck,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react'

/**
 * 환자용 복약 안내서 — 링크만으로 열린다.
 *
 * 한의원 기피 이유 조사 상위가 전부 "모른다" 였다.
 *   · 뭘 먹는지 모른다   → 약재 구성과 각 약재가 하는 일
 *   · 왜 이 약인지 모른다 → 같은 증상 치험례 몇 건에서 나온 처방인지
 *   · 안전한지 모른다     → 복용 중인 양약과의 상호작용, 즉시 알려야 할 징후
 *   · 얼마인지 모른다     → 항목별 금액과 총액
 *   · 몇 일분 받았는지 모른다 → 총 일수 대비 수령분(환불 분쟁의 대부분이 여기)
 *
 * 로그인은 요구하지 않는다. 로그인시키면 아무도 안 본다.
 * 대신 이 문서에는 이름·연락처·생년월일이 애초에 담기지 않는다.
 *
 * 한의사 앱(글래스 디자인)과 섞지 않는다. 이건 환자가 약봉투와 함께 보는
 * 문서라, 흰 바탕에 큰 글씨로 읽히는 것이 전부다.
 */

interface GuideHerb {
  name: string
  amount?: string | null
  effect?: string | null
}

interface GuideInteraction {
  drug: string
  herb: string
  severity: string
  advice?: string | null
}

interface Guide {
  formulaName: string
  herbs: GuideHerb[]
  evidence: { caseCount: number; successRate: number | null; source?: string | null } | null
  interactions: GuideInteraction[]
  instructions: string | null
  cautions: string | null
  totalDays: number | null
  dispensedDays: number | null
  costItems: Array<{ name: string; amount: number }>
  totalCost: number | null
  clinicName: string | null
  issuedAt: string
  adverseFlagOptions: string[]
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.ongojisin.co.kr/api/v1'

const SEVERITY_LABEL: Record<string, string> = {
  critical: '함께 드시면 안 됩니다',
  major: '주의가 필요합니다',
  moderate: '지켜봐야 합니다',
  minor: '참고하세요',
}

export default function MedicationGuidePage() {
  const { token } = useParams<{ token: string }>()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [score, setScore] = useState(5)
  const [flags, setFlags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/public/guides/${token}`)
      setGuide(data?.data ?? data)
    } catch {
      setError('안내서를 찾을 수 없습니다. 링크가 만료되었거나 한의원에서 닫았을 수 있습니다.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (sending) return
    setSending(true)
    try {
      await axios.post(`${API_BASE}/public/guides/${token}/reports`, {
        symptomScore: score,
        adverseFlags: flags,
        note: note.trim() || null,
      })
      setSent(true)
    } catch {
      setError('기록을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center text-neutral-500">
        불러오는 중…
      </main>
    )
  }

  if (error && !guide) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-[15px] leading-relaxed text-neutral-700">{error}</p>
      </main>
    )
  }

  if (!guide) return null

  const remaining =
    guide.totalDays != null && guide.dispensedDays != null
      ? guide.totalDays - guide.dispensedDays
      : null

  return (
    <main className="mx-auto max-w-xl bg-white px-5 pb-20 pt-8 text-neutral-900">
      <header className="mb-8">
        <p className="text-[13px] text-neutral-500">
          {guide.clinicName || '한의원'} · {guide.issuedAt.slice(0, 10)}
        </p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">
          {guide.formulaName || '처방 안내'}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
          이번에 드시는 한약의 구성과 주의사항입니다.
        </p>
      </header>

      {/* 왜 이 약인지 — 효과 불확실·표준화 불신에 대한 답 */}
      {guide.evidence && (
        <section className="mb-6 rounded-2xl border border-neutral-200 p-5">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <h2 className="text-[15px] font-bold">왜 이 처방인가요?</h2>
          </div>
          <p className="text-[15px] leading-relaxed text-neutral-700">
            비슷한 증상으로 이 처방을 쓴 치험례가{' '}
            <strong>{guide.evidence.caseCount.toLocaleString()}건</strong> 기록되어 있습니다.
            {guide.evidence.successRate != null && (
              <>
                {' '}
                그중 호전 이상으로 기록된 비율은{' '}
                <strong>{guide.evidence.successRate}%</strong>입니다.
              </>
            )}
          </p>
          {guide.evidence.source && (
            <p className="mt-1.5 text-[13px] text-neutral-500">출전: {guide.evidence.source}</p>
          )}
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
            치험례집은 성공한 사례를 주로 싣기 때문에 실제 성공률보다 높게 나옵니다. 참고
            자료로만 봐 주세요.
          </p>
        </section>
      )}

      {/* 약재 구성 — "뭘 먹는지 모른다" 에 대한 답 */}
      {guide.herbs.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Leaf className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <h2 className="text-[15px] font-bold">무엇이 들어 있나요? ({guide.herbs.length}가지)</h2>
          </div>
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {guide.herbs.map((h) => (
              <li key={h.name} className="px-4 py-3">
                <p className="text-[15px] font-semibold">
                  {h.name}
                  {h.amount && (
                    <span className="ml-2 text-[13px] font-normal text-neutral-500">
                      {h.amount}
                    </span>
                  )}
                </p>
                {h.effect && (
                  <p className="mt-0.5 text-[14px] leading-relaxed text-neutral-600">
                    {h.effect}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
            알레르기가 있거나 예전에 문제가 있었던 약재가 보이면 복용 전에 한의원에
            알려 주세요.
          </p>
        </section>
      )}

      {/* 복용법 */}
      {(guide.instructions || guide.totalDays != null) && (
        <section className="mb-6 rounded-2xl bg-neutral-50 p-5">
          <h2 className="mb-2 text-[15px] font-bold">어떻게 드시나요?</h2>
          {guide.instructions && (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
              {guide.instructions}
            </p>
          )}
          {guide.totalDays != null && (
            <p className="mt-2 text-[15px] text-neutral-700">
              총 <strong>{guide.totalDays}일분</strong>
              {guide.dispensedDays != null && (
                <>
                  {' '}
                  중 <strong>{guide.dispensedDays}일분</strong>을 받으셨습니다
                  {remaining != null && remaining > 0 && (
                    <span className="text-neutral-500"> (남은 {remaining}일분)</span>
                  )}
                </>
              )}
            </p>
          )}
        </section>
      )}

      {/* 상호작용 — "안전한지 모른다" 에 대한 답 */}
      {guide.interactions.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" />
            <h2 className="text-[15px] font-bold">복용 중인 약과의 주의사항</h2>
          </div>
          <ul className="space-y-2">
            {guide.interactions.map((it, i) => (
              <li
                key={`${it.drug}-${it.herb}-${i}`}
                className={`rounded-2xl border p-4 ${
                  it.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <p className="text-[15px] font-bold text-neutral-900">
                  {it.drug} · {SEVERITY_LABEL[it.severity] ?? '확인이 필요합니다'}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-neutral-700">
                  한약 재료 중 <strong>{it.herb}</strong>과(와) 함께 작용할 수 있습니다.
                </p>
                {it.advice && (
                  <p className="mt-1 text-[14px] leading-relaxed text-neutral-700">{it.advice}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 주의사항 */}
      {guide.cautions && (
        <section className="mb-6 rounded-2xl border border-neutral-200 p-5">
          <h2 className="mb-2 text-[15px] font-bold">주의사항</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
            {guide.cautions}
          </p>
        </section>
      )}

      {/* 비용 — "얼마인지 모른다" 에 대한 답 */}
      {(guide.costItems.length > 0 || guide.totalCost != null) && (
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <h2 className="text-[15px] font-bold">비용</h2>
          </div>
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {guide.costItems.map((c) => (
              <li key={c.name} className="flex justify-between px-4 py-3 text-[15px]">
                <span className="text-neutral-700">{c.name}</span>
                <span className="font-semibold tabular-nums">
                  {c.amount.toLocaleString()}원
                </span>
              </li>
            ))}
            {guide.totalCost != null && (
              <li className="flex justify-between bg-neutral-50 px-4 py-3 text-[15px] font-bold">
                <span>합계</span>
                <span className="tabular-nums">{guide.totalCost.toLocaleString()}원</span>
              </li>
            )}
          </ul>
          {remaining != null && remaining > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-relaxed text-neutral-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              아직 받지 않은 {remaining}일분이 있습니다. 복용을 중단하시게 되면 받지 않은
              분에 대해 한의원에 환불을 요청하실 수 있습니다.
            </p>
          )}
        </section>
      )}

      {/* 자가 기록 — 부작용을 다음 내원까지 묵히지 않게 */}
      <section className="rounded-2xl border-2 border-neutral-900 p-5">
        <div className="mb-2 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          <h2 className="text-[15px] font-bold">오늘 어떠셨나요?</h2>
        </div>

        {sent ? (
          <div className="flex items-start gap-2 py-2">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
            <p className="text-[15px] leading-relaxed text-neutral-700">
              한의원에 전달했습니다. 이상반응을 표시하셨다면 한의원에서 먼저 확인합니다.
              불편이 심하면 복용을 멈추고 바로 연락해 주세요.
            </p>
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
              {guide.adverseFlagOptions.map((f) => {
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
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <p className="text-[14px] leading-relaxed text-red-800">
                  증상이 심하거나 눈·피부가 노래지면 <strong>복용을 멈추고</strong> 한의원 또는
                  가까운 의료기관에 바로 연락해 주세요. 이 기록만으로는 즉시 조치가 되지
                  않습니다.
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

      <p className="mt-8 text-[12px] leading-relaxed text-neutral-400">
        이 안내서는 {guide.clinicName || '한의원'}에서 발행했습니다. 개인을 식별할 수 있는
        정보는 담겨 있지 않습니다. 증상이 갑자기 심해지면 이 문서 대신 의료기관에 직접
        연락해 주세요.
      </p>
    </main>
  )
}
