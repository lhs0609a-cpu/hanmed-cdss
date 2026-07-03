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
import { User } from './user.entity';
import { BillingInterval } from './subscription.entity';

/**
 * 구독에 얹는 add-on 종류.
 *
 * 첫 출시 add-on = 보험청구·삭감방지.
 * 추후: 환자획득(평판관리), 학회 보수교육 학점 등을 별도 add-on으로 확장.
 */
export enum AddonKey {
  INSURANCE_CLAIM = 'insurance_claim',
}

export enum AddonStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
}

/**
 * 사용자 add-on 구독.
 *
 * 메인 구독(Subscription)과 독립적으로 추가/해지 가능. 결제는 동일 빌링키 사용.
 */
@Entity('subscription_addons')
@Index(['userId', 'addonKey'], { unique: true, where: '"status" != \'canceled\'' })
export class SubscriptionAddon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: AddonKey })
  addonKey: AddonKey;

  @Column({
    type: 'enum',
    enum: AddonStatus,
    default: AddonStatus.ACTIVE,
  })
  status: AddonStatus;

  @Column({
    type: 'enum',
    enum: BillingInterval,
    default: BillingInterval.MONTHLY,
  })
  billingInterval: BillingInterval;

  /** 월 또는 연 단가(원). 정책 변경에도 가입자 단가를 보존하기 위해 가입 시점 가격 동결. */
  @Column({ type: 'int' })
  unitPrice: number;

  @Column({ type: 'timestamp' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp' })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
