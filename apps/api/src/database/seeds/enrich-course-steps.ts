import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { ClinicalCase } from '../entities/clinical-case.entity';
import OpenAI from 'openai';

/**
 * 복용 경과에 방향(호전·무변화·악화)과 시점(초기·중기·후기)을 붙인다.
 *
 * 왜 — 환자가 한약을 중도에 끊는 가장 큰 이유가 "5일 먹었는데 변화가 없다"
 * 이다. 그런데 치험례 6,348건에 회차별 경과가 이미 있다. 이걸 모으면
 * "이 시점에 몇 %가 변화를 느꼈는지" 를 말해 줄 수 있고, 그러면 지금 변화가
 * 없는 게 이상한 일이 아니라는 것을 알려 줄 수 있다.
 *
 * 규칙만으로는 부족했다 — 호전/무변화/악화를 정규식으로 잡으니 45%만 걸렸다.
 * "공진단 복용 시작" 처럼 방향이 아예 없는 것도 섞여 있다. 그래서 방향은
 * 모델에게 묻고, 시점은 규칙으로 정한다.
 *
 * 시점을 회차와 일수로 나누지 않고 단계로 묶은 이유 —
 * "5회 복용" 과 "5일 후" 를 한 축에 놓으면 안 된다. 한약은 하루 두세 번
 * 먹으므로 회차와 일수가 다른 척도다. 억지로 숫자축을 만들면 정밀해 보이지만
 * 근거가 없다. 환자에게 필요한 것도 "5.2회차" 가 아니라 "초기에는 변화가
 * 없는 경우가 많다" 다.
 *
 * 0~10 통증 점수는 만들지 않는다. 치험례에 숫자가 없다. 문장에서 점수를
 * 지어내면 그래프는 그럴듯해지고 근거는 사라진다.
 *
 * 멱등: 이미 direction 이 붙은 행은 건너뛴다(--force 로 재처리).
 *
 * 실행: ... enrich-course-steps.ts [--limit=100] [--dry-run] [--force]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 10000;
const MODEL = 'gpt-4o-mini';
const BATCH = 40;

export type CoursePhase =
  | 'baseline'
  | 'early'
  | 'mid'
  | 'late'
  | 'post'
  | 'followup';

export type CourseDirection = 'improved' | 'unchanged' | 'worse' | 'none';

/**
 * 시점 라벨을 단계로 옮긴다. 규칙이라 실행할 때마다 같은 값이 나온다.
 *
 * 실제 라벨 분포(상위): 1회 복용 1505 · 복용 종료 후 772 · 5회 복용 640 ·
 * 1개월 후 200 · 2회 복용 71 · 10일 후 52
 */
function toPhase(step: string): CoursePhase {
  const s = step.replace(/\s+/g, '');

  // 복용을 마친 뒤 — 추적 기간이 붙으면 followup 으로 더 민다.
  if (/복용(종료|중단|후)|종료후|끝난후/.test(s)) {
    if (/(\d+)\s*(개월|년)/.test(s)) return 'followup';
    return 'post';
  }
  if (/(\d+)\s*(개월|년)후/.test(s)) return 'followup';

  const dose = s.match(/(\d+)\s*(회|첩|제)/);
  if (dose) {
    const n = parseInt(dose[1], 10);
    // "1회 복용" 은 시작점이 아니라 한 번 먹은 뒤다. 실제로 첫 복용에
    // 증상이 잡히는 사례가 있다("1회 복용: 가스가 차는 증상이 사라지고").
    // 시작 표시로 쓰인 경우는 direction 이 none 으로 걸러 준다.
    if (n <= 3) return 'early';
    if (n <= 10) return 'mid';
    return 'late';
  }

  const week = s.match(/(\d+)\s*(주일?|주)/);
  if (week) {
    const d = parseInt(week[1], 10) * 7;
    return d <= 3 ? 'early' : d <= 14 ? 'mid' : 'late';
  }

  const day = s.match(/(\d+)\s*일/);
  if (day) {
    const n = parseInt(day[1], 10);
    if (n <= 3) return 'early';
    if (n <= 14) return 'mid';
    return 'late';
  }

  if (/시작|초진|내원/.test(s)) return 'baseline';
  return 'mid';
}

const SYSTEM = `한의학 치험례의 복용 경과 문장을 읽고 증상이 어느 쪽으로 갔는지 판정합니다.
JSON 으로만 답하세요.

{"results":[{"i":0,"d":"improved"}]}

d 는 넷 중 하나:
- improved  : 증상이 줄거나 사라졌다
- unchanged : 뚜렷한 변화가 없다
- worse     : 증상이 심해지거나 새 증상·부작용이 생겼다
- none      : 방향을 알 수 없다 (예: "복용 시작", "재진")

문장에 없는 것을 추측하지 마세요. 애매하면 none 입니다.`;

