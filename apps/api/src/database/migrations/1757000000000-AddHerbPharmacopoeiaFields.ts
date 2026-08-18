import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 약재의 공정서(약전) 정보 컬럼.
 *
 * 지금 약재 마스터의 성미귀경·효능은 AI 가 고전 기술을 정리한 참고값이다.
 * 식약처 생약 약재정보 API(대한민국약전 근거, 2,060건)에서 받은 공식 값 —
 * 학명·라틴생약명·영문명·약용부위·근거공정서 — 를 따로 담아
 * 화면에서 출처를 구분해 보여줄 수 있게 한다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class AddHerbPharmacopoeiaFields1757000000000 implements MigrationInterface {
  name = 'AddHerbPharmacopoeiaFields1757000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "herbs_master"
        ADD COLUMN IF NOT EXISTS "scientificName" varchar(200),
        ADD COLUMN IF NOT EXISTS "latinName" varchar(300),
        ADD COLUMN IF NOT EXISTS "englishName" varchar(200),
        ADD COLUMN IF NOT EXISTS "medicinalPart" varchar(200),
        ADD COLUMN IF NOT EXISTS "pharmacopoeia" varchar(120)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "herbs_master"
        DROP COLUMN IF EXISTS "scientificName",
        DROP COLUMN IF EXISTS "latinName",
        DROP COLUMN IF EXISTS "englishName",
        DROP COLUMN IF EXISTS "medicinalPart",
        DROP COLUMN IF EXISTS "pharmacopoeia"
    `);
  }
}
