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

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
