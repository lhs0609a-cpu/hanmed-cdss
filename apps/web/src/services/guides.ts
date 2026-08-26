import { api } from './api'

/**
 * 환자용 복약 안내서 API (한의사 쪽).
 *
 * 환자가 여는 공개 링크는 이 클라이언트를 쓰지 않는다 —
 * 인증 헤더가 붙으면 안 되고, 안내서 페이지가 직접 호출한다.
 */

export interface Guide {
  id: string
  token: string
  visitId: string | null
  formulaName: string
  herbs: Array<{ name: string; amount?: string | null; effect?: string | null }>
  /** 약재 목록 출처 — 실제 조제(prescription)인지 카탈로그 표준 구성인지 */
  herbSource: 'prescription' | 'catalog' | 'none'
  herbOrigin: string | null
  diagnosis: string | null
  evidence: { caseCount: number; successRate: number | null; source?: string | null } | null
  interactions: Array<{ drug: string; herb: string; severity: string; advice?: string | null }>
  /** 대조한 양약 가짓수. null = 대조 못 함, 0 = 양약 정보 없음 */
  reviewedDrugCount: number | null
  instructions: string | null
  cautions: string | null
  totalDays: number | null
  dispensedDays: number | null
  costItems: Array<{ name: string; amount: number }>
  totalCost: number | null
  clinicName: string | null
  revokedAt: string | null
  createdAt: string
}

export interface GuideReport {
  id: string
  symptomScore: number | null
  adverseFlags: string[]
  note: string | null
  reviewedAt: string | null
  reportedAt: string
}

/** 안내서 하나의 복용 현황 — 날짜는 모두 서버(KST) 기준이다. */
export interface Dosing {
  startedOn: string | null
  takenDates: string[]
  takenToday: boolean
  dayIndex: number | null
  adherence: number | null
  today: string
}

/** 이 안내서가 환자에게 실제로 갔는지. */
export interface GuideDelivery {
  linkSentAt: string | null
  linkSentChannel: string | null
  hasPatient: boolean
  hasPhone: boolean
  consentAt: string | null
  optedOut: boolean
  trackToken: string | null
}

export interface SendGuideLinkResult {
  status:
    | 'sent'
    | 'simulated'
    | 'failed'
    | 'consent_missing'
    | 'no_phone'
    | 'quiet_hours'
  channel: 'kakao' | 'sms' | 'none'
  messageId?: string
  reason?: string
  link: string
  trackToken: string
}

export interface IssueGuidePayload {
  instructions?: string | null
  cautions?: string | null
  totalDays?: number | null
  dispensedDays?: number | null
  costItems?: Array<{ name: string; amount: number }>
  /** 약재 원산지·규격 한 줄 */
  herbOrigin?: string | null
  /** 환자에게 보여줄 변증·진단 — 한의사가 확인한 것만 나간다 */
  diagnosis?: string | null
}

/** 아직 확인하지 않은 환자 자가 기록 — 이상반응이 붙은 것부터 온다. */
export interface UnreviewedReport extends GuideReport {
  guideId: string
  visitId: string | null
  patientId: string | null
  formulaName: string
}

export interface GuideByVisit {
  guide: Guide
  reports: GuideReport[]
  dosing: Dosing
  delivery: GuideDelivery
}

export async function fetchGuideByVisit(
  visitId: string,
): Promise<GuideByVisit | null> {
  const { data } = await api.get<GuideByVisit | null>(
    `/medication-guides/by-visit/${visitId}`,
  )
  return data ?? null
}

export async function issueGuide(
  visitId: string,
  payload: IssueGuidePayload,
): Promise<Guide> {
  const { data } = await api.post<Guide>(
    `/medication-guides/by-visit/${visitId}`,
    payload,
  )
  return data
}

export async function revokeGuide(id: string): Promise<void> {
  await api.delete(`/medication-guides/${id}`)
}

export async function markGuideReportsReviewed(id: string): Promise<void> {
  await api.patch(`/medication-guides/${id}/reviewed`)
}

/**
 * 환자 카톡으로 추적 링크를 보낸다.
 *
 * 결과를 그대로 화면에 보여야 한다. 발송 채널이 설정되지 않았으면 서버가
 * 'simulated' 을 돌려주는데, 이것을 '보냈다' 로 표시하면 한의사는 보냈다고
 * 믿고 환자는 못 받는다.
 */
export async function sendGuideLink(id: string): Promise<SendGuideLinkResult> {
  const { data } = await api.post<SendGuideLinkResult>(
    `/medication-guides/${id}/send`,
  )
  return data
}

export async function setPatientNotifyConsent(
  patientId: string,
  consented: boolean,
): Promise<void> {
  await api.patch(`/my-patients/${patientId}/notify-consent`, {
    consented,
  })
}

export async function revokePatientTrackLink(patientId: string): Promise<void> {
  await api.delete(`/my-patients/${patientId}/track-link`)
}

export async function fetchUnreviewedReports(limit = 20): Promise<UnreviewedReport[]> {
  const { data } = await api.get<UnreviewedReport[]>(
    '/medication-guides/reports/unreviewed',
    { params: { limit } },
  )
  return Array.isArray(data) ? data : []
}
