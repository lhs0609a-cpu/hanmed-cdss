import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export interface CaseHerb {
  name: string;
  amount?: string;
}

/**
 * 한의사 본인이 정리해 둔 치험례.
 *
 * 이 제품은 치험례를 근거로 처방을 설명한다. 그런데 정작 한의사 자신의 치험례는
 * 브라우저 localStorage('ongojishin_my_cases')에만 있었다 — 캐시를 지우면 사라지고,
 * 집 PC 에서는 안 보이고, 백업도 없었다. 몇 년치 임상 기록이 그런 자리에 있으면 안 된다.
 *
 * 환자 식별정보는 담지 않는다. 나이·성별·체질까지만 두고 이름·연락처는 받지 않는다
 * (그건 practitioner_patients 쪽에서 암호화해 관리한다). 치험례는 나중에 커뮤니티로
 * 공유될 수 있는 성격의 기록이라, 애초에 식별정보가 섞이지 않게 스키마로 막는다.
 */
@Entity('practitioner_cases')
@Index(['practitionerId', 'createdAt'])
export class PractitionerCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  practitionerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'practitionerId' })
  practitioner: User;

  /** 이 치험례가 어느 진료에서 나왔는지 — 진료 기록에서 승격시킨 경우. */
  @Column({ type: 'uuid', nullable: true })
  sourceVisitId: string | null;

  // ── 환자 (비식별) ────────────────────────────────────────────
  @Column({ type: 'smallint', nullable: true })
  patientAge: number | null;

  @Column({ type: 'varchar', length: 1, nullable: true })
  patientGender: 'M' | 'F' | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  patientConstitution: string | null;

  // ── 증상·변증 ────────────────────────────────────────────────
  @Column({ type: 'text' })
  chiefComplaint: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  symptoms: string[];

  @Column({ type: 'text', nullable: true })
  diagnosis: string | null;

  /** 변증 */
  @Column({ type: 'varchar', length: 128, nullable: true })
  byeonjeung: string | null;

  // ── 처방 ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 128 })
  formulaName: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  herbs: CaseHerb[];

  /** 가감 내용 — 원방 그대로 쓰는 경우가 드물어서 별도로 남긴다. */
  @Column({ type: 'text', nullable: true })
  modifications: string | null;

  // ── 결과 ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 32, nullable: true })
  treatmentDuration: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  outcome: '완치' | '호전' | '무효' | '악화' | '진행중' | null;

  @Column({ type: 'text', nullable: true })
  outcomeDetails: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tags: string[];

  /** 즐겨찾기 — 자주 꺼내 보는 케이스를 위로 올린다. */
  @Column({ type: 'boolean', default: false })
  isStarred: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
