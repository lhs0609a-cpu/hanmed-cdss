import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  X,
  Copy,
  Check,
  Link2,
  AlertTriangle,
  Plus,
  Trash2,
  Send,
  CalendarCheck,
  ShieldCheck,
} from 'lucide-react'
import {
  fetchGuideByVisit,
  issueGuide,
  revokeGuide,
  markGuideReportsReviewed,
  sendGuideLink,
  setPatientNotifyConsent,
  revokePatientTrackLink,
  type Guide,
  type GuideReport,
  type Dosing,
  type GuideDelivery,
  type SendGuideLinkResult,
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
  /** 명부의 환자 id — 카톡 발송과 수신 동의에 필요하다 */
  patientId?: string | null
  formulaName: string
  defaultDays?: number | null
  /** 진료 기록의 변증 — 환자에게 보여줄지 여기서 확인하고 고친다 */
  visitDiagnosis?: string | null
  /** 진료에 기록해 둔 비급여 항목 — 안내서 비용란의 출발점이 된다 */
  nonCoveredItems?: Array<{ name: string; amount: number }>
  /** 사전 설명·동의를 받은 시점. null 이면 아직 안 받은 것이다 */
  nonCoveredConsentAt?: string | null
  onClose: () => void
}

export function MedicationGuideModal({
  visitId,
  patientId,
  formulaName,
  defaultDays,
  visitDiagnosis,
  nonCoveredItems,
  nonCoveredConsentAt,
  onClose,
}: Props) {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [reports, setReports] = useState<GuideReport[]>([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedTrack, setCopiedTrack] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  const [dosing, setDosing] = useState<Dosing | null>(null)
  const [delivery, setDelivery] = useState<GuideDelivery | null>(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<SendGuideLinkResult | null>(null)
  const [consentBusy, setConsentBusy] = useState(false)

  const [instructions, setInstructions] = useState('하루 2회, 식후 30분에 드세요.')
  const [cautions, setCautions] = useState('')
  const [totalDays, setTotalDays] = useState(String(defaultDays ?? 10))
  // 선납 후 일부만 받은 상태가 환불 분쟁의 대부분인데, 비워 두면 다툴 때
  // 근거가 될 숫자가 아예 없다. 전량 수령을 기본값으로 두고 다르면 고치게 한다.
  const [dispensedDays, setDispensedDays] = useState(String(defaultDays ?? 10))
  // 총 일수를 고치면 수령 일수도 따라가야 한다. 안 그러면 20일분으로 바꿨는데
  // '10일분 받으셨습니다' 가 환자 화면에 그대로 나간다 — 틀린 숫자가 환불
  // 다툼의 근거가 되면 없느니만 못하다. 한의사가 직접 건드린 뒤로는 따라가지 않는다.
  const [dispensedTouched, setDispensedTouched] = useState(false)
  const [herbOrigin, setHerbOrigin] = useState('')
  // 서버가 직전 안내서에서 물려준 값인지 — 화면에서 그렇다고 말해 준다.
  const [originInherited, setOriginInherited] = useState(false)
  // 변증은 진료 기록에서 자동으로 나가지 않는다. 자유 텍스트라 다른 사람
  // 이야기나 이름이 섞여 있을 수 있고, 이 문서는 링크만 알면 열린다.
  const [diagnosis, setDiagnosis] = useState('')
  const [costs, setCosts] = useState<CostRow[]>(
    nonCoveredItems && nonCoveredItems.length > 0
      ? nonCoveredItems.map((c) => ({ name: c.name, amount: String(c.amount) }))
      : [{ name: '첩약', amount: '' }],
  )

  const guideUrl = guide ? `${window.location.origin}/guide/${guide.token}` : ''
  // 카톡으로 나가는 것은 진료 단위 링크가 아니라 환자 단위 추적 링크다.
  const trackUrl = delivery?.trackToken
    ? `${window.location.origin}/t/${delivery.trackToken}`
    : ''

  const load = useCallback(async () => {
    try {
      const res = await fetchGuideByVisit(visitId)
      if (res) {
        setGuide(res.guide)
        setReports(res.reports)
        setDosing(res.dosing)
        setDelivery(res.delivery)
        setInstructions(res.guide.instructions ?? instructions)
        setCautions(res.guide.cautions ?? '')
        if (res.guide.totalDays != null) setTotalDays(String(res.guide.totalDays))
        if (res.guide.dispensedDays != null) {
          setDispensedDays(String(res.guide.dispensedDays))
          setDispensedTouched(true)
        }
        setHerbOrigin(res.guide.herbOrigin ?? '')
        setDiagnosis(res.guide.diagnosis ?? '')
        if (res.guide.herbOrigin) setOriginInherited(true)
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
        herbOrigin: herbOrigin.trim() || null,
        diagnosis: diagnosis.trim() || null,
        costItems: costs
          .filter((c) => c.name.trim() && c.amount.trim())
          .map((c) => ({ name: c.name.trim(), amount: parseInt(c.amount, 10) || 0 })),
      })
      setGuide(saved)
      // 발행 직후 상태를 다시 읽는다. 안 그러면 delivery 가 아직 비어 있어
      // 명부에 연결된 환자인데도 '연결되지 않은 진료' 로 보이고, 방금 만든
      // 안내서를 그 자리에서 카톡으로 보낼 수 없다. 서버가 물려준
      // 원산지 같은 값도 여기서 화면에 반영된다.
      await load()
    } catch (err) {
      logError(err, 'MedicationGuideModal.issue')
    } finally {
      setIssuing(false)
    }
  }

  /**
   * 카톡으로 보내기.
   *
   * 결과를 그대로 보여 준다. 발송 채널이 아직 설정되지 않았으면 서버가
   * 'simulated' 을 돌려주는데, 이것을 '보냈습니다' 로 쓰면 한의사는 보냈다고
   * 믿고 환자는 못 받는다 — 안 보낸 것보다 나쁘다.
   */
  const send = async () => {
    if (!guide || sending) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await sendGuideLink(guide.id)
      setSendResult(res)
      await load()
    } catch (err) {
      logError(err, 'MedicationGuideModal.send')
      setSendResult(null)
    } finally {
      setSending(false)
    }
  }

  const toggleConsent = async (next: boolean) => {
    if (!patientId || consentBusy) return
    setConsentBusy(true)
    try {
      await setPatientNotifyConsent(patientId, next)
      await load()
    } catch (err) {
      logError(err, 'MedicationGuideModal.consent')
    } finally {
      setConsentBusy(false)
    }
  }

  const revokeTrack = async () => {
    if (!patientId) return
    if (
      !confirm(
        '추적 링크를 회수하면 환자가 지금까지의 기록을 열 수 없습니다. 계속할까요?',
      )
    )
      return
    try {
      await revokePatientTrackLink(patientId)
      setSendResult(null)
      await load()
    } catch (err) {
      logError(err, 'MedicationGuideModal.revokeTrack')
    }
  }

  const copyTrack = async () => {
    if (!trackUrl) return
    try {
      await navigator.clipboard.writeText(trackUrl)
      setCopiedTrack(true)
      setTimeout(() => setCopiedTrack(false), 2000)
    } catch (err) {
      logError(err, 'MedicationGuideModal.copyTrack')
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

              {/* 복약 현황 — "효과가 없다" 를 미복용과 구분하는 유일한 근거 */}
              {guide && dosing && dosing.startedOn && (
                <section className="mb-5 rounded-xl border border-neutral-200 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-neutral-500" />
                    <h3 className="text-[14px] font-bold text-neutral-900">복약 현황</h3>
                  </div>
                  <p className="text-[14px] text-neutral-800">
                    {dosing.dayIndex != null && (
                      <>
                        복용 <strong>{dosing.dayIndex}일째</strong>
                        {guide.totalDays ? ` / ${guide.totalDays}일분` : ''} ·{' '}
                      </>
                    )}
                    체크한 날 {dosing.takenDates.length}일
                    {dosing.adherence != null && (
                      <>
                        {' '}
                        · 순응도{' '}
                        <strong
                          className={cn(
                            dosing.adherence < 60 ? 'text-red-600' : 'text-neutral-900',
                          )}
                        >
                          {dosing.adherence}%
                        </strong>
                      </>
                    )}
                  </p>
                  {dosing.adherence != null && dosing.adherence < 60 && (
                    <p className="mt-1 text-[12px] leading-relaxed text-neutral-600">
                      복용을 거른 날이 많습니다. 경과가 더딘 것이 처방 때문인지
                      미복용 때문인지 먼저 확인해 주세요.
                    </p>
                  )}
                </section>
              )}

              {/* 환자 카톡으로 보내기 */}
              {guide && (
                <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Send className="h-4 w-4 text-blue-600" />
                    <h3 className="text-[14px] font-bold text-neutral-900">
                      환자에게 보내기
                    </h3>
                  </div>

                  {!delivery?.hasPatient ? (
                    <p className="text-[13px] leading-relaxed text-neutral-600">
                      명부의 환자와 연결되지 않은 진료입니다. 환자를 연결하면 카톡으로
                      보낼 수 있습니다. 지금은 아래 QR·링크를 직접 전달해 주세요.
                    </p>
                  ) : !delivery.hasPhone ? (
                    <p className="text-[13px] leading-relaxed text-amber-700">
                      명부에 연락처가 없습니다. 환자 정보에 전화번호를 넣어 주세요.
                    </p>
                  ) : (
                    <>
                      {/* 동의 없이 보내면 정보통신망법 위반이다. 체크박스 하나로
                          끝낼 일이 아니라, 실제로 받은 동의를 적는 자리다. */}
                      <label className="mb-2 flex items-start gap-2 text-[13px] leading-relaxed text-neutral-700">
                        <input
                          type="checkbox"
                          checked={Boolean(delivery.consentAt) && !delivery.optedOut}
                          disabled={consentBusy || delivery.optedOut || !patientId}
                          onChange={(e) => void toggleConsent(e.target.checked)}
                          className="mt-0.5 h-4 w-4"
                        />
                        <span>
                          환자에게 <strong>알림 수신 동의</strong>를 받았습니다
                          {delivery.consentAt && (
                            <span className="ml-1 text-neutral-500">
                              ({new Date(delivery.consentAt).toLocaleDateString('ko-KR')})
                            </span>
                          )}
                        </span>
                      </label>
                      {delivery.optedOut && (
                        <p className="mb-2 text-[12px] leading-relaxed text-red-700">
                          환자가 링크에서 직접 수신을 거부했습니다. 다시 켜는 것은 환자
                          본인만 할 수 있습니다.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => void send()}
                        disabled={
                          sending || !delivery.consentAt || delivery.optedOut
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {sending
                          ? '보내는 중…'
                          : delivery.linkSentAt
                            ? '카톡으로 다시 보내기'
                            : '카톡으로 보내기'}
                      </button>

                      {delivery.linkSentAt && (
                        <p className="mt-2 text-[12px] text-neutral-600">
                          마지막 발송{' '}
                          {new Date(delivery.linkSentAt).toLocaleString('ko-KR')}
                          {delivery.linkSentChannel === 'sms' && ' · 문자'}
                          {delivery.linkSentChannel === 'kakao' && ' · 알림톡'}
                        </p>
                      )}

                      {sendResult && (
                        <p
                          className={cn(
                            'mt-2 text-[12px] leading-relaxed',
                            sendResult.status === 'sent'
                              ? 'text-green-700'
                              : 'text-amber-700',
                          )}
                        >
                          {sendResult.status === 'sent' &&
                            `보냈습니다 (${sendResult.channel === 'kakao' ? '알림톡' : '문자'}).`}
                          {sendResult.status !== 'sent' &&
                            (sendResult.reason ?? '보내지 못했습니다.')}
                        </p>
                      )}

                      {trackUrl && (
                        <div className="mt-3 border-t border-blue-200 pt-3">
                          <p className="mb-1.5 text-[12px] text-neutral-600">
                            환자에게 나가는 추적 링크 — 이 환자의 처방 이력 전체가
                            열립니다.
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 truncate text-[12px] text-neutral-700">
                              {trackUrl}
                            </code>
                            <button
                              onClick={() => void copyTrack()}
                              className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-100"
                            >
                              {copiedTrack ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              {copiedTrack ? '복사됨' : '복사'}
                            </button>
                            <button
                              onClick={() => void revokeTrack()}
                              className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-neutral-500 hover:text-red-600"
                            >
                              회수
                            </button>
                          </div>
                        </div>
                      )}

                      <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-neutral-500">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        알림톡이 막히면 문자로 대신 나갑니다. 발송 이력은 수신 동의
                        증빙으로 남습니다.
                      </p>
                    </>
                  )}
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
              {/* 무엇으로 보았는지 — "한의사마다 진단이 다르다" 가 효과 불신의
                  뿌리인데 환자는 자기 진단명조차 못 듣고 약을 받는다.
                  진료 기록에서 자동으로 내보내지 않고 여기서 확인시킨다. */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-neutral-700">
                    환자에게 보여줄 변증·진단 (선택)
                  </label>
                  {visitDiagnosis && visitDiagnosis !== diagnosis && (
                    <button
                      type="button"
                      onClick={() => setDiagnosis(visitDiagnosis)}
                      className="text-[12px] font-semibold text-blue-600"
                    >
                      진료 기록에서 가져오기
                    </button>
                  )}
                </div>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                  placeholder="예: 기허(氣虛)로 인한 만성 피로"
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                  링크를 아는 사람은 누구나 볼 수 있는 문서입니다. 환자 이름이나 다른
                  분 이야기가 섞이지 않았는지 확인해 주세요.
                </p>
              </div>

              {/* 원산지 — "중국산 아니냐" 에 답이 없던 자리 */}
              <div className="mb-4">
                <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                  약재 원산지·규격 (선택)
                </label>
                <input
                  value={herbOrigin}
                  onChange={(e) => setHerbOrigin(e.target.value)}
                  placeholder="예: 국내산 GMP 규격품 (일부 수입 약재 포함)"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                  {originInherited
                    ? '직전에 적어 두신 내용입니다. 공급처가 바뀌었으면 고쳐 주세요.'
                    : '비워 두면 환자 화면에 "기재되지 않았습니다 — 한의원에 문의" 로 나갑니다. 한 번 적어 두면 다음 안내서에도 이어서 씁니다.'}
                </p>
              </div>

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
                    onChange={(e) => {
                      setTotalDays(e.target.value)
                      if (!dispensedTouched) setDispensedDays(e.target.value)
                    }}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[14px] focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                    오늘 드린 일수
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={dispensedDays}
                    onChange={(e) => {
                      setDispensedDays(e.target.value)
                      setDispensedTouched(true)
                    }}
                    className={cn(
                      'w-full rounded-xl border bg-neutral-50 px-3 py-2 text-[14px] focus:bg-white focus:outline-none',
                      dispensedDays
                        ? 'border-neutral-200 focus:border-blue-500'
                        : 'border-amber-300 focus:border-amber-500',
                    )}
                  />
                </div>
              </div>
              {/* 소비자원 자료에서 선납 31건 중 26건이 분쟁이었고 제대로 환불된
                  것은 1건이었다. 다툼은 대부분 '몇 일분을 받았는가' 에서 생긴다. */}
              {!dispensedDays && (
                <p className="-mt-2 mb-4 text-[12px] leading-relaxed text-amber-700">
                  수령 일수를 비워 두면 환자 화면에 "몇 일분을 받았는지 기재되지
                  않았습니다" 로 나갑니다. 나중에 환불 다툼이 생겼을 때 양쪽이 볼 숫자가
                  없다는 뜻입니다.
                </p>
              )}

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
