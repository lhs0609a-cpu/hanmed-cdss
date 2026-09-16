import { DataSource } from 'typeorm';
import {
  CaseCorpus,
  ClinicalCase,
  Gender,
  TreatmentOutcome,
} from '../entities/clinical-case.entity';
import { dataSourceOptions } from '../data-source';

/**
 * 한국 치험례에서 나이·성별·치료 결과를 원문에서 읽어 채운다.
 *
 * 왜 필요한가 — 나이 4,238건, 성별 428건, 결과 549건이 비어 있는데 원문에는
 * 대개 적혀 있다. 치험례 첫 줄이 거의 언제나 환자 지문으로 시작한다:
 *
 *   ●대화중음(3-025) 하복포만 김 ○ ○ 남 15세 태음인 180cm 강원도…
 *   최 ○ ○ 여 27세 소음인 경기도 안양시 관양동
 *
 * 나이는 기존 표기와 맞춘다 — 이미 든 값이 '30대', '0-9세', '80세 이상'
 * 형식이라 같은 축으로 넣어야 목록 필터가 갈라지지 않는다.
 *
 * 어디서 찾나 — 원문 앞 400자 안에서만 본다. 뒤쪽에는 다른 사람 사례나
 * 활용사례가 붙어 있어서, 전문을 훑으면 남의 나이가 이 환자 것으로 들어온다.
 * 실제로 한 행에 여러 환자가 든 경우가 흔하다(hasMixedContent 1,313건).
 *
 * 결과는 두 갈래로 읽는다:
 *   1) courseSteps 의 direction — enrich-course-steps 가 회차마다 매겨 둔 값이다.
 *      마지막 회차가 improved 면 호전, worse 면 악화로 본다.
 *   2) 원문이 밝힌 말 — '완치', '나았다', '여전하다', '더 심해졌다'.
 *
 * 둘이 어긋나면 원문 쪽을 따른다. 사람이 쓴 문장이 기계가 매긴 방향보다 낫다.
 * 둘 다 없으면 비워 둔다 — 결말을 안 적은 치험례가 실제로 있다.
 *
 * 성별은 예외 — 원문이 어긋나면 원문을 따른다.
 * 기존 시드가 성별을 1,154건 거꾸로 넣어 두었다. 원문에 '권OO, 남 72세'라고
 * 적힌 치험례가 목록에서 여성으로 뜬다. 빈 칸을 채우는 것과 달리 이건 이미
 * 든 값을 덮는 일이라 조심스럽지만, 원문에 성별이 또렷이 적혀 있는데 저장값이
 * 다르면 저장값이 틀린 것이다. 근거가 되는 화면이라 틀린 채로 둘 수 없다.
 * 원문이 애매하면(남·여가 함께 나오거나 없으면) 저장값을 그대로 둔다.
 *
 * 멱등: 이미 값이 있는 칸은 건드리지 않는다(--force 로 다시 쓴다).
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/enrich-korean-metadata.ts [--force] [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 0;

/** 환자 지문은 글 첫머리에 온다. 뒤쪽은 다른 사람 사례다. */
const HEAD_CHARS = 400;

/** '남 35세', '여 27 세', '만 12세' — 성별과 나이가 붙어 나오는 자리 */
const AGE_WITH_SEX =
  /(남자|여자|남|여|男|女)\s*,?\s*(?:만\s*)?([0-9]{1,3})\s*(?:세|살)/;
