import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 약재에 식물분류학 과명(科名) 칸을 더한다.
 *
 * category 를 쓰지 않는 이유 — 그쪽은 본초학 효능 분류(청열약·보기약)다.
 * 식약처 생약 분류군 API 가 주는 것은 기원 식물의 학술 분류(과·속·종)라
 * 축이 다르다. 한 칸에 담으면 죽여가 '화담약' 인지 '벼과' 인지 알 수 없게 된다.
 */
export class AddHerbTaxonomy1770000000000 implements MigrationInterface {
  name = 'AddHerbTaxonomy1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "herbs_master" ADD COLUMN IF NOT EXISTS "taxonomy" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "herbs_master" DROP COLUMN IF EXISTS "taxonomy"`,
    );
  }
}
