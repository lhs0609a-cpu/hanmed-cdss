import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Formula } from './formula.entity';
import { Herb } from './herb.entity';

export enum HerbRole {
  KING = '군', // 君藥
  MINISTER = '신', // 臣藥
  ASSISTANT = '좌', // 佐藥
  COURIER = '사', // 使藥
}

@Entity('formula_herbs')
export class FormulaHerb {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Formula, (f) => f.formulaHerbs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'formula_id' })
  formula: Formula;

  @Column('uuid')
  formulaId: string;

  @ManyToOne(() => Herb, { eager: true })
  @JoinColumn({ name: 'herb_id' })
  herb: Herb;

  @Column('uuid')
  herbId: string;

  @Column()
  amount: string; // 용량 (6g, 3돈 등)

  @Column({
    type: 'enum',
    enum: HerbRole,
    nullable: true,
  })
  role: HerbRole; // 군신좌사 역할

  @Column({ nullable: true })
  processingMethod: string; // 포제법 (주초, 구증구포 등)

  @Column({ nullable: true })
  notes: string; // 비고
}
