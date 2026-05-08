/**
 * 환자/진료기록 데이터 export 헬퍼.
 *
 * 정책: 한의사가 해지/EMR 이전 시 자신의 데이터를 항상 가져갈 수 있어야 한다.
 *  - JSON: 풀 스키마 (원본 그대로, 추후 import 호환)
 *  - CSV: 표 형식 (Excel 직접 열림)
 *  - 환자 정보가 포함되므로 다운로드 직전 사용자에게 비식별화 옵션을 노출.
 */

import { anonymizePatientText, maskPatientName } from './patientPii'

export type ExportFormat = 'json' | 'csv'

interface ExportOptions {
  filename?: string
  anonymize?: boolean
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportAsJson(data: unknown, options: ExportOptions = {}): void {
  const filename = options.filename ?? `ongojisin-export-${Date.now()}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  downloadBlob(blob, filename)
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : JSON.stringify(value)
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function exportAsCsv(rows: Record<string, unknown>[], options: ExportOptions = {}): void {
  if (!rows.length) {
    const blob = new Blob(['', ''], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, options.filename ?? `ongojisin-export-${Date.now()}.csv`)
    return
  }
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k))
      return acc
    }, new Set()),
  )
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  }
  // BOM 으로 Excel 한글 깨짐 방지
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, options.filename ?? `ongojisin-export-${Date.now()}.csv`)
}

export interface PatientRecordForExport {
  id: string
  name?: string
  birthDate?: string | null
  gender?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  visits?: Array<{
    visitDate: string
    chiefComplaint?: string
    diagnosis?: string
    prescription?: string
    notes?: string | null
  }>
}

/**
 * 환자 데이터 다중 환자 export (CSV 1건 = 환자 1명, 진료내역은 JSON 직렬화).
 */
export function exportPatientsCsv(
  patients: PatientRecordForExport[],
  options: ExportOptions = {},
): void {
  const rows = patients.map((p) => {
    const safeName = options.anonymize ? maskPatientName(p.name ?? '') : (p.name ?? '')
    const safeNotes = options.anonymize
      ? anonymizePatientText(p.notes ?? '').text
      : (p.notes ?? '')
    return {
      id: p.id,
      name: safeName,
      birthDate: p.birthDate ?? '',
      gender: p.gender ?? '',
      phone: options.anonymize ? '***-****-****' : (p.phone ?? ''),
      address: options.anonymize
        ? anonymizePatientText(p.address ?? '').text
        : (p.address ?? ''),
      notes: safeNotes,
      visits_json: JSON.stringify(p.visits ?? []),
    }
  })
  exportAsCsv(rows, {
    filename: options.filename ?? `ongojisin-patients-${Date.now()}.csv`,
  })
}
