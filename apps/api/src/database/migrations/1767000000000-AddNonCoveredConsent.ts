import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 비급여 사전 설명·동의 기록.
 *
 * 의료법 제45조의2와 시행규칙 제42조의3 은 비급여를 하기 **전에** 항목·가격·
 * 사유·대체 항목을 설명하고 동의를 받도록 한다. 설명 대상은 623개 공개 항목에서
 * 전체 비급여로 확대됐다.
 *
 * 환자용 복약 안내서에 금액을 적어 보여주는 것으로는 이 의무가 충족되지 않는다.
 * 안내서는 처방이 끝난 뒤에 나가기 때문이다. 설명한 시점이 진료 단위로 남아야 한다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class AddNonCoveredConsent1767000000000 implements MigrationInterface {
  name = 'AddNonCoveredConsent1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits"
        ADD COLUMN IF NOT EXISTS "nonCoveredItems" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "nonCoveredConsentAt" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "practitioner_visits"
        DROP COLUMN IF EXISTS "nonCoveredItems",
        DROP COLUMN IF EXISTS "nonCoveredConsentAt"
    `);
  }
}
