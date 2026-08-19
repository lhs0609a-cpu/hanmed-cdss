import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

/**
 * 한자 표기로만 남아 있는 약재 행을 정리한다.
 *
 * 이름 정규화를 한 번 돌렸는데도 두 건이 한자 그대로 남아 있었다.
 * 환자용 복약 안내서에 그대로 나가면서 드러났다 — 환자에게 「當歸身」 을
 * 보여 줄 수는 없다.
 *
 *   知母  → 이미 있는 '지모' 로 합친다(같은 약재가 두 행으로 갈려 있다).
 *   當歸身 → '당귀신' 으로 이름만 바꾼다(당귀의 부위 표기라 별도 항목이 맞다).
 *
 * 합칠 때는 처방 구성(formula_herbs)의 참조를 먼저 옮기고, 옮긴 뒤 중복이
 * 생기면(같은 처방에 두 행이 다 들어 있던 경우) 하나만 남긴다.
 *
 * 멱등: 이미 정리됐으면 아무것도 하지 않는다.
 *
 * 실행: npx ts-node -r tsconfig-paths/register src/database/seeds/merge-hanja-herb-rows.ts [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');

/** 합칠 대상: 한자 표기 → 이미 존재하는 한글 이름 */
const MERGE_INTO: Record<string, string> = {
  知母: '지모',
};

/** 이름만 바꿀 대상: 한자 표기 → 한글 이름 */
const RENAME: Record<string, string> = {
  當歸身: '당귀신',
};

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();

  try {
    for (const [hanja, korean] of Object.entries(MERGE_INTO)) {
      const [src] = await ds.query(
        `SELECT "id" FROM "herbs_master" WHERE "standardName" = $1`,
        [hanja],
      );
      const [dst] = await ds.query(
        `SELECT "id" FROM "herbs_master" WHERE "standardName" = $1`,
        [korean],
      );
      if (!src) {
        console.log(`[merge] ${hanja} 없음 — 건너뜀`);
        continue;
      }
      if (!dst) {
        console.log(`[merge] ${korean} 가 없어 합칠 대상이 없음 — 건너뜀`);
        continue;
      }
      const refs = await ds.query(
        `SELECT COUNT(*)::int AS n FROM "formula_herbs" WHERE "herbId" = $1`,
        [src.id],
      );
      console.log(`[merge] ${hanja} → ${korean} (처방 참조 ${refs[0].n}건)`);
      if (DRY_RUN) continue;

      // 같은 처방에 두 행이 다 들어 있으면 옮기는 순간 중복이 된다.
      // 먼저 그런 행을 지우고 나머지를 옮긴다.
      await ds.query(
        `DELETE FROM "formula_herbs" fh
          WHERE fh."herbId" = $1
            AND EXISTS (
              SELECT 1 FROM "formula_herbs" o
               WHERE o."formulaId" = fh."formulaId" AND o."herbId" = $2
            )`,
        [src.id, dst.id],
      );
      await ds.query(`UPDATE "formula_herbs" SET "herbId" = $1 WHERE "herbId" = $2`, [
        dst.id,
        src.id,
      ]);
      await ds.query(`DELETE FROM "herbs_master" WHERE "id" = $1`, [src.id]);
      console.log(`[merge] 완료`);
    }

    for (const [hanja, korean] of Object.entries(RENAME)) {
      const [row] = await ds.query(
        `SELECT "id", "hanjaName" FROM "herbs_master" WHERE "standardName" = $1`,
        [hanja],
      );
      if (!row) {
        console.log(`[rename] ${hanja} 없음 — 건너뜀`);
        continue;
      }
      console.log(`[rename] ${hanja} → ${korean}`);
      if (DRY_RUN) continue;
      await ds.query(
        `UPDATE "herbs_master"
            SET "standardName" = $1,
                "hanjaName" = COALESCE(NULLIF("hanjaName", ''), $2)
          WHERE "id" = $3`,
        [korean, hanja, row.id],
      );
    }

    const left = await ds.query(
      `SELECT "standardName" FROM "herbs_master" WHERE "standardName" !~ '[가-힣]'`,
    );
    console.log(
      left.length === 0
        ? '\n한자만 남은 약재 없음 ✓'
        : `\n아직 한자만 남은 약재: ${left.map((r: { standardName: string }) => r.standardName).join(', ')}`,
    );
  } finally {
    await ds.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[merge-hanja-herb-rows] 실패:', e);
    process.exit(1);
  });
