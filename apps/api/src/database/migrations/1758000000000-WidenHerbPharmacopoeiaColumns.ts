import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 약재 공정서 컬럼을 text 로 넓힌다.
 *
 * 1757 마이그레이션이 varchar(200/300/120) 으로 만들었는데, 식약처 데이터의 학명은
 * 이명이 여러 개 병기돼 길이 예측이 안 된다:
 *   "Cinnamomum cassia (L.) J.Presl Cinnamomum cassia (L.) D.Don Cinnamomum cassia Blume"
 * 그 결과 value too long 으로 적재가 통째로 실패했다.
 *
 * 1757 을 고쳐도 이미 applied 로 기록돼 다시 돌지 않으므로 별도 마이그레이션으로 넓힌다.
 * (적용된 마이그레이션을 수정하면 환경마다 스키마가 갈린다 — 새로 추가하는 게 원칙)
 */
export class WidenHerbPharmacopoeiaColumns1758000000000 implements MigrationInterface {
  name = 'WidenHerbPharmacopoeiaColumns1758000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "herbs_master"
        ALTER COLUMN "scientificName" TYPE text,
        ALTER COLUMN "latinName" TYPE text,
        ALTER COLUMN "englishName" TYPE text,
        ALTER COLUMN "medicinalPart" TYPE text,
        ALTER COLUMN "pharmacopoeia" TYPE text
    `);
  }

  public async down(): Promise<void> {
    // 되돌리지 않는다 — 좁히면 기존 값이 잘린다.
  }
}
