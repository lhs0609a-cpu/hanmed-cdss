import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 문헌에 한국어 요약 칸을 만든다.
 *
 * 자료실 14,804건 중 한국어는 11건이었다. 나머지는 영어 12,266 · 중국어 2,361.
 * 진료 중에 영어 초록을 읽는 한의사는 거의 없다 — 검색해서 제목만 보고 닫는다.
 * "자료가 있다" 와 "읽는다" 사이의 간극이 이 컬럼 하나에 달려 있다.
 *
 * titleKo 는 이미 있다(원자료에 한국어 제목이 있을 때만 채우던 칸). 이제
 * 기계번역도 여기에 넣되, 원제(title)를 지우지 않고 화면에서 함께 보여준다 —
 * 번역이 미덥지 않을 때 원문으로 바로 갈 수 있어야 한다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class ReferenceKoreanSummary1774000000000 implements MigrationInterface {
  name = 'ReferenceKoreanSummary1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clinical_references"
        ADD COLUMN IF NOT EXISTS "summaryKo" text
    `);
    // 아직 번역 안 된 것을 골라내는 질의가 적재 내내 돈다.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reference_untranslated"
        ON "clinical_references" ("evidenceType")
        WHERE "titleKo" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reference_untranslated"`);
    await queryRunner.query(
      `ALTER TABLE "clinical_references" DROP COLUMN IF EXISTS "summaryKo"`,
    );
  }
}
