import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

/**
 * 사용자 데이터 클라우드 동기화 엔티티
 * Pro 플랜 이상 사용자의 로컬 데이터를 서버에 저장하여
 * 다중 기기 접근 및 데이터 보존을 지원합니다.
 */
@Entity('user_data')
@Unique(['userId', 'dataKey']) // 사용자당 키는 유일
@Index(['userId', 'dataKey'])
export class UserData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 데이터 키 (예: pulse_diagnosis_records, voice_chart_sessions)
   */
  @Column({ length: 100 })
  dataKey: string;

  /**
   * 저장된 데이터.
   * isEncrypted=true일 때: AES-256-GCM 암호문 (base64). EncryptionService로 복호화.
   * isEncrypted=false일 때: 호환을 위한 평문 JSON 문자열 (구 데이터).
   * 신규 saveData() 호출은 항상 isEncrypted=true로 저장한다.
   */
  @Column({ type: 'text' })
  data: string;

  /**
   * 환자/임상 데이터 보호를 위해 at-rest 암호화 적용 여부.
   */
  @Column({ default: false })
  isEncrypted: boolean;

  /**
   * 데이터 크기 (bytes) - 용량 제한 체크용. 평문 기준 사이즈를 기록한다.
   */
  @Column({ type: 'int', default: 0 })
  dataSize: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * 클라우드 동기화 가능한 데이터 키 목록
 */
export const SYNCABLE_DATA_KEYS = [
  'pulse_diagnosis_records',
  'voice_chart_sessions',
  'integratedDiagnosisRecords',
  'recent-items-storage',
  'user_preferences',
] as const;

export type SyncableDataKey = typeof SYNCABLE_DATA_KEYS[number];

/**
 * 플랜별 클라우드 저장 용량 제한 (bytes)
 */
export const CLOUD_STORAGE_LIMITS = {
  free: 0, // Free 플랜은 클라우드 동기화 불가
  professional: 50 * 1024 * 1024, // 50MB
  clinic: 200 * 1024 * 1024, // 200MB
  enterprise: 1024 * 1024 * 1024, // 1GB
} as const;
