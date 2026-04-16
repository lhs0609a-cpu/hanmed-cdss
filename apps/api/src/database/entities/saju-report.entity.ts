import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { SajuReportSection } from './saju-report-section.entity';
import { SajuPurchase } from './saju-purchase.entity';

export enum SajuReportTier {
  MINI = 'mini',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum SajuReportStatus {
  PENDING_PAYMENT = 'pending_payment',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('saju_reports')
@Index(['userId', 'createdAt'])
@Index(['status'])
@Index(['accessToken'], { unique: true })
export class SajuReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ nullable: true })
  purchaseId: string | null;

  @OneToOne(() => SajuPurchase, (purchase) => purchase.report, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'purchaseId' })
  purchase: SajuPurchase | null;

  // 입력 정보
  @Column()
  name: string;

  @Column()
  birthDate: string;

  @Column({ type: 'int', nullable: true })
  birthHour: number | null;

  @Column({ nullable: true })
  gender: string | null;

  // 사주 계산 결과
  @Column({ type: 'jsonb' })
  sajuData: {
    year: { stem: number; branch: number };
    month: { stem: number; branch: number };
    day: { stem: number; branch: number };
    hour: { stem: number; branch: number } | null;
    zodiac: string;
    zodiacEmoji: string;
  };

  @Column({ type: 'jsonb' })
  elementBalance: Record<string, number>;

  @Column()
  constitution: string;

  @Column()
  dominantElement: string;

  @Column()
  weakElement: string;

  // 리포트 설정
  @Column({ type: 'enum', enum: SajuReportTier })
  tier: SajuReportTier;

  @Column({
    type: 'enum',
    enum: SajuReportStatus,
    default: SajuReportStatus.PENDING_PAYMENT,
  })
  status: SajuReportStatus;

  @Column({ type: 'int', default: 0 })
  completedSections: number;

  @Column({ type: 'int' })
  totalSections: number;

  // 공유용 토큰
  @Column({ type: 'uuid', unique: true })
  accessToken: string;

  // PDF
  @Column({ type: 'text', nullable: true })
  pdfUrl: string | null;

  // 생성 타임스탬프
  @Column({ type: 'timestamptz', nullable: true })
  generationStartedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  generationCompletedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => SajuReportSection, (section) => section.report, {
    cascade: true,
  })
  sections: SajuReportSection[];
}
