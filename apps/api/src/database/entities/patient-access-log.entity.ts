import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * 환자 기록 접근 로그 (의료법 준수용)
 *
 * 의료법 시행규칙 제15조에 따라 전자의무기록의 접근 기록을 유지해야 함.
 * - 누가 (userId)
 * - 언제 (accessedAt)
 * - 어떤 환자 기록을 (patientId, recordType, recordId)
 * - 어떤 목적으로 (action)
 * - 어디서 (ipAddress)
 */
@Entity('patient_access_logs')
@Index(['patientId', 'accessedAt'])
@Index(['userId', 'accessedAt'])
@Index(['accessedAt'])
export class PatientAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 접근한 사용자 (의료인/직원)
  @Column('uuid')
  @Index()
  userId: string;

  // 사용자 이름 (감사 추적용 - 비정규화)
  @Column({ length: 100 })
  userName: string;

  // 사용자 역할 (감사 추적용 - 비정규화)
  @Column({ length: 50 })
  userRole: string;

  // 접근한 환자
  @Column('uuid')
  @Index()
  patientId: string;

  // 환자 이름 (감사 추적용 - 마스킹됨, 예: 김**)
  @Column({ length: 100, nullable: true })
  patientNameMasked: string;

  // 기록 유형
  @Column({
    type: 'enum',
    enum: [
      'patient_profile',      // 환자 프로필
      'medical_record',       // 진료 기록
      'prescription',         // 처방 기록
      'consultation',         // 상담 기록
      'lab_result',           // 검사 결과
      'health_journal',       // 건강 일지
      'medication_log',       // 복약 기록
      'ai_recommendation',    // AI 추천 결과
    ],
  })
  recordType: string;

  // 특정 기록 ID (해당하는 경우)
  @Column('uuid', { nullable: true })
  recordId: string;

  // 접근 행위
  @Column({
    type: 'enum',
    enum: [
      'view',         // 조회
      'create',       // 생성
      'update',       // 수정
      'delete',       // 삭제
      'export',       // 내보내기
      'print',        // 출력
      'share',        // 공유
    ],
  })
  action: string;

  // 접근 목적/사유 (선택적 - 특별한 접근시)
  @Column('text', { nullable: true })
  reason: string;

  // 접근 IP 주소
  @Column({ length: 45 }) // IPv6 지원
  ipAddress: string;

  // User Agent
  @Column('text', { nullable: true })
  userAgent: string;

  // 클리닉 ID (해당하는 경우)
  @Column('uuid', { nullable: true })
  clinicId: string;

  // 접근 결과
  @Column({
    type: 'enum',
    enum: ['success', 'denied', 'error'],
    default: 'success',
  })
  result: string;

  // 거부/오류 사유
  @Column('text', { nullable: true })
  failureReason: string;

  // 세션 ID (연관 작업 추적용)
  @Column({ length: 100, nullable: true })
  sessionId: string;

  // 추가 메타데이터
  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  accessedAt: Date;
}
