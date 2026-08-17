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
  status: 'active' | 'inactive'
  lastVisitAt: string | null
  totalVisits: number
  createdAt: string
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
  notes: string | null
}

export interface NewPatientPayload {
  name: string
  phone?: string | null
  birthDate?: string | null
  gender?: 'M' | 'F' | null
  constitution?: string | null
  mainComplaint?: string | null
  memo?: string | null
  status?: 'active' | 'inactive'
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
  notes?: string | null
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
