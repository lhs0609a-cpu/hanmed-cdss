import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 엔티티↔DB 컬럼 드리프트 정리 — 운영에서 500 을 내던 두 컬럼을 맞춘다.
 *
 * 1) clinical_cases."embeddedAt"
 *    AddCaseEmbedding 마이그레이션이 snake_case("embedded_at")로 만들었는데,
 *    ClinicalCase 엔티티는 name 옵션 없이 `embeddedAt` 으로 선언돼 있다.
 *    TypeORM 기본 네이밍 전략은 프로퍼티명을 그대로 컬럼명으로 쓰므로
 *    조회 시 `column c.embeddedAt does not exist` 로 폭발했다.
 *    → 치험례 목록(/cases), 커뮤니티 글 목록(/community/posts) 전체 500.
 *
 * 2) herbs."efficacyTags"
 *    Herb 엔티티에는 있으나 이를 생성하는 마이그레이션이 아예 없었다.
 *    dev 는 synchronize 가 만들어줘서 드러나지 않았고, synchronize 가 꺼진
 *    운영에서만 `column herb.efficacyTags does not exist` 로 터졌다.
 *    → 약재 검색(/herbs), 재고(/inventory/items, /inventory/alerts) 500.
 *
 * 멱등: 컬럼 존재 여부를 검사하고 IF NOT EXISTS 를 쓴다. 재실행 안전.
 */
export class FixEntitySchemaDrift1753000000000 implements MigrationInterface {
  name = 'FixEntitySchemaDrift1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) embedded_at → embeddedAt (있으면 rename, 없으면 신규 생성)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clinical_cases' AND column_name = 'embedded_at'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clinical_cases' AND column_name = 'embeddedAt'
        ) THEN
          ALTER TABLE "clinical_cases" RENAME COLUMN "embedded_at" TO "embeddedAt";
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "clinical_cases"
      ADD COLUMN IF NOT EXISTS "embeddedAt" timestamp NULL
    `);
    // embedding 컬럼도 같은 마이그레이션에서 만들어졌으나 이름은 일치한다(방어적으로 보강).
    await queryRunner.query(`
      ALTER TABLE "clinical_cases"
      ADD COLUMN IF NOT EXISTS "embedding" jsonb NULL
    `);

    // 2) herbs.efficacyTags — Herb 엔티티는 text[] (@Column('text', { array: true }))
    await queryRunner.query(`
      ALTER TABLE "herbs"
      ADD COLUMN IF NOT EXISTS "efficacyTags" text[] NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "herbs" DROP COLUMN IF EXISTS "efficacyTags"
    `);
    // embeddedAt 은 원래 이름으로 되돌린다(데이터 보존).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clinical_cases' AND column_name = 'embeddedAt'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'clinical_cases' AND column_name = 'embedded_at'
        ) THEN
          ALTER TABLE "clinical_cases" RENAME COLUMN "embeddedAt" TO "embedded_at";
        END IF;
      END $$;
    `);
  }
}
