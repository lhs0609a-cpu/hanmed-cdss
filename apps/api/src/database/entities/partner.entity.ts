import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 파트너 종류 — OpenEvidence 모델의 B2B2C 수익 레이어.
 *
 * 한의사 임상 판단을 왜곡하지 않는 위치(처방 결정 후 화면, 부가 정보 영역)에만 노출한다.
 * 광고 위장 금지 — "제휴" 표시 의무.
 */
export enum PartnerCategory {
  /** 한약재 공급사 — "이 처방 한약재 → A사에서 견적" */
  HERB_SUPPLIER = 'herb_supplier',
  /** 진단기기(맥진기·체질진단기 등) */
  DIAGNOSTIC_DEVICE = 'diagnostic_device',
  /** 제약(한방·일반) */
  PHARMA = 'pharma',
  /** 의료기 유통(침·뜸·부항) */
  MEDICAL_SUPPLY = 'medical_supply',
  /** 한의대·교육기관(보수교육 학점) */
  EDUCATION = 'education',
}

/**
 * 노출 위치 — 신뢰 보호를 위해 명시적 화이트리스트.
 */
export enum PartnerPlacement {
  /** 처방 결정 완료 화면 부가정보 영역 */
  PRESCRIPTION_RESULT_SIDEBAR = 'prescription_result_sidebar',
  /** 한약재 상세 페이지 하단 (이 한약재 공급사) */
  HERB_DETAIL_FOOTER = 'herb_detail_footer',
  /** DUR/상호작용 정보 화면 */
  DUR_INFO_PANEL = 'dur_info_panel',
  /** 학회·교육 콘텐츠 영역 */
  EDUCATION_AREA = 'education_area',
}

export enum PartnerStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
}

/**
 * 파트너 제휴 정의.
 *
 * 한 파트너가 여러 placement에 노출될 수 있고, 노출/클릭은 별도 트래킹 테이블에 기록한다.
 */
@Entity('partners')
@Index(['category', 'status'])
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: PartnerCategory })
  category: PartnerCategory;

  @Column({ type: 'enum', enum: PartnerStatus, default: PartnerStatus.ACTIVE })
  status: PartnerStatus;

  /** 노출 가능한 placement 화이트리스트 */
  @Column({ type: 'json' })
  placements: PartnerPlacement[];

  /** 한약재 공급사라면 어떤 herb id에 매칭되는지 등 */
  @Column({ type: 'json', nullable: true })
  matchCriteria: {
    herbIds?: string[];
    formulaIds?: string[];
    keywords?: string[];
  } | null;

  @Column({ length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ length: 500 })
  landingUrl: string;

  @Column({ type: 'text', nullable: true })
  headline: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * 수익 모델: 'cpc' | 'cpl' | 'cpm' | 'revshare' | 'flat'
   * 초기 출시는 정액(flat) + CPC 혼합 권장.
   */
  @Column({ length: 20, default: 'cpc' })
  billingModel: string;

  /** 단가(원). billingModel에 따라 의미가 다름. */
  @Column({ type: 'int', default: 0 })
  unitPrice: number;

  /** 월 노출 한도 (소진 시 자동 일시정지) */
  @Column({ type: 'int', nullable: true })
  monthlyImpressionCap: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
