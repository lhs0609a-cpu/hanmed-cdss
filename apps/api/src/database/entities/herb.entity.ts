import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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
  efficacy: string; // 효능 설명

  @Column('text', { nullable: true })
  contraindications: string; // 금기사항

  @Column('text', { array: true, nullable: true })
  pubmedReferences: string[]; // 관련 논문 PMID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
