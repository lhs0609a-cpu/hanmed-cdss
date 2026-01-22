import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminSystem1704000000000 implements MigrationInterface {
  name = 'AdminSystem1704000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. UserRole enum 생성
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('super_admin', 'admin', 'support', 'content_manager', 'user')
    `);

    // 2. UserStatus enum 생성
    await queryRunner.query(`
      CREATE TYPE "users_status_enum" AS ENUM ('active', 'suspended', 'banned', 'pending_verification')
    `);

    // 3. users 테이블에 role 컬럼 추가 (또는 변경)
    // 기존 role 컬럼이 varchar로 있을 수 있으므로 조건부로 처리
    await queryRunner.query(`
      DO $$
      BEGIN
        -- 기존 role 컬럼이 있으면 삭제하고 새로 생성
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'role'
        ) THEN
          ALTER TABLE "users" DROP COLUMN "role";
        END IF;

        -- 새 role 컬럼 추가
        ALTER TABLE "users" ADD COLUMN "role" "users_role_enum" NOT NULL DEFAULT 'user';
      END $$;
    `);

    // 4. users 테이블에 status 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "users_status_enum" NOT NULL DEFAULT 'active'
    `);

    // 5. users 테이블에 정지 관련 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedById" uuid
    `);

    // 6. 자기 참조 외래키 추가 (정지한 관리자)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_suspendedBy"
      FOREIGN KEY ("suspendedById")
      REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // 7. 관리자 활동 감사 로그 테이블 생성
    await queryRunner.query(`
      CREATE TABLE "admin_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "adminId" uuid NOT NULL,
        "action" varchar(100) NOT NULL,
        "targetType" varchar(50),
        "targetId" uuid,
        "oldValue" jsonb,
        "newValue" jsonb,
        "ipAddress" varchar(45),
        "userAgent" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_audit_logs_adminId" FOREIGN KEY ("adminId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 8. 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX "IDX_users_role" ON "users" ("role")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_status" ON "users" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_adminId" ON "admin_audit_logs" ("adminId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_action" ON "admin_audit_logs" ("action")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_targetType_targetId" ON "admin_audit_logs" ("targetType", "targetId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_createdAt" ON "admin_audit_logs" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 삭제
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_targetType_targetId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_adminId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_role"`);

    // 테이블 삭제
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_audit_logs"`);

    // 외래키 삭제
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_suspendedBy"
    `);

    // 컬럼 삭제
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "suspendedById"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "suspendedReason"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "suspendedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "status"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);

    // enum 타입 삭제
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
