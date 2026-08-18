import { api } from './api'

/**
 * 한의사 본인 치험례 API.
 *
 * 이 제품은 치험례를 근거로 처방을 설명하는데, 정작 한의사 자신의 치험례는
 * localStorage('ongojishin_my_cases')에만 있었다. 서버로 옮기면서 남아 있는
 * 로컬 기록은 importLocalCases() 로 1회 이관한다.
 */

export type MyCaseOutcome = '완치' | '호전' | '무효' | '악화' | '진행중'

export interface MyCase {
  id: string
  sourceVisitId: string | null
  patientAge: number | null
  patientGender: 'M' | 'F' | null
  patientConstitution: string | null
  chiefComplaint: string
  symptoms: string[]
  diagnosis: string | null
  byeonjeung: string | null
  formulaName: string
  herbs: Array<{ name: string; amount?: string }>
  modifications: string | null
  treatmentDuration: string | null
  outcome: MyCaseOutcome | null
  outcomeDetails: string | null
  notes: string | null
  tags: string[]
  isStarred: boolean
  createdAt: string
  updatedAt: string
}

export interface NewMyCasePayload {
  sourceVisitId?: string | null
  patientAge?: number | null
  patientGender?: 'M' | 'F' | null
  patientConstitution?: string | null
  chiefComplaint: string
  symptoms?: string[]
  diagnosis?: string | null
  byeonjeung?: string | null
  formulaName: string
  herbs?: Array<{ name: string; amount?: string }>
  modifications?: string | null
  treatmentDuration?: string | null
  outcome?: MyCaseOutcome | null
  outcomeDetails?: string | null
  notes?: string | null
  tags?: string[]
  isStarred?: boolean
}

export async function fetchMyCases(): Promise<MyCase[]> {
  const { data } = await api.get<MyCase[]>('/my-cases')
  return Array.isArray(data) ? data : []
}

export async function createMyCase(payload: NewMyCasePayload): Promise<MyCase> {
  const { data } = await api.post<MyCase>('/my-cases', payload)
  return data
}

export async function updateMyCase(
  id: string,
  payload: Partial<NewMyCasePayload>,
): Promise<MyCase> {
  const { data } = await api.patch<MyCase>(`/my-cases/${id}`, payload)
  return data
}

export async function deleteMyCase(id: string): Promise<void> {
  await api.delete(`/my-cases/${id}`)
}

// ── 로컬 → 서버 1회 이관 ────────────────────────────────────────

const LEGACY_KEY = 'ongojishin_my_cases'
const MIGRATED_FLAG = 'ongojishin_my_cases_migrated'

/**
 * 브라우저에만 있던 치험례를 서버로 올린다.
 *
 * 전부 올라가야 완료 플래그를 세운다. 중간에 실패하면 아직 안 올라간 건만
 * 로컬에 다시 써 두고 멈춘다 — 통째로 재시도하면 이미 올라간 건이 중복된다.
 * 로컬 원본은 지우지 않는다: 서버가 잘못돼도 되돌릴 근거가 남아 있어야 한다.
 * 반환값은 실제로 올라간 건수.
 */
export async function importLocalCases(): Promise<number> {
  if (localStorage.getItem(MIGRATED_FLAG)) return 0
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) {
    localStorage.setItem(MIGRATED_FLAG, '1')
    return 0
  }

  let rows: Array<Record<string, unknown>>
  try {
    const parsed: unknown = JSON.parse(raw)
    rows = Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : []
  } catch {
    // 깨진 데이터로 이관을 영영 막지 않는다.
    localStorage.setItem(MIGRATED_FLAG, '1')
    return 0
  }

  let moved = 0
  let aborted = false
  const remaining: Array<Record<string, unknown>> = []
  for (const row of rows) {
    const chiefComplaint = String(row.chiefComplaint ?? '').trim()
    const formulaName = String(row.formulaName ?? '').trim()
    if (!chiefComplaint || !formulaName) continue
    if (aborted) {
      remaining.push(row)
      continue
    }
    try {
      await createMyCase({
        chiefComplaint,
        formulaName,
        patientAge: typeof row.patientAge === 'number' ? row.patientAge : null,
        patientGender:
          row.patientGender === 'M' || row.patientGender === 'F' ? row.patientGender : null,
        patientConstitution: (row.patientConstitution as string) ?? null,
        symptoms: Array.isArray(row.symptoms) ? (row.symptoms as string[]) : [],
        diagnosis: (row.diagnosis as string) ?? null,
        byeonjeung: (row.byeonjeung as string) ?? null,
        herbs: Array.isArray(row.herbs)
          ? (row.herbs as Array<{ name: string; amount?: string }>)
          : [],
        modifications: (row.modifications as string) ?? null,
        treatmentDuration: (row.treatmentDuration as string) ?? null,
        outcome: (row.outcome as MyCaseOutcome) ?? null,
        outcomeDetails: (row.outcomeDetails as string) ?? null,
        notes: (row.notes as string) ?? null,
        tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
        isStarred: row.isStarred === true,
      })
      moved++
    } catch {
      // 실패하면 남은 건만 로컬에 다시 써 두고 멈춘다.
      // 통째로 재시도하면 이미 올라간 건이 중복으로 쌓인다.
      remaining.push(row)
      aborted = true
    }
  }

  if (remaining.length > 0) {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(remaining))
    return moved
  }

  localStorage.setItem(MIGRATED_FLAG, '1')
  return moved
}
