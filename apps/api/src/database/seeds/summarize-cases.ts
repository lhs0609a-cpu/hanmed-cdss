import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { ClinicalCase } from '../entities/clinical-case.entity';
import OpenAI from 'openai';

/**
 * 치험례를 현대 한의사가 읽을 수 있는 형태로 구조화한다.
 *
 * 왜 필요한가 — 원문이 한 덩어리다. 6,454건 중 817건이 4천자를 넘고, 371건은
 * "다음은 ○○의 경험이다" 로 다른 사람 사례가 이어 붙어 있고, 106건은 다른 처방의
 * 교과서 해설까지 들어 있다. 실제로 한 행에 사군자탕 치험례 + 시험복용례 +
 * 급유방 인용 + 거원전 해설 + 활용사례가 함께 들어 있었다. 임상에서 그걸 다 읽고
 * 자기 케이스와 대조할 수는 없다.
 *
 * 무엇을 뽑나 — 한 줄 요약, 변증 근거가 된 결정적 소견, 변증 논리, 가감과 이유,
 * 복용 경과 단계, 그리고 "이 치험례의 특징". 마지막 항목이 핵심이다.
 * 나이·주소증만으로는 내 환자와 비교가 안 된다. 무엇이 이 사례를 특별하게
 * 만들었는지가 있어야 "내 케이스에 갖다 쓸 수 있나" 를 판단할 수 있다.
 *
 * 처방명은 덮어쓰지 않는다 — 본문에서 읽은 이름을 verifiedFormulaName 에 따로
 * 담고 어긋나면 표시만 한다. 근거로 쓰이는 데이터라 조용히 바꾸면 안 된다.
 *
 * 멱등: summarizedAt 이 있는 행은 건너뛴다(--force 로 다시 돌릴 수 있다).
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/summarize-cases.ts [--limit=50] [--id=<uuid>] [--force] [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const ID_ARG = process.argv.find((a) => a.startsWith('--id='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 200;
const MODEL = 'gpt-4o-mini';
const CONCURRENCY = 8;
/** 원문이 길어도 앞부분에 해당 케이스가 있다. 토큰과 비용을 위해 자른다. */
const MAX_TEXT = 9000;

const SYSTEM = `당신은 한의학 치험례를 임상의가 읽기 쉽게 정리합니다.
반드시 JSON 으로만 답하세요. 원문에 없는 내용을 지어내지 마세요.

주의: 한 글에 여러 사례와 교과서 해설이 섞여 있는 경우가 많습니다.
"다음은 ○○의 경험이다", "활용사례", "~와 비교하면", "처방구성을 보면",
고전(급유방·동의보감 등) 인용은 **이 치험례가 아닙니다**. 첫 번째 사례만 정리하고,
그런 내용이 섞여 있으면 hasMixedContent 를 true 로 두세요.

각 필드:
- summaryOneLine: 한 문장. "OO세 O성이 ~로 내원, ~처방 후 ~" 형태.
- keyFindings: 변증의 근거가 된 결정적 소견 3~6개. 짧은 구. 원문 표현을 살리되 압축.
- patternReasoning: 왜 이 변증인지 2~3문장. 원문에 근거가 없으면 빈 문자열.
- verifiedFormulaName: 본문에서 실제로 복용한 처방명 하나. 가감 전 원방 이름.
  확실하지 않으면 빈 문자열.
- modification: 원방 대비 가감과 이유. 없으면 빈 문자열. (예: "2배량 + 건강 2돈 — 하복냉")
- courseSteps: 복용 경과를 시간 순으로. step 은 "1회 복용", "5회 복용", "복용 종료 후",
  "1개월 후" 처럼 짧게. change 는 그때 무엇이 달라졌는지 한 문장. 없으면 빈 배열.
- distinctive: 이 치험례의 특징. 흔한 사례와 무엇이 다른지, 임상의가 자기 환자에
  적용할 때 눈여겨볼 점. 2~3문장.
- hasMixedContent: 위 설명대로 true/false.`;

interface Summary {
  summaryOneLine: string;
  keyFindings: string[];
  patternReasoning: string;
  verifiedFormulaName: string;
  modification: string;
  courseSteps: Array<{ step: string; change: string }>;
  distinctive: string;
  hasMixedContent: boolean;
}

/**
 * 원문에 다른 사례·해설이 섞였는지는 규칙으로 판정한다.
 *
 * 모델에게 물어보면 놓친다 — 실제로 시험복용례·거원전 해설·활용사례가 모두 들어 있는
 * 글을 '혼재 아님' 으로 답했다. 이 표지들은 책 편집상 고정된 문구라 규칙이 더 정확하다.
 */
const MIXED_MARKERS = [
  /다음은[^]{0,40}경험이다/,
  /활용사례/,
  /비교하면/,
  /처방구성을 보면/,
  /≪[^≫]{2,20}≫에서 발췌/,
];

function detectMixedContent(text: string): boolean {
  return MIXED_MARKERS.some((re) => re.test(text));
}

function storedFormulaName(c: ClinicalCase): string | null {
  const raw = c.herbalFormulas as unknown;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const first = raw[0] as { formulaName?: string; name?: string };
  return first?.formulaName ?? first?.name ?? null;
}

