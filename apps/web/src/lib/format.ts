/**
 * 한국 로캘 포맷 유틸 - 통화·날짜·시각·번호 일관성을 보장한다.
 *
 * - VAT 별도 가격 표기를 한 곳에서 관리한다 (formatPriceWithVat).
 * - 모든 화면이 같은 자릿수/구분자/단위를 쓰도록 강제한다.
 */

const KRW_FORMATTER = new Intl.NumberFormat('ko-KR')
const KRW_CURRENCY = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
})

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const DATETIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
})

/** 1234500 → "1,234,500" */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '-'
  return KRW_FORMATTER.format(n)
}

/** 19900 → "19,900원" (단위 포함) */
export function formatKRW(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '-'
  return `${KRW_FORMATTER.format(n)}원`
}

/** 19900 → "₩19,900" (Intl.currency) */
export function formatKRWCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '-'
  return KRW_CURRENCY.format(n)
}

export const VAT_RATE = 0.1

/** 부가세 10% 별도. 19900 → 21890 */
export function withVat(amountExcludingVat: number): number {
  return Math.round(amountExcludingVat * (1 + VAT_RATE))
}

export function vatAmount(amountExcludingVat: number): number {
  return Math.round(amountExcludingVat * VAT_RATE)
}

/** 가격 카드용 — 공급가/부가세/총액을 동시에 노출한다. */
export function formatPriceWithVat(amountExcludingVat: number): {
  excluding: string
  vat: string
  total: string
  totalNumber: number
} {
  const total = withVat(amountExcludingVat)
  return {
    excluding: formatKRW(amountExcludingVat),
    vat: formatKRW(vatAmount(amountExcludingVat)),
    total: formatKRW(total),
    totalNumber: total,
  }
}

function toDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined) return null
  const d = input instanceof Date ? input : new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 2026-05-09 → "2026. 05. 09." */
export function formatKRDate(input: Date | string | number | null | undefined): string {
  const d = toDate(input)
  return d ? DATE_FORMATTER.format(d) : '-'
}

export function formatKRDateTime(input: Date | string | number | null | undefined): string {
  const d = toDate(input)
  return d ? DATETIME_FORMATTER.format(d) : '-'
}

export function formatKRTime(input: Date | string | number | null | undefined): string {
  const d = toDate(input)
  return d ? TIME_FORMATTER.format(d) : '-'
}

/** "3분 전", "2시간 전", "어제", … (진료 기록 목록용) */
export function formatRelativeKR(input: Date | string | number | null | undefined): string {
  const d = toDate(input)
  if (!d) return '-'
  const diffMs = Date.now() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return '방금 전'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay === 1) return '어제'
  if (diffDay < 7) return `${diffDay}일 전`
  return formatKRDate(d)
}

/** 010-1234-5678 형식. 입력이 비표준이면 그대로 반환. */
export function formatKRPhone(raw: string | null | undefined): string {
  if (!raw) return '-'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return raw
}

/** 8자리 사업자번호 마스크: 123-45-67890 */
export function formatBizNumber(raw: string | null | undefined): string {
  if (!raw) return '-'
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 10) return raw
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

/** 한의사 면허 8자리 표기 (정책: 5-8자리 숫자 권장). */
export function formatLicense(raw: string | null | undefined): string {
  if (!raw) return '-'
  const digits = raw.replace(/\D/g, '')
  return digits || raw
}
