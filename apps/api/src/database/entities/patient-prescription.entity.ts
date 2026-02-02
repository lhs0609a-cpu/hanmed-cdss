import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PatientAccount } from './patient-account.entity';
import { Formula } from './formula.entity';

export enum PrescriptionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DISCONTINUED = 'discontinued',
}

// 약재 상세 정보 (환자용)
export interface HerbDetail {
  herbId: string;
  name: string;
  hanja?: string;
  amount: string;
  purpose: string; // 환자용 간단 설명
  efficacy: string; // 효능
  scientificInfo?: {
    activeCompounds?: string[];
    mechanism?: string;
    studies?: Array<{
      title: string;
      pmid?: string;
      summary: string;
    }>;
  };
  cautions?: string[];
  imageUrl?: string;
}

// 과학적 근거
export interface ScientificEvidence {
  studies: Array<{
    title: string;
    authors?: string;
    journal?: string;
    year?: number;
    pmid?: string;
    summary: string;
    relevance: string;
  }>;
  mechanism: string;
  expectedEffects: string[];
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
}

// 주의사항
export interface PrescriptionPrecaution {
  type: 'warning' | 'caution' | 'info';
  title: string;
  description: string;
}

// 약물 상호작용 정보
export interface DrugInteractionInfo {
  drugName: string;
  herbName: string;
  interactionType: 'increase' | 'decrease' | 'dangerous';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  recommendation: string;
}

@Entity('patient_prescriptions')
@Index(['patientId'])
@Index(['practitionerId'])
@Index(['status'])
export class PatientPrescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => PatientAccount)
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  @Column({ nullable: true })
  practitionerId: string;

  @Column({ nullable: true })
  recordId: string;

  // 처방약 정보
  @Column({ nullable: true })
  formulaId: string;

  @ManyToOne(() => Formula, { nullable: true })
  @JoinColumn({ name: 'formulaId' })
  formula: Formula;

  @Column({ length: 200 })
  formulaName: string;

  @Column('text', { nullable: true })
  formulaDescription: string;

  // 구성 약재 (상세 정보 포함)
  @Column('jsonb')
  herbsDetail: HerbDetail[];

  // 복용 안내
  @Column('text', { nullable: true })
  dosageInstructions: string;

  @Column({ nullable: true, length: 50 })
  dosageFrequency: string;

  @Column('text', { nullable: true })
  dosageTiming: string;

  @Column({ nullable: true })
  durationDays: number;

  // 주의사항
  @Column('jsonb', { nullable: true })
  precautions: PrescriptionPrecaution[];

  // 약물 상호작용 정보
  @Column('jsonb', { nullable: true })
  drugInteractions: DrugInteractionInfo[];

  // 과학적 근거 (환자용)
  @Column('jsonb', { nullable: true })
  scientificEvidence: ScientificEvidence;

  // 예상 효과
  @Column('jsonb', { nullable: true })
  expectedEffects: Array<{
    effect: string;
    timeline: string;
    description: string;
  }>;

  // 상태
  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.ACTIVE,
  })
  status: PrescriptionStatus;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
