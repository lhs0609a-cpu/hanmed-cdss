import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @Column({ length: 100 })
  action: string; // 예: 'user:suspend', 'subscription:upgrade', 'user:role_change'

  @Column({ length: 50, nullable: true })
  targetType: string | null; // 예: 'user', 'subscription', 'clinic'

  @Column({ nullable: true })
  targetId: string | null;

  @Column('jsonb', { nullable: true })
  oldValue: Record<string, any> | null;

  @Column('jsonb', { nullable: true })
  newValue: Record<string, any> | null;

  @Column({ length: 45, nullable: true })
  ipAddress: string | null;

  @Column('text', { nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

// 감사 로그 액션 상수
export const AuditActions = {
  // 사용자 관리
  USER_SUSPEND: 'user:suspend',
  USER_ACTIVATE: 'user:activate',
  USER_BAN: 'user:ban',
  USER_ROLE_CHANGE: 'user:role_change',
  USER_PASSWORD_RESET: 'user:password_reset',
  USER_DELETE: 'user:delete',

  // 구독 관리
  SUBSCRIPTION_UPGRADE: 'subscription:upgrade',
  SUBSCRIPTION_DOWNGRADE: 'subscription:downgrade',
  SUBSCRIPTION_EXTEND: 'subscription:extend',
  SUBSCRIPTION_CANCEL: 'subscription:cancel',
  SUBSCRIPTION_USAGE_RESET: 'subscription:usage_reset',

  // 결제 관리
  PAYMENT_REFUND: 'payment:refund',

  // 한의원 관리
  CLINIC_VERIFY: 'clinic:verify',
  CLINIC_REJECT: 'clinic:reject',

  // 콘텐츠 관리
  CONTENT_CREATE: 'content:create',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',

  // 시스템 설정
  SYSTEM_CONFIG_CHANGE: 'system:config_change',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
