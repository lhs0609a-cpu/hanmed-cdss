import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { CaseCorpus, ClinicalCase } from '../entities/clinical-case.entity';

/**
 * 고전 의안의 약재 구성을 원문에서 뽑아 herbalFormulas 에 채운다.
 *
 * 왜 필요한가 — 中醫笈成 7,920건이 전부 '처방 미기재'로 떠 있었다. 원문이
 * 없어서가 아니라 시더가 본문만 넣고 약재 칸을 비워 둔 채였다. 원문은
 * 이렇게 생겼다:
 *
 *   [丁甘仁醫案 · 卷六 · 便血案 · 丁甘仁 撰 · 民國]
 *   施左　身熱六七日不退，大便膿血…今擬白頭翁湯加味，清解伏邪，苦化濕熱。
 *   白頭翁（三錢）　炒黃芩（一錢五分）　地榆炭（一錢五分）　杜赤豆（五錢）…
 *
 * 마지막 줄이 약재 구성이다. 전각 공백(U+3000)으로 나뉘고 용량은 괄호에 든다.
 * 서지 머리글 → 변증 서술 → 약재 줄의 차례가 87종 전체에서 지켜진다.
 *
 * 규칙으로 읽는 이유 — 약재명과 용량은 그대로 처방으로 이어지는 값이다.
 * 모델에 넘기면 潼沙苑을 沙苑子로, 一錢五分을 1.5돈으로 바꿔 적는다.
 * 원문 글자를 그대로 옮기고, 못 읽으면 비워 둔다.
 *
 * 방명은 본문이 밝힌 것만 — 의안 다수가 自擬方이라 이름이 없다. 擬白頭翁湯,
 * 胃苓湯主之, （至寶丹） 처럼 원문에 적힌 것만 취하고, 약재만 있는 경우는
 * 방명을 비워 둔다. 그럴듯한 이름을 붙이면 근거가 아니라 창작이 된다.
 *
 * 재진은 따로 — 又로 이어지는 회차마다 처방이 바뀐다. 약재 줄 하나가 처방
 * 하나다. 합쳐 놓으면 麥冬이 두 번 든 이상한 처방이 된다.
 *
 * 멱등: 이미 herbalFormulas 가 찬 행은 건너뛴다(--force 로 다시 쓴다).
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/parse-classical-formulas.ts [--force] [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 0;

/** 토큰 구분자 — 전각 공백이 기본이고 일반 공백도 섞여 있다. */
const SEP = /[　\s]+/;
/** 약재명（용량·포제）. 꼬리 문장부호 하나까지 허용한다. */
const TOKEN = /^([一-鿿□]{1,10})(?:[（(]([^）)]{1,60})[）)])?[。，、]?$/;
/** 방제 이름의 꼬리 글자 */
const FORMULA_TAIL = /(湯|散|丸|飲|飮|膏|丹|煎|片|錠|酒|露|法)$/;
/** 원문이 처방을 밝히는 자리 — 議擬白頭翁湯, 治以四獸飲 */
const NAMED_BY_VERB =
  /(?:擬|用|與|投|進|服|宗|仿|主以|治以|佐以|議|以)+([一-鿿]{2,8}?(?:湯|散|丸|飲|飮|膏|丹|煎))/;
/** 胃苓湯主之, 補中益氣湯加茯神, 至寶丹三分 */
const NAMED_BY_TAIL =
  /([一-鿿]{2,8}?(?:湯|散|丸|飲|飮|膏|丹|煎))(?:主之|治之|加減|送下|泛丸|一服|去|加|合|[0-9一-鿿]{1,3}[錢分兩])/;
/** 괄호 안에 방명만 적어 둔 것 — （至寶丹） */
const NAMED_IN_PAREN = /[（(]([一-鿿]{2,8}(?:湯|散|丸|飲|飮|膏|丹|煎))[）)]/;
/** 방명 앞에 붙어 새어 들어오는 동사 — 用仲景附子瀉心湯 의 用 */
const LEADING_VERB = /^(?:擬|用|與|投|進|服|宗|仿|議|以|照)+/;

