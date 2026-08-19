import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Copy, Check, Link2, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import {
  fetchGuideByVisit,
  issueGuide,
  revokeGuide,
  markGuideReportsReviewed,
  type Guide,
  type GuideReport,
} from '@/services/guides'
import { logError } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * 복약 안내서 발행.
 *
 * 환자가 한의원을 기피하는 이유 상위가 "뭘 먹는지·왜 이 약인지·얼마인지
 * 모른다" 였다. 그 답은 이미 차트와 카탈로그에 있으므로, 한의사가 할 일은
 * 발행 버튼을 누르는 것과 복용법 한 줄을 적는 것까지여야 한다.
 *
 * 비용은 비급여 사전 설명 의무(의료법 제45조의2)의 내용이기도 해서,
 * 항목과 금액을 적어 두면 환자 안내와 설명 근거가 같은 자리에서 해결된다.
 */

interface CostRow {
  name: string
  amount: string
}

interface Props {
  visitId: string
  formulaName: string
  defaultDays?: number | null
  /** 진료에 기록해 둔 비급여 항목 — 안내서 비용란의 출발점이 된다 */
  nonCoveredItems?: Array<{ name: string; amount: number }>
  /** 사전 설명·동의를 받은 시점. null 이면 아직 안 받은 것이다 */
  nonCoveredConsentAt?: string | null
  onClose: () => void
}

