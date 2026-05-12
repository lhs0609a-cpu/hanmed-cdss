/**
 * CSV 유틸 — Windows Excel 에서 한글이 깨지지 않도록 UTF-8 BOM 을 강제 prefix 한다.
 *
 * 사용:
 *   const blob = toCsvBlob([['이름','전화'], ['김한의','010-...']])
 *   downloadCsv('환자목록.csv', blob)
 *
 *   // 또는 Blob 을 직접 다루는 경우:
 *   const blob = csvBlobFromString(csvString)
 */

const UTF8_BOM = '\uFEFF'

/** 셀 값을 RFC 4180 규약에 맞게 인용 처리. 쉼표/큰따옴표/줄바꿈 포함 시 quote. */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s === '') return ''
  const needsQuote = /[",\n\r]/.test(s)
  const escaped = s.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

/** 행 배열을 CSV 문자열로 직렬화 (BOM 없음). */
export function rowsToCsvString(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

/**
 * UTF-8 BOM 을 prepend 한 CSV Blob 을 만든다. 다운로드 시 Excel(Windows)
 * 에서 한글이 정상 표시된다.
 */
export function toCsvBlob(rows: ReadonlyArray<ReadonlyArray<unknown>>): Blob {
  const csv = rowsToCsvString(rows)
  return new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8' })
}

/**
 * 이미 CSV 문자열을 가진 경우, BOM 만 추가해 Blob 생성.
 * (서버에서 받은 CSV 응답을 사용자 다운로드로 노출할 때 사용.)
 */
export function csvBlobFromString(csv: string): Blob {
  const hasBom = csv.charCodeAt(0) === 0xfeff
  return new Blob([hasBom ? csv : UTF8_BOM + csv], {
    type: 'text/csv;charset=utf-8',
  })
}

/**
 * 서버에서 받은 Blob 또는 ArrayBuffer 에 BOM 이 없으면 prepend.
 * (Axios responseType: 'blob' 결과를 그대로 다운로드시킬 때 사용.)
 */
export async function ensureBomBlob(input: Blob | ArrayBuffer): Promise<Blob> {
  const buf = input instanceof Blob ? await input.arrayBuffer() : input
  const view = new Uint8Array(buf)
  // 이미 EF BB BF (UTF-8 BOM) 로 시작하면 그대로 사용
  if (view.length >= 3 && view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf) {
    return input instanceof Blob ? input : new Blob([buf], { type: 'text/csv;charset=utf-8' })
  }
  return new Blob([UTF8_BOM, buf], { type: 'text/csv;charset=utf-8' })
}

/** 브라우저에서 파일 다운로드 트리거. */
export function downloadCsv(filename: string, blob: Blob): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // 비동기 GC 여유를 주고 URL 해제
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}
