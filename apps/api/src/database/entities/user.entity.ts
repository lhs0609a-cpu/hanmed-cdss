import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserRole, UserStatus } from './enums';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  CLINIC = 'clinic',
}

// 플랜별 AI 쿼리 제한
export const PLAN_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 10,
  [SubscriptionTier.BASIC]: 50,
  [SubscriptionTier.PROFESSIONAL]: 300,
  [SubscriptionTier.CLINIC]: Infinity,
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  licenseNumber: string | null;

  @Column({ nullable: true })
  clinicName: string | null;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  subscriptionTier: SubscriptionTier;

  @Column({ nullable: true })
  subscriptionExpiresAt: Date | null;

  @Column({ default: 0 })
  contributionPoints: number;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  stripeCustomerId: string | null;

  // 관리자 시스템 관련 필드
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  suspendedAt: Date | null;

  @Column('text', { nullable: true })
  suspendedReason: string | null;

  @Column({ nullable: true })
  suspendedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'suspendedById' })
  suspendedBy: User | null;

  // Community 관련 필드
  @Column({ default: false })
  isLicenseVerified: boolean; // 면허 인증 완료 여부

  @Column({ nullable: true })
  licenseVerifiedAt: Date | null;

  @Column({ nullable: true })
  specialization: string | null; // 전문 분야 (본초학, 상한론 등)

  @Column('text', { nullable: true })
  bio: string | null; // 자기소개

  @Column({ default: 0 })
  postCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  acceptedAnswerCount: number; // 채택된 답변 수

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
