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
import { PatientPrescription } from './patient-prescription.entity';
import { MedicationReminder } from './medication-reminder.entity';

export enum MedicationLogStatus {
  TAKEN = 'taken',
  SKIPPED = 'skipped',
  DELAYED = 'delayed',
}

@Entity('medication_logs')
@Index(['patientId', 'takenAt'])
export class MedicationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => PatientAccount)
  @JoinColumn({ name: 'patientId' })
  patient: PatientAccount;

  @Column({ nullable: true })
  prescriptionId: string;

  @ManyToOne(() => PatientPrescription, { nullable: true })
  @JoinColumn({ name: 'prescriptionId' })
  prescription: PatientPrescription;

  @Column({ nullable: true })
  reminderId: string;

  @ManyToOne(() => MedicationReminder, { nullable: true })
  @JoinColumn({ name: 'reminderId' })
  reminder: MedicationReminder;

  @Column({ type: 'timestamp' })
  takenAt: Date;

  @Column({
    type: 'enum',
    enum: MedicationLogStatus,
    default: MedicationLogStatus.TAKEN,
  })
  status: MedicationLogStatus;

  @Column('text', { nullable: true })
  notes: string;

  // 증상/부작용 기록
  @Column('jsonb', { nullable: true })
  sideEffects: Array<{
    symptom: string;
    severity: number;
    notes?: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;
}
