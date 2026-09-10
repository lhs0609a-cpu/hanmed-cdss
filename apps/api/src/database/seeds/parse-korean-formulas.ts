import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { CaseCorpus, ClinicalCase } from '../entities/clinical-case.entity';

/**
 * 한국 치험례의 처방 구성을 원문에서 뽑아 herbalFormulas[].herbs 에 채운다.
 *
 * 왜 필요한가 — 8,463건 중 7,681건이 처방명만 있고 약재 칸이 비어 있었다.
 * 화면에서 "삼출건비탕"까지는 보이는데 무엇이 얼마나 들었는지는 안 보인다.
 * 원문에는 대개 적혀 있다:
 *
 *   삼출건비탕 인삼 백출 백복령 후박 진피 산사육 각 1돈 지실 백작약 각 8푼…
 *
 * 왜 어려운가 — 한 글에 여러 처방이 인용된다. 귀비탕 치험례 본문에 상한론
 * 계지탕 조문이 딸려 있고, 산치자산 사례에 '■참고2'로 위풍탕 구성이 붙는다.
 * 그냥 가장 긴 약재 나열을 집으면 남의 처방 구성을 이 사례의 처방으로
 * 적어 넣게 된다(표본 12건 중 2건에서 실제로 그랬다).
 *
 * 가감도 구성이 아니다 — "…향부자 건강 진피 사인 각 1.5돈을 더하여"는
 * 원방에 더한 것이지 처방 구성이 아니다. 이건 modification 이 담을 몫이다.
 *
 * 그래서 세 겹으로 막는다:
 *   1) 이 사례의 처방명(verifiedFormulaName) 바로 뒤 300자 안에서만 찾는다.
 *   2) 앞말이 '더하여/빼고/대신'이면 가감이므로 건너뛴다.
 *   3) 처방 마스터에 구성이 있는 처방인데 겹치는 약재가 30% 미만이면
 *      다른 처방을 집은 것으로 보고 반려한다.
 *
 * 약재명은 원문 표기 그대로 — 중복 판정에만 표준명을 쓴다. 원문이 '백작약'
 * 이라 적었으면 그대로 둔다. 임상 기록이라 조용히 바꿔 적으면 안 된다.
 * 다만 '몰약 沒藥 육계 肉桂'처럼 한글·한자를 짝으로 적은 원문이 있어,
 * 같은 약재가 두 번 들어가는 것만 표준명으로 걸러낸다.
 *
 * 용량은 원문 그대로 — '각 1돈'은 원문이 각각이라 밝힌 것이므로 그 무리
 * 전체에 준다. 그 밖에는 바로 앞 약재 하나에만 붙이고, 나머지는 비운다.
 * 없는 용량을 옆 약재에서 끌어다 쓰면 그건 처방이 아니라 추측이다.
 *
 * 멱등: 약재가 이미 든 행은 건너뛴다(--force 로 다시 쓴다).
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/parse-korean-formulas.ts [--force] [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 0;

/** 처방명 뒤 이만큼 안에서만 구성을 찾는다. */
const WINDOW = 300;
/** 구성은 처방명 바로 뒤에 온다. 이보다 멀면 딴 이야기다. */
const START_WITHIN = 10;
/** 이보다 적으면 구성이 아니라 가감이거나 지나가는 언급이다. */
const MIN_HERBS = 4;
/** 마스터 구성과 이만큼도 안 겹치면 다른 처방을 집은 것이다. */
const MIN_MASTER_OVERLAP = 0.3;

const SPLIT = /[\s,，、ㆍ·・+()（）:：;；[\]]+/;
const DOSE_TOKEN = /^([0-9]+(?:[.,][0-9]+)?)\s*(g|G|그램|돈|錢|냥|兩|푼|分)?$/;
const HANJA_DOSE = /^[一二三四五六七八九十百半]+(?:錢|兩|分|斤)$/;
const EACH = /^(각|各)$/;
/** 약재명 뒤에 바로 붙은 용량 — '창출24g', '반하12' */
const TRAILING_DOSE = /[0-9]+(?:[.,][0-9]+)?\s*(?:g|G|그램|돈|錢|냥|兩|푼|分)?$/;
/** 이 말 뒤에 오는 약재는 원방 구성이 아니라 가감이다. */
const MODIFIER_LEAD = /(더하여|더한|가하여|가한|추가|빼고|제하고|대신)\s*$/;

type Herb = { name: string; amount: string };
type Token = 'H' | 'D' | 'E' | 'X';

export interface Lexicon {
  /** 약재로 인정하는 표기 전부 (표준명·한자명·별칭) */
  names: Set<string>;
  /** 표기 → 표준명. 중복 판정에만 쓴다. */
  canonical: Map<string, string>;
  /** 처방명 → 원방 구성(표준명) */
  master: Map<string, Set<string>>;
  /** 처방명 → 한자명·별칭 */
  formulaAliases: Map<string, string[]>;
}

