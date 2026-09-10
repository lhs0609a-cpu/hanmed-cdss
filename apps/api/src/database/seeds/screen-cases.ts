import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import {
  CaseCorpus,
  ClinicalCase,
  ExclusionReason,
} from '../entities/clinical-case.entity';
import OpenAI from 'openai';

/**
 * 치험례 목록에서 뺄 것을 골라낸다.
 *
 * 왜 필요한가 — 수집 원본이 문서 통째라, 치험례가 아닌 덩어리가 같은 표에
 * 들어와 있다. 실제로 목록 첫 페이지에서 나오는 것들이다:
 *
 *   "● ●이윤호선생의 자료입니다. 이중탕계열 처방도표 강의용 자료"  (전문 38자)
 *   "156. 삼기탕 1-2. 탈항 여 51세 주부 157. 2-1. 단독 여 21세…"  (목차 줄)
 *   "●본초 강좌 《전호》입니다. 본초강목에 전호의 성상이…"          (본초 설명)
 *   "친구 조원장이 있다. 친구 마누라가 살다가 이혼하자고 해서…"     (신변잡기)
 *
 * 왜 길이로 못 자르나 — 222자짜리 이진탕 시험복용례는 회차별 반응이 적혀
 * 있어 임상에서 쓸 만하고, 2,048자짜리 멀쩡한 치험례는 끝에 색인표가 붙어
 * 있을 뿐이다. 300자 컷은 71건을 빼는데 그중 13건이 멀쩡했고, 600자 컷은
 * 832건을 빼면서 489건을 잃는다(실측). 그래서 건별로 본다.
 *
 * 왜 LLM 인가 — 정규식으로는 "무작위"라는 낱말이 고찰에 나온다고 진짜 암
 * 치험례가 걸리고, 끝에 붙은 색인표 때문에 2천자짜리 사례가 걸렸다.
 * 판정은 "이 글이 진료 기록인가"라는 읽기 문제라 규칙으로 안 된다.
 *
 * 후보만 본다 — 8,579건을 다 돌릴 이유가 없다. 짧거나, 경과 단계가 없거나,
 * 본문에서 처방을 못 읽었거나, 색인·강의 표식이 있는 행만 후보로 삼는다
 * (1,607건). 그 밖의 것은 이미 회차별 경과까지 붙어 있는 진짜 치험례다.
 *
 * 지우지 않는다 — excludedReason 에 사유만 남기고 조회에서 뺀다.
 * 판정이 틀릴 수 있고, 파서를 고치면 되살아날 것이 섞여 있다.
 *
 * 멱등: screenedAt 이 있는 행은 건너뛴다(--force 로 다시 돌린다).
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/screen-cases.ts [--limit=200] [--force] [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 2000;
const MODEL = 'gpt-4o-mini';
const CONCURRENCY = 8;
/** 판정에 필요한 건 앞부분이면 충분하다. 뒤에 붙은 색인표까지 읽힐 필요 없다. */
const MAX_TEXT = 2500;