const stripParens = (s: string): string => s.replace(/[（(][^）)]*[）)]/g, '');

type Herb = { name: string; amount: string };

/** 이 줄이 약재 나열인가. 괄호 밖 문장부호가 거의 없어야 한다. */
function asHerbLine(line: string): string[] | null {
  const toks = line.split(SEP).filter(Boolean);
  if (toks.length < 2) return null;
  const shaped = toks.filter((t) => TOKEN.test(t)).length;
  const punct = (stripParens(line).match(/[。，、；：？！]/g) || []).length;
  if (shaped / toks.length < 0.8 || punct > 1) return null;
  return toks;
}

/**
 * 약재가 아니라 조제 지시인 토큰.
 *
 * 약재 줄 사이에 '三味另煎汁', '水泛丸', '煎湯代水' 같은 지시가 끼어 있다.
 * 그대로 두면 약재 목록에 '煎湯□之'가 약재로 뜬다.
 *
 * 薑汁·藕汁·梨汁은 지시가 아니라 실제로 쓰는 약이므로 남긴다 —
 * 汁으로 끝난다는 이유만으로 버리면 233건의 생강즙이 사라진다.
 */
const PREPARATION =
  /(^[一二三四五六七八九十百]+味|後[一二三四五六七八九十]+味|泛丸|和丸|代水|另煎|研末|研細|調服|送下|衝入|沖服|煎湯|去滓|水[一二三四五六七八九十]|滾水)/;

function toHerbs(toks: string[]): Herb[] {
  const out: Herb[] = [];
  for (const t of toks) {
    const m = TOKEN.exec(t);
    if (!m) continue;
    if (PREPARATION.test(m[1])) continue;
    out.push({ name: m[1], amount: (m[2] ?? '').trim() });
  }
  return out;
}

export interface ParsedFormula {
  formulaName: string;
  herbs: Herb[];
}

