/**
 * 사업자(법인) 정보 — 단일 출처(Single Source of Truth).
 *
 * ⚠️ 유료 결제를 받기 전에 반드시 실제 값으로 교체할 것.
 *   - 전자상거래법상 회사명·대표·사업자등록번호·통신판매업신고번호·주소·연락처는 표시 의무 항목입니다.
 *   - 이 파일 한 곳만 수정하면 약관/환불/구독/개인정보처리방침 4개 법적 페이지에 모두 반영됩니다.
 *
 * 사업자등록증(2026-07-16, 동안양세무서장 발급) 기준으로 채웠다.
 * 남은 두 칸은 사업자등록증에 없는 값이라 비워 둔다 — 통신판매업신고번호는
 * 별도 신고증에 있고, 고객센터 전화는 어느 번호를 쓸지 정해야 한다.
 *
 * 비어 있는 동안에는 결제가 열리지 않는다(hasBusinessInfo). 값을 채우면
 * 잠금이 저절로 풀린다.
 *
 * 없는 값을 지어내지 않는다. 사업자등록번호나 신고번호를 만들어 적는 것은
 * 허위 표시다.
 */
export const COMPANY_INFO = {
  /** 법인명 또는 상호 (예: 주식회사 온고지신) */
  name: '머프키치',
  /** 대표자명 */
  ceo: '양보름',
  /** 사업자등록번호 (예: 123-45-67890) */
  businessNumber: '401-20-84647',
  /**
   * 통신판매업신고번호 (예: 제2026-경기의왕-0000호)
   *
   * 사업자등록증에는 없는 값이다. 관할 시·군·구청에 따로 신고하고 받는
   * 통신판매업신고증에 적혀 있다. 사업자등록증 종목에 '전자상거래
   * 소매업' 이 있으니 이미 신고했을 가능성이 높다 — 신고증을 찾아 넣으면
   * 된다. 지어내지 않는다.
   */
  mailOrderNumber: '',
  /** 사업장 주소 */
  address: '경기도 의왕시 백운호수로6길 4, 202호(학의동)',
  /**
   * 고객센터 전화번호.
   *
   * 전자상거래법이 요구하는 표시 항목이라 비워 둘 수 없다. 개인 휴대폰을
   * 적기 어려우면 안심번호나 대표번호를 따로 두는 편이 낫다 — 이 번호는
   * 결제 화면과 환불정책에 그대로 노출된다.
   */
  phone: '',
  /** 대표 이메일 (지원·문의 통합) */
  email: 'support@ongojisin.ai',
  /** 개인정보 보호책임자 성명 */
  privacyOfficer: '양보름',
  /** 개인정보 관련 문의 이메일 (별도 운영 메일함이 없으면 통합 메일 사용) */
  privacyEmail: 'support@ongojisin.ai',
  /** 약관·정책 시행일 (예: 2026년 6월 1일) */
  effectiveDate: '2026년 9월 2일',
  /** 최종 수정일 */
  lastUpdated: '2026년 9월 2일',
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
