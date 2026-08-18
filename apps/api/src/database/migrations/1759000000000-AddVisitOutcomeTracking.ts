import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 진료 경과 추적 컬럼.
 *
 * 처방을 내는 것으로 진료가 끝나지 않는다. 그 처방이 어떻게 됐는지가 다음 진료의
 * 근거이고, 쌓이면 그 한의사 자신의 치험례가 된다. 지금은 처방만 저장되고
 * 결과가 어디에도 남지 않아 "내가 지난달에 뭘 줬고 어떻게 됐더라" 를 알 수 없다.
 *
 * 2026 한의약 만성질환 급여 확대로 재방문 관리 자체가 진료의 일부가 되므로
 * 재방문 예정일(followUpAt)도 함께 둔다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class AddVisitOutcomeTracking1759000000000 implements MigrationInterface {
  name = 'AddVisitOutcomeTracking1759000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits"
        ADD COLUMN IF NOT EXISTS "outcome" varchar(16),
        ADD COLUMN IF NOT EXISTS "outcomeNotes" text,
        ADD COLUMN IF NOT EXISTS "outcomeRecordedAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "followUpAt" timestamptz
    `);
    // 확인 대상 조회용 — 경과 미기록 + 재방문일 경과 를 자주 훑는다.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practitioner_visits_followup"
        ON "practitioner_visits" ("practitionerId", "followUpAt")
        WHERE "outcomeRecordedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practitioner_visits_followup"`);
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits"
        DROP COLUMN IF EXISTS "outcome",
        DROP COLUMN IF EXISTS "outcomeNotes",
        DROP COLUMN IF EXISTS "outcomeRecordedAt",
        DROP COLUMN IF EXISTS "followUpAt"
    `);
  }
}
