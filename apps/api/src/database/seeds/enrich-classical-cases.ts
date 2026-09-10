import { DataSource } from 'typeorm';
import {
  CaseCorpus,
  ClinicalCase,
  Gender,
  TreatmentOutcome,
} from '../entities/clinical-case.entity';
import { dataSourceOptions } from '../data-source';

/**
 * 고전 의안에서 성별·변증·회차 경과·치료 결과를 읽어 채운다.
 *
 * 왜 필요한가 — 처방은 채웠는데(parse-classical-formulas) 나머지 칸이 비어
 * 있었다. 성별 7,857건 미상, 변증 6,538건 없음, 경과 단계 7,920건 전부 0.
 * 원문에는 적혀 있다. 읽는 법을 몰라서 비어 있던 것이다.
 *
 * ── 성별: 男左女右 ──
 * 醫案은 환자 성씨 뒤에 左 또는 右를 붙여 성별을 적는다. 진맥할 때 남자는
 * 왼손, 여자는 오른손을 먼저 본다는 데서 온 표기다(男左女右).
 *
 *   姜左　外寒束於表分…      → 남자 강씨
 *   胡（右）　諸恙較前稍輕…   → 여자 호씨
 *
 * 이건 추론이 아니라 그 책의 표기법이다. 丁甘仁醫案·張聿青醫案·曹滄洲醫案이
 * 이 방식을 쓴다. 氏·媼·嫗·婦人은 그 자체로 여성을 가리킨다.
 *
 * 다만 左와 右가 한 머리글에 같이 나오면 어느 쪽인지 알 수 없으므로 비운다.
 *
 * ── 변증: 문말 괄호 ──
 * 臨證指南醫案 계열은 서술 끝 괄호에 병기(病機)를 적어 둔다.
 *
 *   陳（二十）　多噎。胸膈不爽。胃陽弱。宜薄味。（胃陽虛）
 *
 * 같은 자리에 용량(一錢五分)·날짜(八月初三日)·조제 지시도 들어가므로,
 * 병기 글자(虛實寒熱濕風痰火…)가 있고 숫자·단위가 없는 것만 취한다.
 * 이 조건을 안 걸면 '各三錢'이 변증으로 들어간다(실제로 그랬다).
 *
 * ── 경과: 재진 단락 ──
 * 又·二診·三診으로 시작하는 단락이 회차별 재진이다. 원문 추출기가 세어
 * 두기만 하고(followups) 쓰지는 않았다. 단락 하나가 회차 하나다.
 *
 * ── 결과: 명시한 것만 ──
 * 痊愈·全愈·而愈처럼 나았다고 적힌 것만 완치로 본다. 고전 의안은 결말을
 * 안 적는 쪽이 훨씬 많고(7,920건 중 234건만 명시), 처방이 좋아 보인다고
 * 나았다고 적으면 그건 기록이 아니라 창작이다. 나머지는 비워 둔다.
 *
 * 멱등: 이미 값이 있는 칸은 건드리지 않는다(--force 로 다시 쓴다).
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/enrich-classical-cases.ts [--force] [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 0;

/** 재진 단락의 머리글자 */
const FOLLOWUP = /^(又|再診|二診|三診|四診|五診|六診|復診|次診|續診)/;
/** 남자 표기 — 성씨 뒤 또는 괄호 안의 左 */
const MALE_MARK = /^[一-鿿]?左[　\s(（]|^[一-鿿][（(]左[）)]/;
/** 여자 표기 — 右, 그리고 그 자체로 여성인 호칭 */
const FEMALE_MARK = /^[一-鿿]?右[　\s(（]|^[一-鿿][（(]右[）)]/;
const FEMALE_WORD = /^[一-鿿]氏[　\s(（]|媼|嫗|婦人|少婦|老婦|孀/;
/** 병기(病機)에 쓰이는 글자 — 하나라도 있어야 변증으로 본다 */
const PATHOGENESIS =
  /[虛實寒熱濕風痰火瘀氣血陰陽鬱滯逆陷衰亢燥毒積聚結傷損虧犯乘侮動閉脫痺痹厥疳]/;
/** 용량·날짜·조제 지시는 변증이 아니다 */
const NOT_PATTERN = /[錢兩分片斤劑服煎丸散湯飲日月年時初旬]|[0-9一二三四五六七八九十百]{2,}/;
/** 나았다고 적힌 것 */
const CURED = /(痊愈|痊癒|全愈|病愈|即愈|果愈|尋愈|遂愈|竟愈|而愈|乃愈|已愈|霍然|全瘳|病瘳)/;
/** 좋아졌다고 적힌 것 */
const IMPROVED = /(漸愈|漸退|漸減|已減|已减|大減|大效|獲效|奏效|即效|見效|稍安|漸安|病退)/;

const SEP = /[　\s]+/;
const TOKEN = /^([一-鿿□]{1,10})(?:[（(]([^）)]{1,60})[）)])?[。，、]?$/;

const stripParens = (s: string): string => s.replace(/[（(][^）)]*[）)]/g, '');

/**
 * 이 값이 변증 칸에 있어서는 안 되는 것인가.
 *
 * 기존 시드가 이 칸에 조제 지시(鹽水炒·煎湯代水), 용량(錢半·二個), 재진
 * 표시(又診), 그리고 醫案 편집자 이름(邵新甫·鄒滋九·門人顧祖庚診)을 넣어
 * 두었다. 근거 화면에 포제법이 변증으로 떠 있으면 안 된다.
 *
 * 병기 글자가 있는지로 가르지 않는다 — 그렇게 하면 蓐勞·瘧母·胃咳·倒經처럼
 * 병기 글자가 없는 멀쩡한 병명까지 지운다. 쓰레기 쪽을 지목해서 그것만 지운다.
 */
const JUNK_VALUE =
  /[0-9]|^[一二三四五六七八九十百]|[錢兩分斤釐匙杯粒個隻朵枚張把撮尺莖圈合片滴釜杓]|炒|炙|浸|沖|研|煎服|調服|拌|包|末|飯丸|磨|化服|另|先煎|後入|去[皮毛心節背]|代水|代茶|送下|湯下|少許|[：。]|^用[一-鿿]{2}$|[丹丸散湯]$/;
/** 재진 표시·서지·평어 작성자 */
const META_VALUE = /^又診$|^醫案$|門人|診$|志$|^[邵鄒華陸秦文正清丁嚴][一-鿿]{1,3}$/;

/** 변증 칸에 그대로 둘 값인가. */
export function isUsablePattern(v: string | null): boolean {
  const t = (v ?? '').trim();
  if (!t || t.length > 14) return false;
  if (JUNK_VALUE.test(t)) return false;
  if (META_VALUE.test(t)) return false;
  return true;
}

/** 약재 나열 줄인가 — 변증을 여기서 찾으면 용량이 딸려 온다. */
function isHerbLine(line: string): boolean {
  const toks = line.split(SEP).filter(Boolean);
  if (toks.length < 2) return false;
  const shaped = toks.filter((t) => TOKEN.test(t)).length;
  const punct = (stripParens(line).match(/[。，、；：？！]/g) || []).length;
  return shaped / toks.length >= 0.8 && punct <= 1;
}

export interface ClassicalEnrichment {
  gender: Gender | null;
  patternDiagnosis: string | null;
  courseSteps: Array<{ step: string; change: string }>;
  outcome: TreatmentOutcome | null;
}

export function enrichClassical(text: string): ClassicalEnrichment {
  const lines = (text ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const body = lines.filter((l) => !l.startsWith('['));
  const head = body[0] ?? '';

  // 성별 — 좌우가 한 머리글에 같이 나오면 판단하지 않는다.
  const male = MALE_MARK.test(head);
  const female = FEMALE_MARK.test(head) || FEMALE_WORD.test(head);
  let gender: Gender | null = null;
  if (male && !female) gender = Gender.MALE;
  else if (female && !male) gender = Gender.FEMALE;

  // 변증 — 서술 줄의 괄호에서만 찾는다.
  //
  // 기존 시드가 이 칸에 포제법과 용량을 넣어 둔 행이 있다('鹽水炒', '煎湯代水',
  // '去節，一尺'). 변증이 아니므로 여기서 골라낸 값이 없더라도 그런 값은
  // 지운다 — 근거 화면에 포제법이 변증으로 떠 있으면 안 된다.
  let pattern: string | null = null;
  for (const line of body) {
    if (isHerbLine(line)) continue;
    for (const m of line.matchAll(/[（(]([一-鿿]{2,12})[）)]/g)) {
      const v = m[1];
      if (NOT_PATTERN.test(v)) continue;
      if (!PATHOGENESIS.test(v)) continue;
      pattern = v; // 뒤에 나온 것이 그 회차의 변증이다
    }
  }

  // 경과 — 재진 단락 하나가 회차 하나.
  const courseSteps: Array<{ step: string; change: string }> = [];
  for (const line of body) {
    const m = FOLLOWUP.exec(line);
    if (!m) continue;
    if (isHerbLine(line)) continue;
    const change = line.slice(m[0].length).replace(/^[　\s]+/, '').trim();
    if (!change) continue;
    courseSteps.push({ step: m[1], change: change.slice(0, 400) });
  }

  // 결과 — 원문이 밝힌 것만.
  let outcome: TreatmentOutcome | null = null;
  if (CURED.test(text)) outcome = TreatmentOutcome.CURED;
  else if (IMPROVED.test(text)) outcome = TreatmentOutcome.IMPROVED;

  return { gender, patternDiagnosis: pattern, courseSteps, outcome };
}

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log('[고전보강] DB 연결됨');

  try {
    const repo = ds.getRepository(ClinicalCase);
    const qb = repo
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c."originalText" AS "originalText"',
        'c."patientGender" AS "patientGender"',
        'c."patternDiagnosis" AS "patternDiagnosis"',
        'c."courseSteps" AS "courseSteps"',
        'c."treatmentOutcome" AS "treatmentOutcome"',
      ])
      .where('c.corpus = :corpus', { corpus: CaseCorpus.CLASSICAL });
    if (LIMIT) qb.limit(LIMIT);

    type Row = {
      id: string;
      originalText: string;
      patientGender: string;
      patternDiagnosis: string | null;
      courseSteps: Array<unknown> | null;
      treatmentOutcome: string | null;
    };
    const rows: Row[] = await qb.getRawMany();
    console.log(`[고전보강] 대상 ${rows.length}건`);

    let nGender = 0;
    let nPattern = 0;
    let nCourse = 0;
    let nOutcome = 0;
    const pending: Array<{
      id: string;
      g: string;
      p: string | null;
      s: string;
      o: string | null;
    }> = [];

    for (const row of rows) {
      const e = enrichClassical(row.originalText);
      const hadGender = row.patientGender && row.patientGender !== 'unknown';
      const hadCourse = Array.isArray(row.courseSteps) && row.courseSteps.length > 0;

      const g = !FORCE && hadGender ? row.patientGender : (e.gender ?? row.patientGender ?? Gender.UNKNOWN);
      const storedIsPattern = isUsablePattern(row.patternDiagnosis);
      const p = e.patternDiagnosis
        ? e.patternDiagnosis
        : storedIsPattern
          ? row.patternDiagnosis
          : null;
      const steps = !FORCE && hadCourse ? row.courseSteps! : e.courseSteps;
      const o = !FORCE && row.treatmentOutcome ? row.treatmentOutcome : (e.outcome ?? row.treatmentOutcome);

      const changed =
        g !== row.patientGender ||
        p !== row.patternDiagnosis ||
        (steps as unknown[]).length !== (row.courseSteps?.length ?? 0) ||
        o !== row.treatmentOutcome;
      if (!changed) continue;

      if (g !== row.patientGender) nGender++;
      if (p !== row.patternDiagnosis) nPattern++;
      if ((steps as unknown[]).length !== (row.courseSteps?.length ?? 0)) nCourse++;
      if (o !== row.treatmentOutcome) nOutcome++;

      pending.push({ id: row.id, g, p, s: JSON.stringify(steps), o });
    }

    if (!DRY_RUN) {
      const CHUNK = 100;
      for (let i = 0; i < pending.length; i += CHUNK) {
        const slice = pending.slice(i, i + CHUNK);
        const values = slice
          .map(
            (_, k) =>
              `($${k * 5 + 1}::uuid, $${k * 5 + 2}::text, $${k * 5 + 3}::varchar, $${k * 5 + 4}::jsonb, $${k * 5 + 5}::text)`,
          )
          .join(', ');
        const params = slice.flatMap((x) => [x.id, x.g, x.p, x.s, x.o]);
        await ds.query(
          `UPDATE clinical_cases AS c
              SET "patientGender" = v.g::clinical_cases_patientgender_enum,
                  "patternDiagnosis" = v.p,
                  "courseSteps" = v.s,
                  "treatmentOutcome" = CASE WHEN v.o IS NULL THEN NULL
                       ELSE v.o::clinical_cases_treatmentoutcome_enum END,
                  "updatedAt" = now()
             FROM (VALUES ${values}) AS v(id, g, p, s, o)
            WHERE c.id = v.id`,
          params,
        );
        if ((i + CHUNK) % 1000 === 0) {
          console.log(
            `[고전보강] ${Math.min(i + CHUNK, pending.length)}/${pending.length}`,
          );
        }
      }
    }

    console.log(`\n[고전보강] 바뀐 행 ${pending.length}건`);
    console.log(`  성별 ${nGender} · 변증 ${nPattern} · 회차경과 ${nCourse} · 결과 ${nOutcome}`);
    console.log('  (원문이 밝히지 않은 것은 비워 둔다 — 고전은 결말을 안 적는 쪽이 많다)');
    if (DRY_RUN) console.log('[고전보강] --dry-run 이라 저장하지 않았다.');
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[고전보강] 실패:', e);
    process.exit(1);
  });
}
