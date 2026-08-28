import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 치험례 본문 유출 방어 — 열람 로그와 열람 잠금.
 *
 * 배경: 치험례 목록 API 가 originalText(원문 전문)를 그대로 실어 보내고 있었다.
 * 로그인 계정 하나로 페이지네이션을 돌리면 6,000건 전체를 긁어갈 수 있었다.
 * 이 회사의 유일한 복제 불가 자산이 인증만 통과하면 전부 나가는 상태였다.
 *
 * 이 마이그레이션이 더하는 것
 *   1. case_access_logs — 본문 열람 전건 기록.
 *      로그 id 가 곧 워터마크 traceId 다. 유출본에서 제로폭 워터마크를 뽑으면
 *      이 테이블에서 열람자·시각·IP 를 특정한다.
 *   2. users.casesAccessLockedUntil — 이상 열람 감지 시 열람만 일시 정지.
 *      검색·목록은 계속 열어둔다. 오탐으로 진료를 통째로 끊지 않기 위해서다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class CaseContentProtection1773000000000 implements MigrationInterface {
  name = 'CaseContentProtection1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_access_action_enum" AS ENUM (
          'view_full', 'denied_rate_limit', 'denied_locked', 'copy_attempt', 'consent'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "case_access_logs" (
        "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"       uuid NOT NULL,
        "caseId"       uuid,
        "action"       "case_access_action_enum" NOT NULL,
        "ipAddress"    varchar(45),
        "userAgent"    text,
        "sessionId"    varchar(128),
        "tierAtAccess" varchar(32),
        "detail"       jsonb,
        "createdAt"    timestamptz NOT NULL DEFAULT now()
      )
    `);

    // 속도제한이 매 열람마다 "이 사용자의 최근 N분"을 센다 — 이 인덱스가 성능의 전부다.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_case_access_logs_user_created"
        ON "case_access_logs" ("userId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_case_access_logs_case_created"
        ON "case_access_logs" ("caseId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_case_access_logs_created"
        ON "case_access_logs" ("createdAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "casesAccessLockedUntil" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "casesAccessLockedUntil"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "case_access_logs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "case_access_action_enum"`);
  }
}
