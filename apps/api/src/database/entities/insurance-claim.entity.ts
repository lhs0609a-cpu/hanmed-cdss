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
import { User } from './user.entity';
import { PatientRecord } from './patient-record.entity';
import { PatientAccount } from './patient-account.entity';
import { Clinic } from './clinic.entity';

export enum ClaimStatus {
  DRAFT = 'draft',           // 작성 중
  PENDING = 'pending',       // 청구 대기
  SUBMITTED = 'submitted',   // 청구 완료
  UNDER_REVIEW = 'under_review', // 심사 중
  APPROVED = 'approved',     // 승인
  REJECTED = 'rejected',     // 반려
  PARTIAL = 'partial',       // 일부 승인
  PAID = 'paid',            // 지급 완료
}

export enum InsuranceType {
  NATIONAL_HEALTH = 'national_health',  // 건강보험
  INDUSTRIAL = 'industrial',            // 산재보험
  AUTO = 'auto',                        // 자동차보험
  PRIVATE = 'private',                  // 실손보험
}

// 진단코드 (상병코드)
export interface DiagnosisCode {
  code: string;           // KCD 코드 (예: U50.1)
  name: string;           // 상병명
  isPrimary: boolean;     // 주상병 여부
  confidence?: number;    // AI 매칭 신뢰도
}

// 시술/처치 항목
export interface TreatmentItem {
  code: string;           // 수가코드
  name: string;           // 항목명
  quantity: number;       // 횟수
  unitPrice: number;      // 단가
  totalPrice: number;     // 금액
  category: string;       // 카테고리 (침, 뜸, 부항, 약)
}

// 심사 결과
export interface ReviewResult {
  reviewedAt: Date;
  status: 'approved' | 'rejected' | 'partial';
  approvedAmount: number;
  rejectedAmount: number;
  rejectionReason?: string;
  adjustments?: Array<{
    itemCode: string;
    originalAmount: number;
    adjustedAmount: number;
    reason: string;
  }>;
}

@Entity('insurance_claims')
@Index(['practitionerId'])
@Index(['patientId'])
@Index(['clinicId'])
@Index(['status'])
@Index(['claimDate'])
export class InsuranceClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 청구 번호 (자동 생성)
  @Column({ unique: true })
  claimNumber: string;

  @Column('uuid')
  practitionerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'practitionerId' })
  practitioner: User;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientAccount)
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column('uuid', { nullable: true })
  recordId: string;

  @ManyToOne(() => PatientRecord, { nullable: true })
  @JoinColumn({ name: 'recordId' })
  record: PatientRecord;

  // 보험 유형
  @Column({
    type: 'enum',
    enum: InsuranceType,
    default: InsuranceType.NATIONAL_HEALTH,
  })
  insuranceType: InsuranceType;

  // 청구 상태
  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.DRAFT,
  })
  status: ClaimStatus;

  // 진료일
  @Column({ type: 'date' })
  treatmentDate: Date;

  // 청구일
  @Column({ type: 'date', nullable: true })
  claimDate: Date;

  // 진단코드 목록
  @Column('jsonb')
  diagnosisCodes: DiagnosisCode[];

  // 시술 항목
  @Column('jsonb')
  treatmentItems: TreatmentItem[];

  // 금액 정보
  @Column({ type: 'decimal', precision: 10, scale: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  patientCopay: number;  // 본인부담금

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  insuranceAmount: number;  // 보험청구액

  // AI 분석 결과
  @Column('jsonb', { nullable: true })
  aiAnalysis: {
    suggestedCodes: DiagnosisCode[];
    riskScore: number;  // 반려 위험도 0-100
    warnings: string[];
    suggestions: string[];
    missingItems: string[];
  };

  // 심사 결과
  @Column('jsonb', { nullable: true })
  reviewResult: ReviewResult;

  // 메모
  @Column('text', { nullable: true })
  notes: string;

  // 제출 정보
  @Column({ nullable: true })
  submittedAt: Date;

  @Column({ nullable: true })
  submittedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 상병코드 마스터 테이블
@Entity('diagnosis_code_master')
@Index(['code'])
@Index(['category'])
export class DiagnosisCodeMaster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;  // KCD 코드

  @Column()
  nameKo: string;  // 한글명

  @Column({ nullable: true })
  nameEn: string;  // 영문명

  @Column()
  category: string;  // 분류 (한방, 양방 공통 등)

  @Column('text', { nullable: true })
  description: string;

  // 관련 증상/키워드 (AI 매칭용)
  @Column('simple-array', { nullable: true })
  keywords: string[];

  // 자주 함께 사용되는 코드
  @Column('simple-array', { nullable: true })
  relatedCodes: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
