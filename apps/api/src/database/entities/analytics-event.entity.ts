import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('analytics_events')
@Index(['type'])
@Index(['userId'])
@Index(['sessionId'])
@Index(['createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column('jsonb', { default: {} })
  properties: Record<string, unknown>;

  @Column('uuid', { nullable: true })
  userId: string | null;

  @Column({ nullable: true })
  userTier: string | null;

  @Column()
  sessionId: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ nullable: true })
  screenSize: string | null;

  @Column({ nullable: true })
  locale: string | null;

  // 클라이언트가 보낸 발생 시각
  @Column({ type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
