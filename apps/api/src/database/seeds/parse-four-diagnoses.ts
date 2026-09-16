import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { CaseCorpus, ClinicalCase } from '../entities/clinical-case.entity';

/**
 * 원문에서 맥진·설진·복진 소견을 뽑아 해당 컬럼에 채운다.
 *
 * 왜 필요한가 — pulseDiagnosis / tongueDiagnosis / abdominalDiagnosis 는
 * 엔티티에 있으나 8,463건 전부 비어 있었다. 어느 시더도 쓰지 않았다.
 * 원문에는 적혀 있다 — "맥진 : 유맥", "혀에 치흔이 있고 설태가 두텁다",
 * "심하 진수음이 있으며 좌우 복직근연급이 있다".
 *
 * 왜 낱말만 찾으면 안 되나:
 *   · 大腹皮(대복피)는 약재다. '복피'로 찾으면 처방 구성이 복진으로 들어온다.
 *   · '문정맥을 타고'의 '맥을', '잡혀가면'의 '혀가'처럼 다른 낱말 안에 걸린다.
 *   · 脈弦而腹痛 같은 한문 조문은 이 환자 소견이 아니라 인용이다.
 *   · "시호를 쓰려면 흉협고만을 반드시 확인해야한다"는 지침이지 소견이 아니다.
 *
 * 그래서 네 가지를 요구한다:
 *   1) 표지 앞에 한글이 붙지 않을 것(낱말 경계).
 *   2) 맥은 맥상 용어(부·침·지·삭·활…)나 '별무'가 함께 있을 것.
 *      맥이라는 글자만으로는 소견인지 알 수 없다.
 *   3) 한자가 6자 넘게 이어지면 인용문으로 보고 버린다.
 *   4) 지침·설명 어투('쓰려면', '확인해야', '치료하면')는 버린다.
 *
 * 여러 자리에 걸리면 가장 짧은 것을 쓴다 — 소견은 짧고, 길어질수록
 * 변증 논의나 경과 서술이 섞인다.
 *
 * 원문 표현을 그대로 옮긴다. '침긴(沈緊)'을 '침맥·긴맥'으로 풀어 적으면
 * 그건 기록이 아니라 해석이다.
 *
 * 멱등: 이미 값이 있는 컬럼은 건드리지 않는다(--force 로 다시 쓴다).
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/parse-four-diagnoses.ts [--force] [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 0;

/** 문장 경계 — 마침표 말고도 번호매김과 구분기호가 문장을 나눈다. */
const BOUNDARY =
  /[\n。.!?]|[①-⑳]|[㉠-㉭]|[■●※▣￭]|\s[0-9]{1,2}[).]\s/;
