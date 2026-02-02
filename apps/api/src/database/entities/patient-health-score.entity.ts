import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PatientAccount } from './patient-account.entity';
import { PatientRecord } from './patient-record.entity';

/**
 * 장부 기능 점수 (0-100)
 */
export interface OrganFunctionScores {
  /** 비위(脾胃) - 소화기능 */
  spleen: number;
  /** 폐(肺) - 호흡/면역 기능 */
  lung: number;
  /** 신(腎) - 신장/생식/골격 기능 */
  kidney: number;
  /** 간(肝) - 간/해독/근육 기능 */
  liver: number;
  /** 심(心) - 심장/순환/정신 기능 */
  heart: number;
}

/**
 * 체열/근실도 해석 결과
 */
export interface BodyStateInterpretation {
  /** 전통 의학적 해석 */
  traditional: string;
  /** 현대 의학적 해석 */
  modern: string;
  /** 관련 증상 */
  relatedSymptoms: string[];
  /** 생활 지침 */
  recommendations: string[];
}

/**
 * 건강 점수 평가의 근거
 */
export interface ScoreEvidence {
  /** 평가 요소 */
  factor: string;
  /** 원본 데이터 */
  sourceData: string;
  /** 점수 기여도 */
  contribution: number;
  /** 신뢰 수준 (0-1) */
  confidence: number;
}

/**
 * 건강 점수 트렌드 데이터
 */
export interface HealthScoreTrend {
  /** 이전 점수 대비 변화 */
  changeFromLast: number;
  /** 변화 방향 */
  direction: 'improving' | 'stable' | 'declining';
  /** 트렌드 해석 */
  interpretation: string;
}

@Entity('patient_health_scores')
@Index(['patientId'])
@Index(['evaluatedAt'])
@Index(['patientId', 'evaluatedAt'])
export class PatientHealthScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => PatientAccount)
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  // 평가 기준이 된 진료 기록 (선택적)
  @Column({ nullable: true })
  patientRecordId: string;

  @ManyToOne(() => PatientRecord, { nullable: true })
  @JoinColumn({ name: 'patientRecordId' })
  patientRecord: PatientRecord;

  // ============ 체열 점수 (寒熱) ============
  /**
   * 체열 점수 (-10 ~ +10)
   * -10: 극한(極寒) - 매우 추움, 대사 저하
   *   0: 평(平) - 정상
   * +10: 극열(極熱) - 매우 뜨거움, 염증/대사 항진
   */
  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  bodyHeatScore: number;

  @Column('jsonb', { nullable: true })
  bodyHeatInterpretation: BodyStateInterpretation;

  // ============ 근실도 점수 (虛實) ============
  /**
   * 근실도 점수 (-10 ~ +10)
   * -10: 극허(極虛) - 극심한 기력 저하
   *   0: 평(平) - 정상
   * +10: 극실(極實) - 과잉/울체/정체
   */
  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  bodyStrengthScore: number;

  @Column('jsonb', { nullable: true })
  bodyStrengthInterpretation: BodyStateInterpretation;

  // ============ 기혈순환도 (0-100) ============
  /**
   * 기혈순환 점수 (0-100)
   * 혈액순환 및 에너지 흐름 상태
   */
  @Column({ type: 'int', default: 50 })
  circulationScore: number;

  @Column('text', { nullable: true })
  circulationInterpretation: string;

  // ============ 장부 기능 점수 ============
  @Column('jsonb', { nullable: true })
  organFunctionScores: OrganFunctionScores;

  @Column('jsonb', { nullable: true })
  organInterpretations: Record<string, string>;

  // ============ 종합 건강 지수 (0-100) ============
  /**
   * 종합 건강 지수 (0-100)
   * 모든 지표를 종합한 전체 건강 상태
   */
  @Column({ type: 'int', default: 50 })
  overallHealthIndex: number;

  @Column('text', { nullable: true })
  overallInterpretation: string;

  // ============ 평가 신뢰도 ============
  /**
   * 평가 신뢰도 (0-1)
   * 점수 산출에 사용된 데이터의 품질과 양에 따라 결정
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  confidenceLevel: number;

  @Column('text', { nullable: true })
  confidenceExplanation: string;

  // ============ 근거 데이터 ============
  @Column('jsonb', { nullable: true })
  scoreEvidence: ScoreEvidence[];

  // ============ 트렌드 정보 ============
  @Column('jsonb', { nullable: true })
  trend: HealthScoreTrend;

  // ============ AI 분석 메타데이터 ============
  @Column({ nullable: true })
  aiModelVersion: string;

  @Column('jsonb', { nullable: true })
  aiAnalysisMetadata: {
    inputSymptoms?: string[];
    inputDiagnosis?: string;
    processingTime?: number;
    promptVersion?: string;
  };

  // ============ 평가 시점 ============
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  evaluatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