const stripDose = (t: string): string => t.replace(TRAILING_DOSE, '');

function classify(tok: string, lex: Lexicon): Token {
  const bare = stripDose(tok);
  if (bare.length >= 2 && bare.length <= 6 && lex.names.has(bare)) return 'H';
  if (DOSE_TOKEN.test(tok) || HANJA_DOSE.test(tok)) return 'D';
  if (EACH.test(tok)) return 'E';
  return 'X';
}

/**
 * 구간 안에서 약재가 끊기지 않고 이어지는 가장 긴 자리를 찾아 읽는다.
 * 용량과 '각'은 나열을 끊지 않는다 — 그것도 처방의 일부다.
 */
function readRun(segment: string, lex: Lexicon): Herb[] | null {
  const toks = (segment ?? '').split(SPLIT).filter(Boolean);
  const kinds = toks.map((t) => classify(t, lex));

  let best: { i: number; j: number; n: number } | null = null;
  let i = 0;
  while (i < toks.length) {
    if (kinds[i] !== 'H') {
      i++;
      continue;
    }
    let j = i;
    let n = 0;
    while (j < toks.length && kinds[j] !== 'X') {
      if (kinds[j] === 'H') n++;
      j++;
    }
    if (!best || n > best.n) best = { i, j, n };
    i = j;
  }
  if (!best || best.n < MIN_HERBS) return null;
  if (best.i > START_WITHIN) return null;

  const seen = new Set<string>();
  const herbs: Herb[] = [];
  let pending: string[] = [];
  const push = (name: string, amount: string): void => {
    const key = lex.canonical.get(name) ?? name;
    if (seen.has(key)) return;
    seen.add(key);
    herbs.push({ name, amount });
  };

  for (let k = best.i; k < best.j; k++) {
    const tok = toks[k];
    if (kinds[k] === 'H') {
      const bare = stripDose(tok);
      const attached = TRAILING_DOSE.exec(tok);
      if (attached && attached[0]) {
        pending.forEach((p) => push(p, ''));
        pending = [];
        push(bare, attached[0].trim());
      } else {
        pending.push(bare);
      }
    } else if (kinds[k] === 'D') {
      // 원문이 '각'이라 밝혔으면 앞 무리 전체가 같은 용량이다.
      const isEach = k > best.i && kinds[k - 1] === 'E';
      if (isEach) {
        pending.forEach((p) => push(p, tok));
        pending = [];
      } else {
        const last = pending.pop();
        pending.forEach((p) => push(p, ''));
        pending = [];
        if (last) push(last, tok);
      }
    }
  }
  pending.forEach((p) => push(p, ''));
  return herbs.length >= MIN_HERBS ? herbs : null;
}

/** 이 사례의 처방명 뒤에서만 구성을 찾는다. */
export function parseKorean(
  text: string,
  formulaName: string,
  lex: Lexicon,
): { herbs: Herb[]; rejected: boolean } {
  const name = (formulaName ?? '').trim();
  if (!name || !text) return { herbs: [], rejected: false };

  const candidates = [name, ...(lex.formulaAliases.get(name) ?? [])].filter(
    Boolean,
  );
  let best: Herb[] | null = null;
  for (const nm of candidates) {
    let at = -1;
    while ((at = text.indexOf(nm, at + 1)) >= 0) {
      const before = text.slice(Math.max(0, at - 30), at);
      if (MODIFIER_LEAD.test(`${before} `)) continue; // 가감이다
      const found = readRun(
        text.slice(at + nm.length, at + nm.length + WINDOW),
        lex,
      );
      if (found && (!best || found.length > best.length)) best = found;
    }
  }
  if (!best) return { herbs: [], rejected: false };

  // 원방 구성을 아는 처방인데 겹치는 것이 거의 없으면 남의 처방을 집은 것이다.
  const master = lex.master.get(name);
  if (master && master.size >= 3) {
    const got = new Set(best.map((h) => lex.canonical.get(h.name) ?? h.name));
    let shared = 0;
    for (const m of master) if (got.has(m)) shared++;
    if (shared / master.size < MIN_MASTER_OVERLAP) {
      return { herbs: [], rejected: true };
    }
  }
  return { herbs: best, rejected: false };
}

