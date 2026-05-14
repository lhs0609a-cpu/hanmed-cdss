import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * clinical_cases 에 임베딩 컬럼 추가.
 *
 * - embedding: OpenAI text-embedding-3-small (1536차원) jsonb 배열
 * - embedded_at: 생성 시각
 *
 * pgvector 미설치 환경에서도 동작. 운영에서 검색 빈도가 높아지면
 * pgvector + IVFFlat 인덱스로 별도 마이그레이션할 수 있다.
 */
export class AddCaseEmbedding1749000000000 implements MigrationInterface {
  name = 'AddCaseEmbedding1749000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "embedding" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" ADD COLUMN IF NOT EXISTS "embedded_at" timestamp`,
    );
    // 미임베딩 행을 빨리 찾기 위한 부분 인덱스
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_clinical_cases_no_embedding" ON "clinical_cases" ("id") WHERE "embedding" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_clinical_cases_no_embedding"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "embedded_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_cases" DROP COLUMN IF EXISTS "embedding"`,
    );
  }
}
