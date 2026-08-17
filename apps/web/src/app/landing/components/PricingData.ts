/**
 * 랜딩 가격표 데이터.
 *
 * ⚠️ 단일 진실 공급원은 백엔드의 apps/api/src/modules/toss-payments/toss-payments.service.ts
 *    (PLAN_PRICES / BILLING_ADDON) 이다. 이 파일의 숫자는 그 값을 그대로 옮긴 것이며,
 *    백엔드를 바꾸면 여기도 반드시 함께 바꿔야 한다.
 *
 * 과거 랜딩(LandingPage 구버전)은 Professional 을 99,000원, Clinic 을 299,000원으로
 * 표기했는데, 99,000원은 실제로는 '보험청구 add-on' 가격이었고 299,000원은 백엔드에
 * 존재하지 않는 값이었다. 실제 청구액(49,000 / 149,000)과 어긋나 표시광고 문제가 되므로
 * 아래 값은 백엔드 기준으로 정정한 것이다.
 */

export interface PlanTier {
  id: 'free' | 'basic' | 'pro' | 'clinic'
  name: string
  tagline: string
  monthly: number
  yearly: number
  /** AI 챗봇 월 포함 횟수 (코어 임상 기능은 별도) */
  includedQueries: number
  /** 초과 시 건당 원 (0 = 초과 불가) */
  overagePrice: number
  features: string[]
  cta: string
  highlight?: boolean
}

/** 연간 결제 할인율 — 2개월 무료 = 약 17% */
export const ANNUAL_DISCOUNT_RATE = 0.17
export const ANNUAL_DISCOUNT_LABEL = '2개월 무료'

export const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: '핵심 임상 기능은 계속 무료',
    monthly: 0,
    yearly: 0,
    includedQueries: 50,
    overagePrice: 0,
    features: [
      '처방·약재·경혈 데이터베이스 열람',
      '환자 등록 및 진료 기록 작성',
      'AI 챗봇 월 50회',
      '약물 상호작용 기본 점검',
    ],
    cta: '무료로 시작하기',
  },
  {
    id: 'basic',
    name: 'Basic',
    tagline: '혼자 진료하는 원장님의 시작점',
    monthly: 19900,
    yearly: 199000,
    includedQueries: 200,
    overagePrice: 200,
    features: [
      'Free의 모든 기능',
      'AI 변증 추론',
      'AI 챗봇 월 200회',
      '치험례 검색',
      '초과 시 건당 200원',
    ],
    cta: 'Basic 시작하기',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: '한의사 1인이 매일 쓰는 기준 플랜',
    monthly: 49000,
    yearly: 490000,
    includedQueries: 1000,
    overagePrice: 100,
    features: [
      'Basic의 모든 기능',
      'AI 챗봇 월 1,000회',
      '음성 차트 (SOAP 자동 생성)',
      '치험례 전체 열람 및 유사 사례 추천',
      '삭감 사전 점검',
      '초과 시 건당 100원',
    ],
    cta: 'Pro 시작하기',
    highlight: true,
  },
  {
    id: 'clinic',
    name: 'Clinic',
    tagline: '원장 + 한의사 2인까지 한 계정으로',
    monthly: 149000,
    yearly: 1490000,
    includedQueries: 5000,
    overagePrice: 80,
    features: [
      'Pro의 모든 기능',
      '한의원 단위 AI 챗봇 월 5,000회',
      '원장 + 한의사 2인 계정 포함',
      '직역별 권한 분리 (접수·간호·청구)',
      '한의원 통합 통계 및 감사 로그',
      '초과 시 건당 80원',
    ],
    cta: 'Clinic 시작하기',
  },
]

/** 청구 부가서비스 — Clinic 위에 얹는 별도 상품 */
export const BILLING_ADDON = {
  name: '보험청구 · 삭감방지',
  description: '자동 청구 + 사전 삭감 점검 + 청구 누락 알람 + 심사 대응 가이드',
  monthly: 99000,
  yearly: 990000,
} as const

/**
 * 카피에 쓸 수 있는 '검증된' 수치만 모은다.
 *
 * 원칙: 저장소/데이터 파일에서 실제로 확인 가능한 값만 노출한다.
 * - formulas 429  → apps/web/public/data/formulas/all-formulas.json 배열 길이와 일치
 * - acupoints 361 → WHO 표준 경혈 수 (교과서적 상수)
 *
 * 의도적으로 제외한 값:
 *   치험례 6,000 / 약재 500 / 상호작용 1,000
 *   → stats.config.ts 에 하드코딩돼 있으나 DB 실측치와 동기화된 근거가 없다.
 *     의료 SaaS 랜딩에서 검증 불가한 수치를 헤드라인에 쓰면 표시광고 리스크가 되므로,
 *     실제 DB 집계를 API 로 노출한 뒤에 추가할 것.
 */
export const VERIFIED_FACTS = [
  { value: '429', unit: '건', label: '방약합편 기반 처방 데이터' },
  { value: '361', unit: '혈', label: 'WHO 표준 경혈 정보' },
] as const

export function formatKRW(won: number): string {
  return won.toLocaleString('ko-KR')
}
