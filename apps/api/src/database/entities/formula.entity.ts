import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FormulaHerb } from './formula-herb.entity';

@Entity('formulas')
export class Formula {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 처방명 (소청룡탕)

  @Column({ nullable: true })
  hanja: string; // 한자명 (小靑龍湯)

  @Column('text', { array: true, nullable: true })
  aliases: string[]; // 이명

  @Column()
  category: string; // 분류 (해표제, 청열제, 보익제 등)

  @Column('text', { nullable: true })
  source: string; // 출전 (상한론, 동의보감 등)

  @Column('text', { nullable: true })
  indication: string; // 주치 (적용증)

  @Column('text', { nullable: true })
  pathogenesis: string; // 병기 설명

  @Column('jsonb', { nullable: true })
  contraindications: string[]; // 금기증

  @Column('jsonb', { nullable: true })
  modifications: Array<{
    condition: string; // 조건 (열이 있으면)
    action: string; // 조치 (석고 가미)
  }>;

  @OneToMany(() => FormulaHerb, (fh) => fh.formula, { cascade: true })
  formulaHerbs: FormulaHerb[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
