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

@Entity('health_journals')
@Index(['patientId'])
@Index(['recordedDate'])
export class HealthJournal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => PatientAccount)
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  // 기록 일시
  @Column({ type: 'date' })
  recordedDate: Date;

  @Column({ type: 'time', nullable: true })
  recordedTime: string;

  // 건강 상태 (1-10)
  @Column({ nullable: true })
  overallCondition: number;

  @Column({ nullable: true })
  painLevel: number;

  @Column({ nullable: true })
  energyLevel: number;

  @Column({ nullable: true })
  sleepQuality: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  sleepHours: number;

  // 증상 기록
  @Column('jsonb', { nullable: true })
  symptoms: Array<{
    name: string;
    severity: number;
    location?: string;
    duration?: string;
    notes?: string;
  }>;

  // 복용 기록
  @Column({ nullable: true })
  medicationTaken: boolean;

  @Column('text', { nullable: true })
  medicationNotes: string;

  // 식사 기록
  @Column('jsonb', { nullable: true })
  meals: Array<{
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    time?: string;
    description: string;
    appetite?: number; // 1-5
  }>;

  // 운동 기록
  @Column({ nullable: true })
  exerciseDone: boolean;

  @Column('text', { nullable: true })
  exerciseNotes: string;

  @Column({ nullable: true })
  exerciseDuration: number; // 분

  // 스트레스/감정
  @Column({ nullable: true })
  stressLevel: number;

  @Column({ nullable: true })
  mood: string;

  // 추가 메모
  @Column('text', { nullable: true })
  notes: string;

  @Column('jsonb', { default: [] })
  photos: string[];

  // 날씨 (참고용)
  @Column({ nullable: true })
  weather: string;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature: number;

  @CreateDateColumn()
  createdAt: Date;
}