const SYSTEM = `당신은 한의학 치험례 자료를 검수합니다.
주어진 글이 "한의사가 임상에서 참고할 수 있는 진료 기록"인지 판정하세요.
반드시 JSON 으로만 답하세요.

남길 것(keep) — 한 사람(또는 한 마리)에게 실제로 약을 쓰고 그 결과를 적은 글.
  · 환자 상태와 투약과 반응이 있으면 짧아도 남깁니다(200자여도 됩니다).
  · 시험복용례·체험기도 남깁니다. 효과가 없었다는 기록(무효례·실패례)도 남깁니다.
    여러 사람의 복용 반응을 줄줄이 적은 "N-N. 복용례" 형태도 목차가 아닙니다 —
    한 줄 한 줄이 실제로 먹고 어땠는지의 기록이라 남깁니다
    ("○○○ 남 34세 … 이진탕을 복용한 후 약간 졸리고 평소보다 허기를 느꼈다").
    목차는 병명과 인적사항만 있고 먹은 뒤 이야기가 없는 쪽입니다.
  · 사람이 아닌 소·개에게 쓴 치험례도 남깁니다.
  · 옛 문헌(급유방·의종손익 등)에서 발췌한 증례도 실제 진료 기록이면 남깁니다.
  · 선생의 경험을 채록한 것도, 누구에게 무엇을 써서 어떻게 됐는지가 있으면 남깁니다.

뺄 것 — 아래 중 하나에 해당하면 그 사유를 답합니다.
  · index   : 목차·색인 줄. "156. 삼기탕 1-2. 탈항 여 51세 주부 157. 2-1. 단독…"
              처럼 처방명과 병명과 인적사항만 나열되고 진료 서술이 없는 것.
              여러 사례를 한 줄씩 나열한 표도 여기 해당합니다.
              **글의 첫머리가 그 표인지를 보세요.** 진짜 치험례는 제목과 환자
              줄로 시작하고 표는 꼬리에 붙습니다("…호전되었다. 이향산의 치험
              총람 1. …"). 반대로 "이○○ [15-4] 여 8개월 감기 기침 1회 1첩
              도○○ [15-5] 남 9 소양인 …" 처럼 표로 시작하면 색인입니다.
  · lecture : 처방 해설·처방도표·강의자료·비교표. 특정 환자가 없는 설명글.
              약재 구성과 용법만 적힌 전수방·비방 소개도 여기 해당합니다
              ("영선제통음 마황 적작약 4g 형개… 공용-하지정맥류 용법-1일 3회
              식후복 제공자-OOO 선생" — 쓴 환자가 없으면 치험례가 아닙니다).
  · materia : 본초 설명. 약재의 성상·채취·수치·감별 이야기.
  · abstract: 학술 논문 초록이나 임상연구 요약. 남의 연구 소개.
  · chatter : 신변잡기·질문글·역사 일화·제품 홍보. 진료 기록이 아닌 것.
  · empty   : 형식은 치험례인데 증상도 처방도 경과도 남아 있지 않은 것.

애매하면 keep 입니다. 진료 서술이 조금이라도 있으면 남기세요.

응답: {"verdict":"keep"} 또는 {"verdict":"drop","reason":"index","why":"한 줄 근거"}`;

interface Verdict {
  verdict: 'keep' | 'drop';
  reason?: string;
  why?: string;
}

const REASONS = new Set<string>(Object.values(ExclusionReason));

/**
 * 판정 후보.
 *
 * 여기 안 걸리는 행은 회차별 경과와 본문 확인 처방명을 이미 갖춘 것들이다.
 * 그런 것까지 LLM 에 보내는 건 돈과 시간을 버리는 일이다.
 */
const CANDIDATE_SQL = `
  c.corpus = :corpus
  AND (
    length(c."originalText") < 700
    OR c."courseSteps" IS NULL
    OR jsonb_array_length(c."courseSteps") = 0
    OR coalesce(c."verifiedFormulaName", '') = ''
    OR c."originalText" ~ '^[0-9]+[.][[:space:]]'
    OR c."originalText" ~ '([[][0-9]+-[0-9]+[]])'
    OR c."originalText" ~ '(처방도표|강의용|공부해|본초 강좌|본초강좌|총람|처방기준)'
    OR c."originalText" ~ '(임상연구|무작위|코호트|메타분석)'
    OR c."originalText" !~ '(투약|처방|지어|복용|투여|썼다|사용했|달여|服用)'
  )
`;

/** 판정에 필요한 것만. 전체 행을 뜨면 행마다 1,536차원 임베딩이 딸려 온다. */
interface Candidate {
  id: string;
  sourceId: string;
  originalText: string;
  len: number;
}

