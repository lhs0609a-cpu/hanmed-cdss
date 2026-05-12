import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 한의사 2000명 베타 출시 대비 — 결제/구독/보험 강화 마이그레이션
 *
 * 변경사항:
 *  1. payments: PENDING 중복 방지용 부분 unique index
 *  2. subscriptions: pastDueUntil, paymentFailedAt 컬럼 + SUSPENDED 상태값
 *  3. formulas: insuranceStatus, insuranceCode 컬럼
 *  4. insurance_claim_seq 시퀀스 — 청구번호 동시성 제어
 */
export class BetaLaunchBillingAndInsurance1748000000000
  implements MigrationInterface
{
  name = 'BetaLaunchBillingAndInsurance1748000000000';

  // ALTER TYPE ... ADD VALUE 는 (PG 의 일부 환경에서) 동일 트랜잭션 내 즉시 사용에
  // 제약이 있어 트랜잭션을 끈다. PractitionerRolesExpansion 마이그레이션 패턴 동일.
  transaction = false as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. payments: PENDING 결제 1인 1건 제약 (부분 unique index)
    // ============================================================
    // status 컬럼의 enum 값은 'pending' (소문자). PaymentStatus enum 참고.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_user_pending"
      ON "payments" ("userId")
      WHERE "status" = 'pending'
    `);

    // ============================================================
    // 2. subscriptions: SUSPENDED 상태값 + paymentFailedAt + pastDueUntil
    // ============================================================
    // Postgres enum 에 새 값 추가 (IF NOT EXISTS 는 PG 12+)
    await queryRunner.query(`
      ALTER TYPE "subscriptions_status_enum"
      ADD VALUE IF NOT EXISTS 'suspended'
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "paymentFailedAt" timestamp NULL,
      ADD COLUMN IF NOT EXISTS "pastDueUntil" timestamp NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscriptions_past_due_until"
      ON "subscriptions" ("pastDueUntil")
      WHERE "pastDueUntil" IS NOT NULL
    `);

    // ============================================================
    // 3. formulas: 보험 급여 정보
    // ============================================================
    await queryRunner.query(`
      CREATE TYPE "formula_insurance_status_enum"
      AS ENUM ('COVERED', 'NON_COVERED', 'PARTIAL', 'UNKNOWN')
    `);

    await queryRunner.query(`
      ALTER TABLE "formulas"
      ADD COLUMN "insuranceStatus" "formula_insurance_status_enum"
        NOT NULL DEFAULT 'UNKNOWN',
      ADD COLUMN "insuranceCode" varchar(32) NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_formulas_insurance_status"
      ON "formulas" ("insuranceStatus")
    `);

    // ============================================================
    // 4. 청구번호 시퀀스 — 동시 INSERT 에도 충돌 없음 보장
    // ============================================================
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS "insurance_claim_seq"
      INCREMENT BY 1
      START WITH 1
      MINVALUE 1
      NO MAXVALUE
      CACHE 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 시퀀스
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "insurance_claim_seq"`);

    // formulas
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_formulas_insurance_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "formulas"
      DROP COLUMN IF EXISTS "insuranceCode",
      DROP COLUMN IF EXISTS "insuranceStatus"
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "formula_insurance_status_enum"`,
    );

    // subscriptions
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_subscriptions_past_due_until"`,
    );
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      DROP COLUMN IF EXISTS "pastDueUntil",
      DROP COLUMN IF EXISTS "paymentFailedAt"
    `);
    // Postgres 는 enum 값을 직접 제거할 수 없음 — down 에서는 보류.
    // 필요 시 enum 재생성 절차 (rename → create new → cast → drop old) 별도 처리.

    // payments
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_payment_user_pending"`,
    );
  }
}
