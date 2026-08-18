import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 단방 치험례의 약재명 컬럼.
 *
 * 치험례 6,454건 중 1,800건 가까이가 방제가 아니라 단방·식용약초 사례다
 * (`●오미자(식용약초) 알레르기성 비염...`). 처방명이 없다는 이유로 약재 화면에서
 * 빠져 있었다. 원문 첫 줄에서 뽑아 이 컬럼에 저장하면 인덱스로 빠르게 찾을 수 있다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class AddSingleHerbToCases1756000000000 implements MigrationInterface {
  name = 'AddSingleHerbToCases1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clinical_cases"
      ADD COLUMN IF NOT EXISTS "singleHerb" varchar(64) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clinical_cases_single_herb"
        ON "clinical_cases" ("singleHerb")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clinical_cases_single_herb"`);
    await queryRunner.query(`ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "singleHerb"`);
  }
}
