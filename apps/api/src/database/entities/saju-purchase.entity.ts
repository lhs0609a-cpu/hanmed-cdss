import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { SajuReport } from './saju-report.entity';

export enum SajuPurchaseStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('saju_purchases')
@Index(['orderId'], { unique: true })
@Index(['userId', 'createdAt'])
export class SajuPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @OneToOne(() => SajuReport, (report) => report.purchase, { nullable: true })
  report: SajuReport | null;

  // 주문 정보
  @Column({ unique: true })
  orderId: string;

  @Column()
  orderName: string;

  @Column({ type: 'int' })
  amount: number;

  // 토스페이먼츠 정보
  @Column({ type: 'text', nullable: true })
  paymentKey: string | null;

  @Column({
    type: 'enum',
    enum: SajuPurchaseStatus,
    default: SajuPurchaseStatus.PENDING,
  })
  status: SajuPurchaseStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  customerEmail: string | null;

  @Column({ type: 'text', nullable: true })
  customerName: string | null;

  // 카드 정보 (마스킹됨)
  @Column({ type: 'text', nullable: true })
  cardCompany: string | null;

  @Column({ type: 'text', nullable: true })
  cardNumber: string | null;

  @Column({ type: 'text', nullable: true })
  receiptUrl: string | null;

  // 실패 정보
  @Column({ type: 'text', nullable: true })
  failureCode: string | null;

  @Column({ type: 'text', nullable: true })
  failureMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
