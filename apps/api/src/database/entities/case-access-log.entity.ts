import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 치험례 본문 열람 로그 — 유출 대응의 근거.
 *
 * 이 테이블이 하는 일은 세 가지다.
 *   1. 속도제한의 계산 근거 (최근 N분 몇 건 열었나)
 *   2. 이상 열람 탐지 (새벽 대량, 다중 IP, 비인간적 속도)
 *   3. 유출본이 돌아다닐 때 워터마크의 traceId 로 열람자를 특정
 *
 * 로그 id 가 곧 워터마크 traceId 다. 그래서 열람 응답을 만들기 전에 먼저 기록한다.
 */

export enum CaseAccessAction {
  /** 본문 열람 성공 */
  VIEW_FULL = 'view_full',
  /** 속도제한에 걸려 거절 */
  DENIED_RATE_LIMIT = 'denied_rate_limit',
  /** 이상 패턴으로 계정 열람 잠금 */
  DENIED_LOCKED = 'denied_locked',
  /** 클라이언트에서 복사·인쇄·캡처 시도가 감지됨 */
  COPY_ATTEMPT = 'copy_attempt',
  /** 재배포 금지 동의 */
  CONSENT = 'consent',
}

@Entity('case_access_logs')
// 속도제한·이상탐지가 "이 사용자의 최근 열람"을 매번 센다 — 이 인덱스가 없으면 못 쓴다.
@Index(['userId', 'createdAt'])
@Index(['caseId', 'createdAt'])
export class CaseAccessLog {
  /** 이 값이 워터마크 traceId 다 */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  /** COPY_ATTEMPT·CONSENT 는 특정 치험례가 없을 수 있다 */
  @Column('uuid', { nullable: true })
  caseId: string | null;

  @Column({ type: 'enum', enum: CaseAccessAction })
  action: CaseAccessAction;

  /** IPv6 대비 45자 */
  @Column({ length: 45, nullable: true })
  ipAddress: string | null;

  @Column('text', { nullable: true })
  userAgent: string | null;

  /** 다중 세션 동시 열람 탐지용 */
  @Column({ length: 128, nullable: true })
  sessionId: string | null;

  /** 열람 시점의 구독 티어 — 나중에 정책 위반 판단에 쓴다 */
  @Column({ length: 32, nullable: true })
  tierAtAccess: string | null;

  /** 거절 사유, 복사 시도 종류 등 부가 정보 */
  @Column('jsonb', { nullable: true })
  detail: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt: Date;
}
