import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 서버 오류 기록.
 *
 * 지금까지 오류는 fly 로그에만 남았다. 로그는 흘러가고 검색이 어렵고,
 * 무엇보다 원장이 볼 수 없다. "어제 결제가 몇 건 실패했나" 를 물으면
 * 아무도 답할 수 없는 상태였다.
 *
 * 한 줄에 한 오류를 쌓지 않는다. 같은 오류가 초당 수십 번 날 수 있어서
 * 그러면 이 표가 서비스보다 먼저 죽는다. fingerprint(메서드+경로+메시지
 * 앞부분) 로 묶어 한 행에 count 를 올린다 — Sentry 가 하는 방식이다.
 *
 * 스택은 4KB 까지만 남긴다. 원인을 찾는 데 필요한 것은 맨 위 몇 줄이고,
 * 전체를 담으면 한 행이 수십 KB 가 된다.
 */
@Entity('error_logs')
@Index(['fingerprint'], { unique: true })
@Index(['lastSeenAt'])
export class ErrorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 같은 오류를 묶는 키. sha1(method + path + message 앞 120자) 앞 32자. */
  @Column({ length: 40 })
  fingerprint: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ length: 10 })
  method: string;

  /** 요청 경로. 쿼리스트링은 지운다 — 토큰이 섞여 들어올 수 있다. */
  @Column({ length: 500 })
  path: string;

  @Column('text')
  message: string;

  @Column('text', { nullable: true })
  stack: string | null;

  /** 마지막으로 이 오류를 만난 사용자. 로그인 전이면 null. */
  @Column({ type: 'uuid', nullable: true })
  lastUserId: string | null;

  @Column({ type: 'int', default: 1 })
  count: number;

  @Column({ type: 'timestamp' })
  firstSeenAt: Date;

  @Column({ type: 'timestamp' })
  lastSeenAt: Date;

  /**
   * 처리 완료 표시.
   *
   * 고쳤다고 지우지 않는다. 지우면 "이 오류가 언제부터 언제까지 있었나" 를
   * 다시는 알 수 없다. 대신 닫아 두고 다시 나면 자동으로 열린다.
   */
  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
