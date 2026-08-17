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

// === 컬럼 자동 매핑 ===
// 한의차트·닥터팔레트·자생·하이메디 등 EMR 마다 헤더 이름이 제각각이라
// (영문/한글/공백·언더스코어 혼용) 출처를 몰라도 헤더 별칭으로 표준 필드에 매핑한다.
// 정규화: 소문자 + 공백/언더스코어/하이픈/점 제거 후 별칭과 비교.
const COLUMN_ALIASES: Record<keyof EmrPatientRecord, string[]> = {
  name: ['name', '이름', '성명', '환자명', '환자이름', '고객명', '성함'],
  birthDate: ['birthdate', 'birth', 'dob', '생년월일', '생일', '생년월', '출생일'],
  gender: ['gender', 'sex', '성별'],
  phone: [
    'phone', 'mobile', 'tel', 'telephone', 'cellphone', 'hp',
    '전화', '전화번호', '연락처', '휴대폰', '핸드폰', '휴대전화', '핸드폰번호', '휴대폰번호',
  ],
  address: ['address', 'addr', '주소', '거주지'],
  notes: ['notes', 'note', 'memo', '메모', '비고', '특이사항'],
  externalId: ['externalid', 'id', 'patientid', 'chartno', 'chartnumber', '환자번호', '차트번호', '챠트번호', '환자id'],
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_\-.]/g, '')
}

/** 헤더 배열에서 각 표준 필드의 컬럼 인덱스를 찾아 매핑한다. 없으면 필드 생략. */
function buildColumnMap(header: string[]): Partial<Record<keyof EmrPatientRecord, number>> {
  const normalized = header.map(normalizeHeader)
  const map: Partial<Record<keyof EmrPatientRecord, number>> = {}
  for (const key of Object.keys(COLUMN_ALIASES) as (keyof EmrPatientRecord)[]) {
    const aliases = COLUMN_ALIASES[key]
    const i = normalized.findIndex((h) => aliases.includes(h))
    if (i >= 0) map[key] = i
  }
  return map
}

// === Generic CSV adapter (출처 무관 자동 감지) ===

export const GenericCsvAdapter: EmrAdapter = {
  source: 'csv-generic',
  async parse(file: File) {
    const text = await file.text()
    const rows = parseCsv(text)
    const errors: ImportReport['errors'] = []
    const patients: EmrPatientRecord[] = []
    const visits: EmrVisitRecord[] = []

    if (rows.length === 0) return { patients, visits, errors }
    const header = rows[0]
    const map = buildColumnMap(header)

    // 이름/생년월일/전화 중 하나라도 식별되면 환자 CSV 로 본다.
    const isPatientCsv = map.name !== undefined || map.birthDate !== undefined || map.phone !== undefined
    if (!isPatientCsv) {
      errors.push({ row: 0, reason: '헤더에서 이름·생년월일·연락처 등 환자 식별 컬럼을 찾지 못했습니다. CSV 첫 줄에 컬럼명이 있는지 확인해주세요.' })
      return { patients, visits, errors }
    }

    const at = (cols: string[], key: keyof EmrPatientRecord) => {
      const i = map[key]
      return i === undefined ? undefined : cols[i]
    }
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]
      if (cols.every((c) => !c.trim())) continue
      try {
        patients.push({
          externalId: at(cols, 'externalId') || undefined,
          name: at(cols, 'name') ?? '',
          birthDate: at(cols, 'birthDate') || undefined,
          gender: ((): EmrPatientRecord['gender'] => {
            const g = (at(cols, 'gender') || '').toLowerCase()
            if (g.startsWith('m') || g === '남' || g === '남자' || g === '남성') return 'male'
            if (g.startsWith('f') || g === '여' || g === '여자' || g === '여성') return 'female'
            return undefined
          })(),
          phone: at(cols, 'phone') || undefined,
          address: at(cols, 'address') || undefined,
          notes: at(cols, 'notes') || undefined,
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

/**
 * 출처를 몰라도 파일만 받아 자동 분석한다.
 * 모든 EMR 어댑터가 CSV 헤더 별칭 기반이라 generic 파서로 통합 감지하면 충분하다.
 * (한의차트·닥터팔레트·자생·하이메디 등 컬럼명이 영문/한글 어느 쪽이든 매핑됨)
 */
export async function importAuto(file: File): Promise<ImportReport> {
  return importFromEmr('csv-generic', file)
}
