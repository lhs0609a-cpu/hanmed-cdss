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
    // 학명은 이명이 여러 개 병기돼 길이 예측이 안 된다
    // ("Cinnamomum cassia (L.) J.Presl Cinnamomum cassia (L.) D.Don ...").
    // varchar 로 잡았다가 길이 초과로 적재가 통째로 실패했다. text 로 둔다.
    await queryRunner.query(`
      ALTER TABLE "herbs_master"
        ADD COLUMN IF NOT EXISTS "scientificName" text,
        ADD COLUMN IF NOT EXISTS "latinName" text,
        ADD COLUMN IF NOT EXISTS "englishName" text,
        ADD COLUMN IF NOT EXISTS "medicinalPart" text,
        ADD COLUMN IF NOT EXISTS "pharmacopoeia" text
    `);
    // 이미 varchar 로 만들어진 환경을 위해 타입을 맞춘다(재실행 안전).
    await queryRunner.query(`
      ALTER TABLE "herbs_master"
        ALTER COLUMN "scientificName" TYPE text,
        ALTER COLUMN "latinName" TYPE text,
        ALTER COLUMN "englishName" TYPE text,
        ALTER COLUMN "medicinalPart" TYPE text,
        ALTER COLUMN "pharmacopoeia" TYPE text
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
