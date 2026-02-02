import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Herb } from './herb.entity';

/**
 * 분자 타겟 정보
 */
export interface MolecularTarget {
  /** 타겟 이름 (예: AMPK, NF-κB, COX-2) */
  name: string;
  /** 타겟 유형 */
  type: 'enzyme' | 'receptor' | 'channel' | 'transporter' | 'transcription_factor' | 'other';
  /** 작용 (활성화/억제/조절) */
  action: 'activation' | 'inhibition' | 'modulation';
  /** IC50/EC50 값 (있는 경우) */
  potency?: string;
  /** 작용 효과 설명 */
  effect: string;
  /** 근거 수준 */
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
}

/**
 * 신호전달경로 정보
 */
export interface SignalingPathwayInfo {
  /** 경로 이름 */
  name: string;
  /** 경로 유형 */
  type?: 'inflammatory' | 'metabolic' | 'apoptotic' | 'proliferative' | 'antioxidant' | 'other';
  /** 경로 내 역할 */
  role: string;
  /** 상위 경로 연결 */
  upstream?: string[];
  /** 하위 경로 연결 */
  downstream?: string[];
  /** 임상적 의미 */
  clinicalRelevance: string;
}

/**
 * 약동학 정보 (ADME)
 */
export interface Pharmacokinetics {
  /** 흡수 (Absorption) */
  absorption?: {
    bioavailability?: string;      // 생체이용률
    absorptionSite?: string;       // 흡수 부위
    tmax?: string;                 // 최대 혈중농도 도달 시간
    foodEffect?: string;           // 음식 영향
  };
  /** 분포 (Distribution) */
  distribution?: {
    volumeOfDistribution?: string; // 분포용적
    proteinBinding?: string;       // 단백 결합률
    tissueDistribution?: string[]; // 조직 분포
    bbbPenetration?: boolean;      // 혈뇌장벽 통과 여부
  };
  /** 대사 (Metabolism) */
  metabolism?: {
    primaryEnzymes?: string[];     // 주요 대사 효소 (CYP450 등)
    metabolites?: string[];        // 대사체
    metabolismSite?: string;       // 대사 부위
    inductionInhibition?: string;  // 효소 유도/억제 정보
  };
  /** 배설 (Excretion) */
  excretion?: {
    halfLife?: string;             // 반감기
    clearance?: string;            // 청소율
    routeOfElimination?: string;   // 배설 경로
    renalExcretion?: string;       // 신장 배설
  };
}

/**
 * 임상적 관련성
 */
export interface ClinicalRelevance {
  /** 승인된 적응증 (국가/기관별) */
  approvedIndications?: Array<{
    indication: string;
    country?: string;
    approvalStatus?: string;
  }>;
  /** 연구 중인 적응증 */
  investigationalIndications?: string[];
  /** 임상 근거 요약 */
  clinicalEvidenceSummary?: string;
  /** 주요 임상 연구 */
  keyStudies?: Array<{
    title: string;
    year: number;
    pmid?: string;
    finding: string;
    evidenceLevel?: string;
  }>;
  /** 약물 상호작용 */
  drugInteractions?: Array<{
    drug: string;
    mechanism: string;
    severity: 'major' | 'moderate' | 'minor';
    recommendation: string;
  }>;
  /** 부작용/독성 */
  safetyProfile?: {
    commonSideEffects?: string[];
    seriousAdverseEvents?: string[];
    contraindications?: string[];
    ld50?: string;  // 동물 실험 LD50
  };
}

@Entity('herb_compounds')
@Index(['herbId'])
@Index(['compoundName'])
export class HerbCompound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Herb, (h) => h.compounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'herb_id' })
  herb: Herb;

  @Column('uuid')
  herbId: string;

  @Column()
  compoundName: string; // 성분명 (Ginsenoside Rb1)

  @Column({ nullable: true })
  compoundNameKo: string; // 한글명 (진세노사이드 Rb1)

  @Column({ nullable: true })
  casNumber: string; // CAS 등록번호

  @Column({ nullable: true })
  pubChemId: string; // PubChem CID

  @Column({ nullable: true })
  chemSpiderId: string; // ChemSpider ID

  @Column({ nullable: true })
  category: string; // 분류 (사포닌, 플라보노이드 등)

  @Column({ nullable: true })
  chemicalClass: string; // 화학적 분류 (terpenoid, alkaloid, phenolic 등)

  @Column({ nullable: true })
  molecularFormula: string; // 분자식 (예: C54H92O23)

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  molecularWeight: number; // 분자량

  @Column('text', { nullable: true })
  pharmacology: string; // 약리작용 (기존 필드)

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  contentPercent: number; // 함량 (%)

  // ============ 새로운 약리학적 필드 ============

  /**
   * 분자 타겟 정보
   * 성분이 작용하는 분자 수준 타겟들
   */
  @Column('jsonb', { nullable: true })
  molecularTargets: MolecularTarget[];

  /**
   * 신호전달경로 정보
   * 관여하는 세포 신호 경로
   */
  @Column('jsonb', { nullable: true })
  signalingPathways: SignalingPathwayInfo[];

  /**
   * 약동학 정보 (ADME)
   * 흡수, 분포, 대사, 배설 정보
   */
  @Column('jsonb', { nullable: true })
  pharmacokinetics: Pharmacokinetics;

  /**
   * 임상적 관련성
   * 승인 적응증, 임상 근거, 안전성 정보
   */
  @Column('jsonb', { nullable: true })
  clinicalRelevance: ClinicalRelevance;

  /**
   * 작용 기전 요약 (환자 친화적)
   */
  @Column('text', { nullable: true })
  mechanismSummary: string;

  /**
   * 작용 기전 플로우차트 데이터
   * 시각화용 구조화된 데이터
   */
  @Column('jsonb', { nullable: true })
  mechanismFlowchart: {
    nodes: Array<{
      id: string;
      type: 'compound' | 'target' | 'pathway' | 'effect';
      label: string;
      description?: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      label?: string;
      type?: 'activation' | 'inhibition' | 'modulation';
    }>;
  };

  @Column('text', { array: true, nullable: true })
  pubmedIds: string[]; // 관련 논문 PMID

  /**
   * 데이터 출처
   */
  @Column('text', { array: true, nullable: true })
  dataSources: string[]; // ['PubChem', 'DrugBank', 'TCMSP', 'PubMed']

  /**
   * 마지막 업데이트 날짜
   */
  @Column({ type: 'timestamp', nullable: true })
  lastUpdated: Date;
}
