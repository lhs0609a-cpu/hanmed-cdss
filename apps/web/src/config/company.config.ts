/**
 * 사업자(법인) 정보 — 단일 출처(Single Source of Truth).
 *
 * ⚠️ 유료 결제를 받기 전에 반드시 실제 값으로 교체할 것.
 *   - 전자상거래법상 회사명·대표·사업자등록번호·통신판매업신고번호·주소·연락처는 표시 의무 항목입니다.
 *   - 이 파일 한 곳만 수정하면 약관/환불/구독/개인정보처리방침 4개 법적 페이지에 모두 반영됩니다.
 *
 * 비워 둔 항목은 화면에 '[회사명 입력 필요]' 같은 대괄호 문구가 그대로
 * 노출되고 있었다. 법적 고지 페이지에 개발용 자리표시자가 보이는 것은
 * 정보가 없는 것보다 나쁘다 — 읽는 사람에게 이 서비스가 준비되지 않았다고
 * 말하는 셈이고, 그 페이지는 결제 직전에 열리는 곳이다.
 *
 * 그래서 값을 비워 두고(빈 문자열), 화면에서는 아직 등록 전임을 밝히도록
 * 했다. 없는 사업자등록번호를 지어내는 것은 허위 표시라 절대 하지 않는다.
 */
export const COMPANY_INFO = {
  /** 법인명 또는 상호 (예: 주식회사 온고지신) */
  name: '',
  /** 대표자명 */
  ceo: '',
  /** 사업자등록번호 (예: 123-45-67890) */
  businessNumber: '',
  /** 통신판매업신고번호 (예: 제2026-서울강남-0000호) */
  mailOrderNumber: '',
  /** 사업장 주소 */
  address: '',
  /** 고객센터 전화번호 */
  phone: '',
  /** 대표 이메일 (지원·문의 통합) */
  email: 'support@ongojisin.ai',
  /** 개인정보 보호책임자 성명 */
  privacyOfficer: '',
  /** 개인정보 관련 문의 이메일 (별도 운영 메일함이 없으면 통합 메일 사용) */
  privacyEmail: 'support@ongojisin.ai',
  /** 약관·정책 시행일 (예: 2026년 6월 1일) */
  effectiveDate: '',
  /** 최종 수정일 */
  lastUpdated: '',
} as const

/**
 * 표시 의무 항목이 다 채워졌는지.
 *
 * 전자상거래법 제13조가 요구하는 항목들이다. 하나라도 비어 있으면 유료
 * 결제를 받을 수 없다 — 결제 화면을 막는 근거로 쓴다.
 *
 * 이메일은 기본값이 있으므로 여기서 세지 않는다.
 */
export const REQUIRED_BUSINESS_FIELDS = [
  'name',
  'ceo',
  'businessNumber',
  'mailOrderNumber',
  'address',
  'phone',
] as const

export function missingBusinessFields(): string[] {
  return REQUIRED_BUSINESS_FIELDS.filter(
    (k) => !String(COMPANY_INFO[k] ?? '').trim(),
  )
}

/** 사업자 정보가 법적 표시 요건을 갖췄는지. */
export function hasBusinessInfo(): boolean {
  return missingBusinessFields().length === 0
}

/**
 * 화면에 찍을 값.
 *
 * 비어 있으면 '등록 전' 이라고 밝힌다. 빈칸으로 두면 누락인지 준비 중인지
 * 구분이 안 되고, 자리표시자를 그대로 두면 개발 중 화면이 새어 나간다.
 */
export function companyField(key: keyof typeof COMPANY_INFO): string {
  const v = String(COMPANY_INFO[key] ?? '').trim()
  return v || '등록 전 (개인 개발 단계)'
}
