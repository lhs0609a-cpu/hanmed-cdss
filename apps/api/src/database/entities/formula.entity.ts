import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FormulaHerb } from './formula-herb.entity';
import { BodyHeat, BodyStrength } from './clinical-case.entity';

// 처방의 한열 성질
export enum FormulaHeatNature {
  COLD = 'cold',         // 한량성 (寒凉性) - 열을 내리는 처방
  COOL = 'cool',         // 량성 (凉性)
  NEUTRAL = 'neutral',   // 평성 (平性)
  WARM = 'warm',         // 온성 (溫性)
  HOT = 'hot',           // 열성 (熱性) - 몸을 덥히는 처방
}

// 처방의 보사 성질
export enum FormulaStrengthNature {
  TONIFYING = 'tonifying',   // 보(補) - 허약을 보충
  NEUTRAL = 'neutral',       // 평(平)
  DRAINING = 'draining',     // 사(瀉) - 사기를 배출
}

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

  // === 체열/근실도 기반 처방 성질 (이종대 선생님 기준) ===

  // 처방의 한열 성질
  @Column({
    type: 'enum',
    enum: FormulaHeatNature,
    nullable: true,
  })
  heatNature: FormulaHeatNature;

  // 처방의 보사 성질
  @Column({
    type: 'enum',
    enum: FormulaStrengthNature,
    nullable: true,
  })
  strengthNature: FormulaStrengthNature;

  // 적합한 체열 (이 처방이 효과적인 환자 체열)
  @Column({
    type: 'enum',
    enum: BodyHeat,
    array: true,
    nullable: true,
  })
  suitableBodyHeat: BodyHeat[];

  // 적합한 근실도 (이 처방이 효과적인 환자 근실도)
  @Column({
    type: 'enum',
    enum: BodyStrength,
    array: true,
    nullable: true,
  })
  suitableBodyStrength: BodyStrength[];

  // 금기 체열 (이 처방을 피해야 하는 환자 체열)
  @Column({
    type: 'enum',
    enum: BodyHeat,
    array: true,
    nullable: true,
  })
  contraindicatedBodyHeat: BodyHeat[];

  // 금기 근실도 (이 처방을 피해야 하는 환자 근실도)
  @Column({
    type: 'enum',
    enum: BodyStrength,
    array: true,
    nullable: true,
  })
  contraindicatedBodyStrength: BodyStrength[];

  @OneToMany(() => FormulaHerb, (fh) => fh.formula, { cascade: true })
  formulaHerbs: FormulaHerb[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