/** 성별 없이 나이만 — '27세 소음인' */
const AGE_ONLY = /(?:^|[\s,(（:：])(?:만\s*)?([0-9]{1,3})\s*(?:세|살)(?![월일])/;
/** 개월 단위 유아 — '10개월', '7개월 된' */
const AGE_MONTHS = /([0-9]{1,2})\s*개월/;
/** 나이대만 적힌 것 — '50대', '70대 초반' */
const AGE_DECADE = /([0-9]{1,2})0\s*대/;

/** 성별을 그 자체로 가리키는 말 */
const MALE_WORD = /([（(]남[）)]|남자|남아|할아버지|아저씨|남성|男)/;
const FEMALE_WORD = /([（(]여[）)]|여자|여아|할머니|아주머니|주부|부인|여성|산모|임산부|女)/;

/** 원문이 밝힌 결말 */
const SAID_CURED = /(완치|다 나았|모두 나았|깨끗이 나았|소실되었|없어졌다|완쾌)/;
const SAID_IMPROVED = /(호전|좋아졌|경감|줄어들었|많이 나았|개선되었)/;
const SAID_WORSE = /(악화|더 심해졌|더욱 심해|부작용|악화되었)/;
const SAID_SAME = /(여전하|변화가 없|차도가 없|효과가 없|무효|그대로)/;

type Step = { direction?: string };

export interface KoreanMetadata {
  ageRange: string | null;
  gender: Gender | null;
  outcome: TreatmentOutcome | null;
}

/** 기존 표기와 같은 축으로 맞춘다 — '30대', '0-9세', '80세 이상' */
export function toAgeRange(years: number): string | null {
  if (!Number.isFinite(years) || years < 0 || years > 120) return null;
  if (years < 10) return '0-9세';
  if (years >= 80) return '80세 이상';
  return `${Math.floor(years / 10) * 10}대`;
}

export function readMetadata(
  text: string,
  steps: Step[] | null,
): KoreanMetadata {
  const head = (text ?? '').slice(0, HEAD_CHARS);

  // ── 나이 ──
  let ageRange: string | null = null;
  const withSex = AGE_WITH_SEX.exec(head);
  if (withSex) {
    ageRange = toAgeRange(parseInt(withSex[2], 10));
  } else {
    const months = AGE_MONTHS.exec(head);
    if (months) ageRange = '0-9세'; // 개월 단위는 영유아다
    else {
      const only = AGE_ONLY.exec(head);
      if (only) ageRange = toAgeRange(parseInt(only[1], 10));
      else {
        const decade = AGE_DECADE.exec(head);
        if (decade) {
          const d = parseInt(decade[1], 10) * 10;
          ageRange = d >= 80 ? '80세 이상' : `${d}대`;
        }
      }
    }
  }

  // ── 성별 ──
  let gender: Gender | null = null;
  if (withSex) {
    gender = /여/.test(withSex[1]) || withSex[1] === '女'
      ? Gender.FEMALE
      : Gender.MALE;
  } else {
    const male = MALE_WORD.test(head);
    const female = FEMALE_WORD.test(head);
    if (male && !female) gender = Gender.MALE;
    else if (female && !male) gender = Gender.FEMALE;
  }

  // ── 결과 ──
  // 원문이 밝힌 말이 먼저다. 사람이 쓴 문장이 기계가 매긴 방향보다 낫다.
  let outcome: TreatmentOutcome | null = null;
  if (SAID_WORSE.test(text)) outcome = TreatmentOutcome.WORSENED;
  else if (SAID_CURED.test(text)) outcome = TreatmentOutcome.CURED;
  else if (SAID_IMPROVED.test(text)) outcome = TreatmentOutcome.IMPROVED;
  else if (SAID_SAME.test(text)) outcome = TreatmentOutcome.NO_CHANGE;
  else if (Array.isArray(steps) && steps.length) {
    // 원문에 말이 없으면 회차 방향을 본다. 마지막 회차가 결말에 가깝다.
    const dirs = steps
      .map((s) => s?.direction)
      .filter((d): d is string => !!d && d !== 'none');
    const last = dirs[dirs.length - 1];
    if (last === 'improved') outcome = TreatmentOutcome.IMPROVED;
    else if (last === 'worse') outcome = TreatmentOutcome.WORSENED;
    else if (last === 'unchanged') outcome = TreatmentOutcome.NO_CHANGE;
  }

  return { ageRange, gender, outcome };
}

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log('[한국보강] DB 연결됨');

  try {
    const repo = ds.getRepository(ClinicalCase);
    const qb = repo
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c."originalText" AS "originalText"',
        'c."patientAgeRange" AS "patientAgeRange"',
        'c."patientGender" AS "patientGender"',
        'c."treatmentOutcome" AS "treatmentOutcome"',
        'c."courseSteps" AS "courseSteps"',
      ])
      .where('c.corpus = :corpus', { corpus: CaseCorpus.KOREAN })
      .andWhere('c."excludedReason" IS NULL');
    // 성별을 바로잡으려면 이미 값이 든 행도 봐야 한다. 원문과 대조해
    // 어긋나는 것만 덮으므로, 맞게 든 행은 그대로 지나간다.
    if (!FORCE) {
      qb.andWhere(
        `(c."patientAgeRange" IS NULL
          OR c."treatmentOutcome" IS NULL
          OR c."originalText" ~ '(남|여|男|女)[[:space:],]*(만[[:space:]]*)?[0-9]{1,3}[[:space:]]*(세|살)')`,
      );
    }
    if (LIMIT) qb.limit(LIMIT);

    type Row = {
      id: string;
      originalText: string;
      patientAgeRange: string | null;
      patientGender: string;
      treatmentOutcome: string | null;
      courseSteps: Step[] | null;
    };
    const rows: Row[] = await qb.getRawMany();
    console.log(`[한국보강] 대상 ${rows.length}건`);

    let nAge = 0;
    let nSex = 0;
    let nOutcome = 0;
    const pending: Array<{
      id: string;
      a: string | null;
      g: string;
      o: string | null;
    }> = [];

    for (const row of rows) {
      const m = readMetadata(row.originalText, row.courseSteps);
      const a = row.patientAgeRange ?? m.ageRange;
      // 원문이 성별을 또렷이 밝혔으면 그것이 근거다. 저장값이 다르면 덮는다.
      // 그 밖에는 저장값을 지키고, 비어 있을 때만 읽은 값을 넣는다.
      const g = m.gender
        ? m.gender
        : row.patientGender && row.patientGender !== 'unknown'
          ? row.patientGender
          : Gender.UNKNOWN;
      const o = row.treatmentOutcome ?? m.outcome;

      if (
        a === row.patientAgeRange &&
        g === row.patientGender &&
        o === row.treatmentOutcome
      ) {
        continue;
      }
      if (a !== row.patientAgeRange) nAge++;
      if (g !== row.patientGender) nSex++;
      if (o !== row.treatmentOutcome) nOutcome++;
      pending.push({ id: row.id, a, g, o });
    }

    if (!DRY_RUN) {
      const CHUNK = 100;
      for (let i = 0; i < pending.length; i += CHUNK) {
        const slice = pending.slice(i, i + CHUNK);
        const values = slice
          .map(
            (_, k) =>
              `($${k * 4 + 1}::uuid, $${k * 4 + 2}::varchar, $${k * 4 + 3}::text, $${k * 4 + 4}::text)`,
          )
          .join(', ');
        const params = slice.flatMap((x) => [x.id, x.a, x.g, x.o]);
        await ds.query(
          `UPDATE clinical_cases AS c
              SET "patientAgeRange" = v.a,
                  "patientGender" = v.g::clinical_cases_patientgender_enum,
                  "treatmentOutcome" = CASE WHEN v.o IS NULL THEN NULL
                       ELSE v.o::clinical_cases_treatmentoutcome_enum END,
                  "updatedAt" = now()
             FROM (VALUES ${values}) AS v(id, a, g, o)
            WHERE c.id = v.id`,
          params,
        );
        if ((i + CHUNK) % 1000 === 0) {
          console.log(
            `[한국보강] ${Math.min(i + CHUNK, pending.length)}/${pending.length}`,
          );
        }
      }
    }

    console.log(`\n[한국보강] 바뀐 행 ${pending.length}건 / 대상 ${rows.length}건`);
    console.log(`  나이 ${nAge} · 성별 ${nSex} · 결과 ${nOutcome}`);
    if (DRY_RUN) console.log('[한국보강] --dry-run 이라 저장하지 않았다.');
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[한국보강] 실패:', e);
    process.exit(1);
  });
}
