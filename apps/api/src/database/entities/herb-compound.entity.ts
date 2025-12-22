import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Herb } from './herb.entity';

@Entity('herb_compounds')
export class HerbCompound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Herb, (h) => h.compounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'herb_id' })
  herb: Herb;

  @Column('uuid')
  herbId: string;

  @Column()
  compoundName: string; // 성분명 (Ginsenoside Rb1)

  @Column({ nullable: true })
  compoundNameKo: string; // 한글명 (진세노사이드 Rb1)

  @Column({ nullable: true })
  casNumber: string; // CAS 등록번호

  @Column({ nullable: true })
  category: string; // 분류 (사포닌, 플라보노이드 등)

  @Column('text', { nullable: true })
  pharmacology: string; // 약리작용

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  contentPercent: number; // 함량 (%)

  @Column('text', { array: true, nullable: true })
  pubmedIds: string[]; // 관련 논문 PMID
}
