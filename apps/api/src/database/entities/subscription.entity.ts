import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User, SubscriptionTier } from './user.entity';

export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing',
}

/**
 * 무료 체험 설정
 */
export const TRIAL_CONFIG = {
  /** 체험 기간 (일) */
  TRIAL_DAYS: 7,
  /** 체험 시 제공되는 플랜 */
  TRIAL_TIER: SubscriptionTier.PROFESSIONAL,
  /** 체험 후 자동 전환 플랜 (null이면 FREE로 전환) */
  POST_TRIAL_TIER: null as SubscriptionTier | null,
};

@Entity('subscriptions')
@Index(['status', 'trialEndsAt']) // 체험 만료 처리용 인덱스
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  stripeSubscriptionId: string;

  @Column({ nullable: true })
  stripePriceId: string | null;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.INCOMPLETE,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: BillingInterval,
    default: BillingInterval.MONTHLY,
  })
  billingInterval: BillingInterval;

  @Column({ type: 'timestamp' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp' })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelAt: Date | null; // 예약된 취소 일시

  @Column({ type: 'int', default: 0 })
  paymentRetryCount: number; // 결제 재시도 횟수

  @Column({ type: 'text', nullable: true })
  lastPaymentError: string | null; // 마지막 결제 오류 메시지

  // ========== 무료 체험 관련 필드 ==========

  /** 무료 체험 여부 */
  @Column({ type: 'boolean', default: false })
  isTrial: boolean;

  /** 체험 시작일 */
  @Column({ type: 'timestamp', nullable: true })
  trialStartedAt: Date | null;

  /** 체험 종료일 */
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  trialEndsAt: Date | null;

  /** 체험이 정식 구독으로 전환되었는지 */
  @Column({ type: 'boolean', default: false })
  trialConverted: boolean;

  /** 체험 전환 알림 발송 여부 */
  @Column({ type: 'boolean', default: false })
  trialEndingNotified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
