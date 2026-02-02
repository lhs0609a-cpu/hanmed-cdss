import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PatientRecord } from './patient-record.entity';
import { PatientAccount } from './patient-account.entity';

// 예측 결과 타입
export interface PrognosisPredictionResult {
  expectedDuration: {
    optimistic: number; // days
    typical: number;
    conservative: number;
  };
  improvementRate: {
    week1: number; // 0-100%
    week2: number;
    week4: number;
    week8: number;
  };
  confidenceScore: number; // 0-1
  relapseProbability: number; // 0-1
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative';
    weight: number;
  }>;
}

// 근거 데이터 타입
export interface PrognosisEvidence {
  similarCases: number;
  avgOutcome: number;
  dataSource: string;
  modelVersion: string;
}

// 실제 결과 타입
export interface ActualOutcome {
  recordedAt: Date;
  actualDuration: number;
  actualImprovement: number;
  notes: string;
}

@Entity('prognosis_predictions')
@Index(['recordId'])
@Index(['patientId'])
@Index(['createdAt'])
export class PrognosisPrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  recordId: string;

  @ManyToOne(() => PatientRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordId' })
  record: PatientRecord;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  // 예측 결과
  @Column('jsonb')
  prediction: PrognosisPredictionResult;

  // 근거 데이터
  @Column('jsonb')
  evidence: PrognosisEvidence;

  // 실제 결과 (추후 업데이트)
  @Column('jsonb', { nullable: true })
  actualOutcome: ActualOutcome | null;

  @CreateDateColumn()
  createdAt: Date;
}
