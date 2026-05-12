import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { HerbCompound } from './herb-compound.entity';
import { FormulaHerb } from './formula-herb.entity';

@Entity('herbs_master')
export class Herb {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  standardName: string; // 표준 약재명

  @Column({ nullable: true })
  hanjaName: string; // 한자명

  @Column('text', { array: true, nullable: true })
  aliases: string[]; // 이명 배열

  @Column()
  category: string; // 분류 (해표약/청열약 등)

  @Column('jsonb', { nullable: true })
  activeCompounds: Array<{
    name: string;
    content?: string;
  }>; // 유효 성분

  @Column('jsonb', { nullable: true })
  properties: {
    nature?: string; // 성질 (한/열/온/량)
    flavor?: string; // 맛 (산/고/감/신/함)
  };

  @Column('text', { array: true, nullable: true })
  meridianTropism: string[]; // 귀경

  @Column('text', { nullable: true })
  efficacy: string; // 효능 설명 (자유 텍스트)

  // 표준 한의학 용어 태그 — 향후 한의학 용어 사전(KMTDS 등) 매핑용.
  // 예: ['청열', '해독', '보기', '활혈', '거습', '안신']
  @Column('text', { array: true, nullable: true })
  efficacyTags: string[];

  @Column('text', { nullable: true })
  contraindications: string; // 금기사항

  @Column('text', { array: true, nullable: true })
  pubmedReferences: string[]; // 관련 논문 PMID

  @OneToMany(() => HerbCompound, (hc) => hc.herb)
  compounds: HerbCompound[];

  @OneToMany(() => FormulaHerb, (fh) => fh.herb)
  formulaHerbs: FormulaHerb[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // === 표시용 헬퍼 (DB 컬럼 아님) ============================================
  // null/빈 값일 때 UI 가 "정보 없음" 으로 일관 표시하도록 도와준다.
  // 컨트롤러/서비스에서 응답 직렬화 시 호출.

  get displayEfficacy(): string {
    return this.efficacy && this.efficacy.trim() ? this.efficacy : '정보 없음';
  }

  get displayMeridianTropism(): string {
    return this.meridianTropism && this.meridianTropism.length > 0
      ? this.meridianTropism.join(', ')
      : '정보 없음';
  }

  get displayEfficacyTags(): string[] {
    return this.efficacyTags && this.efficacyTags.length > 0 ? this.efficacyTags : [];
  }
}
