import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 약재 조인 컬럼 이중화 정리.
 *
 * 세 엔티티가 관계는 snake_case JoinColumn 으로, 스칼라는 camelCase @Column 으로
 * 선언돼 있었다:
 *
 *   @ManyToOne(...) @JoinColumn({ name: 'formula_id' }) formula: Formula;
 *   @Column('uuid') formulaId: string;
 *
 * TypeORM 은 이걸 서로 다른 두 컬럼으로 만든다. 결과적으로 INSERT 는 "formulaId" 에
 * 값을 넣는데 관계 조회(leftJoin)는 formula_id 를 보므로, 처방 상세의 구성 약재가
 * 항상 빈 배열로 나왔다. 실제로 처방 429건을 적재하고도 약재가 하나도 안 붙었다.
 *
 * 엔티티에서 JoinColumn 이름을 camelCase 스칼라와 일치시켰고, 여기서는 남아 있는
 * 데이터를 정리한다:
 *   1) 양방향 백필 — 어느 쪽에 값이 있든 반대쪽을 채운다.
 *   2) 레거시 snake 컬럼은 남겨 두고 NULL 허용만 보장한다.
 *      (드롭은 롤백 여지를 없애므로 다음 배포에서 별도로 판단)
 *
 * 멱등: UPDATE ... WHERE IS NULL 이라 재실행해도 변화 없음.
 */
export class ConsolidateHerbJoinColumns1755000000000 implements MigrationInterface {
  name = 'ConsolidateHerbJoinColumns1755000000000';

  private async backfill(
    queryRunner: QueryRunner,
    table: string,
    pairs: Array<[string, string]>,
  ): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT to_regclass('public.${table}') AS t`,
    );
    if (!exists?.[0]?.t) return;

    for (const [camel, snake] of pairs) {
      const cols = await queryRunner.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1 AND column_name IN ($2,$3)`,
        [table, camel, snake],
      );
      const names = cols.map((c: { column_name: string }) => c.column_name);
      if (!names.includes(camel) || !names.includes(snake)) continue;

      // snake → camel (구버전 코드가 쓴 행)
      await queryRunner.query(
        `UPDATE "${table}" SET "${camel}" = "${snake}"
         WHERE "${camel}" IS NULL AND "${snake}" IS NOT NULL`,
      );
      // camel → snake (신버전/시드가 쓴 행) — 구코드 롤백 대비
      await queryRunner.query(
        `UPDATE "${table}" SET "${snake}" = "${camel}"
         WHERE "${snake}" IS NULL AND "${camel}" IS NOT NULL`,
      );
      // 이후 INSERT 가 한쪽만 채워도 막히지 않도록
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${snake}" DROP NOT NULL`,
      );
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.backfill(queryRunner, 'formula_herbs', [
      ['formulaId', 'formula_id'],
      ['herbId', 'herb_id'],
    ]);
    await this.backfill(queryRunner, 'drug_herb_interactions', [['herbId', 'herb_id']]);
    await this.backfill(queryRunner, 'herb_compounds', [['herbId', 'herb_id']]);
  }

  public async down(): Promise<void> {
    // 데이터 백필은 되돌리지 않는다 — 양쪽 컬럼이 같은 값을 갖는 상태는
    // 구버전 코드에서도 정상 동작하므로 롤백할 이유가 없다.
  }
}
