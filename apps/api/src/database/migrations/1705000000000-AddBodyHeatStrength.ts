import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBodyHeatStrength1705000000000 implements MigrationInterface {
  name = 'AddBodyHeatStrength1705000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 체열 Enum 생성
    await queryRunner.query(`
      CREATE TYPE "body_heat_enum" AS ENUM ('cold', 'neutral', 'hot')
    `);

    // 근실도 Enum 생성
    await queryRunner.query(`
      CREATE TYPE "body_strength_enum" AS ENUM ('deficient', 'neutral', 'excess')
    `);

    // 처방 한열 성질 Enum 생성
    await queryRunner.query(`
      CREATE TYPE "formula_heat_nature_enum" AS ENUM ('cold', 'cool', 'neutral', 'warm', 'hot')
    `);

    // 처방 보사 성질 Enum 생성
    await queryRunner.query(`
      CREATE TYPE "formula_strength_nature_enum" AS ENUM ('tonifying', 'neutral', 'draining')
    `);

    // clinical_cases 테이블에 체열/근실도 필드 추가
    await queryRunner.query(`
      ALTER TABLE "clinical_cases"
      ADD COLUMN "bodyHeat" "body_heat_enum",
      ADD COLUMN "bodyStrength" "body_strength_enum",
      ADD COLUMN "bodyHeatScore" integer,
      ADD COLUMN "bodyStrengthScore" integer
    `);

    // patient_accounts 테이블에 체열/근실도 필드 추가
    await queryRunner.query(`
      ALTER TABLE "patient_accounts"
      ADD COLUMN "bodyHeat" "body_heat_enum",
      ADD COLUMN "bodyStrength" "body_strength_enum",
      ADD COLUMN "bodyHeatScore" integer,
      ADD COLUMN "bodyStrengthScore" integer
    `);

    // patient_records 테이블에 체열/근실도 필드 추가
    await queryRunner.query(`
      ALTER TABLE "patient_records"
      ADD COLUMN "bodyHeat" "body_heat_enum",
      ADD COLUMN "bodyStrength" "body_strength_enum",
      ADD COLUMN "bodyHeatScore" integer,
      ADD COLUMN "bodyStrengthScore" integer
    `);

    // formulas 테이블에 처방 성질 필드 추가
    await queryRunner.query(`
      ALTER TABLE "formulas"
      ADD COLUMN "heatNature" "formula_heat_nature_enum",
      ADD COLUMN "strengthNature" "formula_strength_nature_enum",
      ADD COLUMN "suitableBodyHeat" "body_heat_enum"[],
      ADD COLUMN "suitableBodyStrength" "body_strength_enum"[],
      ADD COLUMN "contraindicatedBodyHeat" "body_heat_enum"[],
      ADD COLUMN "contraindicatedBodyStrength" "body_strength_enum"[]
    `);

    // 인덱스 추가 (검색 성능 향상)
    await queryRunner.query(`
      CREATE INDEX "IDX_clinical_cases_body_heat" ON "clinical_cases" ("bodyHeat")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_clinical_cases_body_strength" ON "clinical_cases" ("bodyStrength")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_patient_accounts_body_heat" ON "patient_accounts" ("bodyHeat")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_patient_accounts_body_strength" ON "patient_accounts" ("bodyStrength")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_formulas_heat_nature" ON "formulas" ("heatNature")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_formulas_strength_nature" ON "formulas" ("strengthNature")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 삭제
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_formulas_strength_nature"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_formulas_heat_nature"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patient_accounts_body_strength"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patient_accounts_body_heat"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clinical_cases_body_strength"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clinical_cases_body_heat"`);

    // formulas 테이블 필드 삭제
    await queryRunner.query(`
      ALTER TABLE "formulas"
      DROP COLUMN IF EXISTS "contraindicatedBodyStrength",
      DROP COLUMN IF EXISTS "contraindicatedBodyHeat",
      DROP COLUMN IF EXISTS "suitableBodyStrength",
      DROP COLUMN IF EXISTS "suitableBodyHeat",
      DROP COLUMN IF EXISTS "strengthNature",
      DROP COLUMN IF EXISTS "heatNature"
    `);

    // patient_records 테이블 필드 삭제
    await queryRunner.query(`
      ALTER TABLE "patient_records"
      DROP COLUMN IF EXISTS "bodyStrengthScore",
      DROP COLUMN IF EXISTS "bodyHeatScore",
      DROP COLUMN IF EXISTS "bodyStrength",
      DROP COLUMN IF EXISTS "bodyHeat"
    `);

    // patient_accounts 테이블 필드 삭제
    await queryRunner.query(`
      ALTER TABLE "patient_accounts"
      DROP COLUMN IF EXISTS "bodyStrengthScore",
      DROP COLUMN IF EXISTS "bodyHeatScore",
      DROP COLUMN IF EXISTS "bodyStrength",
      DROP COLUMN IF EXISTS "bodyHeat"
    `);

    // clinical_cases 테이블 필드 삭제
    await queryRunner.query(`
      ALTER TABLE "clinical_cases"
      DROP COLUMN IF EXISTS "bodyStrengthScore",
      DROP COLUMN IF EXISTS "bodyHeatScore",
      DROP COLUMN IF EXISTS "bodyStrength",
      DROP COLUMN IF EXISTS "bodyHeat"
    `);

    // Enum 타입 삭제
    await queryRunner.query(`DROP TYPE IF EXISTS "formula_strength_nature_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "formula_heat_nature_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "body_strength_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "body_heat_enum"`);
  }
}
