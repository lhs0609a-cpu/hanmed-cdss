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
import { MedicationGuideDose } from './medication-guide-dose.entity';

export interface GuideHerb {
  name: string;
  amount?: string | null;
  /** 이 약재가 무슨 일을 하는지 — 환자가 읽을 한 줄 */
  effect?: string | null;
}

/**
 * 약재 목록을 어디서 가져왔는지.
 *
 * 이걸 구분하지 않으면 환자가 읽는 목록이 '내가 받은 약' 인지 '그 처방의
 * 교과서 구성' 인지 알 수 없다. 가감한 처방인데 원방을 보여주면 뺀 약재가
 * 있는 것으로, 더한 약재가 없는 것으로 읽힌다 — 없는 것보다 나쁘다.
 */
export type GuideHerbSource =
  | 'prescription' // 진료 기록에 한의사가 적은 실제 조제 내용
  | 'catalog' // 처방명으로 찾은 표준 구성(실제 조제와 다를 수 있음)
  | 'none'; // 둘 다 없음

export interface GuideInteraction {
  drug: string;
  herb: string;
  severity: string;
  advice?: string | null;
}

export interface GuideEvidence {
  caseCount: number;
  /** 완치·호전 비율(0~100). 채점 가능한 사례가 적으면 내지 않는다(null). */
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

  /** 위 목록의 출처. 화면에서 '실제 조제' 와 '표준 구성' 을 구분해 말한다. */
  @Column({ type: 'varchar', length: 16, default: 'none' })
  herbSource: GuideHerbSource;

  /**
   * 약재 원산지·규격 한 줄.
   *
   * 한약 불신의 큰 축이 "중국산 아니냐" 인데 어디에도 답이 없었다. 약재마다
   * 받아 적게 하면 아무도 안 쓰므로, 한의원이 쓰는 공급처 규격을 한 줄로
   * 적게 한다. 안 적으면 지어내지 않고 '문의' 로 남긴다.
   */
  @Column({ type: 'text', nullable: true })
  herbOrigin: string | null;

  /**
   * 이 처방을 왜 골랐는지 — 변증·진단 스냅샷.
   *
   * "한의사마다 진단이 다르다" 가 효과 불신의 뿌리인데, 정작 환자는 자기가
   * 무엇으로 진단됐는지도 모른 채 약을 받는다. 진료 기록의 변증을 그대로
   * 넣지 않고 한의사가 발행 화면에서 확인·수정한 것만 담는다 — 자유 텍스트라
   * 식별정보가 섞여 들어올 수 있다.
   */
  @Column({ type: 'text', nullable: true })
  diagnosis: string | null;

  /** 왜 이 처방인지 — 치험례 근거 스냅샷 */
  @Column({ type: 'jsonb', nullable: true })
  evidence: GuideEvidence | null;

  /** 복용 중인 양약과의 상호작용 스냅샷 */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  interactions: GuideInteraction[];

  /**
   * 대조한 양약 가짓수.
   *
   * 상호작용 0건이 "확인했고 문제없음" 인지 "확인 자체를 안 함" 인지 구분되지
   * 않으면, 환자는 안전하다는 뜻으로 읽는다. 약 이름은 담지 않는다 —
   * 링크만 알면 열리는 문서에 그 사람이 무슨 약을 먹는지가 남으면 안 된다.
   *
   * null = 명부에 환자가 연결되지 않아 대조하지 못함
   * 0    = 환자가 복용 중인 양약을 알려주지 않음
   */
  @Column({ type: 'smallint', nullable: true })
  reviewedDrugCount: number | null;

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

  // ── 복용 추적 ────────────────────────────────────────────────
  // 환자가 언제부터 먹기 시작했는지는 처방일과 다르다. 약을 받아 가고 이틀
  // 뒤에 시작하는 일이 흔한데, 그 이틀을 복용일로 세면 순응도도 경과도 틀린다.

  /** 환자가 '복용 시작' 을 누른 날 (KST YYYY-MM-DD). 안 눌렀으면 null. */
  @Column({ type: 'date', nullable: true })
  dosingStartedOn: string | null;

  // ── 링크 전달 ────────────────────────────────────────────────

  /** 환자 카톡(또는 문자)으로 추적 링크를 마지막으로 보낸 시점. */
  @Column({ type: 'timestamptz', nullable: true })
  linkSentAt: Date | null;

  /** 마지막으로 실제 나간 채널. 'kakao' | 'sms' */
  @Column({ type: 'varchar', length: 16, nullable: true })
  linkSentChannel: string | null;

  /** 안내서를 닫은 시점. 닫히면 공개 링크는 더 이상 열리지 않는다. */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @OneToMany(() => MedicationGuideReport, (r) => r.guide)
  reports: MedicationGuideReport[];

  @OneToMany(() => MedicationGuideDose, (d) => d.guide)
  doses: MedicationGuideDose[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
