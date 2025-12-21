import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Herb } from './herb.entity';

export enum InteractionType {
  INCREASE = 'increase', // 효과 증강
  DECREASE = 'decrease', // 효과 감소
  DANGEROUS = 'dangerous', // 위험한 상호작용
}

export enum Severity {
  CRITICAL = 'critical', // 병용 금기
  WARNING = 'warning', // 주의 요망
  INFO = 'info', // 참고 정보
}

export enum EvidenceLevel {
  A = 'A', // 높은 근거 수준
  B = 'B', // 중간 근거 수준
  C = 'C', // 낮은 근거 수준
  D = 'D', // 매우 낮은 근거 수준
}

@Entity('drug_herb_interactions')
export class DrugHerbInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  drugName: string; // 양약 성분명/제품명

  @Column({ nullable: true })
  drugAtcCode: string; // ATC 분류 코드

  @ManyToOne(() => Herb)
  @JoinColumn({ name: 'herb_id' })
  herb: Herb;

  @Column('uuid')
  herbId: string;

  @Column({
    type: 'enum',
    enum: InteractionType,
  })
  interactionType: InteractionType;

  @Column({
    type: 'enum',
    enum: Severity,
  })
  severity: Severity;

  @Column('text', { nullable: true })
  mechanism: string; // 상호작용 기전 설명

  @Column({
    type: 'enum',
    enum: EvidenceLevel,
    nullable: true,
  })
  evidenceLevel: EvidenceLevel;

  @Column('text', { array: true, nullable: true })
  referencePmid: string[]; // 참고 논문 PMID

  @Column('text', { nullable: true })
  recommendation: string; // 권고사항

  @CreateDateColumn()
  createdAt: Date;
}
