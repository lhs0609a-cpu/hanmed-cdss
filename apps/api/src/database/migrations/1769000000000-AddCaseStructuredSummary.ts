import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 치험례 구조화 요약 컬럼.
 *
 * 원문이 한 덩어리라 임상에서 읽을 수가 없다. 6,454건 중 817건이 4천자를 넘고,
 * 371건은 "다음은 ○○의 경험이다" 로 다른 사람 사례가 이어 붙어 있으며,
 * 106건은 다른 처방의 교과서 해설까지 들어 있다. 실제로 한 행에 사군자탕 치험례 +
 * 시험복용례 + 급유방 인용 + 거원전 해설 + 활용사례가 함께 들어 있는 것을 확인했다.
 *
 * 저장된 처방명이 본문과 어긋나는 경우도 있다(그 행의 저장 이름은 보중익기탕인데
 * 본문은 사군자탕). 덮어쓰지 않고 verifiedFormulaName 에 따로 담아 화면에서
 * 어긋남을 알린다 — 근거로 쓰는 데이터라 조용히 바꾸면 안 된다.
 *
 * 멱등: IF NOT EXISTS.
 */
export class AddCaseStructuredSummary1769000000000 implements MigrationInterface {
  name = 'AddCaseStructuredSummary1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clinical_cases"
        ADD COLUMN IF NOT EXISTS "summaryOneLine" text,
        ADD COLUMN IF NOT EXISTS "keyFindings" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "patternReasoning" text,
        ADD COLUMN IF NOT EXISTS "modification" text,
        ADD COLUMN IF NOT EXISTS "courseSteps" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "distinctive" text,
        ADD COLUMN IF NOT EXISTS "verifiedFormulaName" varchar(128),
        ADD COLUMN IF NOT EXISTS "formulaMismatch" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "hasMixedContent" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "summarizedAt" timestamptz
    `);
    // 아직 정리 안 된 것부터 훑을 때 쓴다.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clinical_cases_summarized"
        ON "clinical_cases" ("summarizedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clinical_cases_summarized"`);
    await queryRunner.query(`
      ALTER TABLE "clinical_cases"
        DROP COLUMN IF EXISTS "summaryOneLine",
        DROP COLUMN IF EXISTS "keyFindings",
        DROP COLUMN IF EXISTS "patternReasoning",
        DROP COLUMN IF EXISTS "modification",
        DROP COLUMN IF EXISTS "courseSteps",
        DROP COLUMN IF EXISTS "distinctive",
        DROP COLUMN IF EXISTS "verifiedFormulaName",
        DROP COLUMN IF EXISTS "formulaMismatch",
        DROP COLUMN IF EXISTS "hasMixedContent",
        DROP COLUMN IF EXISTS "summarizedAt"
    `);
  }
}
