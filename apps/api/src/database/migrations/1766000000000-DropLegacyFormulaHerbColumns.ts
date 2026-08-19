import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * formula_herbs 의 옛 스네이크케이스 FK 컬럼을 걷어낸다.
 *
 * 1755 에서 조인 컬럼을 formulaId/herbId 로 통일했지만 옛 컬럼(formula_id,
 * herb_id)과 그 외래키가 그대로 남아 있었다. 지금 2,653행 중 242행은
 * herbId 와 herb_id 가 서로 다른 약재를 가리킨다 — 죽은 데이터다.
 *
 * 남아 있으면 두 가지가 계속 터진다.
 *   1. 약재 행을 지우거나 합칠 때 옛 외래키가 막는다(실제로 막혔다).
 *   2. 누가 옛 컬럼을 읽으면 다른 처방 구성이 나온다.
 *
 * 엔티티와 애플리케이션 코드는 전부 camelCase 컬럼만 쓴다.
 *
 * 되돌릴 수 없다 — 되살려도 값이 틀린 컬럼이라 복구할 의미가 없다.
 */
export class DropLegacyFormulaHerbColumns1766000000000 implements MigrationInterface {
  name = 'DropLegacyFormulaHerbColumns1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "formula_herbs"
        DROP COLUMN IF EXISTS "formula_id",
        DROP COLUMN IF EXISTS "herb_id"
    `);
  }

  public async down(): Promise<void> {
    // 값이 이미 틀어져 있던 컬럼이라 되살리지 않는다.
  }
}
