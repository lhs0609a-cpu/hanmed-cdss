import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 첩약 시범사업 처방 이력 컬럼.
 *
 * 2단계 시범사업은 환자 1인당 연간 2개 질환, 질환당 20일분까지만 급여다.
 * 한도를 넘기면 삭감되는데 지금은 한의사가 지난 처방을 기억해서 센다.
 * 경기도한의사회 설문(2025.5, 675명)에서 "체크리스트 등 번거로운 행정절차"를
 * 76%가 애로로 꼽았다 — 남은 일수 계산은 그중 기록만으로 자동화되는 부분이다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class AddVisitCheopyakUsage1762000000000 implements MigrationInterface {
  name = 'AddVisitCheopyakUsage1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits"
        ADD COLUMN IF NOT EXISTS "cheopyakDisease" varchar(64),
        ADD COLUMN IF NOT EXISTS "cheopyakDays" smallint
    `);
    // 환자별 연간 사용량 집계용.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practitioner_visits_cheopyak"
        ON "practitioner_visits" ("patientId", "visitedAt")
        WHERE "cheopyakDisease" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practitioner_visits_cheopyak"`);
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits"
        DROP COLUMN IF EXISTS "cheopyakDisease",
        DROP COLUMN IF EXISTS "cheopyakDays"
    `);
  }
}
