import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserRole, UserStatus, PractitionerType, LicenseVerificationStatus } from './enums';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  CLINIC = 'clinic',
}

// 플랜별 AI 쿼리 제한
export const PLAN_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 10,
  [SubscriptionTier.BASIC]: 50,
  [SubscriptionTier.PROFESSIONAL]: 300,
  [SubscriptionTier.CLINIC]: Infinity,
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  licenseNumber: string | null;

  @Column({ nullable: true })
  clinicName: string | null;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  subscriptionTier: SubscriptionTier;

  @Column({ nullable: true })
  subscriptionExpiresAt: Date | null;

  @Column({ default: 0 })
  contributionPoints: number;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ name: 'tossBillingKey', nullable: true })
  tossBillingKey: string | null;

  // 2FA (TOTP, RFC 6238)
  @Column({ default: false })
  is2faEnabled: boolean;

  // 암호화된 base32 시크릿 (CommonModule의 EncryptionService로 암복호화)
  @Column('text', { nullable: true })
  totpSecretEncrypted: string | null;

  /**
   * 인증 앱 분실 대비 백업 코드 (1회용).
   * bcrypt 해시 배열의 JSON 직렬화 → 다시 EncryptionService로 암호화하여 보관한다.
   * 평문은 활성화/재발급 시점에만 사용자에게 1회 노출되고, 이후 검증은 해시 비교로만 가능.
   */
  @Column('text', { nullable: true })
  twoFaBackupCodesEncrypted: string | null;

  // 관리자 시스템 관련 필드
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  suspendedAt: Date | null;

  @Column('text', { nullable: true })
  suspendedReason: string | null;

  @Column({ nullable: true })
  suspendedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'suspendedById' })
  suspendedBy: User | null;

  // 직역 구분 — 처방/저장 권한 게이트에 사용
  @Column({
    type: 'enum',
    enum: PractitionerType,
    default: PractitionerType.PRACTITIONER,
  })
  practitionerType: PractitionerType;

  // Community / 처방권한 관련 필드
  @Column({ default: false })
  isLicenseVerified: boolean; // 면허 인증 완료 여부

  @Column({
    type: 'enum',
    enum: LicenseVerificationStatus,
    default: LicenseVerificationStatus.UNSUBMITTED,
  })
  licenseVerificationStatus: LicenseVerificationStatus;

  @Column({ nullable: true })
  licenseVerifiedAt: Date | null;

  @Column({ nullable: true })
  licenseVerifiedById: string | null;

  @Column('text', { nullable: true })
  licenseRejectionReason: string | null;

  // 회원탈퇴(grace period) 추적
  @Column({ nullable: true })
  deletionRequestedAt: Date | null;

  @Column({ nullable: true })
  deletionScheduledFor: Date | null; // 30일 후 hard-delete 예정일

  @Column('text', { nullable: true })
  deletionReason: string | null;

  @Column({ nullable: true })
  specialization: string | null; // 전문 분야 (본초학, 상한론 등)

  @Column('text', { nullable: true })
  bio: string | null; // 자기소개

  @Column({ default: 0 })
  postCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: 0 })
  acceptedAnswerCount: number; // 채택된 답변 수

  // 약관 동의 관련 필드
  @Column({ default: false })
  consentTerms: boolean; // 이용약관 동의

  @Column({ default: false })
  consentPrivacy: boolean; // 개인정보처리방침 동의

  @Column({ default: false })
  consentMarketing: boolean; // 마케팅 정보 수신 동의

  @Column({ nullable: true })
  consentTermsAt: Date | null; // 이용약관 동의 일시

  @Column({ nullable: true })
  consentPrivacyAt: Date | null; // 개인정보처리방침 동의 일시

  @Column({ nullable: true })
  consentMarketingAt: Date | null; // 마케팅 동의 일시

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
