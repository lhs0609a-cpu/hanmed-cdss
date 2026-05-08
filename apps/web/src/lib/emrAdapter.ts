/**
 * EMR 연동 어댑터 인터페이스.
 *
 * 목적:
 *   - 한의차트·닥터팔레트·자생·하이메디 등 외부 EMR 의 환자/진료 기록을
 *     온고지신 표준 스키마로 변환해 import 한다.
 *   - 향후 export(역방향) 도 동일 어댑터로 대응.
 *
 * 정책:
 *   - 어댑터는 SourceFormat 별 단위 모듈 (예: HanmedChartAdapter, DoctorPaletteAdapter).
 *   - 1차 구현은 CSV 표준 (각 EMR 의 ‘진료내역 내보내기’ 결과물을 사용).
 *   - 매핑 누락/오류는 ImportReport.errors 로 노출 — 사용자가 수정 후 재시도.
 */

export type EmrSource = 'hanmed-chart' | 'doctor-palette' | 'jasen' | 'highmedi' | 'csv-generic'

export interface EmrPatientRecord {
  externalId?: string
  name: string
  birthDate?: string // YYYY-MM-DD
  gender?: 'male' | 'female' | 'other'
  phone?: string
  address?: string
  notes?: string
}

export interface EmrVisitRecord {
  externalId?: string
  patientExternalId?: string
  visitDate: string // ISO
  chiefComplaint?: string
  diagnosis?: string
  prescription?: string
  notes?: string
}

export interface ImportReport {
  source: EmrSource
  patientsImported: number
  visitsImported: number
  errors: Array<{ row: number; reason: string; raw?: unknown }>
  warnings: string[]
}

export interface EmrAdapter {
  source: EmrSource
  /** EMR 추출 파일을 받아 환자·진료 기록으로 변환한다. */
  parse: (file: File) => Promise<{ patients: EmrPatientRecord[]; visits: EmrVisitRecord[]; errors: ImportReport['errors'] }>
}

// === CSV 헬퍼 (BOM 포함, RFC 4180 일부) ===

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuotes = false
  let i = 0
  if (text.charCodeAt(0) === 0xfeff) i = 1 // BOM 스킵
  for (; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else {
      if (ch === ',') {
        row.push(cur)
        cur = ''
      } else if (ch === '"') {
        inQuotes = true
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i += 1
        row.push(cur)
        rows.push(row)
        row = []
        cur = ''
      } else {
        cur += ch
      }
    }
  }
  if (cur.length || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

// === Generic CSV adapter ===

const GENERIC_PATIENT_HEADERS = ['name', 'birth_date', 'gender', 'phone', 'address', 'notes', 'external_id']

export const GenericCsvAdapter: EmrAdapter = {
  source: 'csv-generic',
  async parse(file: File) {
    const text = await file.text()
    const rows = parseCsv(text)
    const errors: ImportReport['errors'] = []
    const patients: EmrPatientRecord[] = []
    const visits: EmrVisitRecord[] = []

    if (rows.length === 0) return { patients, visits, errors }
    const header = rows[0].map((h) => h.trim().toLowerCase())

    const isPatientCsv = GENERIC_PATIENT_HEADERS.some((h) => header.includes(h))
    if (!isPatientCsv) {
      errors.push({ row: 0, reason: '헤더에서 name/birth_date/phone 등 환자 식별 컬럼을 찾지 못했습니다.' })
      return { patients, visits, errors }
    }

    const idx = (key: string) => header.indexOf(key)
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]
      if (cols.every((c) => !c.trim())) continue
      try {
        patients.push({
          externalId: cols[idx('external_id')] || undefined,
          name: cols[idx('name')] ?? '',
          birthDate: cols[idx('birth_date')] || undefined,
          gender: ((): EmrPatientRecord['gender'] => {
            const g = (cols[idx('gender')] || '').toLowerCase()
            if (g.startsWith('m') || g === '남' || g === '남자') return 'male'
            if (g.startsWith('f') || g === '여' || g === '여자') return 'female'
            return undefined
          })(),
          phone: cols[idx('phone')] || undefined,
          address: cols[idx('address')] || undefined,
          notes: cols[idx('notes')] || undefined,
        })
      } catch (e) {
        errors.push({ row: r, reason: (e as Error).message, raw: cols })
      }
    }
    return { patients, visits, errors }
  },
}

const HANMED_CHART_HINT = '한의차트의 환자 내보내기는 컬럼이 다를 수 있습니다 — 매핑이 안 맞으면 generic CSV 형식으로 변환 후 다시 시도하세요.'

export const HanmedChartAdapter: EmrAdapter = {
  source: 'hanmed-chart',
  async parse(file: File) {
    const result = await GenericCsvAdapter.parse(file)
    if (result.patients.length === 0 && !result.errors.length) {
      result.errors.push({ row: 0, reason: HANMED_CHART_HINT })
    }
    return result
  },
}

export const DoctorPaletteAdapter: EmrAdapter = {
  source: 'doctor-palette',
  async parse(file: File) {
    return GenericCsvAdapter.parse(file)
  },
}

export const ADAPTERS: Record<EmrSource, EmrAdapter> = {
  'csv-generic': GenericCsvAdapter,
  'hanmed-chart': HanmedChartAdapter,
  'doctor-palette': DoctorPaletteAdapter,
  jasen: GenericCsvAdapter,
  highmedi: GenericCsvAdapter,
}

export async function importFromEmr(source: EmrSource, file: File): Promise<ImportReport> {
  const adapter = ADAPTERS[source] ?? GenericCsvAdapter
  const { patients, visits, errors } = await adapter.parse(file)
  return {
    source: adapter.source,
    patientsImported: patients.length,
    visitsImported: visits.length,
    errors,
    warnings: [],
  }
}
