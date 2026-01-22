-- =====================================================
-- 온고지신 CDSS - 관리자 시스템 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- 1. UserRole enum 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
    CREATE TYPE "users_role_enum" AS ENUM ('super_admin', 'admin', 'support', 'content_manager', 'user');
  END IF;
END$$;

-- 2. UserStatus enum 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
    CREATE TYPE "users_status_enum" AS ENUM ('active', 'suspended', 'banned', 'pending_verification');
  END IF;
END$$;

-- 3. users 테이블에 role 컬럼 추가
DO $$
BEGIN
  -- 기존 role 컬럼이 있으면 타입 변경
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    -- varchar인 경우 enum으로 변경
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE "users_role_enum" USING
      CASE
        WHEN role = 'super_admin' THEN 'super_admin'::"users_role_enum"
        WHEN role = 'admin' THEN 'admin'::"users_role_enum"
        WHEN role = 'support' THEN 'support'::"users_role_enum"
        WHEN role = 'content_manager' THEN 'content_manager'::"users_role_enum"
        ELSE 'user'::"users_role_enum"
      END;
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'::"users_role_enum";
  ELSE
    -- role 컬럼이 없으면 새로 추가
    ALTER TABLE "users" ADD COLUMN "role" "users_role_enum" NOT NULL DEFAULT 'user';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'role 컬럼 처리 중 오류 (무시): %', SQLERRM;
END$$;

-- 4. users 테이블에 status 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "status" "users_status_enum" NOT NULL DEFAULT 'active';
  END IF;
END$$;

-- 5. users 테이블에 정지 관련 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'suspendedAt'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "suspendedAt" TIMESTAMP;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'suspendedReason'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "suspendedReason" TEXT;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'suspendedById'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "suspendedById" uuid;
  END IF;
END$$;

-- 6. 자기 참조 외래키 추가 (정지한 관리자)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FK_users_suspendedBy'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "FK_users_suspendedBy"
    FOREIGN KEY ("suspendedById")
    REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '외래키 생성 중 오류 (무시): %', SQLERRM;
END$$;

-- 7. 관리자 활동 감사 로그 테이블 생성
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "adminId" uuid NOT NULL,
  "action" varchar(100) NOT NULL,
  "targetType" varchar(50),
  "targetId" uuid,
  "oldValue" jsonb,
  "newValue" jsonb,
  "ipAddress" varchar(45),
  "userAgent" text,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_admin_audit_logs_id" PRIMARY KEY ("id")
);

-- 외래키 추가 (users 테이블 참조)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FK_admin_audit_logs_adminId'
  ) THEN
    ALTER TABLE "admin_audit_logs"
    ADD CONSTRAINT "FK_admin_audit_logs_adminId"
    FOREIGN KEY ("adminId")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '외래키 생성 중 오류 (무시): %', SQLERRM;
END$$;

-- 8. 인덱스 생성
CREATE INDEX IF NOT EXISTS "IDX_users_role" ON "users" ("role");
CREATE INDEX IF NOT EXISTS "IDX_users_status" ON "users" ("status");
CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_adminId" ON "admin_audit_logs" ("adminId");
CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_action" ON "admin_audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_targetType_targetId" ON "admin_audit_logs" ("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "IDX_admin_audit_logs_createdAt" ON "admin_audit_logs" ("createdAt");

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '  관리자 시스템 마이그레이션 완료!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
END$$;
