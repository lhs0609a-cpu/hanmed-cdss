import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { PatientAccount } from './patient-account.entity';
import { Clinic } from './clinic.entity';

export enum ConnectionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('patient_clinic_connections')
@Unique(['patientId', 'clinicId'])
export class PatientClinicConnection {
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

  @Column({
    type: 'enum',
    enum: ConnectionStatus,
    default: ConnectionStatus.ACTIVE,
  })
  status: ConnectionStatus;

  @Column({ default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  connectedAt: Date;

  @Column({ nullable: true })
  lastVisitAt: Date;

  @Column({ default: 0 })
  totalVisits: number;

  @Column({ nullable: true, length: 50 })
  clinicPatientNumber: string;
}