/** 한자가 이만큼 이어지면 이 환자 소견이 아니라 고전 인용이다. */
const CITATION = /[一-鿿]{6,}/;
/** 소견이 아니라 지침·해설인 문장 */
const INSTRUCTION = /^[（(]|쓰려면|확인해야|해야한다|해야 한다|치료하면|주면 낫는|라 하였|조문|본방을/;
/** 표지 앞에 한글이 붙으면 다른 낱말이다 — 대복피의 '복피', 잡혀가면의 '혀가' */
const NB = '(?<![가-힣])';

const PULSE_CUE = new RegExp(`${NB}(맥진|맥상|맥박|맥은|맥이)`);
/** 맥상 용어가 함께 있어야 소견으로 본다. */
const PULSE_QUALITY =
  /(부|침|지|삭|활|삽|현|긴|완|홍|세|약|미|실|허|대|단|장|결|촉|유|규|산|동)맥|맥[은이]?\s*[가-힣]{0,3}(부|침|지|삭|활|삽|현|긴|완|홍|세|약|미|실|허|대|단|장)|별무|정상|촉지|없다/;
const TONGUE_CUE = new RegExp(
  `${NB}(설태|설진|설색|설질|백태|황태|치흔|혀는|혀가)`,
);
const ABDOMEN_CUE = new RegExp(
  `${NB}(복진|복직근|심하비|흉협고만|진수음|복력|제상계|소복급결)|복부가\\s*(연약|무력|단단|팽만|함몰|긴장)`,
);

/** 맥진·설진 컬럼은 varchar(255) 다. 넉넉히 잘라 담는다. */
const MAX_SHORT = 180;
/** 복진은 text 라 조금 더 담을 수 있다. */
const MAX_LONG = 250;

export function pickFinding(
  text: string,
  cue: RegExp,
  quality: RegExp | null,
  max: number,
): string | null {
  const parts = (text ?? '')
    .split(BOUNDARY)
    .map((s) => s.trim())
    .filter(Boolean);

  const hits: string[] = [];
  for (const p of parts) {
    if (p.length > max) continue;
    if (!cue.test(p)) continue;
    if (quality && !quality.test(p)) continue;
    if (CITATION.test(p)) continue;
    if (INSTRUCTION.test(p)) continue;
    if (!/[가-힣]/.test(p)) continue;
    hits.push(p);
  }
  if (!hits.length) return null;
  // 가장 짧은 것이 소견이다. 길수록 변증 논의가 섞인다.
  hits.sort((a, b) => a.length - b.length);
  return hits[0].slice(0, max);
}

export function parseFourDiagnoses(text: string): {
  pulse: string | null;
  tongue: string | null;
  abdomen: string | null;
} {
  return {
    pulse: pickFinding(text, PULSE_CUE, PULSE_QUALITY, MAX_SHORT),
    tongue: pickFinding(text, TONGUE_CUE, null, MAX_SHORT),
    abdomen: pickFinding(text, ABDOMEN_CUE, null, MAX_LONG),
  };
}

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log('[四診] DB 연결됨');

  try {
    const repo = ds.getRepository(ClinicalCase);
    const qb = repo
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c."originalText" AS "originalText"',
        'c."pulseDiagnosis" AS "pulseDiagnosis"',
        'c."tongueDiagnosis" AS "tongueDiagnosis"',
        'c."abdominalDiagnosis" AS "abdominalDiagnosis"',
      ])
      .where('c.corpus = :corpus', { corpus: CaseCorpus.KOREAN })
      .andWhere('c."excludedReason" IS NULL');
    if (!FORCE) {
      qb.andWhere(
        `(c."pulseDiagnosis" IS NULL OR c."tongueDiagnosis" IS NULL OR c."abdominalDiagnosis" IS NULL)`,
      );
    }
    if (LIMIT) qb.limit(LIMIT);

    type Row = {
      id: string;
      originalText: string;
      pulseDiagnosis: string | null;
      tongueDiagnosis: string | null;
      abdominalDiagnosis: string | null;
    };
    const rows: Row[] = await qb.getRawMany();
    console.log(`[四診] 대상 ${rows.length}건`);

    let pulse = 0;
    let tongue = 0;
    let abdomen = 0;
    let any = 0;
    const pending: Array<{
      id: string;
      p: string | null;
      t: string | null;
      a: string | null;
    }> = [];

    for (const row of rows) {
      const found = parseFourDiagnoses(row.originalText);
      // 이미 값이 있으면 덮지 않는다(--force 라도 사람이 넣은 값이 우선).
      const p = row.pulseDiagnosis ?? found.pulse;
      const t = row.tongueDiagnosis ?? found.tongue;
      const a = row.abdominalDiagnosis ?? found.abdomen;
      if (!p && !t && !a) continue;
      if (p && !row.pulseDiagnosis) pulse++;
      if (t && !row.tongueDiagnosis) tongue++;
      if (a && !row.abdominalDiagnosis) abdomen++;
      if (
        (p && !row.pulseDiagnosis) ||
        (t && !row.tongueDiagnosis) ||
        (a && !row.abdominalDiagnosis)
      ) {
        any++;
        pending.push({ id: row.id, p, t, a });
      }
    }

    if (!DRY_RUN) {
      const CHUNK = 100;
      for (let i = 0; i < pending.length; i += CHUNK) {
        const slice = pending.slice(i, i + CHUNK);
        const values = slice
          .map(
            (_, k) =>
              `($${k * 4 + 1}::uuid, $${k * 4 + 2}::varchar, $${k * 4 + 3}::varchar, $${k * 4 + 4}::text)`,
          )
          .join(', ');
        const params = slice.flatMap((x) => [x.id, x.p, x.t, x.a]);
        await ds.query(
          `UPDATE clinical_cases AS c
              SET "pulseDiagnosis" = v.p,
                  "tongueDiagnosis" = v.t,
                  "abdominalDiagnosis" = v.a,
                  "updatedAt" = now()
             FROM (VALUES ${values}) AS v(id, p, t, a)
            WHERE c.id = v.id`,
          params,
        );
        if ((i + CHUNK) % 500 === 0) {
          console.log(
            `[四診] ${Math.min(i + CHUNK, pending.length)}/${pending.length}`,
          );
        }
      }
    }

    console.log(`\n[四診] 채운 행 ${any}건 / 대상 ${rows.length}건`);
    console.log(`  맥진 ${pulse} · 설진 ${tongue} · 복진 ${abdomen}`);
    console.log(
      '  (원문에 소견을 적지 않은 치험례가 대부분이다 — 없는 것을 만들지 않는다)',
    );
    if (DRY_RUN) console.log('[四診] --dry-run 이라 저장하지 않았다.');
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[四診] 실패:', e);
    process.exit(1);
  });
}
