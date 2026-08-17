import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { PractitionerVisit } from './practitioner-visit.entity';

/**
 * 한의사가 직접 관리하는 환자 명부.
 *
 * patient_records / patient_accounts 와는 다른 것이다 —
 * 그쪽은 환자 포털에 가입한 환자의 기록이고, 이 테이블은 앱을 쓰지 않는
 * 일반 내원 환자를 한의사가 자기 진료를 위해 적어 두는 명부다.
 *
 * 개인정보 원칙:
 *  - 이름 / 전화번호 / 생년월일은 평문으로 두지 않는다. 서비스 계층에서
 *    EncryptionService(AES-256-GCM)로 암호화해 넣고 읽을 때 복호화한다.
 *  - 검색은 nameSearchToken(정규화된 이름의 HMAC)으로만 가능하다.
 *    부분 일치 검색은 복호화 후 애플리케이션에서 처리한다 — 명부 크기가
 *    한의원 단위(수백~수천)라 이 비용이 개인정보 노출보다 싸다.
 *  - 삭제는 soft delete. 진료 기록이 매달린 상태에서 물리 삭제하면
 *    남은 기록이 주인 없는 데이터가 된다.
 */
@Entity('practitioner_patients')
@Index(['practitionerId', 'deletedAt'])
@Index(['practitionerId', 'nameSearchToken'])
export class PractitionerPatient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 소유 한의사 — 모든 조회는 이 컬럼으로 스코프된다(교차 테넌트 차단). */
  @Column()
  practitionerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'practitionerId' })
  practitioner: User;

  /** 한의원 단위 공유용 — 미지정이면 개인 명부. */
  @Column({ nullable: true })
  clinicId: string | null;

  // ── 개인식별정보 (암호화 저장) ──────────────────────────────
  @Column({ type: 'text' })
  nameEncrypted: string;

  @Column({ type: 'text', nullable: true })
  phoneEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  birthDateEncrypted: string | null;

  /**
   * 정규화된 이름의 HMAC — 동명이인 조회/중복 등록 검사용 결정적 인덱스.
   * 원문 복원은 불가능하고, 사전 공격을 막기 위해 서버 키로 HMAC 한다.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  nameSearchToken: string | null;

  // ── 비식별 임상 정보 (평문) ─────────────────────────────────
  @Column({ type: 'varchar', length: 8, nullable: true })
  gender: 'M' | 'F' | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  constitution: string | null;

  @Column({ type: 'text', nullable: true })
  mainComplaint: string | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'inactive';

  @Column({ type: 'timestamptz', nullable: true })
  lastVisitAt: Date | null;

  @Column({ type: 'int', default: 0 })
  totalVisits: number;

  @OneToMany(() => PractitionerVisit, (visit) => visit.patient)
  visits: PractitionerVisit[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