export async function loadLexicon(ds: DataSource): Promise<Lexicon> {
  const names = new Set<string>();
  const canonical = new Map<string, string>();
  const herbRows: Array<{ s: string; h: string | null; a: unknown }> =
    await ds.query(
      `SELECT "standardName" AS s, "hanjaName" AS h, aliases AS a FROM herbs_master`,
    );
  const addName = (raw: unknown, std: string): void => {
    const v = String(raw ?? '').trim();
    if (!v) return;
    names.add(v);
    canonical.set(v, std);
  };
  for (const r of herbRows) {
    const std = (r.s ?? '').trim();
    if (!std) continue;
    addName(std, std);
    addName(r.h, std);
    const al = Array.isArray(r.a)
      ? r.a
      : typeof r.a === 'string'
        ? r.a.split(/[,;]/)
        : [];
    for (const x of al) addName(x, std);
  }

  const master = new Map<string, Set<string>>();
  const comp: Array<{ name: string; hn: string }> = await ds.query(
    `SELECT f.name AS name, h."standardName" AS hn
       FROM formula_herbs fh
       JOIN formulas f ON f.id = fh."formulaId"
       JOIN herbs_master h ON h.id = fh."herbId"`,
  );
  for (const r of comp) {
    if (!master.has(r.name)) master.set(r.name, new Set());
    master.get(r.name)!.add(r.hn);
  }

  const formulaAliases = new Map<string, string[]>();
  const frows: Array<{ name: string; hanja: string | null; aliases: unknown }> =
    await ds.query(`SELECT name, hanja, aliases FROM formulas`);
  for (const r of frows) {
    const al: string[] = [];
    if (r.hanja) al.push(String(r.hanja).trim());
    const raw = Array.isArray(r.aliases)
      ? r.aliases
      : typeof r.aliases === 'string'
        ? r.aliases.split(/[,;]/)
        : [];
    for (const x of raw) {
      const v = String(x ?? '').trim();
      if (v) al.push(v);
    }
    formulaAliases.set(r.name, al);
  }

  return { names, canonical, master, formulaAliases };
}

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log('[korean] DB 연결됨');

  try {
    const lex = await loadLexicon(ds);
    console.log(
      `[korean] 약재 표기 ${lex.names.size}개 / 원방 구성 보유 ${lex.master.size}개 처방`,
    );

    const repo = ds.getRepository(ClinicalCase);
    const qb = repo
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c."sourceId" AS "sourceId"',
        'c."originalText" AS "originalText"',
        'c."verifiedFormulaName" AS "verifiedFormulaName"',
        'c."herbalFormulas" AS "herbalFormulas"',
      ])
      .where('c.corpus = :corpus', { corpus: CaseCorpus.KOREAN })
      .andWhere('c."excludedReason" IS NULL');
    if (!FORCE) {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM jsonb_array_elements(c."herbalFormulas") f
                      WHERE jsonb_typeof(f->'herbs') = 'array'
                        AND jsonb_array_length(f->'herbs') > 0)`,
      );
    }
    if (LIMIT) qb.limit(LIMIT);

    type Row = {
      id: string;
      sourceId: string;
      originalText: string;
      verifiedFormulaName: string | null;
      herbalFormulas: Array<Record<string, unknown>> | null;
    };
    const rows: Row[] = await qb.getRawMany();
    console.log(`[korean] 대상 ${rows.length}건`);

    let filled = 0;
    let rejected = 0;
    let noName = 0;
    let herbCount = 0;
    let withAmount = 0;
    const pending: Array<{ id: string; formulas: unknown[] }> = [];

    for (const row of rows) {
      const stored = Array.isArray(row.herbalFormulas)
        ? row.herbalFormulas
        : [];
      const name =
        (row.verifiedFormulaName ?? '').trim() ||
        String(stored[0]?.formulaName ?? '').trim();
      if (!name) {
        noName++;
        continue;
      }
      const { herbs, rejected: rej } = parseKorean(row.originalText, name, lex);
      if (rej) {
        rejected++;
        continue;
      }
      if (!herbs.length) continue;

      filled++;
      herbCount += herbs.length;
      withAmount += herbs.filter((h) => h.amount).length;

      // 기존 항목의 다른 값(number·details)은 건드리지 않고 herbs 만 채운다.
      const formulas =
        stored.length > 0
          ? stored.map((f, idx) => (idx === 0 ? { ...f, herbs } : f))
          : [{ formulaName: name, herbs }];
      pending.push({ id: row.id, formulas });
    }

    if (!DRY_RUN) {
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
        if ((i + CHUNK) % 500 === 0) {
          console.log(
            `[korean] ${Math.min(i + CHUNK, pending.length)}/${pending.length}`,
          );
        }
      }
    }

    console.log(`\n[korean] 채움 ${filled}건 / 대상 ${rows.length}건`);
    console.log(`  약재 ${herbCount}개, 그중 용량 있는 것 ${withAmount}개`);
    console.log(`  반려 ${rejected}건 (원방과 겹치지 않아 남의 처방으로 봄)`);
    console.log(`  처방명 없어 못 찾음 ${noName}건`);
    if (DRY_RUN) console.log('[korean] --dry-run 이라 저장하지 않았다.');
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[korean] 실패:', e);
    process.exit(1);
  });
}
