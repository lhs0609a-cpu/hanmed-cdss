import axios from 'axios'

/**
 * 환자가 로그인 없이 여는 화면들이 쓰는 API.
 *
 * 인증 헤더가 붙는 `services/api` 를 쓰지 않는다 — 환자는 계정이 없다.
 * 안내서(약봉투 QR)와 추적 링크(카톡) 둘 다 여기를 통한다.
 */

const API_BASE =
  import.meta.env.VITE_API_URL || 'https://api.ongojisin.co.kr/api/v1'

export interface GuideHerb {
  name: string
  amount?: string | null
  effect?: string | null
}

export interface GuideInteraction {
  drug: string
  herb: string
  severity: string
  advice?: string | null
}

/** 복용 현황 — 날짜는 전부 서버(KST)가 정한다. */
export interface Dosing {
  startedOn: string | null
  takenDates: string[]
  takenToday: boolean
  dayIndex: number | null
  adherence: number | null
  today: string
}

/** 약재 목록의 출처 — '내가 받은 약' 과 '그 처방의 표준 구성' 을 구분한다. */
export type GuideHerbSource = 'prescription' | 'catalog' | 'none'

export interface PublicGuide {
  token: string
  formulaName: string
  herbs: GuideHerb[]
  herbSource: GuideHerbSource
  /** 약재 원산지·규격 한 줄. 안 적혔으면 null */
  herbOrigin: string | null
  /** 무엇으로 보았는지 — 한의사가 확인해 넣은 것만 */
  diagnosis: string | null
  /** 대조한 양약 가짓수. null = 대조 못 함, 0 = 양약 정보 없음 */
  reviewedDrugCount: number | null
  evidence: {
    caseCount: number
    successRate: number | null
    source?: string | null
  } | null
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
  dosing: Dosing
}

export interface MyReport {
  id: string
  symptomScore: number | null
  adverseFlags: string[]
  note: string | null
  reportedAt: string
  /** 추적 화면에서만 채워진다 — 어느 처방 때 남긴 기록인지 */
  formulaName?: string | null
}

export interface TrackPayload {
  clinicName: string | null
  notifyOptedOut: boolean
  current: PublicGuide | null
  past: Array<{
    token: string
    formulaName: string
    issuedAt: string
    totalDays: number | null
  }>
  timeline: MyReport[]
  adverseFlagOptions: string[]
}

const unwrap = <T>(data: unknown): T =>
  ((data as { data?: T })?.data ?? data) as T

// ── 안내서(진료 단위, 약봉투 QR) ─────────────────────────────

export async function fetchGuide(token: string): Promise<PublicGuide> {
  const { data } = await axios.get(`${API_BASE}/public/guides/${token}`)
  return unwrap<PublicGuide>(data)
}

export async function fetchGuideReports(token: string): Promise<MyReport[]> {
  const { data } = await axios.get(`${API_BASE}/public/guides/${token}/reports`)
  const rows = unwrap<MyReport[]>(data)
  return Array.isArray(rows) ? rows : []
}

export async function submitReport(
  token: string,
  body: {
    symptomScore: number | null
    adverseFlags: string[]
    note: string | null
  },
): Promise<void> {
  await axios.post(`${API_BASE}/public/guides/${token}/reports`, body)
}

// ── 복용 체크 ────────────────────────────────────────────────

export async function startDosing(token: string): Promise<Dosing> {
  const { data } = await axios.post(
    `${API_BASE}/public/guides/${token}/doses/start`,
  )
  return unwrap<Dosing>(data)
}

export async function toggleDoseToday(token: string): Promise<Dosing> {
  const { data } = await axios.post(
    `${API_BASE}/public/guides/${token}/doses/toggle`,
  )
  return unwrap<Dosing>(data)
}

/** 기기에 남아 있던 예전 기록을 한 번만 올린다. 서버가 비어 있을 때만 받는다. */
export async function importDoses(
  token: string,
  dates: string[],
): Promise<Dosing> {
  const { data } = await axios.post(
    `${API_BASE}/public/guides/${token}/doses/import`,
    { dates },
  )
  return unwrap<Dosing>(data)
}

// ── 환자 단위 추적(카톡 링크) ────────────────────────────────

export async function fetchTrack(trackToken: string): Promise<TrackPayload> {
  const { data } = await axios.get(`${API_BASE}/public/track/${trackToken}`)
  return unwrap<TrackPayload>(data)
}

export async function optOutOfNotifications(
  trackToken: string,
): Promise<void> {
  await axios.post(`${API_BASE}/public/track/${trackToken}/opt-out`)
}
