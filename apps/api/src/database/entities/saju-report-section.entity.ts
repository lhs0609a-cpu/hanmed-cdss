import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SajuReport } from './saju-report.entity';

export enum SajuSectionType {
  OVERVIEW = 'overview',
  PERSONALITY = 'personality',
  HEALTH_CONSTITUTION = 'health_constitution',
  CAREER_WEALTH = 'career_wealth',
  RELATIONSHIPS = 'relationships',
  YEARLY_FORTUNE = 'yearly_fortune',
  MONTHLY_FORTUNE = 'monthly_fortune',
  LIFE_ADVICE = 'life_advice',
}

@Entity('saju_report_sections')
@Index(['reportId', 'sectionOrder'])
export class SajuReportSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reportId: string;

  @ManyToOne(() => SajuReport, (report) => report.sections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reportId' })
  report: SajuReport;

  @Column({ type: 'enum', enum: SajuSectionType })
  sectionType: SajuSectionType;

  @Column({ type: 'int' })
  sectionOrder: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  // DALL-E 이미지 (프리미엄 전용)
  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  imagePrompt: string | null;

  // 메타 정보
  @Column({ type: 'int', default: 0 })
  tokenCount: number;

  @Column({ type: 'text', nullable: true })
  modelUsed: string | null;

  @Column({ default: false })
  isCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
