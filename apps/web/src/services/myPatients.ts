import { api } from './api'

/**
 * 한의사 본인의 환자 명부 / 진료 기록 API.
 *
 * 예전에는 이 데이터가 전부 localStorage('hanmed_patients', 'hanmed_prescriptions')에
 * 있었다. 기기를 바꾸면 사라지고 백업도 없었다. 서버 저장으로 옮기면서
 * 남아 있는 로컬 데이터는 importLocalData() 로 1회 이관한다.
 */

export interface MyPatient {
  id: string
  name: string
  phone: string | null
  birthDate: string | null
  gender: 'M' | 'F' | null
  constitution: string | null
  mainComplaint: string | null
  memo: string | null
  /** 복용 중인 양약 — 한약 상호작용 대조에 쓴다 */
  medications: string[]
  status: 'active' | 'inactive'
  lastVisitAt: string | null
  totalVisits: number
  createdAt: string
  /** 알림 수신 동의 시점 — 없으면 카톡·문자를 보낼 수 없다(정통법 제50조) */
  notifyConsentAt: string | null
  /** 환자가 직접 누른 수신 거부 — 있으면 동의가 있어도 보내지 않는다 */
  notifyOptOutAt: string | null
  /** 환자 단위 추적 링크 토큰. 안 보냈거나 회수했으면 null */
  trackToken: string | null
}

export interface MyVisit {
  id: string
  patientId: string | null
  visitedAt: string
  chiefComplaint: string | null
  symptoms: Array<{ name: string; severity?: number }>
  diagnosis: string | null
  formulaName: string | null
  herbs: Array<{ name: string; amount?: string; role?: string }>
  aiConfidence: number | null
  aiDegraded: boolean
  /** 통증 점수(VAS 0~10) — 안 물어본 진료는 null */
  painScore: number | null
  pulseNote: string | null
  notes: string | null
  /** 첩약 시범사업 급여 처방일 때만 채워진다 */
  cheopyakDisease: string | null
  cheopyakDays: number | null
  /** 비급여 사전 설명 — 항목과 설명·동의 시점 */
  nonCoveredItems: Array<{
    name: string
    amount: number
    reason?: string | null
    alternative?: string | null
  }>
  nonCoveredConsentAt: string | null
  /** 상호작용 위험을 환자에게 설명한 시점 */
  interactionNoticeGivenAt: string | null
  outcome: string | null
  outcomeNotes: string | null
  outcomeRecordedAt: string | null
  followUpAt: string | null
}

/** 경과 확인이 필요한 진료 — 대시보드 목록용 */
export interface PendingFollowUp extends MyVisit {
  patientName: string | null
  daysSince: number
}

export type VisitOutcome = '완치' | '호전' | '무효' | '악화' | '진행중'

export interface NewPatientPayload {
  name: string
  phone?: string | null
  birthDate?: string | null
  gender?: 'M' | 'F' | null
  constitution?: string | null
  mainComplaint?: string | null
  memo?: string | null
  status?: 'active' | 'inactive'
  medications?: string[]
}

export interface NewVisitPayload {
  patientId?: string | null
  visitedAt?: string
  chiefComplaint?: string | null
  symptoms?: Array<{ name: string; severity?: number }>
  diagnosis?: string | null
  formulaName?: string | null
  herbs?: Array<{ name: string; amount?: string; role?: string }>
  aiConfidence?: number | null
  aiDegraded?: boolean
  painScore?: number | null
  pulseNote?: string | null
  notes?: string | null
  cheopyakDisease?: string | null
  cheopyakDays?: number | null
  nonCoveredItems?: Array<{
    name: string
    amount: number
    reason?: string | null
    alternative?: string | null
  }>
  /** true 면 지금 설명·동의를 받은 것으로 기록한다 */
  nonCoveredConsentGiven?: boolean
}

export async function fetchMyPatients(): Promise<MyPatient[]> {
  const { data } = await api.get<MyPatient[]>('/my-patients')
  return Array.isArray(data) ? data : []
}

export async function fetchMyPatient(id: string): Promise<MyPatient> {
  const { data } = await api.get<MyPatient>(`/my-patients/${id}`)
  return data
}

export async function createMyPatient(payload: NewPatientPayload): Promise<MyPatient> {
  const { data } = await api.post<MyPatient>('/my-patients', payload)
  return data
}

export async function updateMyPatient(
  id: string,
  payload: Partial<NewPatientPayload>,
): Promise<MyPatient> {
  const { data } = await api.patch<MyPatient>(`/my-patients/${id}`, payload)
  return data
}

export async function deleteMyPatient(id: string): Promise<void> {
  await api.delete(`/my-patients/${id}`)
}

export async function fetchMyVisits(patientId?: string, limit = 50): Promise<MyVisit[]> {
  const { data } = await api.get<MyVisit[]>('/my-patients/visits', {
    params: { patientId, limit },
  })
  return Array.isArray(data) ? data : []
}

export async function createMyVisit(payload: NewVisitPayload): Promise<MyVisit> {
  const { data } = await api.post<MyVisit>('/my-patients/visits', payload)
  return data
}

/** 한동안 안 온 환자 — 연락 대상 목록 */
export interface InactivePatient extends MyPatient {
  daysSinceLastVisit: number
  neverVisited: boolean
}

/**
 * 마지막 내원이 기준일보다 오래된 활성 환자.
 * 이탈은 조용히 일어나서, 목록으로 보지 않으면 알 방법이 없다.
 */
