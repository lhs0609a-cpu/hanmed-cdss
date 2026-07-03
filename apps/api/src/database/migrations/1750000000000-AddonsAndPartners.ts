import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 수익모델 확장 — 청구 add-on + 파트너 수익 레이어
 *
 * 변경사항:
 *  1. subscription_addons 테이블 (보험청구 등 add-on 별도 구독)
 *  2. partners 테이블 (B2B2C 파트너 제휴)
 *  3. partner_impressions 테이블 (노출/클릭 트래킹)
 */
export class AddonsAndPartners1750000000000 implements MigrationInterface {
  name = 'AddonsAndPartners1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 멱등 보장 — migrationsRun 이 (히스토리 테이블 불일치 등으로) 재실행되어도
    // "already exists" 로 부팅이 폭발하지 않도록 모든 DDL 을 IF NOT EXISTS / DO $$ 가드.
    // ============================================================
    // 1. addon_key / addon_status enum
    // ============================================================
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_addons_addonkey_enum') THEN
          CREATE TYPE "subscription_addons_addonkey_enum" AS ENUM ('insurance_claim');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_addons_status_enum') THEN
          CREATE TYPE "subscription_addons_status_enum" AS ENUM ('active', 'canceled', 'past_due', 'suspended');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_addons_billinginterval_enum') THEN
          CREATE TYPE "subscription_addons_billinginterval_enum" AS ENUM ('monthly', 'yearly');
        END IF;
      END $$;
    `);

    // ============================================================
    // 2. subscription_addons
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscription_addons" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "addonKey" "subscription_addons_addonkey_enum" NOT NULL,
        "status" "subscription_addons_status_enum" NOT NULL DEFAULT 'active',
        "billingInterval" "subscription_addons_billinginterval_enum" NOT NULL DEFAULT 'monthly',
        "unitPrice" integer NOT NULL,
        "currentPeriodStart" timestamp NOT NULL,
        "currentPeriodEnd" timestamp NOT NULL,
        "canceledAt" timestamp,
        "cancelAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_subscription_addons_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 활성 add-on은 사용자-종류 조합 1건만 허용
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_addon_user_key_active"
      ON "subscription_addons" ("userId", "addonKey")
      WHERE "status" != 'canceled'
    `);

    // ============================================================
    // 3. partners
    // ============================================================
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partners_category_enum') THEN
          CREATE TYPE "partners_category_enum" AS ENUM (
            'herb_supplier', 'diagnostic_device', 'pharma', 'medical_supply', 'education'
          );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partners_status_enum') THEN
          CREATE TYPE "partners_status_enum" AS ENUM ('active', 'paused', 'ended');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "partners" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(200) NOT NULL,
        "category" "partners_category_enum" NOT NULL,
        "status" "partners_status_enum" NOT NULL DEFAULT 'active',
        "placements" json NOT NULL,
        "matchCriteria" json,
        "logoUrl" varchar(500),
        "landingUrl" varchar(500) NOT NULL,
        "headline" text,
        "description" text,
        "billingModel" varchar(20) NOT NULL DEFAULT 'cpc',
        "unitPrice" integer NOT NULL DEFAULT 0,
        "monthlyImpressionCap" integer,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_partners_category_status" ON "partners" ("category", "status")
    `);

    // ============================================================
    // 4. partner_impressions
    // ============================================================
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_impressions_placement_enum') THEN
          CREATE TYPE "partner_impressions_placement_enum" AS ENUM (
            'prescription_result_sidebar', 'herb_detail_footer', 'dur_info_panel', 'education_area'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "partner_impressions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "partnerId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "placement" "partner_impressions_placement_enum" NOT NULL,
        "eventType" varchar(20) NOT NULL DEFAULT 'impression',
        "context" json,
        "occurredAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_partner_impressions_partner" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_partner_impressions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_partner_impressions_partner_time"
      ON "partner_impressions" ("partnerId", "occurredAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_partner_impressions_user_time"
      ON "partner_impressions" ("userId", "occurredAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "partner_impressions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "partner_impressions_placement_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "partners"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "partners_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "partners_category_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_addons"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_addons_billinginterval_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_addons_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_addons_addonkey_enum"`);
  }
}
