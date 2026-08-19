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
import { PractitionerPatient } from './practitioner-patient.entity';

export interface VisitSymptom {
  name: string;
  severity?: number;
}

export interface VisitHerb {
  name: string;
  amount?: string;
  role?: string;
}

/**
 * 한 번의 진료 기록 — 주소증·증상·변증·처방을 한 행으로 남긴다.
 *
 * 그동안 이 데이터는 브라우저 localStorage('hanmed_prescriptions')에만 있었다.
 * 다른 PC 에서 로그인하면 없고, 캐시를 지우면 사라지고, 백업 경로도 없었다.
 * 구독료를 받는 서비스에서 진료 기록이 브라우저에만 있는 건 성립하지 않는다.
 *
 * 임상 내용은 개인식별정보가 아니므로 평문으로 둔다. 환자 식별은
 * practitioner_patients 쪽에서 암호화로 보호한다.
 */
@Entity('practitioner_visits')
@Index(['practitionerId', 'visitedAt'])
@Index(['patientId', 'visitedAt'])
export class PractitionerVisit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 소유 한의사 — 모든 조회의 스코프 기준. */
  @Column()
  practitionerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'practitionerId' })
  practitioner: User;

  /** 명부에 없는 즉석 진료(익명 상담)도 허용하므로 nullable. */
  @Column({ nullable: true })
  patientId: string | null;

  @ManyToOne(() => PractitionerPatient, (p) => p.visits, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'patientId' })
  patient: PractitionerPatient | null;

  @Column({ type: 'timestamptz' })
  visitedAt: Date;

  @Column({ type: 'text', nullable: true })
  chiefComplaint: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  symptoms: VisitSymptom[];

  /** AI 변증 분석 요약 또는 한의사가 직접 적은 변증. */
  @Column({ type: 'text', nullable: true })
  diagnosis: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  formulaName: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  herbs: VisitHerb[];

  /**
   * 처방 채택 시점의 AI 적합도 원값(0~1).
   * 화면에는 등급으로만 노출하지만, 나중에 실제 경과와 대조해
   * 이 값이 실제로 의미가 있는지 검증하려면 원값을 남겨야 한다.
   */
  @Column({ type: 'float', nullable: true })
  aiConfidence: number | null;

  /**
   * 이 처방이 AI 폴백 경로(그라운딩·임산부 금기 가드 우회)에서 나왔는지.
   * 사후 감사에서 "안전 필터가 없던 시점의 추천"을 가려낼 수 있어야 한다.
   */
  @Column({ type: 'boolean', default: false })
  aiDegraded: boolean;

  /**
   * 통증 점수(VAS, 0~10). 안 물어본 진료도 있으므로 0 이 아니라 null 이 기본이다.
   * 0 을 기본값으로 두면 '통증 없음' 과 '안 물어봄' 이 같아진다.
   */
  @Column({ type: 'smallint', nullable: true })
  painScore: number | null;

  /** 맥진 소견 — 다음 진료에서 대조하려면 남아 있어야 한다. */
  @Column({ type: 'text', nullable: true })
  pulseNote: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ── 첩약 건강보험 시범사업 ───────────────────────────────────
  // 2단계 시범사업은 환자 1인당 연간 2개 질환, 질환당 20일분까지만 급여다.
  // 한도를 넘겨 처방하면 그대로 삭감되는데, 지금은 한의사가 지난 처방을
  // 기억해서 세고 있다. 처방할 때 남은 일수를 계산하려면 이 두 값이 필요하다.

  /** 시범사업 대상 질환명(6개 중 하나). 첩약 급여 처방이 아니면 null. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  cheopyakDisease: string | null;

  /** 이번 처방의 일수. 연간 한도(질환당 20일) 계산의 단위다. */
  @Column({ type: 'smallint', nullable: true })
  cheopyakDays: number | null;

  /**
   * 한약-양약 상호작용 위험을 환자에게 설명한 시점.
   *
   * 대법원이 인정한 설명의무는 이행 사실을 남겨 두지 않으면 다툴 때 방어가 안 된다.
   * "설명했다" 는 주장만으로는 부족하고, 진료 단위로 시점이 남아야 한다.
   */
  @Column({ type: 'timestamptz', nullable: true })
  interactionNoticeGivenAt: Date | null;

  // ── 경과 추적 ────────────────────────────────────────────────
  // 처방을 내는 것으로 진료가 끝나지 않는다. 그 처방이 어떻게 됐는지가
  // 다음 진료의 근거이고, 쌓이면 이 한의사 자신의 치험례가 된다.
  // 만성질환(2026 급여 확대)은 재방문 관리가 곧 치료라 더 그렇다.

  /** 치료 경과. 미기록 상태를 구분하려고 null 을 유지한다. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  outcome: '완치' | '호전' | '무효' | '악화' | '진행중' | null;

  /** 경과에 대한 한의사 메모 (가감 이유, 반응 등) */
  @Column({ type: 'text', nullable: true })
  outcomeNotes: string | null;

  /** 경과를 기록한 시점 — null 이면 아직 확인 안 한 진료다. */
  @Column({ type: 'timestamptz', nullable: true })
  outcomeRecordedAt: Date | null;

  /** 재방문 예정일. 이 날짜가 지났는데 경과가 없으면 확인 대상으로 뜬다. */
  @Column({ type: 'timestamptz', nullable: true })
  followUpAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
