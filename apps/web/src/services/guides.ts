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
  evidence: { caseCount: number; successRate: number | null; source?: string | null } | null
  interactions: Array<{ drug: string; herb: string; severity: string; advice?: string | null }>
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

export interface IssueGuidePayload {
  instructions?: string | null
  cautions?: string | null
  totalDays?: number | null
  dispensedDays?: number | null
  costItems?: Array<{ name: string; amount: number }>
}

/** 아직 확인하지 않은 환자 자가 기록 — 이상반응이 붙은 것부터 온다. */
export interface UnreviewedReport extends GuideReport {
  guideId: string
  visitId: string | null
  patientId: string | null
  formulaName: string
}

export async function fetchGuideByVisit(
  visitId: string,
): Promise<{ guide: Guide; reports: GuideReport[] } | null> {
  const { data } = await api.get<{ guide: Guide; reports: GuideReport[] } | null>(
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

export async function fetchUnreviewedReports(limit = 20): Promise<UnreviewedReport[]> {
  const { data } = await api.get<UnreviewedReport[]>(
    '/medication-guides/reports/unreviewed',
    { params: { limit } },
  )
  return Array.isArray(data) ? data : []
}
