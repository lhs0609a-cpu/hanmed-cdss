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

export enum ReservationVisitType {
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
  practitionerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'practitionerId' })
  practitioner: User | null;

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
    enum: ReservationVisitType,
    nullable: true,
  })
  visitType: ReservationVisitType | null;

  @Column('text', { nullable: true })
  visitReason: string | null;

  @Column('text', { nullable: true })
  symptomsNote: string | null;

  // 상태
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ nullable: true })
  confirmedAt: Date | null;

  @Column({ nullable: true })
  cancelledAt: Date | null;

  @Column('text', { nullable: true })
  cancellationReason: string | null;

  // 알림
  @Column({ default: false })
  reminderSent: boolean;

  @Column({ nullable: true })
  reminderSentAt: Date | null;

  // 메모
  @Column('text', { nullable: true })
  clinicNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
