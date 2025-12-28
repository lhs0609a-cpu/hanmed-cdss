import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Subscription } from './subscription.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

@Entity('payments')
@Index(['userId', 'createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  subscriptionId: string;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  // 주문 정보
  @Column({ unique: true })
  orderId: string;

  @Column()
  orderName: string;

  // 결제 금액
  @Column()
  amount: number; // 총 결제 금액

  @Column()
  baseAmount: number; // 기본 구독료

  @Column({ default: 0 })
  overageAmount: number; // 초과 요금

  @Column({ default: 0 })
  overageCount: number; // 초과 사용 건수

  // 환불 정보
  @Column({ default: 0 })
  refundedAmount: number;

  @Column({ nullable: true })
  refundReason: string;

  @Column({ nullable: true })
  refundedAt: Date;

  // 토스페이먼츠 정보
  @Column({ nullable: true })
  paymentKey: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  failedAt: Date;

  @Column({ nullable: true })
  failureReason: string;

  // 카드 정보 (마스킹됨)
  @Column({ nullable: true })
  cardCompany: string;

  @Column({ nullable: true })
  cardNumber: string; // 마스킹된 번호 (****1234)

  // 영수증
  @Column({ nullable: true })
  receiptUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
