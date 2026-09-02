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
   * 대표가 전화 대신 이메일로 문의를 받기로 정해 비워 둔다. 화면에서는
   * 전화 자리에 이메일이 대신 나간다.
   *
   * 전자상거래법 제13조는 전화번호와 전자우편주소를 함께 적도록 정한다.
   * 전화번호를 두는 편이 안전하므로, 070 번호를 개통하면 여기에 넣는다.
   */
  phone: '',
  /** 대표 이메일 (지원·문의 통합) */
  email: 'lhs0609c@naver.com',
  /** 개인정보 보호책임자 성명 */
  privacyOfficer: '양보름',
  /** 개인정보 관련 문의 이메일 (별도 운영 메일함이 없으면 통합 메일 사용) */
  privacyEmail: 'lhs0609c@naver.com',
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
  'address',
] as const

/**
 * 아직 못 채운 것 — 잠금 조건에서는 뺐지만 없어도 되는 값은 아니다.
 *
 * 대표가 결제를 먼저 열기로 정했다. 통신판매업신고번호는 받는 대로 넣고,
 * 전화번호는 070 을 개통하면 넣는다. 둘 다 전자상거래법 제13조의 표시
 * 항목이라, 비어 있는 동안에는 화면에 '확인 중' 으로 나간다 — 없는 번호를
 * 지어내지 않는다.
 */
export const PENDING_BUSINESS_FIELDS = ['mailOrderNumber', 'phone'] as const

export function missingBusinessFields(): string[] {
  return REQUIRED_BUSINESS_FIELDS.filter(
    (k) => !String(COMPANY_INFO[k] ?? '').trim(),
  )
}

/**
 * 토스페이먼츠 자동결제 사용 가능 여부.
 *
 * 한때 false 로 막아 뒀다. 카드 등록이 계속 INVALID_BILL_KEY_REQUEST 로
 * 거절돼서 자동결제 계약이 없는 줄 알았기 때문이다. 그건 틀린 진단이었다 —
 * 잘못된 카드번호를 보내면 INVALID_CARD_NUMBER 가 정확히 돌아온다.
 * 엔드포인트는 열려 있고 카드 검증도 돈다.
 *
 * 진짜 원인은 본인인증이었다. 카드번호를 직접 받아 발급하는 방식은 본인인증을
 * 우리가 구현해야 하는데 안 했다. 결제창(SDK) 방식으로 바꾸면 토스가
 * 휴대폰 본인인증까지 처리한다.
 *
 * 결제창 연동을 마쳤으므로 다시 연다.
 */
export const TOSS_BILLING_CONTRACT_ACTIVE = true

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
  if (v) return v
  // 전화 자리는 이메일로 대신한다. 문의를 이메일로 받기로 했으니
  // 빈칸이나 '없음' 보다 연락이 닿는 곳을 적는 편이 낫다.
  if (key === 'phone') return COMPANY_INFO.email
  return '확인 중'
}
