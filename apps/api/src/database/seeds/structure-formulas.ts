import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

/**
 * 처방 해설에서 검색·필터에 쓸 구조를 뽑는다.
 *
 * 왜 필요한가 — 처방 429건에 해설 본문(평균 2,359자)은 두툼한데 정작 검색이
 * 보는 필드가 비어 있다. 적응증은 429건 중 388건이 비었고, 분류는 전부 'etc'
 * 라 화면에서 '기타' 한 칸짜리 필터가 된다. DB 쪽 formulas.indication 도
 * 빈 문자열이다(해설이 pathogenesis 로 들어가 있다). 즉 큐레이션된 적응증은
 * 어디에도 없다.
 *
 * 그래서 화면은 적응증 대신 해설 앞 100자로 검색한다. '소화불량' 이 본문에
 * 128건 나오는데 검색은 52건만 찾았다. 반대로 본문 전체를 그냥 훑으면 429건
 * 중 143건이 걸려 정밀도가 무너진다 — 해설이 긴 임상 에세이라 증상이 스치듯
 * 언급된 것까지 잡히기 때문이다. 필요한 건 본문에서 뽑아낸 적응증이다.
 *
 * 지어내지 않는다 — 원문에 근거가 없으면 비운다. 구성 약재와 용량은 건드리지
 * 않는다(임상 데이터를 모델이 고쳐 쓰면 안 된다). 뽑는 것은 읽는 순서를 위한
 * 분류와 색인뿐이다.
 *
 * 결과는 원본 JSON 을 덮어쓰지 않고 별도 파일로 낸다. 6MB 짜리 원본을 다시
 * 쓰면 변경분을 검토할 수 없다.
 *
 * 멱등: 이미 뽑힌 id 는 건너뛴다(--force 로 다시 돌릴 수 있다).
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/structure-formulas.ts [--limit=50] [--force] [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 1000;
const MODEL = 'gpt-4o-mini';
const CONCURRENCY = 8;
const MAX_TEXT = 7000;

/** 화면의 categoryMap 과 같은 열쇠말을 쓴다. 새 값을 만들면 필터에서 빠진다. */
const CATEGORIES = [
  '해표',
  '청열',
  '사하',
  '화해',
  '온리',
  '보익',
  '고섭',
  '안신',
  '이기',
  '이혈',
  '치풍',
  '이수',
  '화담',
  '소도',
  '옹양',
  '기타',
] as const;

const SYSTEM = `당신은 한의학 방제 해설을 임상의가 찾아 쓸 수 있게 색인합니다.
반드시 JSON 으로만 답하세요. 원문에 없는 내용을 지어내지 마세요.

각 필드:
- indications: 이 처방을 쓰는 주소증·증상 5~12개. 한의사가 실제로 검색할 말로
  적으세요(예: "소화불량", "산후발열", "잇몸출혈", "어지러움").
  해설이 "이 처방과 비교하면" 하며 다른 처방을 설명하는 대목의 증상은 넣지 마세요.
  원문에 근거가 없으면 빈 배열.
- category: 주된 치법 하나. 아래 뜻을 보고 고르세요.
  해표 — 땀을 내어 표증(감기·오한발열·몸살)을 푼다
  청열 — 열을 내린다(염증·발열·구내염·충혈)
  사하 — 대변을 통하게 한다(변비·적취)
  화해 — 소양·간위 불화를 고른다(한열왕래·흉협고만)
  온리 — 속을 데운다(냉증·복랭·설사)
  보익 — 기·혈·음·양을 보한다(허약·피로·병후조리)
  고섭 — 새는 것을 거둔다(자한·유정·설사·대하)
  안신 — 정신을 안정시킨다(불면·경계·정충)
  이기 — 기의 흐름을 돌린다(기체·창만·울증)
  이혈 — 혈을 다스린다(어혈·출혈·월경)
  치풍 — 풍습을 몰아낸다(관절통·마비·중풍·저림)
  이수 — 물을 뺀다(부종·소변불리·습)
  화담 — 담을 삭인다(기침·가래·현훈)
  소도 — 음식을 삭인다(식체·소화불량)
  옹양 — 종기·창양을 다스린다
  기타 — 위 어디에도 뚜렷이 속하지 않을 때만
  처방명에 치법이 드러나면(행기·보중·청상·거풍 등) 그것을 우선 참고하세요.
- patternKeywords: 변증 관련 열쇠말 3~8개 (예: "기허", "혈열", "표한", "습담").
- contraindications: 원문이 금기·주의로 밝힌 것만. 없으면 빈 배열.
  추측하지 마세요. 안전에 관한 항목이라 원문 근거가 없으면 반드시 비웁니다.
- modification: 원문에 나온 가감과 이유. 없으면 빈 문자열.
- patientSummary: 환자에게 설명할 한 문장. 한자어와 전문용어 없이.
  (예: "속이 더부룩하고 소화가 잘 안 될 때 쓰는 처방입니다.")
  원문 근거가 부족하면 빈 문자열.`;

