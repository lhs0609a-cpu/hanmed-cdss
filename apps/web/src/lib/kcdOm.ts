/**
 * KCD-OM (한의 표준질병사인분류) 매핑.
 *
 * 사용 시나리오:
 *   - 변증 추론 결과 → 청구용 KCD-OM 코드 자동 제안
 *   - 사상의학 체질 + 변증의 통합 뷰
 *
 * 주의: 본 매핑은 임상 가이드 보조용이며, 청구 시 한의사가 최종 확인해야 한다.
 *      실제 KCD-OM 8차 코드 일부 — 운영에서 식약처/심평원 갱신본으로 동기화.
 */

export interface KcdOmEntry {
  code: string
  korean: string
  hanja?: string
  category: 'pattern' | 'constitution' | 'symptom'
  notes?: string
}

/** 변증(辨證) → KCD-OM 매핑 (대표적인 것 우선). */
export const PATTERN_TO_KCD_OM: Record<string, KcdOmEntry> = {
  '기허': { code: 'U50.0', korean: '기허증', hanja: '氣虛證', category: 'pattern' },
  '혈허': { code: 'U50.1', korean: '혈허증', hanja: '血虛證', category: 'pattern' },
  '음허': { code: 'U50.2', korean: '음허증', hanja: '陰虛證', category: 'pattern' },
  '양허': { code: 'U50.3', korean: '양허증', hanja: '陽虛證', category: 'pattern' },
  '기혈양허': { code: 'U50.4', korean: '기혈양허증', hanja: '氣血兩虛證', category: 'pattern' },
  '음양양허': { code: 'U50.5', korean: '음양양허증', hanja: '陰陽兩虛證', category: 'pattern' },
  '기체': { code: 'U51.0', korean: '기체증', hanja: '氣滯證', category: 'pattern' },
  '기울': { code: 'U51.1', korean: '기울증', hanja: '氣鬱證', category: 'pattern' },
  '간기울결': { code: 'U51.2', korean: '간기울결증', hanja: '肝氣鬱結證', category: 'pattern' },
  '혈어': { code: 'U52.0', korean: '혈어증', hanja: '血瘀證', category: 'pattern' },
  '담음': { code: 'U53.0', korean: '담음증', hanja: '痰飮證', category: 'pattern' },
  '습열': { code: 'U54.0', korean: '습열증', hanja: '濕熱證', category: 'pattern' },
  '한습': { code: 'U54.1', korean: '한습증', hanja: '寒濕證', category: 'pattern' },
  '풍한': { code: 'U55.0', korean: '풍한증', hanja: '風寒證', category: 'pattern' },
  '풍열': { code: 'U55.1', korean: '풍열증', hanja: '風熱證', category: 'pattern' },
  '실열': { code: 'U56.0', korean: '실열증', hanja: '實熱證', category: 'pattern' },
  '허열': { code: 'U56.1', korean: '허열증', hanja: '虛熱證', category: 'pattern' },
}

/** 사상의학 체질 → KCD-OM */
export const CONSTITUTION_TO_KCD_OM: Record<string, KcdOmEntry> = {
  '태양인': { code: 'U95.0', korean: '태양인', hanja: '太陽人', category: 'constitution' },
  '태음인': { code: 'U95.1', korean: '태음인', hanja: '太陰人', category: 'constitution' },
  '소양인': { code: 'U95.2', korean: '소양인', hanja: '少陽人', category: 'constitution' },
  '소음인': { code: 'U95.3', korean: '소음인', hanja: '少陰人', category: 'constitution' },
}

export function lookupPatternCode(pattern: string): KcdOmEntry | null {
  if (!pattern) return null
  const normalized = pattern.trim()
  return (
    PATTERN_TO_KCD_OM[normalized] ??
    Object.values(PATTERN_TO_KCD_OM).find(
      (e) => e.korean === normalized || e.hanja === normalized,
    ) ??
    null
  )
}

export function lookupConstitutionCode(constitution: string): KcdOmEntry | null {
  if (!constitution) return null
  const normalized = constitution.trim()
  return (
    CONSTITUTION_TO_KCD_OM[normalized] ??
    Object.values(CONSTITUTION_TO_KCD_OM).find(
      (e) => e.korean === normalized || e.hanja === normalized,
    ) ??
    null
  )
}

/** 변증+체질 통합 뷰: 둘 다 매칭되는 코드 셋 반환 */
export function combineCodes(input: {
  pattern?: string
  constitution?: string
}): KcdOmEntry[] {
  const codes: KcdOmEntry[] = []
  if (input.pattern) {
    const p = lookupPatternCode(input.pattern)
    if (p) codes.push(p)
  }
  if (input.constitution) {
    const c = lookupConstitutionCode(input.constitution)
    if (c) codes.push(c)
  }
  return codes
}

/** 청구 코드 추천 안내문 (한의사용 — 단언이 아니라 후보로 표시) */
export function buildKcdSuggestionText(codes: KcdOmEntry[]): string {
  if (!codes.length) return 'KCD-OM 추천 코드 없음 — 청구 시 한의사가 직접 확인하세요.'
  return (
    '아래 코드는 변증·체질 후보 기반의 추천이며, 실제 청구는 한의사가 최종 결정해야 합니다.\n' +
    codes.map((c) => ` · ${c.code} ${c.korean}${c.hanja ? ` (${c.hanja})` : ''}`).join('\n')
  )
}
