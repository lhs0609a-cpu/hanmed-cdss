import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PatientAccount } from './patient-account.entity';
import { PatientPrescription } from './patient-prescription.entity';

@Entity('medication_reminders')
export class MedicationReminder {
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

  @Column({ length: 100 })
  title: string;

  @Column({ type: 'time' })
  reminderTime: string;

  // 요일 (0=일, 1=월, ... 6=토)
  @Column('int', { array: true, default: [0, 1, 2, 3, 4, 5, 6] })
  reminderDays: number[];

  @Column({ default: true })
  isActive: boolean;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
