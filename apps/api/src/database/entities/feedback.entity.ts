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

export type FeedbackType = 'error_report' | 'feature_feedback' | 'nps' | 'general';

@Entity('feedbacks')
@Index(['type', 'createdAt'])
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'general',
  })
  type: FeedbackType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  reviewed: boolean;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