export function MedicationGuideModal({
  visitId,
  formulaName,
  defaultDays,
  nonCoveredItems,
  nonCoveredConsentAt,
  onClose,
}: Props) {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [reports, setReports] = useState<GuideReport[]>([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  const [instructions, setInstructions] = useState('하루 2회, 식후 30분에 드세요.')
  const [cautions, setCautions] = useState('')
  const [totalDays, setTotalDays] = useState(String(defaultDays ?? 10))
  const [dispensedDays, setDispensedDays] = useState('')
  const [costs, setCosts] = useState<CostRow[]>(
    nonCoveredItems && nonCoveredItems.length > 0
      ? nonCoveredItems.map((c) => ({ name: c.name, amount: String(c.amount) }))
      : [{ name: '첩약', amount: '' }],
  )

  const guideUrl = guide ? `${window.location.origin}/guide/${guide.token}` : ''

  const load = useCallback(async () => {
    try {
      const res = await fetchGuideByVisit(visitId)
      if (res) {
        setGuide(res.guide)
        setReports(res.reports)
        setInstructions(res.guide.instructions ?? instructions)
        setCautions(res.guide.cautions ?? '')
        if (res.guide.totalDays != null) setTotalDays(String(res.guide.totalDays))
        if (res.guide.dispensedDays != null)
          setDispensedDays(String(res.guide.dispensedDays))
        if (res.guide.costItems.length > 0) {
          setCosts(res.guide.costItems.map((c) => ({ name: c.name, amount: String(c.amount) })))
        }
      }
    } catch (err) {
      logError(err, 'MedicationGuideModal.load')
    } finally {
      setLoading(false)
    }
    // instructions 를 의존성에 넣으면 타이핑할 때마다 다시 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId])

  useEffect(() => {
    void load()
  }, [load])

  // QR 은 링크가 생긴 뒤에만 그린다. 종이에 붙여 주는 용도라 크게 뽑는다.
  useEffect(() => {
    if (!guideUrl) {
      setQr(null)
      return
    }
    QRCode.toDataURL(guideUrl, { width: 320, margin: 1 })
      .then(setQr)
      .catch((err) => logError(err, 'MedicationGuideModal.qr'))
  }, [guideUrl])

  const issue = async () => {
    if (issuing) return
    setIssuing(true)
    try {
      const saved = await issueGuide(visitId, {
        instructions: instructions.trim() || null,
        cautions: cautions.trim() || null,
        totalDays: parseInt(totalDays, 10) || null,
        dispensedDays: dispensedDays ? parseInt(dispensedDays, 10) : null,
        costItems: costs
          .filter((c) => c.name.trim() && c.amount.trim())
          .map((c) => ({ name: c.name.trim(), amount: parseInt(c.amount, 10) || 0 })),
      })
      setGuide(saved)
    } catch (err) {
      logError(err, 'MedicationGuideModal.issue')
    } finally {
      setIssuing(false)
    }
  }

  const copy = async () => {
    if (!guideUrl) return
    try {
      await navigator.clipboard.writeText(guideUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      logError(err, 'MedicationGuideModal.copy')
    }
  }

  const close = async () => {
    if (!guide) return
    if (!confirm('안내서를 닫으면 환자가 링크를 열 수 없습니다. 계속할까요?')) return
    try {
      await revokeGuide(guide.id)
      setGuide(null)
    } catch (err) {
      logError(err, 'MedicationGuideModal.revoke')
    }
  }

  const reviewAll = async () => {
    if (!guide) return
    try {
      await markGuideReportsReviewed(guide.id)
      setReports((prev) =>
        prev.map((r) => ({ ...r, reviewedAt: r.reviewedAt ?? new Date().toISOString() })),
      )
    } catch (err) {
      logError(err, 'MedicationGuideModal.review')
    }
  }

  const unreviewed = reports.filter((r) => !r.reviewedAt)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 className="text-[17px] font-bold text-neutral-900">복약 안내서</h2>
            <p className="mt-0.5 text-[12px] text-neutral-500">
              {formulaName || '처방 없음'} · 환자가 링크로 열어 봅니다
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-8 text-center text-[13px] text-neutral-500">불러오는 중…</p>
          ) : (
            <>
              {/* 환자 자가 기록 — 이상반응부터 */}
              {reports.length > 0 && (
                <section className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-neutral-900">
                      환자 자가 기록 {reports.length}건
                      {unreviewed.length > 0 && (
                        <span className="ml-2 text-[12px] font-medium text-red-600">
                          미확인 {unreviewed.length}
                        </span>
                      )}
                    </h3>
                    {unreviewed.length > 0 && (
                      <button
                        onClick={() => void reviewAll()}
                        className="text-[13px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        모두 확인 처리
                      </button>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {reports.slice(0, 8).map((r) => (
                      <li
                        key={r.id}
                        className={cn(
                          'rounded-xl border p-3',
                          r.adverseFlags.length > 0
                            ? 'border-red-200 bg-red-50'
                            : 'border-neutral-200',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {r.adverseFlags.length > 0 && (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                          )}
                          <span className="text-[13px] font-semibold text-neutral-900">
                            {new Date(r.reportedAt).toLocaleString('ko-KR')}
                          </span>
                          {r.symptomScore != null && (
                            <span className="text-[13px] text-neutral-600">
                              증상 {r.symptomScore}/10
                            </span>
                          )}
                        </div>
                        {r.adverseFlags.length > 0 && (
                          <p className="mt-1 text-[13px] font-medium text-red-800">
                            {r.adverseFlags.join(', ')}
                          </p>
                        )}
                        {r.note && (
                          <p className="mt-1 text-[13px] leading-relaxed text-neutral-700">
                            {r.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 링크 */}
              {guide && (
                <section className="mb-5 rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-neutral-500" />
                    <code className="flex-1 truncate text-[13px] text-neutral-700">
                      {guideUrl}
                    </code>
                    <button
                      onClick={() => void copy()}
                      className="flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-200"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? '복사됨' : '복사'}
                    </button>
                  </div>
                  {qr && (
                    <div className="mt-3 flex items-center gap-4">
                      <img src={qr} alt="복약 안내서 QR 코드" className="h-32 w-32" />
                      <p className="text-[13px] leading-relaxed text-neutral-600">
                        약봉투에 붙이거나 화면으로 보여 주세요. 환자는 로그인 없이 열 수
                        있고, 이 문서에는 이름·연락처가 들어가지 않습니다.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* 발행 내용 */}
              <div className="mb-4">
                <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                  복용법
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                  주의사항 (선택)
                </label>
                <textarea
                  value={cautions}
                  onChange={(e) => setCautions(e.target.value)}
                  rows={2}
                  placeholder="예: 복용 중 찬 음식과 밀가루는 피해 주세요."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                    총 일수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={totalDays}
                    onChange={(e) => setTotalDays(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                    수령 일수 (선택)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={dispensedDays}
                    onChange={(e) => setDispensedDays(e.target.value)}
                    placeholder="일부만 드렸다면"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* 비용 — 비급여 사전 설명 의무의 내용이기도 하다 */}
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[13px] font-medium text-neutral-700">
                  비급여 항목·금액
                </label>
                <button
                  type="button"
                  onClick={() => setCosts((prev) => [...prev, { name: '', amount: '' }])}
                  className="flex items-center gap-1 text-[13px] font-semibold text-blue-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  항목 추가
                </button>
              </div>
              <div className="mb-2 space-y-2">
                {costs.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={c.name}
                      onChange={(e) =>
                        setCosts((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                        )
                      }
                      placeholder="항목명"
                      className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                    <input
                      type="number"
                      value={c.amount}
                      onChange={(e) =>
                        setCosts((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)),
                        )
                      }
                      placeholder="금액"
                      className="w-32 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCosts((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="항목 삭제"
                      className="rounded-lg px-2 text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {/* 이 모달은 처방 뒤에 열린다. 여기 금액을 적는 것으로
                  사전 설명 의무가 충족되는 것처럼 읽히면 안 된다. */}
              {nonCoveredConsentAt ? (
                <p className="text-[12px] leading-relaxed text-green-700">
                  사전 설명·동의 기록됨 —{' '}
                  {new Date(nonCoveredConsentAt).toLocaleString('ko-KR')}
                </p>
              ) : (
                <p className="text-[12px] leading-relaxed text-amber-700">
                  이 진료에는 비급여 사전 설명·동의 기록이 없습니다. 의료법 제45조의2 는
                  비급여를 하기 <strong>전에</strong> 가격·사유·대체 항목을 설명하도록
                  합니다 — 여기 금액을 적는 것으로는 대신되지 않습니다. 진료 기록에서
                  남겨 주세요.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 border-t border-neutral-100 px-6 py-4">
          {guide && (
            <button
              onClick={() => void close()}
              className="rounded-xl bg-neutral-100 px-4 py-2.5 text-[14px] font-medium text-neutral-600 hover:bg-neutral-200"
            >
              안내서 닫기
            </button>
          )}
          <button
            onClick={() => void issue()}
            disabled={issuing}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {issuing ? '만드는 중…' : guide ? '내용 갱신' : '안내서 만들기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MedicationGuideModal
