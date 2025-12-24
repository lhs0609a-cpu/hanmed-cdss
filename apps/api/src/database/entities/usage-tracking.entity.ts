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

export enum UsageType {
  AI_QUERY = 'ai_query',
  CASE_SEARCH = 'case_search',
  INTERACTION_CHECK = 'interaction_check',
}

@Entity('usage_tracking')
@Index(['userId', 'usageType', 'periodStart'])
export class UsageTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: UsageType,
  })
  usageType: UsageType;

  @Column({ default: 0 })
  count: number;

  @Column({ type: 'timestamp' })
  periodStart: Date; // 월 시작일

  @Column({ type: 'timestamp' })
  periodEnd: Date; // 월 종료일

  @CreateDateColumn()
  createdAt: Date;
}
