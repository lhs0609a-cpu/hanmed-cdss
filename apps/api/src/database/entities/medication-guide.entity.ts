import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { MedicationGuideReport } from './medication-guide-report.entity';

export interface GuideHerb {
  name: string;
  amount?: string | null;
  /** 이 약재가 무슨 일을 하는지 — 환자가 읽을 한 줄 */
  effect?: string | null;
}

export interface GuideInteraction {
  drug: string;
  herb: string;
  severity: string;
  advice?: string | null;
}

export interface GuideEvidence {
  caseCount: number;
  /** 채점 가능한 사례가 적으면 성공률을 내지 않는다(null) */
  successRate: number | null;
  source?: string | null;
}

export interface GuideCostItem {
  name: string;
  amount: number;
}

/**
 * 환자에게 주는 복약 안내서.
 *
 * 한방의료 기피 이유 조사에서 상위에 걸린 것들이 "내가 뭘 먹는지 모른다",
 * "안전한지 모른다", "왜 이 약인지 모른다", "얼마인지 모른다" 였다.
 * 소비자원 처리 건에서 진료기록부에 한약 처방이 적혀 있던 경우는 10%,
 * 자료 제출을 요구하자 70%가 영업비밀이라며 공개를 거절했다.
 *
 * 그래서 처방 내용을 환자가 열어 볼 수 있게 만든다. 다만 링크를 아는 사람은
 * 누구나 열 수 있으므로 **환자 식별정보는 담지 않는다** — 처방·약재·복용법·
 * 주의사항·비용까지만이고, 이름·연락처·생년월일은 스냅샷에도 넣지 않는다.
 */
@Entity('medication_guides')
@Index(['practitionerId', 'createdAt'])
export class MedicationGuide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 공개 링크에 쓰는 임의 토큰. 추측 가능한 값이면 안 된다. */
  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column()
  practitionerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'practitionerId' })
  practitioner: User;

  /** 어느 진료에서 나온 안내서인지. 진료 하나당 하나만 둔다. */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  visitId: string | null;

  /** 자가 기록을 환자 타임라인에 붙이기 위한 참조. 공개 응답에는 넣지 않는다. */
  @Column({ type: 'uuid', nullable: true })
  patientId: string | null;

  /** 발행 시점의 한의원 이름 — 나중에 바뀌어도 안내서는 그대로 남아야 한다. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  clinicName: string | null;

  @Column({ type: 'varchar', length: 128 })
  formulaName: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  herbs: GuideHerb[];

  /** 왜 이 처방인지 — 치험례 근거 스냅샷 */
  @Column({ type: 'jsonb', nullable: true })
  evidence: GuideEvidence | null;

  /** 복용 중인 양약과의 상호작용 스냅샷 */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  interactions: GuideInteraction[];

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @Column({ type: 'text', nullable: true })
  cautions: string | null;

  // ── 수령·비용 ────────────────────────────────────────────────
  // 선납 후 일부만 받은 상태에서 환불 분쟁이 가장 많다. 소비자원 사례에서
  // 제대로 환불된 건 1건뿐이었다. 총 몇 일분 중 몇 일분을 받았는지가
  // 양쪽에 같은 화면으로 보이면 다툴 거리가 줄어든다.

  @Column({ type: 'smallint', nullable: true })
  totalDays: number | null;

  @Column({ type: 'smallint', nullable: true })
  dispensedDays: number | null;

  /** 비급여 항목별 금액 — 사전 설명 의무(의료법 제45조의2)의 내용이기도 하다. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  costItems: GuideCostItem[];

  @Column({ type: 'integer', nullable: true })
  totalCost: number | null;

  /** 안내서를 닫은 시점. 닫히면 공개 링크는 더 이상 열리지 않는다. */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @OneToMany(() => MedicationGuideReport, (r) => r.guide)
  reports: MedicationGuideReport[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
