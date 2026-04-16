import { SajuReportTier, SajuReportStatus } from '../../../database/entities/saju-report.entity';
import { SajuSectionType } from '../../../database/entities/saju-report-section.entity';

/** 사상체질 영문 → 한글 매핑 */
export const CONSTITUTION_KO: Record<string, string> = {
  taeyang: '태양인',
  taeeum: '태음인',
  soyang: '소양인',
  soeum: '소음인',
};

/** 상품 가격 */
export const SAJU_PRICES: Record<SajuReportTier, number> = {
  [SajuReportTier.MINI]: 3900,
  [SajuReportTier.STANDARD]: 19900,
  [SajuReportTier.PREMIUM]: 49900,
};

/** 상품명 */
export const SAJU_PRODUCT_NAMES: Record<SajuReportTier, string> = {
  [SajuReportTier.MINI]: '건강사주 미니',
  [SajuReportTier.STANDARD]: '건강사주 스탠다드',
  [SajuReportTier.PREMIUM]: '건강사주 프리미엄',
};

/** 티어별 포함 섹션 */
export const TIER_SECTIONS: Record<SajuReportTier, SajuSectionType[]> = {
  [SajuReportTier.MINI]: [
    SajuSectionType.OVERVIEW,
    SajuSectionType.HEALTH_CONSTITUTION,
    SajuSectionType.YEARLY_FORTUNE,
  ],
  [SajuReportTier.STANDARD]: [
    SajuSectionType.OVERVIEW,
    SajuSectionType.PERSONALITY,
    SajuSectionType.HEALTH_CONSTITUTION,
    SajuSectionType.CAREER_WEALTH,
    SajuSectionType.RELATIONSHIPS,
    SajuSectionType.YEARLY_FORTUNE,
  ],
  [SajuReportTier.PREMIUM]: [
    SajuSectionType.OVERVIEW,
    SajuSectionType.PERSONALITY,
    SajuSectionType.HEALTH_CONSTITUTION,
    SajuSectionType.CAREER_WEALTH,
    SajuSectionType.RELATIONSHIPS,
    SajuSectionType.YEARLY_FORTUNE,
    SajuSectionType.MONTHLY_FORTUNE,
    SajuSectionType.LIFE_ADVICE,
  ],
};

/** 섹션 제목 */
export const SECTION_TITLES: Record<SajuSectionType, string> = {
  [SajuSectionType.OVERVIEW]: '사주 개요 - 타고난 명식(命式) 분석',
  [SajuSectionType.PERSONALITY]: '성격 DNA - 나만의 기질과 성향',
  [SajuSectionType.HEALTH_CONSTITUTION]: '건강 체질 - 한의학 기반 정밀진단',
  [SajuSectionType.CAREER_WEALTH]: '직업 & 재물 - 나에게 맞는 성공 경로',
  [SajuSectionType.RELATIONSHIPS]: '대인관계 & 궁합 - 연애/인간관계 분석',
  [SajuSectionType.YEARLY_FORTUNE]: '2026년 총운 - 올해의 흐름',
  [SajuSectionType.MONTHLY_FORTUNE]: '월별 운세 - 12개월 상세 가이드',
  [SajuSectionType.LIFE_ADVICE]: '종합 조언 - 개운법과 삶의 방향',
};

/** 티어별 AI 모델 */
export const TIER_MODEL: Record<SajuReportTier, string> = {
  [SajuReportTier.MINI]: 'claude-haiku-4-5-20251001',
  [SajuReportTier.STANDARD]: 'claude-sonnet-4-5-20250929',
  [SajuReportTier.PREMIUM]: 'claude-opus-4-6',
};

/** 티어별 섹션당 max_tokens */
export const TIER_MAX_TOKENS: Record<SajuReportTier, number> = {
  [SajuReportTier.MINI]: 2048,
  [SajuReportTier.STANDARD]: 4096,
  [SajuReportTier.PREMIUM]: 8192,
};

/** 상품 상세 정보 (프론트엔드 표시용) */
export const SAJU_PRODUCTS = [
  {
    tier: SajuReportTier.MINI,
    name: '미니',
    price: SAJU_PRICES[SajuReportTier.MINI],
    sectionCount: 3,
    features: [
      '사주 개요 분석',
      '건강 체질 진단',
      '올해 운세',
    ],
    badge: null,
  },
  {
    tier: SajuReportTier.STANDARD,
    name: '스탠다드',
    price: SAJU_PRICES[SajuReportTier.STANDARD],
    sectionCount: 6,
    features: [
      '사주 개요 분석',
      '성격 DNA 분석',
      '건강 체질 정밀진단',
      '직업 & 재물운',
      '대인관계 & 궁합',
      '올해 운세',
    ],
    badge: '인기',
  },
  {
    tier: SajuReportTier.PREMIUM,
    name: '프리미엄',
    price: SAJU_PRICES[SajuReportTier.PREMIUM],
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
];
