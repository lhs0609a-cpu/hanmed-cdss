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

/**
 * 변증명 → KCD-OM 코드 조회.
 *
 * 정확한 키 매칭이 1순위, korean/hanja 표기 매칭이 2순위.
 * 매핑이 없으면 `null` 반환 — 호출자는 `buildKcdSuggestionText` 가 자동으로
 * "코드 추천 불가" 안내문을 생성하므로 빈 배열로 넘기면 됨.
 */
export function lookupPatternCode(pattern: string): KcdOmEntry | null {
  if (!pattern) return null
  const normalized = pattern.trim()
  if (!normalized) return null

  // 1) 정확 일치
  if (PATTERN_TO_KCD_OM[normalized]) {
    return PATTERN_TO_KCD_OM[normalized]
  }

  // 2) korean/hanja 표기 일치
  const byLabel = Object.values(PATTERN_TO_KCD_OM).find(
    (e) => e.korean === normalized || e.hanja === normalized,
  )
  if (byLabel) return byLabel

  // 3) 부분 일치 (예: "간기울결증" → "간기울결" 키 매칭)
  const byPrefix = Object.entries(PATTERN_TO_KCD_OM).find(
    ([key, entry]) =>
      normalized.startsWith(key) ||
      normalized.startsWith(entry.korean) ||
      key.startsWith(normalized),
  )
  if (byPrefix) return byPrefix[1]

  return null
}

/** 변증명에 매핑된 코드가 없을 때 한의사에게 보일 안내. */
export const UNMAPPED_PATTERN_NOTICE =
  '해당 변증에 대응하는 KCD-OM 코드를 자동 추천할 수 없습니다. 청구 시 한의사가 직접 입력해 주세요.'

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
  if (!codes.length) return UNMAPPED_PATTERN_NOTICE
  return (
    '아래 코드는 변증·체질 후보 기반의 추천이며, 실제 청구는 한의사가 최종 결정해야 합니다.\n' +
    codes.map((c) => ` · ${c.code} ${c.korean}${c.hanja ? ` (${c.hanja})` : ''}`).join('\n')
  )
}

// ============================================================
// 비급여/급여 청구 호환성 검증
// ============================================================

/** 처방의 보험 급여 상태 (백엔드 FormulaInsuranceStatus 와 동기화) */
export type FormulaInsuranceStatus =
  | 'COVERED'
  | 'NON_COVERED'
  | 'PARTIAL'
  | 'UNKNOWN'

/** 청구 유형 (보험 청구 시 사용) */
export type ClaimType =
  | 'national_health' // 건강보험
  | 'industrial'      // 산재
  | 'auto'            // 자동차보험
  | 'private'         // 실손
  | 'self_pay'        // 비급여(자비)

export interface BillingCompatibilityResult {
  /** 검증 통과 여부 — false 면 청구 전에 사용자 확인 필요 */
  ok: boolean
  /** 경고 단계: error 는 청구 차단 권장, warn 은 한의사 확인 후 진행 가능 */
  severity: 'ok' | 'warn' | 'error'
  message: string
  /** 추천 액션 (UI 가 토스트/배너 등에 표시) */
  suggestion?: string
}

/**
 * 처방의 보험 급여 상태 ↔ 청구 유형 호환성 검증.
 *
 * UI 사용 예 (처방 선택 → 청구 작성 화면):
 * ```ts
 * const r = validateBillingCompatibility(formula.insuranceStatus, claimType)
 * if (!r.ok) toast.warning(r.message)
 * ```
 *
 * @param insuranceStatus  Formula 엔티티의 insuranceStatus 값
 * @param claimType        청구 유형 (보험 종류 또는 자비)
 */
export function validateBillingCompatibility(
  insuranceStatus: FormulaInsuranceStatus | null | undefined,
  claimType: ClaimType,
): BillingCompatibilityResult {
  const status = insuranceStatus || 'UNKNOWN'
  const isInsuranceClaim = claimType !== 'self_pay'

  // 비급여 처방 → 보험 청구 시도: 차단 권장
  if (status === 'NON_COVERED' && isInsuranceClaim) {
    return {
      ok: false,
      severity: 'error',
      message:
        '비급여 처방을 보험 청구에 포함할 수 없습니다. 자비 청구로 분리하거나 처방을 변경하세요.',
      suggestion: '청구 유형을 "자비"로 변경하거나 급여 가능한 대체 처방을 선택하세요.',
    }
  }

  // 일부 급여 처방: 한의사 확인 권장
  if (status === 'PARTIAL' && isInsuranceClaim) {
    return {
      ok: true,
      severity: 'warn',
      message:
        '일부 급여 처방입니다. 급여/비급여 분리 청구가 필요할 수 있으니 한의사가 확인하세요.',
      suggestion: '심평원 고시 기준에 따라 급여 부분만 청구하세요.',
    }
  }

  // 미확인 처방 + 보험 청구: 경고 (자동 청구 위험)
  if (status === 'UNKNOWN' && isInsuranceClaim) {
    return {
      ok: true,
      severity: 'warn',
      message:
        '이 처방의 급여 여부가 확인되지 않았습니다. 청구 전에 한의사가 직접 확인하세요.',
      suggestion: '심평원 등록 여부를 확인 후 청구하거나 비급여(자비) 청구로 변경하세요.',
    }
  }

  // 급여 처방 → 자비 청구: 정보성 (이상 없음)
  if (status === 'COVERED' && !isInsuranceClaim) {
    return {
      ok: true,
      severity: 'ok',
      message: '급여 처방을 자비 청구로 처리합니다. 환자에게 사유를 안내해 주세요.',
    }
  }

  return {
    ok: true,
    severity: 'ok',
    message: '청구 호환성 확인 완료.',
  }
}
