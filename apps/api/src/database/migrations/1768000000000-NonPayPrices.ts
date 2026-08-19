import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 심평원 비급여 가격 통계 저장 테이블.
 *
 * 원자료는 공공데이터포털에 있지만, 우리 API 가 도는 도쿄에서 부르면 5건에
 * 35초가 걸린다(해외 IP 스로틀). 요청 때마다 부를 수 없어 미리 받아 둔다.
 * 월 1회 갱신 자료라 이렇게 두는 편이 맞다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class NonPayPrices1768000000000 implements MigrationInterface {
  name = 'NonPayPrices1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nonpay_prices" (
        "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code"      varchar(32) NOT NULL UNIQUE,
        "fullName"  varchar(400) NOT NULL,
        "category"  varchar(100) NOT NULL,
        "name"      varchar(300) NOT NULL,
        "appliedOn" varchar(8),
        "regions"   jsonb NOT NULL DEFAULT '{}'::jsonb,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_nonpay_prices_category"
        ON "nonpay_prices" ("category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "nonpay_prices"`);
  }
}
