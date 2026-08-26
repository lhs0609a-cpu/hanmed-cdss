import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 안내서가 실제 처방을 말하게 한다.
 *
 * 지금까지 안내서의 약재 목록은 처방명으로 카탈로그를 조회한 결과였다.
 * 임상에서 원방 그대로 쓰는 일은 드물어서, 가감한 처방에 원방이 표시되면
 * 뺀 약재가 있는 것으로, 더한 약재가 없는 것으로 읽혔다. 카탈로그에 없는
 * 처방명이면 목록 자체가 비었다. 소비자원 자료에서 처방 내용을 안 알려준다는
 * 것이 불신의 큰 축이었는데, 틀린 내용을 알려주는 것은 그보다 나쁘다.
 *
 *   herbSource         — 목록 출처(prescription / catalog / none)
 *   herbOrigin         — 원산지·규격 한 줄 ("중국산 아니냐" 에 대한 답)
 *   diagnosis          — 무엇으로 보았는지 (한의사가 확인한 것만)
 *   reviewedDrugCount  — 대조한 양약 가짓수. 상호작용 0건이 '확인함' 인지
 *                        '확인 안 함' 인지 구분한다. 약 이름은 담지 않는다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class GuideTruthfulness1772000000000 implements MigrationInterface {
  name = 'GuideTruthfulness1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "medication_guides"
        ADD COLUMN IF NOT EXISTS "herbSource"        varchar(16) NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS "herbOrigin"        text,
        ADD COLUMN IF NOT EXISTS "diagnosis"         text,
        ADD COLUMN IF NOT EXISTS "reviewedDrugCount" smallint
    `);

    // 이미 발행된 안내서의 목록은 전부 카탈로그 유래다. 'none' 으로 두면
    // 실제 조제인 것처럼 읽힐 수 있으니 출처를 정확히 표시한다.
    await queryRunner.query(`
      UPDATE "medication_guides"
         SET "herbSource" = 'catalog'
       WHERE "herbSource" = 'none'
         AND jsonb_array_length(COALESCE("herbs", '[]'::jsonb)) > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "medication_guides"
        DROP COLUMN IF EXISTS "herbSource",
        DROP COLUMN IF EXISTS "herbOrigin",
        DROP COLUMN IF EXISTS "diagnosis",
        DROP COLUMN IF EXISTS "reviewedDrugCount"
    `);
  }
}
