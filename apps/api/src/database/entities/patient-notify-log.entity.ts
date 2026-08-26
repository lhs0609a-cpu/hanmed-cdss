import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** 무엇 때문에 보낸 메시지인지. */
export type NotifyKind =
  | 'guide_link' // 안내서 추적 링크 전달 (한의사가 누름, 재발송 가능)
  | 'checkin_d3' // 복용 3일째 체크인
  | 'checkin_d7' // 복용 7일째 체크인
  | 'ending_d2'; // 복용 종료 2일 전

export type NotifyChannel = 'kakao' | 'sms' | 'none';

/**
 * 발송 결과.
 *
 * `simulated` 를 따로 둔 이유 — NHN 키가 없으면 메시징 서비스가 성공을
 * 돌려준다. 그대로 'sent' 로 적으면 아무것도 안 갔는데 "보냈습니다" 가 화면에
 * 남는다. 조용한 실패는 안 보낸 것보다 나쁘다.
 */
export type NotifyStatus =
  | 'sent'
  | 'simulated'
  | 'failed'
  | 'consent_missing'
  | 'no_phone'
  | 'quiet_hours';

/**
 * 환자에게 나간 알림 이력.
 *
 * 두 가지 때문에 필요하다.
 *  1. 자동 체크인이 같은 안내서에 두 번 나가지 않게 막는다 (kind 로 조회).
 *  2. 정보통신망법상 수신 동의·발송 시각을 증빙해야 한다. 동의 없이 나간 것이
 *     없다는 것을 보이려면 차단된 시도(consent_missing)도 남겨야 한다.
 *
 * 전화번호는 여기에 적지 않는다 — 이미 환자 명부에 암호화해 두었고,
 * 로그 테이블이 평문 연락처의 두 번째 사본이 될 이유가 없다.
 */
@Entity('patient_notify_logs')
@Index(['practitionerId', 'createdAt'])
@Index(['guideId', 'kind'])
export class PatientNotifyLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  practitionerId: string;

  @Column({ type: 'uuid', nullable: true })
  patientId: string | null;

  @Column({ type: 'uuid', nullable: true })
  guideId: string | null;

  @Column({ type: 'varchar', length: 32 })
  kind: NotifyKind;

  @Column({ type: 'varchar', length: 16 })
  channel: NotifyChannel;

  @Column({ type: 'varchar', length: 24 })
  status: NotifyStatus;

  @Column({ type: 'varchar', length: 128, nullable: true })
  messageId: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