async function judge(
  openai: OpenAI,
  row: Candidate,
): Promise<Verdict | null> {
  const text = (row.originalText || '').slice(0, MAX_TEXT);
  try {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `전체 길이 ${row.len}자\n\n${text}` },
      ],
    });
    const raw = res.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Verdict;
    if (parsed.verdict !== 'drop' && parsed.verdict !== 'keep') return null;
    if (parsed.verdict === 'drop' && !REASONS.has(parsed.reason || '')) {
      // 사유를 못 대면 판정을 믿지 않는다 — 남기는 쪽이 안전하다.
      return { verdict: 'keep' };
    }
    return parsed;
  } catch (e) {
    console.warn(`  [!] ${row.sourceId}: ${(e as Error).message}`);
    return null;
  }
}

async function screen(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[screen] OPENAI_API_KEY 가 없다. .env.local 을 확인한다.');
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey });

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('[screen] DB 연결됨');

  try {
    const repo = dataSource.getRepository(ClinicalCase);
    const qb = repo
      .createQueryBuilder('c')
      // 필요한 열만 고른다. getMany() 로 전체 행을 뜨면 행마다 1,536차원
      // 임베딩이 딸려 와, 1,600건이면 판정을 시작하기도 전에 수십 MB 를
      // 실어 나른다(실제로 4분간 한 건도 못 넘어갔다).
      .select([
        'c.id AS id',
        'c."sourceId" AS "sourceId"',
        'c."originalText" AS "originalText"',
        'length(c."originalText") AS len',
      ])
      .where(CANDIDATE_SQL, { corpus: CaseCorpus.KOREAN })
      .orderBy('length(c."originalText")', 'ASC')
      .limit(LIMIT);
    if (!FORCE) qb.andWhere('c."screenedAt" IS NULL');

    const rows: Candidate[] = (await qb.getRawMany()).map((r) => ({
      id: String(r.id),
      sourceId: String(r.sourceId),
      originalText: String(r.originalText ?? ''),
      len: Number(r.len ?? 0),
    }));
    console.log(`[screen] 후보 ${rows.length}건 (모델 ${MODEL}, 동시 ${CONCURRENCY})`);
    if (!rows.length) return;

    const tally: Record<string, number> = {};
    let done = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      const verdicts = await Promise.all(batch.map((r) => judge(openai, r)));

      // 사유별로 모아 한 번씩 UPDATE 한다. 행마다 왕복하면 1,600건에
      // 왕복만 1,600번이고, 그게 판정보다 오래 걸린다.
      const byReason = new Map<string | null, string[]>();
      for (let k = 0; k < batch.length; k++) {
        const row = batch[k];
        const v = verdicts[k];
        if (!v) {
          failed++;
          continue;
        }
        const reason = v.verdict === 'drop' ? (v.reason as string) : null;
        tally[reason ?? 'keep'] = (tally[reason ?? 'keep'] ?? 0) + 1;
        if (reason) {
          console.log(
            `  [-] ${reason.padEnd(8)} ${row.sourceId} (${row.len}자) ${v.why ?? ''}`,
          );
        }
        const bucket = byReason.get(reason) ?? [];
        bucket.push(row.id);
        byReason.set(reason, bucket);
      }
      if (!DRY_RUN) {
        for (const [reason, ids] of byReason) {
          if (!ids.length) continue;
          await repo
            .createQueryBuilder()
            .update(ClinicalCase)
            .set({ excludedReason: reason, screenedAt: new Date() })
            .whereInIds(ids)
            .execute();
        }
      }
      done += batch.length;
      if (done % 80 === 0 || done === rows.length) {
        console.log(`[screen] ${done}/${rows.length}`);
      }
    }

    console.log('\n[screen] 판정 결과');
    for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(10)} ${n}건`);
    }
    if (failed) console.log(`  (판정 실패 ${failed}건 — 손대지 않았다)`);
    if (DRY_RUN) console.log('[screen] --dry-run 이라 저장하지 않았다.');
  } finally {
    await dataSource.destroy();
  }
}

screen().catch((e) => {
  console.error('[screen] 실패:', e);
  process.exit(1);
});
