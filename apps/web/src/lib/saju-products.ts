import type { SajuTier } from '@/stores/sajuStore'

export interface SajuProduct {
  tier: SajuTier
  name: string
  price: number
  sectionCount: number
  features: string[]
  badge: string | null
}

/** 모든 페이지에서 공통으로 사용하는 사주 상품 정보 */
export const SAJU_PRODUCTS: readonly SajuProduct[] = [
  {
    tier: 'mini',
    name: '미니',
    price: 3900,
    sectionCount: 3,
    features: ['사주 개요 분석', '건강 체질 진단', '올해 운세'],
    badge: null,
  },
  {
    tier: 'standard',
    name: '스탠다드',
    price: 19900,
    sectionCount: 6,
    features: [
      '사주 개요',
      '성격 DNA',
      '건강 체질 정밀진단',
      '직업 & 재물운',
      '대인관계 & 궁합',
      '올해 운세',
    ],
    badge: '인기',
  },
  {
    tier: 'premium',
    name: '프리미엄',
    price: 49900,
    sectionCount: 8,
    features: [
      '스탠다드 전체 포함',
      '12개월 월별운세',
      '종합 조언 & 개운법',
      'AI 일러스트',
      'PDF 리포트',
    ],
    badge: '추천',
  },
] as const

/** 티어로 상품 정보 조회 */
export function getSajuProduct(tier: SajuTier): SajuProduct | undefined {
  return SAJU_PRODUCTS.find((p) => p.tier === tier)
}

/** 티어별 가격 */
export function getSajuPrice(tier: SajuTier): number {
  return getSajuProduct(tier)?.price ?? 0
}

/** 티어별 이름 */
export function getSajuName(tier: SajuTier): string {
  return getSajuProduct(tier)?.name ?? tier
}
