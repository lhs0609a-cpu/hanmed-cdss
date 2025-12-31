import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PatientAccount } from './patient-account.entity';
import { Clinic } from './clinic.entity';
import { User } from './user.entity';
import { ClinicalCase } from './clinical-case.entity';
import { PatientPrescription } from './patient-prescription.entity';

export enum RecordStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum VisitType {
  INITIAL = 'initial',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
}

// AI가 생성한 건강 인사이트 타입
export interface HealthInsight {
  summary: string;
  keyFindings: string[];
  riskFactors?: string[];
  improvements?: string[];
}

// 생활 관리 권고 타입
export interface LifestyleRecommendation {
  category: 'diet' | 'exercise' | 'sleep' | 'stress' | 'other';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  tips: string[];
}

// 식이 권고 타입
export interface DietRecommendation {
  recommended: Array<{
    food: string;
    reason: string;
    frequency?: string;
  }>;
  avoid: Array<{
    food: string;
    reason: string;
  }>;
  generalAdvice: string[];
}

@Entity('patient_records')
@Index(['patientId'])
@Index(['clinicId'])
@Index(['visitDate'])
export class PatientRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => PatientAccount)
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column()
  practitionerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'practitionerId' })
  practitioner: User;

  @Column({ nullable: true })
  clinicalCaseId: string;

  @ManyToOne(() => ClinicalCase, { nullable: true })
  @JoinColumn({ name: 'clinicalCaseId' })
  clinicalCase: ClinicalCase;

  // 진료 일시
  @Column({ type: 'date' })
  visitDate: Date;

  @Column({
    type: 'enum',
    enum: VisitType,
    default: VisitType.INITIAL,
  })
  visitType: VisitType;

  // 증상 (환자용 설명)
  @Column('text', { nullable: true })
  chiefComplaintPatient: string;

  @Column('jsonb', { nullable: true })
  symptomsSummary: Array<{
    name: string;
    description: string;
    severity?: number;
  }>;

  // 진단
  @Column('text', { nullable: true })
  diagnosisSummary: string;

  @Column({ nullable: true, length: 20 })
  constitutionResult: string;

  @Column('text', { nullable: true })
  patternDiagnosisPatient: string;

  // 처방
  @Column({ nullable: true })
  prescriptionId: string;

  @OneToOne(() => PatientPrescription, { nullable: true })
  @JoinColumn({ name: 'prescriptionId' })
  prescription: PatientPrescription;

  // AI 분석 결과 (환자용)
  @Column('jsonb', { nullable: true })
  aiHealthInsights: HealthInsight;

  @Column('jsonb', { nullable: true })
  lifestyleRecommendations: LifestyleRecommendation[];

  @Column('jsonb', { nullable: true })
  dietRecommendations: DietRecommendation;

  @Column('jsonb', { nullable: true })
  exerciseRecommendations: Array<{
    type: string;
    description: string;
    frequency: string;
    cautions?: string[];
  }>;

  // 다음 방문
  @Column({ type: 'date', nullable: true })
  nextVisitRecommended: Date;

  @Column('text', { nullable: true })
  nextVisitNotes: string;

  // 공유 설정
  @Column({ default: false })
  isSharedWithPatient: boolean;

  @Column({ nullable: true })
  sharedAt: Date;

  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.ACTIVE,
  })
  status: RecordStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
