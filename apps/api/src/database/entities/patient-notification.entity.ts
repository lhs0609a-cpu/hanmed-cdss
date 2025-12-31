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

export enum NotificationType {
  RESERVATION = 'reservation',
  MEDICATION = 'medication',
  RECORD = 'record',
  PRESCRIPTION = 'prescription',
  HEALTH_TIP = 'health_tip',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
}

@Entity('patient_notifications')
@Index(['patientId', 'createdAt'])
@Index(['isRead'])
export class PatientNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => PatientAccount)
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  body: string;

  // 추가 데이터 (링크용 ID 등)
  @Column('jsonb', { nullable: true })
  data: {
    recordId?: string;
    prescriptionId?: string;
    reservationId?: string;
    clinicId?: string;
    actionUrl?: string;
  };

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date;

  // 푸시 발송 여부
  @Column({ default: false })
  pushSent: boolean;

  @Column({ nullable: true })
  pushSentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
