import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1703200000000 implements MigrationInterface {
  name = 'InitialSchema1703200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users 테이블
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL UNIQUE,
        "password" varchar(255) NOT NULL,
        "name" varchar(100) NOT NULL,
        "role" varchar(50) DEFAULT 'user',
        "subscription_tier" varchar(50) DEFAULT 'starter',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    // Herbs Master 테이블
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "herbs_master" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "korean_name" varchar(100) NOT NULL,
        "chinese_name" varchar(100),
        "scientific_name" varchar(200),
        "category" varchar(100),
        "properties" varchar(100),
        "meridians" text[],
        "functions" text,
        "contraindications" text,
        "created_at" timestamp DEFAULT now()
      )
    `);

    // Drug-Herb Interactions 테이블
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "drug_herb_interactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "drug_name" varchar(200) NOT NULL,
        "herb_name" varchar(200) NOT NULL,
        "severity" varchar(20) NOT NULL DEFAULT 'info',
        "mechanism" text,
        "clinical_effect" text,
        "recommendation" text,
        "evidence_level" varchar(50),
        "references" text[],
        "created_at" timestamp DEFAULT now()
      )
    `);

    // Clinical Cases 테이블
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clinical_cases" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "case_number" varchar(50),
        "patient_gender" varchar(10),
        "patient_age" int,
        "chief_complaint" text,
        "symptoms" text[],
        "diagnosis" text,
        "treatment_principle" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    // Prescriptions 테이블
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prescriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "case_id" uuid REFERENCES "clinical_cases"("id") ON DELETE CASCADE,
        "prescription_name" varchar(200),
        "herbs" jsonb,
        "preparation_method" text,
        "dosage_instructions" text,
        "treatment_duration" varchar(100),
        "outcome" text,
        "follow_up_notes" text,
        "created_at" timestamp DEFAULT now()
      )
    `);

    // 인덱스 생성
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_herbs_korean_name" ON "herbs_master"("korean_name")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_interactions_drug" ON "drug_herb_interactions"("drug_name")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_interactions_herb" ON "drug_herb_interactions"("herb_name")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cases_diagnosis" ON "clinical_cases"("diagnosis")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "prescriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clinical_cases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "drug_herb_interactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "herbs_master"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
