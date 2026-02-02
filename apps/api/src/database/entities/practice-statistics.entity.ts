import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum StatisticsPeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// 통계 메트릭 타입
export interface PracticeMetrics {
  // 환자 통계
  totalPatients: number;
  newPatients: number;
  returningPatients: number;
  returnRate: number; // 0-100%

  // 진료 통계
  totalConsultations: number;
  avgConsultationTime: number; // minutes

  // 처방 통계
  totalPrescriptions: number;
  topFormulas: Array<{ name: string; count: number }>;
  topSymptoms: Array<{ name: string; count: number }>;

  // 성과 통계
  avgImprovementRate: number; // 0-100%
  patientSatisfaction: number; // 0-5

  // AI 사용 통계
  aiRecommendationsUsed: number;
  aiAcceptanceRate: number; // 0-100%
}

// 벤치마크 데이터 타입
export interface BenchmarkData {
  nationalAvg: Record<string, number>;
  percentile: number; // 0-100
}

@Entity('practice_statistics')
@Index(['practitionerId'])
@Index(['periodStart', 'periodEnd'])
@Index(['periodType'])
export class PracticeStatistics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  practitionerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'practitionerId' })
  practitioner: User;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({
    type: 'enum',
    enum: StatisticsPeriodType,
  })
  periodType: StatisticsPeriodType;

  @Column('jsonb')
  metrics: PracticeMetrics;

  @Column('jsonb', { nullable: true })
  benchmark: BenchmarkData | null;

  @CreateDateColumn()
  createdAt: Date;
}
