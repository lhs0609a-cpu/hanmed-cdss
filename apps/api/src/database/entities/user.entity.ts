import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SubscriptionTier {
  STARTER = 'starter',
  PRO = 'pro',
  MASTER = 'master',
}

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
  licenseNumber: string;

  @Column({ nullable: true })
  clinicName: string;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.STARTER,
  })
  subscriptionTier: SubscriptionTier;

  @Column({ nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ default: 0 })
  contributionPoints: number;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  stripeCustomerId: string;

  // Community 관련 필드
  @Column({ default: false })
  isLicenseVerified: boolean; // 면허 인증 완료 여부

  @Column({ nullable: true })
  licenseVerifiedAt: Date;

  @Column({ nullable: true })
  specialization: string; // 전문 분야 (본초학, 상한론 등)

  @Column('text', { nullable: true })
  bio: string; // 자기소개

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
