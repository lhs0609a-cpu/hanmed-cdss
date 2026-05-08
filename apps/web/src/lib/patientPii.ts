/**
 * 환자 식별정보 비식별화 — 케이스 공유/커뮤니티 게시 직전 호출.
 *
 * 정책 (2026-05 기준 한의사 사용 가이드):
 *   - 이름: 김OO 형태로 마스킹 (성만 노출)
 *   - 생년월일: 연도만 노출 ('1980년대' 또는 '50대')
 *   - 주민번호: 전부 마스킹
 *   - 전화: ***-****-****
 *   - 주소: 시/구 단위까지만
 *   - 한의원명·진단의명: 옵션
 *
 * 자동 마스킹 후, UI 에서 한의사가 게시 전에 한 번 더 확인하도록 강제.
 */

const RRN = /(\d{6})[- ]?(\d{7})/g
const PHONE = /\b0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}\b/g
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g
const CARD = /\b(?:\d[ -]?){13,19}\b/g
const ADDRESS_DETAIL = /([가-힣]+(?:동|로|길|번길))\s*\d+[\d\-가-힣\s호동층번지]*/g

export interface AnonymizeOptions {
  keepFirstName?: boolean // 이름 첫자 노출 여부 (default true)
  ageBucket?: 'decade' | 'exact' // '50대' vs '52세'
  removeClinicName?: boolean
  customMasks?: Array<{ pattern: RegExp; replacement: string }>
}

export interface AnonymizeReport {
  text: string
  removed: Array<{ kind: string; sample: string }>
}

export function anonymizePatientText(
  raw: string,
  opts: AnonymizeOptions = {},
): AnonymizeReport {
  if (!raw) return { text: '', removed: [] }
  const removed: AnonymizeReport['removed'] = []
  let text = raw

  text = text.replace(RRN, (_m, p1) => {
    removed.push({ kind: 'rrn', sample: '주민번호' })
    return `${p1}-*******`
  })
  text = text.replace(PHONE, () => {
    removed.push({ kind: 'phone', sample: '전화번호' })
    return '***-****-****'
  })
  text = text.replace(EMAIL, () => {
    removed.push({ kind: 'email', sample: '이메일' })
    return '***@***'
  })
  text = text.replace(CARD, () => {
    removed.push({ kind: 'card', sample: '카드번호 추정' })
    return '**** **** **** ****'
  })
  text = text.replace(ADDRESS_DETAIL, (_m, p1) => {
    removed.push({ kind: 'address', sample: p1 })
    return `${p1} ***`
  })

  for (const { pattern, replacement } of opts.customMasks ?? []) {
    text = text.replace(pattern, () => {
      removed.push({ kind: 'custom', sample: '사용자 패턴' })
      return replacement
    })
  }

  return { text, removed }
}

/** 환자명 마스킹: '홍길동' → '홍OO' */
export function maskPatientName(name: string): string {
  if (!name) return ''
  const trimmed = name.trim()
  if (trimmed.length <= 1) return 'O'
  return trimmed[0] + 'O'.repeat(Math.max(1, trimmed.length - 1))
}

/** 나이 표기 변환 — 정확한 나이 → 연령대 */
export function maskAgeToDecade(age: number | null | undefined): string {
  if (age == null || Number.isNaN(age)) return '연령 미상'
  const decade = Math.floor(age / 10) * 10
  return `${decade}대`
}

/** 의료광고 금지 표현 (의료법 56조 + 의협 가이드 일부) — 게시 전 차단 */
const ADVERTISING_FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /(완치|완전\s*치료|즉시\s*완치)/g, reason: "'완치' 등 효과 보장 표현은 의료법 위반 우려" },
  { pattern: /100\s*%/g, reason: "'100%' 등 단정적 효능 표현 금지" },
  { pattern: /(부작용\s*없|무\s*부작용)/g, reason: "'부작용 없음' 등 안전 절대 보장 표현 금지" },
  { pattern: /(국내\s*최고|세계\s*최고|업계\s*1위)/g, reason: '비교 광고 / 최상급 표현 금지' },
  { pattern: /(특허|독점)\s*치료/g, reason: '특허/독점 치료 표현은 사전 심의 필요' },
]

export interface ForbiddenMatch {
  pattern: string
  reason: string
  matched: string[]
}

export function findForbiddenAdvertisingPhrases(text: string): ForbiddenMatch[] {
  if (!text) return []
  const out: ForbiddenMatch[] = []
  for (const { pattern, reason } of ADVERTISING_FORBIDDEN_PATTERNS) {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      out.push({ pattern: pattern.source, reason, matched: Array.from(new Set(matches)) })
    }
  }
  return out
}

export function isPostSafeForCommunity(text: string): { safe: boolean; report: ForbiddenMatch[] } {
  const report = findForbiddenAdvertisingPhrases(text)
  return { safe: report.length === 0, report }
}