async function summarize(openai: OpenAI, c: ClinicalCase): Promise<Summary | null> {
  const text = (c.originalText ?? '').slice(0, MAX_TEXT);
  if (text.trim().length < 80) return null;

  const stored = storedFormulaName(c);
  const context = [
    stored ? `저장된 처방명(참고, 틀릴 수 있음): ${stored}` : null,
    c.patternDiagnosis ? `저장된 변증: ${c.patternDiagnosis}` : null,
    c.patientAgeRange ? `연령대: ${c.patientAgeRange}` : null,
    `치험례 원문:`,
    text,
  ]
    .filter(Boolean)
    .join('\n');

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: context },
    ],
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Summary>;
    return {
      summaryOneLine: String(parsed.summaryOneLine ?? '').trim(),
      keyFindings: Array.isArray(parsed.keyFindings)
        ? parsed.keyFindings.map((k) => String(k).trim()).filter(Boolean).slice(0, 8)
        : [],
      patternReasoning: String(parsed.patternReasoning ?? '').trim(),
      verifiedFormulaName: String(parsed.verifiedFormulaName ?? '').trim(),
      modification: String(parsed.modification ?? '').trim(),
      courseSteps: Array.isArray(parsed.courseSteps)
        ? parsed.courseSteps
            .map((s) => ({
              step: String((s as { step?: string })?.step ?? '').trim(),
              change: String((s as { change?: string })?.change ?? '').trim(),
            }))
            .filter((s) => s.step && s.change)
            .slice(0, 12)
        : [],
      distinctive: String(parsed.distinctive ?? '').trim(),
      hasMixedContent: parsed.hasMixedContent === true,
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

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();

  try {
    const repo = ds.getRepository(ClinicalCase);
    const qb = repo
      .createQueryBuilder('c')
      .where("COALESCE(c.originalText, '') <> ''")
      .orderBy('LENGTH(c."originalText")', 'DESC')
      .take(LIMIT);

    if (ID_ARG) {
      qb.andWhere('c.id = :id', { id: ID_ARG.slice('--id='.length) });
    } else if (!FORCE) {
      qb.andWhere('c."summarizedAt" IS NULL');
    }

    const cases = await qb.getMany();
    console.log(`[summarize] 대상 ${cases.length}건 (모델 ${MODEL})`);

    let done = 0;
    let mismatch = 0;
    let mixed = 0;

    for (let i = 0; i < cases.length; i += CONCURRENCY) {
      const batch = cases.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (c) => {
          try {
            const s = await summarize(openai, c);
            if (!s) return;

            const stored = storedFormulaName(c);
            // 어긋남 판정은 양쪽에 이름이 다 있을 때만. 부분 포함(가감명)은 같은 것으로 본다.
            const isMismatch =
              !!stored &&
              !!s.verifiedFormulaName &&
              !stored.includes(s.verifiedFormulaName) &&
              !s.verifiedFormulaName.includes(stored);

            // 모델 판단과 규칙 판정을 합친다. 둘 중 하나라도 걸리면 혼재로 본다.
            const mixedContent =
              s.hasMixedContent || detectMixedContent(c.originalText ?? '');

            if (isMismatch) mismatch++;
            if (mixedContent) mixed++;

            if (DRY_RUN) {
              console.log(`\n--- ${c.id} ---`);
              console.log('요약:', s.summaryOneLine);
              console.log('저장 처방:', stored, '| 본문 처방:', s.verifiedFormulaName,
                isMismatch ? '  ← 어긋남' : '');
              console.log('가감:', s.modification);
              console.log('근거:', s.keyFindings.join(' / '));
              console.log('변증 논리:', s.patternReasoning);
              console.log('경과:', s.courseSteps.map((x) => `${x.step}: ${x.change}`).join('\n      '));
              console.log('특징:', s.distinctive);
              console.log('혼재:', mixedContent, `(모델 ${s.hasMixedContent} / 규칙 ${detectMixedContent(c.originalText ?? '')})`);
              return;
            }

            await repo.update(
              { id: c.id },
              {
                summaryOneLine: s.summaryOneLine || null,
                keyFindings: s.keyFindings,
                patternReasoning: s.patternReasoning || null,
                modification: s.modification || null,
                courseSteps: s.courseSteps,
                distinctive: s.distinctive || null,
                verifiedFormulaName: s.verifiedFormulaName || null,
                formulaMismatch: isMismatch,
                hasMixedContent: mixedContent,
                summarizedAt: new Date(),
              },
            );
            done++;
          } catch (e) {
            console.error(`  실패 ${c.id}: ${(e as Error).message}`);
          }
        }),
      );
      if (!DRY_RUN && (i + CONCURRENCY) % 40 === 0) {
        console.log(`  ${Math.min(i + CONCURRENCY, cases.length)}/${cases.length}`);
      }
    }

    console.log(
      `\n[summarize] 완료 ${done}건 · 처방명 어긋남 ${mismatch}건 · 원문 혼재 ${mixed}건`,
    );
  } finally {
    await ds.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[summarize] 실패:', e);
    process.exit(1);
  });
