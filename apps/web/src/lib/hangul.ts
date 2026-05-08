/**
 * 한글 자모 정규화/초성 검색 유틸.
 *
 * 한의사 사용 환경 가정:
 *   - "보충익기탕" 같은 오타도 "보중익기탕"에 매칭되어야 한다 (자모 단위 contains).
 *   - 초성만 입력해도 매칭 (ㅂㅈㅇㄱㅌ → 보중익기탕).
 *   - 한자/한글 혼용 검색을 한쪽 입력만으로도 가능하게 한다.
 *
 * 규칙: 외부 의존성 없이 순수 JS. 사용처에서 빈 결과 시 폴백 매칭에 활용.
 */

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'] as const
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'] as const
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'] as const

const HANGUL_BASE = 0xac00
const HANGUL_END = 0xd7a3

export function isHangulSyllable(ch: string): boolean {
  if (!ch) return false
  const code = ch.charCodeAt(0)
  return code >= HANGUL_BASE && code <= HANGUL_END
}

/** "한방" → "ㅎㅏㄴㅂㅏㅇ" — 자모 단위로 풀어 비교한다. */
export function decomposeHangul(input: string): string {
  let out = ''
  for (const ch of input) {
    const code = ch.charCodeAt(0)
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      const offset = code - HANGUL_BASE
      const cho = Math.floor(offset / 588)
      const jung = Math.floor((offset % 588) / 28)
      const jong = offset % 28
      out += CHO[cho] + JUNG[jung] + (JONG[jong] || '')
    } else {
      out += ch
    }
  }
  return out
}

/** "보중익기탕" → "ㅂㅈㅇㄱㅌ" */
export function getChosung(input: string): string {
  let out = ''
  for (const ch of input) {
    const code = ch.charCodeAt(0)
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      const offset = code - HANGUL_BASE
      const cho = Math.floor(offset / 588)
      out += CHO[cho]
    } else {
      out += ch
    }
  }
  return out
}

/** 입력이 초성만으로 구성됐는지 (ㄱ-ㅎ) */
export function isChosungOnly(input: string): boolean {
  return /^[ㄱ-ㅎ\s]+$/.test(input.trim())
}

/** 검색용 정규화 — 소문자, 공백 제거, 양쪽 트림, NFC 정규화. */
export function normalizeForSearch(input: string): string {
  return input.normalize('NFC').toLowerCase().replace(/\s+/g, '').trim()
}

/**
 * Korean-aware contains: 일반 부분일치, 자모 단위 부분일치, 초성 부분일치를 모두 시도한다.
 * 한의사 입력 오타("보충익기" → "보중익기")는 자모 단위 levenshtein <= 2 까지 허용.
 */
export function koreanContains(haystack: string, needle: string): boolean {
  if (!needle) return true
  if (!haystack) return false
  const h = normalizeForSearch(haystack)
  const n = normalizeForSearch(needle)
  if (h.includes(n)) return true

  // 초성만 입력한 경우
  if (isChosungOnly(needle)) {
    const cho = getChosung(haystack).replace(/\s+/g, '')
    if (cho.includes(needle.replace(/\s+/g, ''))) return true
  }

  // 자모 분해 후 부분일치
  const dh = decomposeHangul(h)
  const dn = decomposeHangul(n)
  if (dh.includes(dn)) return true

  // 자모 단위 levenshtein 거리 ≤ 2 (오타 1-2개 포용)
  if (Math.abs(dh.length - dn.length) <= 4 && jamoLevenshtein(dh, dn) <= 2) {
    return true
  }
  return false
}

function jamoLevenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let curr = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const next = Math.min(prev[j] + 1, curr + 1, prev[j - 1] + cost)
      prev[j - 1] = curr
      curr = next
    }
    prev[b.length] = curr
  }
  return prev[b.length]
}

/**
 * 한의 용어 한자→한글 보조 사전 (검색에서 한쪽만 입력해도 잡히게).
 * 필요한 만큼 보강. 진단명/처방명/약재명에서 자주 쓰는 것 우선.
 */
export const HANJA_TO_HANGUL: Record<string, string> = {
  '氣虛': '기허', '血虛': '혈허', '陰虛': '음허', '陽虛': '양허',
  '氣鬱': '기울', '肝氣鬱結': '간기울결', '濕熱': '습열', '痰飮': '담음',
  '補中益氣湯': '보중익기탕', '六味地黃湯': '육미지황탕',
  '當歸': '당귀', '黃芪': '황기', '人蔘': '인삼', '甘草': '감초',
  '太陽人': '태양인', '太陰人': '태음인', '少陽人': '소양인', '少陰人': '소음인',
}

export function expandKoreanQuery(q: string): string[] {
  const variants = new Set<string>([q])
  for (const [hanja, hangul] of Object.entries(HANJA_TO_HANGUL)) {
    if (q.includes(hanja)) variants.add(q.replace(hanja, hangul))
    if (q.includes(hangul)) variants.add(q.replace(hangul, hanja))
  }
  return Array.from(variants)
}