interface Verdict {
  i: number;
  d: CourseDirection;
}

async function classify(
  client: OpenAI,
  texts: string[],
): Promise<Map<number, CourseDirection>> {
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: texts.map((t, i) => `${i}. ${t}`).join('\n'),
      },
    ],
  });

  const out = new Map<number, CourseDirection>();
  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}') as {
      results?: Verdict[];
    };
    for (const r of parsed.results ?? []) {
      if (
        typeof r.i === 'number' &&
        ['improved', 'unchanged', 'worse', 'none'].includes(r.d)
      ) {
        out.set(r.i, r.d);
      }
    }
  } catch {
    console.warn('  파싱 실패 — 배치 건너뜀');
  }
  return out;
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY 가 필요합니다.');
    process.exit(1);
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  const repo = ds.getRepository(ClinicalCase);

  const cases = await repo
    .createQueryBuilder('c')
    .where(`jsonb_array_length(c."courseSteps") > 0`)
    .take(LIMIT)
    .getMany();

  // 이미 방향이 붙은 케이스는 건너뛴다.
  const targets = FORCE
    ? cases
    : cases.filter((c) =>
        (c.courseSteps ?? []).some(
          (s) => !(s as Record<string, unknown>).direction,
        ),
      );

  console.log(
    `[course] 경과가 있는 치험례 ${cases.length}건 · 처리 대상 ${targets.length}건`,
  );

  // 모든 단계를 한 줄로 펴서 배치로 분류한다. 케이스마다 부르면 호출이 6천 번이다.
  type Flat = { caseIdx: number; stepIdx: number; text: string };
  const flat: Flat[] = [];
  targets.forEach((c, ci) => {
    (c.courseSteps ?? []).forEach((s, si) => {
      flat.push({ caseIdx: ci, stepIdx: si, text: `${s.step}: ${s.change}` });
    });
  });
  console.log(`[course] 단계 ${flat.length}개를 ${BATCH}개씩 분류합니다`);

  const directions = new Map<string, CourseDirection>();
  for (let i = 0; i < flat.length; i += BATCH) {
    const chunk = flat.slice(i, i + BATCH);
    const verdicts = await classify(
      client,
      chunk.map((f) => f.text),
    );
    for (let k = 0; k < chunk.length; k++) {
      const d = verdicts.get(k);
      if (d) directions.set(`${chunk[k].caseIdx}:${chunk[k].stepIdx}`, d);
    }
    if ((i / BATCH) % 20 === 0) {
      process.stdout.write(`\r  ${Math.min(i + BATCH, flat.length)}/${flat.length}`);
    }
  }

  let saved = 0;
  const tally: Record<string, number> = {};
  for (let ci = 0; ci < targets.length; ci++) {
    const c = targets[ci];
    const steps = (c.courseSteps ?? []).map((s, si) => {
      const d = directions.get(`${ci}:${si}`) ?? 'none';
      const phase = toPhase(s.step);
      tally[d] = (tally[d] ?? 0) + 1;
      tally[`phase:${phase}`] = (tally[`phase:${phase}`] ?? 0) + 1;
      return { ...s, direction: d, phase };
    });
    c.courseSteps = steps as ClinicalCase['courseSteps'];
    if (!DRY_RUN) await repo.update({ id: c.id }, { courseSteps: c.courseSteps });
    saved++;
  }

  console.log(`\n\n[course] ${DRY_RUN ? '미리보기' : '완료'} — ${saved}건`);
  console.log(
    `  방향: 호전 ${tally.improved ?? 0} · 무변화 ${tally.unchanged ?? 0} · 악화 ${tally.worse ?? 0} · 없음 ${tally.none ?? 0}`,
  );
  console.log(
    `  시점: 시작 ${tally['phase:baseline'] ?? 0} · 초기 ${tally['phase:early'] ?? 0} · 중기 ${tally['phase:mid'] ?? 0} · 후기 ${tally['phase:late'] ?? 0} · 종료 ${tally['phase:post'] ?? 0} · 추적 ${tally['phase:followup'] ?? 0}`,
  );

  const sample = targets[0];
  if (sample) {
    console.log(`\n  예: ${sample.summaryOneLine?.slice(0, 40) ?? sample.id}`);
    for (const s of sample.courseSteps ?? []) {
      const r = s as Record<string, unknown>;
      console.log(`    [${r.phase}/${r.direction}] ${s.step}: ${s.change.slice(0, 40)}`);
    }
  }

  await ds.destroy();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[course] 실패:', e?.message ?? e);
    process.exit(1);
  });
