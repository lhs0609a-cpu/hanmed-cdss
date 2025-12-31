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
import { Clinic } from './clinic.entity';
import { User } from './user.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export enum VisitType {
  INITIAL = 'initial',
  FOLLOW_UP = 'follow_up',
  CONSULTATION = 'consultation',
}

@Entity('reservations')
@Index(['clinicId', 'reservationDate'])
@Index(['patientId'])
@Index(['status'])
export class Reservation {
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

  @Column({ nullable: true })
  practitionerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'practitionerId' })
  practitioner: User;

  // 예약 정보
  @Column({ type: 'date' })
  reservationDate: Date;

  @Column({ type: 'time' })
  reservationTime: string;

  @Column({ default: 30 })
  durationMinutes: number;

  // 예약 유형
  @Column({
    type: 'enum',
    enum: VisitType,
    nullable: true,
  })
  visitType: VisitType;

  @Column('text', { nullable: true })
  visitReason: string;

  @Column('text', { nullable: true })
  symptomsNote: string;

  // 상태
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ nullable: true })
  confirmedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column('text', { nullable: true })
  cancellationReason: string;

  // 알림
  @Column({ default: false })
  reminderSent: boolean;

  @Column({ nullable: true })
  reminderSentAt: Date;

  // 메모
  @Column('text', { nullable: true })
  clinicNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
