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
  subscriptionId: string | null;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription | null;

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
  refundReason: string | null;

  @Column({ nullable: true })
  refundedAt: Date | null;

  // 토스페이먼츠 정보
  @Column({ nullable: true })
  paymentKey: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  paidAt: Date | null;

  @Column({ nullable: true })
  failedAt: Date | null;

  @Column({ nullable: true })
  failureCode: string | null; // 토스 에러 코드

  @Column({ nullable: true })
  failureMessage: string | null; // 사용자 친화적 에러 메시지

  @Column({ nullable: true })
  failureReason: string | null; // 상세 에러 설명

  // 카드 정보 (마스킹됨)
  @Column({ nullable: true })
  cardCompany: string | null;

  @Column({ nullable: true })
  cardNumber: string | null; // 마스킹된 번호 (****1234)

  // 영수증
  @Column({ nullable: true })
  receiptUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
