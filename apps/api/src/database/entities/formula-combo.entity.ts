import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('formula_combos')
export class FormulaCombo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 합방명 (시박탕)

  @Column({ nullable: true })
  hanja: string; // 한자명 (柴朴湯)

  @Column('uuid', { array: true })
  sourceFormulaIds: string[]; // 원 처방 ID들

  @Column('text', { array: true, nullable: true })
  sourceFormulaNames: string[]; // 원 처방명들 (검색용)

  @Column('text', { nullable: true })
  indication: string; // 합방 적응증

  @Column('text', { nullable: true })
  rationale: string; // 합방 이유

  @Column({ default: true })
  isClassical: boolean; // 전통 합방 여부

  @CreateDateColumn()
  createdAt: Date;
}
