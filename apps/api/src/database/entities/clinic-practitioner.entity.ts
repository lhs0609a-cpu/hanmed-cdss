import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Clinic } from './clinic.entity';
import { User } from './user.entity';

export enum PractitionerRole {
  OWNER = 'owner',               // 원장 — ALL
  PRACTITIONER = 'practitioner', // 한의사 — 진료/처방/AI 추천
  RECEPTIONIST = 'receptionist', // 접수/데스크 — 환자 등록·예약, 진료 기록 읽기 전용
  BILLING = 'billing',           // 청구 담당 — 청구 작성·제출만
  NURSE = 'nurse',               // 간호조무사 — 환자 등록·생체신호 입력 (처방 X)
  VIEWER = 'viewer',             // 읽기 전용
}

@Entity('clinic_practitioners')
@Unique(['clinicId', 'userId'])
export class ClinicPractitioner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: PractitionerRole,
    default: PractitionerRole.PRACTITIONER,
  })
  role: PractitionerRole;

  @Column({ nullable: true, length: 100 })
  displayName: string;

  @Column('text', { array: true, default: [] })
  specialties: string[];

  @Column('text', { nullable: true })
  bio: string;

  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({ default: true })
  isAcceptingPatients: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
