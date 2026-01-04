import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ConstitutionType } from './clinical-case.entity';

export enum PatientGender {
  MALE = 'male',
  FEMALE = 'female',
}

@Entity('patient_accounts')
export class PatientAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: PatientGender,
    nullable: true,
  })
  gender: PatientGender;

  @Column({ nullable: true })
  profileImageUrl: string;

  // 푸시 알림
  @Column({ nullable: true })
  fcmToken: string;

  @Column({ default: true })
  pushEnabled: boolean;

  // 다중 디바이스 푸시 토큰
  @Column('jsonb', { nullable: true })
  pushTokens: Array<{
    token: string;
    deviceType?: 'ios' | 'android' | 'web';
    deviceName?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;

  // 알림 설정
  @Column('jsonb', { nullable: true })
  notificationSettings: {
    reservationEnabled?: boolean;
    medicationEnabled?: boolean;
    recordEnabled?: boolean;
    healthTipEnabled?: boolean;
    promotionEnabled?: boolean;
    systemEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };

  // 건강 프로필
  @Column({
    type: 'enum',
    enum: ConstitutionType,
    nullable: true,
  })
  constitution: ConstitutionType;

  @Column('jsonb', { default: [] })
  allergies: string[];

  @Column('jsonb', { default: [] })
  chronicConditions: string[];

  @Column('jsonb', { default: [] })
  currentMedications: string[];

  // 상태
  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
