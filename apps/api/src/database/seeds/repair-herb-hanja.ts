import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

/**
 * 약재 마스터의 한자명 오류를 고친다.
 *
 * 왜 — 한자명은 처방 구성과 대조하는 열쇠다. 그런데 작약 행의 한자가 澤瀉
 * (택사)로 들어가 있었다. 그래서 처방의 芍藥 은 마스터에서 못 찾고, 반대로
 * 澤瀉 를 찾으면 작약 행("보혈약 · 혈액 순환과 경련 완화")이 나온다.
 * 상호작용·배합금기 판정이 엉뚱한 약재로 가는 경로다.
 *
 * 247행을 모델로 감사해 45행이 걸렸지만 17행은 자기모순(같은 걸 다르다고 함)
 * 이었고, 남은 28행을 사람이 확인해 아래 목록만 남겼다. 효능·분류 설명은
 * 한글명 기준으로 맞아서 건드리지 않는다 — 틀린 것은 한자명뿐이다.
 *
 * 안전 데이터라 손으로 검증한 것만 고친다. 모델 제안을 그대로 쓰지 않는다.
 *
 * 실행: npx ts-node ... repair-herb-hanja.ts [--apply]
 *       기본은 미리보기. --apply 를 줘야 실제로 쓴다.
 */
const APPLY = process.argv.includes('--apply');

/** 한글명 → 올바른 한자명. 사람이 확인한 것만. */
const FIXES: Array<[string, string, string]> = [
  ['작약', '芍藥', '澤瀉(택사)가 들어가 있었다'],
  ['마늘', '大蒜', '山藥(산약)이 들어가 있었다'],
  ['엿기름', '麥芽', '薏苡仁(의이인)이 들어가 있었다'],
  ['편귤', '片橘', '片芩(편금)이 들어가 있었다'],
  ['나팔꽃씨', '牽牛子', '蘿菔子(내복자)가 들어가 있었다'],
];

/**
 * 법제·수치 접미사만 붙은 경우 — 약재는 맞으니 한자만 다듬는다.
 * 阿膠珠→阿膠 처럼 별개 제품으로 보는 견해도 있어 원본은 aliases 로 남길
 * 수 있으나, 지금 aliases 는 247행 전부 비어 있어 여기서는 한자만 고친다.
 */
const SUFFIX_FIXES: Array<[string, string]> = [
  ['두충', '杜仲'],
  ['갈근', '葛根'],
  ['삼릉', '三稜'],
  ['산약', '山藥'],
  ['택사', '澤瀉'],
  ['아교', '阿膠'],
  ['모근', '茅根'],
  ['부추', '韭菜'],
  ['연엽', '荷葉'],
  ['연절', '藕節'],
  ['사군자', '使君子'],
  ['상표초', '桑螵蛸'],
  ['육두구', '肉豆蔲'],
  ['천산갑', '穿山甲'],
  ['대두', '大豆'],
  ['매실', '梅實'],
  ['쑥', '艾'],
  ['소합향', '蘇合香'],
];

const REINSTATE: Array<{ korean: string; hanja: string; category: string }> = [
  { korean: '의이인', hanja: '薏苡仁', category: '이수약' },
];

(async () => {
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  let changed = 0;

  const run = async (korean: string, hanja: string, why: string) => {
    const [row] = await ds.query(
      `SELECT "id","hanjaName" FROM "herbs_master" WHERE "standardName" = $1 LIMIT 1`,
      [korean],
    );
    if (!row) {
      console.log(`  건너뜀 ${korean} — 행이 없다`);
      return;
    }
    if (row.hanjaName === hanja) return;
    console.log(`  ${korean}: ${row.hanjaName} → ${hanja}${why ? `  (${why})` : ''}`);
    if (APPLY) {
      await ds.query(`UPDATE "herbs_master" SET "hanjaName" = $1 WHERE "id" = $2`, [
        hanja,
        row.id,
      ]);
    }
    changed++;
  };

  console.log('[한자명 오류 — 다른 약재가 들어가 있던 것]');
  for (const [k, h, why] of FIXES) await run(k, h, why);

  console.log('\n[법제·수치 접미사 정리]');
  for (const [k, h] of SUFFIX_FIXES) await run(k, h, '');

  for (const r of REINSTATE) {
    const [exists] = await ds.query(
      `SELECT "id" FROM "herbs_master" WHERE "standardName" = $1 OR "hanjaName" = $2 LIMIT 1`,
      [r.korean, r.hanja],
    );
    if (exists) continue;
    console.log(`  되살림 ${r.korean} (${r.hanja})`);
    if (APPLY) {
      await ds.query(
        `INSERT INTO "herbs_master" ("standardName","hanjaName","category") VALUES ($1, $2, $3)`,
        [r.korean, r.hanja, r.category],
      );
    }
    changed++;
  }

  console.log(
    `\n${APPLY ? '적용' : '미리보기'} — ${changed}행${APPLY ? ' 수정됨' : ' 수정 예정 (--apply 로 실행)'}`,
  );
  await ds.destroy();
})();
