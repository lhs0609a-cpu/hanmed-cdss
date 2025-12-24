import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionSystem1703300000000 implements MigrationInterface {
  name = 'SubscriptionSystem1703300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. SubscriptionTier enum 변경 (starter→free, pro→professional, master→clinic)
    // 기존 enum 타입이 있으면 변경, 없으면 새로 생성
    await queryRunner.query(`
      DO $$ BEGIN
        -- 임시로 컬럼을 varchar로 변경
        ALTER TABLE "users" ALTER COLUMN "subscriptionTier" TYPE varchar(50);

        -- 기존 값 변환
        UPDATE "users" SET "subscriptionTier" = 'free' WHERE "subscriptionTier" = 'starter';
        UPDATE "users" SET "subscriptionTier" = 'professional' WHERE "subscriptionTier" = 'pro';
        UPDATE "users" SET "subscriptionTier" = 'clinic' WHERE "subscriptionTier" = 'master';

        -- 기존 enum 타입 삭제 (존재하면)
        DROP TYPE IF EXISTS "subscription_tier_enum" CASCADE;
        DROP TYPE IF EXISTS "users_subscriptiontier_enum" CASCADE;

        -- 새 enum 타입 생성
        CREATE TYPE "users_subscriptiontier_enum" AS ENUM ('free', 'basic', 'professional', 'clinic');

        -- 컬럼 타입 변경
        ALTER TABLE "users" ALTER COLUMN "subscriptionTier" TYPE "users_subscriptiontier_enum"
          USING "subscriptionTier"::"users_subscriptiontier_enum";

        -- 기본값 설정
        ALTER TABLE "users" ALTER COLUMN "subscriptionTier" SET DEFAULT 'free';
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Error occurred: %', SQLERRM;
      END $$;
    `);

    // 2. subscription_status enum 생성
    await queryRunner.query(`
      CREATE TYPE "subscriptions_status_enum" AS ENUM ('active', 'canceled', 'past_due', 'incomplete', 'trialing')
    `);

    // 3. billing_interval enum 생성
    await queryRunner.query(`
      CREATE TYPE "subscriptions_billinginterval_enum" AS ENUM ('monthly', 'yearly')
    `);

    // 4. subscriptions 테이블 생성
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "stripeSubscriptionId" varchar NOT NULL,
        "stripePriceId" varchar,
        "status" "subscriptions_status_enum" NOT NULL DEFAULT 'incomplete',
        "billingInterval" "subscriptions_billinginterval_enum" NOT NULL DEFAULT 'monthly',
        "currentPeriodStart" TIMESTAMP NOT NULL,
        "currentPeriodEnd" TIMESTAMP NOT NULL,
        "canceledAt" TIMESTAMP,
        "cancelAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subscriptions_stripeSubscriptionId" UNIQUE ("stripeSubscriptionId"),
        CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 5. usage_type enum 생성
    await queryRunner.query(`
      CREATE TYPE "usage_tracking_usagetype_enum" AS ENUM ('ai_query', 'case_search', 'interaction_check')
    `);

    // 6. usage_tracking 테이블 생성
    await queryRunner.query(`
      CREATE TABLE "usage_tracking" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "usageType" "usage_tracking_usagetype_enum" NOT NULL,
        "count" integer NOT NULL DEFAULT 0,
        "periodStart" TIMESTAMP NOT NULL,
        "periodEnd" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_usage_tracking_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_usage_tracking_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 7. usage_tracking 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX "IDX_usage_tracking_user_type_period"
      ON "usage_tracking" ("userId", "usageType", "periodStart")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 삭제
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_usage_tracking_user_type_period"`);

    // 테이블 삭제
    await queryRunner.query(`DROP TABLE IF EXISTS "usage_tracking"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);

    // enum 타입 삭제
    await queryRunner.query(`DROP TYPE IF EXISTS "usage_tracking_usagetype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscriptions_billinginterval_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscriptions_status_enum"`);

    // SubscriptionTier enum 복원 (선택적)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users" ALTER COLUMN "subscriptionTier" TYPE varchar(50);

        UPDATE "users" SET "subscriptionTier" = 'starter' WHERE "subscriptionTier" = 'free';
        UPDATE "users" SET "subscriptionTier" = 'pro' WHERE "subscriptionTier" = 'professional';
        UPDATE "users" SET "subscriptionTier" = 'master' WHERE "subscriptionTier" = 'clinic';

        DROP TYPE IF EXISTS "users_subscriptiontier_enum" CASCADE;
        CREATE TYPE "users_subscriptiontier_enum" AS ENUM ('starter', 'pro', 'master');

        ALTER TABLE "users" ALTER COLUMN "subscriptionTier" TYPE "users_subscriptiontier_enum"
          USING "subscriptionTier"::"users_subscriptiontier_enum";
        ALTER TABLE "users" ALTER COLUMN "subscriptionTier" SET DEFAULT 'starter';
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Error occurred: %', SQLERRM;
      END $$;
    `);
  }
}