export async function fetchInactivePatients(
  days = 60,
  limit = 30,
): Promise<InactivePatient[]> {
  const { data } = await api.get<InactivePatient[]>('/my-patients/inactive', {
    params: { days, limit },
  })
  return Array.isArray(data) ? data : []
}

/**
 * 상호작용 위험을 환자에게 설명했다고 기록한다.
 * 설명의무는 이행 사실이 남지 않으면 나중에 방어가 되지 않는다.
 */
export async function recordInteractionNotice(visitId: string): Promise<MyVisit> {
  const { data } = await api.patch<MyVisit>(
    `/my-patients/visits/${visitId}/interaction-notice`,
  )
  return data
}

/** 첩약 시범사업 연간 한도 사용 현황 */
export interface CheopyakQuota {
  year: number
  diseases: Array<{
    disease: string
    daysUsed: number
    daysRemaining: number
    lastPrescribedAt: string | null
  }>
  diseaseSlotsTotal: number
  diseaseSlotsUsed: number
  daysPerDisease: number
}

/**
 * 이 환자의 올해 첩약 급여 사용량.
 * 연간 2개 질환·질환당 20일 한도를 넘겨 처방하면 그대로 삭감된다.
 */
export async function fetchCheopyakQuota(
  patientId: string,
  year?: number,
): Promise<CheopyakQuota> {
  const { data } = await api.get<CheopyakQuota>(
    `/my-patients/${patientId}/cheopyak-quota`,
    { params: year ? { year } : undefined },
  )
  return data
}

/**
 * 경과 확인이 필요한 진료 목록.
 * 처방을 낸 뒤 결과를 기록하지 않으면 그 진료는 치험례가 되지 못한다.
 */
export async function fetchPendingFollowUps(staleDays = 14): Promise<PendingFollowUp[]> {
  const { data } = await api.get<PendingFollowUp[]>('/my-patients/follow-ups', {
    params: { staleDays },
  })
  return Array.isArray(data) ? data : []
}

/** 진료 경과 기록 */
export async function recordVisitOutcome(
  visitId: string,
  payload: { outcome: VisitOutcome; outcomeNotes?: string | null; followUpAt?: string | null },
): Promise<MyVisit> {
  const { data } = await api.patch<MyVisit>(`/my-patients/visits/${visitId}/outcome`, payload)
  return data
}

export async function exportMyData(): Promise<{
  exportedAt: string
  patients: MyPatient[]
  visits: MyVisit[]
}> {
  const { data } = await api.get('/my-patients/export')
  return data
}

// ── 로컬 → 서버 1회 이관 ────────────────────────────────────────

const LEGACY_PATIENTS_KEY = 'hanmed_patients'
const LEGACY_PRESCRIPTIONS_KEY = 'hanmed_prescriptions'
const MIGRATED_FLAG = 'hanmed_local_migrated_v1'

/** 이관할 로컬 데이터가 남아 있는지 — 배너 노출 판단용. */
export function hasLegacyLocalData(): boolean {
  if (localStorage.getItem(MIGRATED_FLAG)) return false
  try {
    const p = JSON.parse(localStorage.getItem(LEGACY_PATIENTS_KEY) || '[]')
    const r = JSON.parse(localStorage.getItem(LEGACY_PRESCRIPTIONS_KEY) || '[]')
    return (Array.isArray(p) && p.length > 0) || (Array.isArray(r) && r.length > 0)
  } catch {
    return false
  }
}

export function markLegacyMigrated(): void {
  localStorage.setItem(MIGRATED_FLAG, new Date().toISOString())
}

/**
 * 로컬 데이터를 서버로 올린다. 성공해도 원본은 지우지 않는다 —
 * 이관이 잘못됐을 때 되돌릴 수단을 남겨야 한다. 대신 플래그로 재노출만 막는다.
 */
export async function importLocalData(): Promise<{
  importedPatients: number
  importedVisits: number
  skipped: number
}> {
  let patients: NewPatientPayload[] = []
  let visits: NewVisitPayload[] = []

  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_PATIENTS_KEY) || '[]')
    if (Array.isArray(raw)) {
      patients = raw
        .filter((p) => p && p.name)
        .map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone || null,
          birthDate: p.birthDate || null,
          gender: p.gender === 'M' || p.gender === 'F' ? p.gender : null,
          constitution: p.constitution || null,
          mainComplaint: p.mainComplaint || null,
          status: p.status === 'inactive' ? 'inactive' : 'active',
        })) as NewPatientPayload[]
    }
  } catch {
    /* 손상된 로컬 데이터는 건너뛴다 */
  }

  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_PRESCRIPTIONS_KEY) || '[]')
    if (Array.isArray(raw)) {
      visits = raw.map((r) => ({
        patientId: r.patientId || null,
        visitedAt: r.date || r.createdAt || undefined,
        chiefComplaint: r.chiefComplaint || null,
        symptoms: Array.isArray(r.symptoms)
          ? r.symptoms.map((s: unknown) =>
              typeof s === 'string' ? { name: s } : (s as { name: string }),
            )
          : [],
        diagnosis: r.analysis || r.diagnosis || null,
        formulaName: r.formulaName || null,
        herbs: Array.isArray(r.herbs) ? r.herbs : [],
        aiConfidence: typeof r.confidenceScore === 'number' ? r.confidenceScore : null,
      }))
    }
  } catch {
    /* 손상된 로컬 데이터는 건너뛴다 */
  }

  const { data } = await api.post('/my-patients/import', { patients, visits })
  markLegacyMigrated()
  return data
}
