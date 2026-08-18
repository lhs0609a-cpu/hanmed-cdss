import { api } from './api'

/**
 * 한의사 케이스 공유 — 자기 진료와 처방을 익명화해서 동료에게 올린다.
 *
 * 백엔드(case-sharing 모듈)는 이미 있었는데 진료 화면과 연결돼 있지 않아
 * "진료 → 공유" 경로가 없었다. 치험례가 쌓여야 추천 근거도 좋아지므로
 * 결과 화면에서 한 번에 올릴 수 있어야 한다.
 *
 * 환자 식별정보는 보내지 않는다 — 연령대·성별까지만.
 */

export type CaseCategory =
  | 'diagnosis'
  | 'treatment'
  | 'prescription'
  | 'adverse'
  | 'difficult'
  | 'discussion'

export interface ShareCasePayload {
  title: string
  content: string
  category: CaseCategory
  patientInfo: {
    ageRange: string
    gender: string
    constitution?: string
    mainSymptoms: string[]
    duration?: string
  }
}

export interface SharedCaseSummary {
  id: string
  title: string
  category: CaseCategory
  createdAt: string
}

export async function shareCase(payload: ShareCasePayload): Promise<SharedCaseSummary> {
  const { data } = await api.post('/case-sharing/cases', payload)
  return (data?.data ?? data) as SharedCaseSummary
}

/** 내가 올린 케이스 */
export async function fetchMySharedCases(): Promise<SharedCaseSummary[]> {
  const { data } = await api.get('/case-sharing/cases/mine')
  const rows = data?.data ?? data
  return Array.isArray(rows) ? rows : (rows?.items ?? [])
}

/**
 * 나이(숫자/문자)를 연령대로 환산한다.
 * 만 나이 그대로 올리면 다른 정보와 결합해 환자가 특정될 수 있다.
 */
export function toAgeRange(age?: string | number | null): string {
  const n = typeof age === 'number' ? age : parseInt(String(age ?? '').replace(/[^0-9]/g, ''), 10)
  if (!Number.isFinite(n) || n <= 0) return '미상'
  if (n < 10) return '10세 미만'
  if (n >= 80) return '80대 이상'
  return `${Math.floor(n / 10) * 10}대`
}

export function toGenderLabel(gender?: string | null): string {
  if (gender === 'M' || gender === 'male' || gender === '남' || gender === '남성') return '남성'
  if (gender === 'F' || gender === 'female' || gender === '여' || gender === '여성') return '여성'
  return '미상'
}
