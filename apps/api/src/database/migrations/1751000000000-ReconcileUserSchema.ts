import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * users 테이블 스키마 정합화 (수기 스크립트 → 정식 마이그레이션 편입).
 *
 * 배경: 그동안 user.entity.ts 에 컬럼이 추가될 때 대응 마이그레이션 없이
 * 운영 DB 에 수기(fix-practitioner-type.js, apps/api/migrations/*.sql)로만
 * 반영되어 왔다. 그 결과 2026-05-19 로그인 5일 장애(entity↔DB drift)가 발생했고,
 * 신규/재해복구 DB 는 재현 불가능한 상태였다.
 *
 * 이 마이그레이션은 그 수기 변경을 멱등(IF NOT EXISTS / DO $$)하게 편입하여
 * 운영 DB 에는 no-op, fresh DB 에는 정합 상태를 만든다.
 *
 * ⚠️ 주의: users 의 password→passwordHash, subscription_tier(varchar)→subscriptionTier(enum)
 * 등 InitialSchema 와의 근본적 컬럼 drift 는 운영 스키마 덤프로 검증 후 별도 처리해야 한다.
 * 여기서는 검증된(운영에서 이미 수기 적용된) 컬럼만 다룬다.
 */
export class ReconcileUserSchema1751000000000 implements MigrationInterface {
  name = 'ReconcileUserSchema1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- 1. Enums ----------
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_practitionertype_enum') THEN
          CREATE TYPE "users_practitionertype_enum" AS ENUM ('practitioner', 'public_health_doctor', 'student');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_licenseverificationstatus_enum') THEN
          CREATE TYPE "users_licenseverificationstatus_enum" AS ENUM ('unsubmitted', 'pending', 'verified', 'rejected');
        END IF;
      END $$;
    `);

    // users_status_enum 에 'pending_deletion' 값 보강 (탈퇴 grace period).
    // 값 추가는 트랜잭션 밖에서만 가능할 수 있으나 IF NOT EXISTS 로 안전.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
          ALTER TYPE "users_status_enum" ADD VALUE IF NOT EXISTS 'pending_deletion';
        END IF;
      END $$;
    `);

    // ---------- 2. Columns (모두 IF NOT EXISTS, 재실행 안전) ----------
    const columnStmts = [
      // Practitioner / license
      `ADD COLUMN IF NOT EXISTS "practitionerType" "users_practitionertype_enum" NOT NULL DEFAULT 'practitioner'`,
      `ADD COLUMN IF NOT EXISTS "isLicenseVerified" boolean NOT NULL DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS "licenseVerificationStatus" "users_licenseverificationstatus_enum" NOT NULL DEFAULT 'unsubmitted'`,
      `ADD COLUMN IF NOT EXISTS "licenseVerifiedAt" timestamp NULL`,
      `ADD COLUMN IF NOT EXISTS "licenseVerifiedById" uuid NULL`,
      `ADD COLUMN IF NOT EXISTS "licenseRejectionReason" text NULL`,

      // Deletion (grace period)
      `ADD COLUMN IF NOT EXISTS "deletionRequestedAt" timestamp NULL`,
      `ADD COLUMN IF NOT EXISTS "deletionScheduledFor" timestamp NULL`,
      `ADD COLUMN IF NOT EXISTS "deletionReason" text NULL`,

      // Profile
      `ADD COLUMN IF NOT EXISTS "specialization" varchar NULL`,
      `ADD COLUMN IF NOT EXISTS "bio" text NULL`,

      // Community counters
      `ADD COLUMN IF NOT EXISTS "postCount" integer NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS "commentCount" integer NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS "acceptedAnswerCount" integer NOT NULL DEFAULT 0`,

      // Consent
      `ADD COLUMN IF NOT EXISTS "consentTerms" boolean NOT NULL DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS "consentPrivacy" boolean NOT NULL DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS "consentMarketing" boolean NOT NULL DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS "consentTermsAt" timestamp NULL`,
      `ADD COLUMN IF NOT EXISTS "consentPrivacyAt" timestamp NULL`,
      `ADD COLUMN IF NOT EXISTS "consentMarketingAt" timestamp NULL`,

      // 2FA (TOTP) — apps/api/migrations/add-2fa-*.sql 편입
      `ADD COLUMN IF NOT EXISTS "is2faEnabled" boolean NOT NULL DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS "totpSecretEncrypted" text NULL`,
      `ADD COLUMN IF NOT EXISTS "twoFaBackupCodesEncrypted" text NULL`,

      // 결제 — Stripe→Toss 빌링키 (rename-stripe-to-toss-billing-key.sql 편입)
      `ADD COLUMN IF NOT EXISTS "tossBillingKey" varchar NULL`,

      // Profile 기타
      `ADD COLUMN IF NOT EXISTS "suspendedAt" timestamp NULL`,
      `ADD COLUMN IF NOT EXISTS "suspendedReason" text NULL`,
      `ADD COLUMN IF NOT EXISTS "suspendedById" uuid NULL`,
    ];

    for (const stmt of columnStmts) {
      await queryRunner.query(`ALTER TABLE "users" ${stmt};`);
    }
  }

  public async down(): Promise<void> {
    // 정합화 마이그레이션은 되돌리지 않는다 (데이터 손실 방지). 의도적 no-op.
  }
}