interface Structured {
  indications: string[];
  category: string;
  patternKeywords: string[];
  contraindications: string[];
  modification: string;
  patientSummary: string;
}

interface FormulaJson {
  id: string;
  name: string;
  hanja?: string;
  source?: string;
  description?: string | null;
  compositionExplanation?: string | null;
  cautions?: string | null;
  usage?: string | null;
  indicationText?: string | null;
  indications?: string[];
}

const WEB_DATA = path.resolve(
  __dirname,
  '../../../../../apps/web/public/data/formulas',
);
const SRC_FILE = path.join(WEB_DATA, 'all-formulas.json');
const OUT_FILE = path.join(WEB_DATA, 'formula-structured.json');

function bodyOf(f: FormulaJson): string {
  return [
    f.indicationText,
    f.indications?.join(' '),
    f.description,
    f.compositionExplanation,
    f.cautions,
    f.usage,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_TEXT);
}

async function extract(
  openai: OpenAI,
  f: FormulaJson,
): Promise<Structured | null> {
  const body = bodyOf(f);
  if (body.trim().length < 120) return null;

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `처방명: ${f.name}${f.hanja ? ` (${f.hanja})` : ''}\n출전: ${
          f.source || '미상'
        }\n\n${body}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<Structured>;
    const cat = String(p.category ?? '').trim();
    return {
      indications: Array.isArray(p.indications)
        ? p.indications.map((x) => String(x).trim()).filter(Boolean).slice(0, 12)
        : [],
      // 화면 필터에 없는 값이 오면 '기타' 로 떨어뜨린다. 조용히 사라지는 것보다 낫다.
      category: (CATEGORIES as readonly string[]).includes(cat) ? cat : '기타',
      patternKeywords: Array.isArray(p.patternKeywords)
        ? p.patternKeywords.map((x) => String(x).trim()).filter(Boolean).slice(0, 8)
        : [],
      contraindications: Array.isArray(p.contraindications)
        ? p.contraindications
            .map((x) => String(x).trim())
            .filter(Boolean)
            .slice(0, 8)
        : [],
      modification: String(p.modification ?? '').trim(),
      patientSummary: String(p.patientSummary ?? '').trim(),
    };
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY 가 필요합니다.');
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const formulas = JSON.parse(
    fs.readFileSync(SRC_FILE, 'utf-8'),
  ) as FormulaJson[];

  const existing: Record<string, Structured> = fs.existsSync(OUT_FILE)
    ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf-8'))
    : {};

  const targets = formulas
    .filter((f) => FORCE || !existing[f.id])
    .slice(0, LIMIT);

  console.log(
    `[structure] 대상 ${targets.length}건 / 전체 ${formulas.length}건 (모델 ${MODEL})`,
  );

  let done = 0;
  let empty = 0;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (f) => {
        try {
          const s = await extract(openai, f);
          if (!s) {
            empty++;
            return;
          }
          if (DRY_RUN) {
            console.log(`\n--- ${f.name} ---`);
            console.log('분류:', s.category);
            console.log('적응증:', s.indications.join(' / '));
            console.log('변증:', s.patternKeywords.join(' / '));
            console.log('금기:', s.contraindications.join(' / ') || '(없음)');
            console.log('가감:', s.modification || '(없음)');
            console.log('환자설명:', s.patientSummary);
            return;
          }
          existing[f.id] = s;
          done++;
        } catch (e) {
          console.error(`  실패 ${f.name}: ${(e as Error).message}`);
        }
      }),
    );
    if (!DRY_RUN && (i + CONCURRENCY) % 80 === 0) {
      fs.writeFileSync(OUT_FILE, JSON.stringify(existing, null, 0), 'utf-8');
      console.log(`  ${Math.min(i + CONCURRENCY, targets.length)}/${targets.length} (중간 저장)`);
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(OUT_FILE, JSON.stringify(existing, null, 0), 'utf-8');
    const cats: Record<string, number> = {};
    for (const v of Object.values(existing)) {
      cats[v.category] = (cats[v.category] || 0) + 1;
    }
    console.log(
      `\n[structure] 완료 ${done}건 · 본문부족 ${empty}건 · 누적 ${
        Object.keys(existing).length
      }건`,
    );
    console.log('분류 분포:', JSON.stringify(cats));
    console.log('출력:', OUT_FILE);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[structure] 실패:', e);
    process.exit(1);
  });