export function parseClassical(text: string): ParsedFormula[] {
  const lines = (text ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const herbLines: string[][] = [];
  const prose: string[] = [];
  for (const line of lines) {
    if (line.startsWith('[')) continue; // 서지 머리글
    const toks = asHerbLine(line);
    if (toks) herbLines.push(toks);
    else prose.push(line);
  }

  // 약재가 본문 줄 끝에 이어 붙은 서적이 있다(臨證指南醫案 일부).
  // 마지막 마침표 뒤 꼬리만 떼어 다시 본다.
  if (herbLines.length === 0) {
    for (const p of prose) {
      const cut = p.lastIndexOf('。');
      const tail = cut >= 0 ? p.slice(cut + 1).trim() : '';
      if (tail.length < 4) continue;
      const toks = asHerbLine(tail);
      if (toks) {
        herbLines.push(toks);
        break;
      }
    }
  }

  // 약재 줄 뒤에 四味和丸，大棗一個去核… 같은 조제 지시가 붙는 경우가 있다.
  // 첫 쉼표 앞까지만 약재로 본다.
  if (herbLines.length === 0) {
    for (const p of prose) {
      const head = p.split('，')[0].trim();
      if (head.length < 4) continue;
      const toks = asHerbLine(head);
      if (toks) {
        herbLines.push(toks);
        break;
      }
    }
  }

  let named = '';
  for (const p of prose) {
    const bare = stripParens(p);
    const m = NAMED_BY_VERB.exec(bare) || NAMED_BY_TAIL.exec(bare);
    if (m) {
      named = m[1].replace(LEADING_VERB, '');
      break;
    }
  }
  if (!named) {
    for (const p of prose) {
      const m = NAMED_IN_PAREN.exec(p);
      if (m) {
        named = m[1];
        break;
      }
    }
  }

  // 약재 줄 하나가 처방 하나다 — 재진마다 처방이 바뀐다.
  const formulas: ParsedFormula[] = herbLines.map((toks) => {
    const herbs = toHerbs(toks);
    // 방명 한 개만 적힌 줄(河車大造丸)은 약재가 아니라 처방 이름이다.
    if (herbs.length === 1 && FORMULA_TAIL.test(herbs[0].name)) {
      return { formulaName: herbs[0].name, herbs: [] };
    }
    return { formulaName: '', herbs };
  });

  // 본문이 밝힌 방명은 첫 처방에만 단다. 회차마다 다른 약을 쓰는데 같은
  // 이름을 돌려 붙이면 없는 사실이 생긴다.
  if (named && formulas.length && !formulas[0].formulaName) {
    formulas[0].formulaName = named;
  }
  if (named && formulas.length === 0) {
    formulas.push({ formulaName: named, herbs: [] });
  }

  return formulas.filter((f) => f.formulaName || f.herbs.length);
}

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log('[classical] DB 연결됨');

  try {
    const repo = ds.getRepository(ClinicalCase);
    const qb = repo
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c."sourceId" AS "sourceId"',
        'c."originalText" AS "originalText"',
      ])
      .where('c.corpus = :corpus', { corpus: CaseCorpus.CLASSICAL });
    if (!FORCE) {
      qb.andWhere(
        `(c."herbalFormulas" IS NULL OR jsonb_array_length(c."herbalFormulas") = 0)`,
      );
    }
    if (LIMIT) qb.limit(LIMIT);

    const rows: Array<{ id: string; sourceId: string; originalText: string }> =
      await qb.getRawMany();
    console.log(`[classical] 대상 ${rows.length}건`);

    let filled = 0;
    let named = 0;
    let herbCount = 0;
    let withAmount = 0;
    let empty = 0;
    const pending: Array<{ id: string; formulas: ParsedFormula[] }> = [];

    for (const row of rows) {
      const formulas = parseClassical(row.originalText);
      if (!formulas.length) {
        empty++;
        continue;
      }
      filled++;
      if (formulas[0].formulaName) named++;
      for (const f of formulas) {
        herbCount += f.herbs.length;
        withAmount += f.herbs.filter((h) => h.amount).length;
      }
      pending.push({ id: row.id, formulas });
    }

    if (!DRY_RUN) {
      // 100건씩 한 문장으로 쓴다. 행마다 왕복하면 7,900번을 오간다.
      const CHUNK = 100;
      for (let i = 0; i < pending.length; i += CHUNK) {
        const slice = pending.slice(i, i + CHUNK);
        const values = slice
          .map((_, k) => `($${k * 2 + 1}::uuid, $${k * 2 + 2}::jsonb)`)
          .join(', ');
        const params = slice.flatMap((p) => [p.id, JSON.stringify(p.formulas)]);
        await ds.query(
          `UPDATE clinical_cases AS c
              SET "herbalFormulas" = v.formulas, "updatedAt" = now()
             FROM (VALUES ${values}) AS v(id, formulas)
            WHERE c.id = v.id`,
          params,
        );
        if ((i + CHUNK) % 1000 === 0) {
          console.log(
            `[classical] ${Math.min(i + CHUNK, pending.length)}/${pending.length}`,
          );
        }
      }
    }

    console.log(`\n[classical] 채움 ${filled}건 / 대상 ${rows.length}건`);
    console.log(`  방명 확인 ${named}건 (나머지는 自擬方 — 비워 둔다)`);
    console.log(`  약재 ${herbCount}개, 그중 용량 있는 것 ${withAmount}개`);
    console.log(`  못 읽음 ${empty}건 (논설·평어만 있어 처방이 없는 것 포함)`);
    if (DRY_RUN) console.log('[classical] --dry-run 이라 저장하지 않았다.');
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[classical] 실패:', e);
    process.exit(1);
  });
}
