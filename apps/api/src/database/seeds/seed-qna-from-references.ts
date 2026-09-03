import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post, PostStatus, PostType } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { Reference } from '../entities/reference.entity';

/**
 * Q&A 게시판을 "질문과 근거" 로 채운다.
 *
 * 게시판이 질문 일곱 개로 비어 있었다. 빈 Q&A 는 아무도 두 번 열지 않는다 —
 * 물어봐야 답이 안 달릴 것 같으니 묻지 않고, 묻지 않으니 계속 비어 있다.
 *
 * 질문을 지어내지 않는다. 자료실 문헌 한 편을 골라 "그 논문이 답하고 있는
 * 임상 질문" 을 제목으로 세우고, 본문에는 그 논문이 실제로 보여준 것만
 * 적는다. 지어낸 임상 경험담이 아니라 근거 카드다. 그래서 작성자는 운영팀이고
 * 익명이 아니며, 글마다 원문 링크가 붙는다.
 *
 * 왜 문헌을 재료로 쓰나. 한의사가 실제로 궁금해하는 것은 "이 치료가 되느냐"
 * 이고, 그 질문에 답하는 자료가 우리에게 16,000편 있다. 그중 임상에서 만나는
 * 주소증을 다룬 것만 고른다 — 전립선암 안드로겐 억제요법은 궁금하지 않다.
 *
 * 사람이 올린 질문을 덮지 않는다. 목록은 사람 글을 위로 올리고(findAllPosts),
 * 작성자 필터로 "한의사 글만" 을 고를 수 있다. 그래도 이 글들이 사람 글보다
 * 백 배 많다는 사실은 변하지 않으므로, '근거정리' 태그를 달아 구분한다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/seed-qna-from-references.ts --limit=8 --dry-run
 *   ... --limit=300 --shard=0/4    (넷을 동시에 돌린다)
 *   ... --stats-only
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const LIMIT = Number(argValue('limit') ?? '8') || 8;
const DRY_RUN = process.argv.includes('--dry-run');
const STATS_ONLY = process.argv.includes('--stats-only');

/** 여러 개를 동시에 돌리기 위한 분할. digest-references 와 같은 방식이다. */
const SHARD = (() => {
  const v = argValue('shard');
  if (!v) return null;
  const [i, n] = v.split('/').map((x) => parseInt(x, 10));
  if (!Number.isFinite(i) || !Number.isFinite(n) || n < 1 || i < 0 || i >= n) {
    console.error('--shard 는 0/4 형식입니다.');
    process.exit(1);
  }
  return { i, n };
})();

/** 한 번에 모델에 넘길 건수. 크게 잡으면 응답이 잘려 JSON 이 깨진다. */
const BATCH = 4;

/** Q&A 임을 표시하는 태그. 사람이 올린 질문과 구분된다. */
const EVIDENCE_TAG = '근거정리';

/**
 * 한의원에서 실제로 보는 주소증.
 *
 * translate-references 의 CLINIC_SYMPTOMS 와 같은 목적이다. 다만 여기서는
 * 한국어 제목·요약을 상대로 찾으므로 한글 낱말로 쓴다.
 */
const CLINIC_TOPICS = [
  '요통', '허리', '디스크', '척추', '좌골', '방사통',
  '경항통', '목통증', '경추', '거북목',
  '견비통', '오십견', '어깨', '회전근',
  '슬통', '무릎', '관절염', '퇴행성',
  '두통', '편두통', '어지럼', '현훈', '이명',
  '불면', '수면',
  '소화불량', '위염', '역류', '변비', '설사', '과민성',
  '월경통', '월경불순', '갱년기', '난임', '임신',
  '비염', '아토피', '두드러기', '피부',
  '안면마비', '구안와사', '중풍', '뇌졸중', '편마비',
  '섬유근통', '근막', '요추', '염좌',
  '피로', '우울', '불안', '화병',
  '수족냉증', '부종', '비만', '다이어트',
  '소아', '야뇨', '성장', '틱',
  '수근관', '테니스엘보', '족저근막',
  '침', '전침', '뜸', '부항', '추나', '약침', '한약',
];

const SYSTEM_PROMPT = `당신은 한국 한의사를 위한 임상 Q&A 편집자입니다.
논문 한 편을 받아 "진료실에서 실제로 나오는 질문" 하나와 그 답을 씁니다.

question — 질문 제목
  한의사가 동료에게 물을 법한 말로 씁니다. 60자 이내.
  논문 제목을 그대로 옮기지 마십시오. 궁금해서 묻는 문장이어야 합니다.
  좋은 예: "만성 요통에 침 치료, 위약보다 낫다는 근거가 있나요?"
  나쁜 예: "만성 요통에 대한 침 치료의 효과: 체계적 고찰 및 메타분석"

answer — 답변 본문. 아래 순서를 지킵니다. 마크다운을 씁니다.
  1) 첫 문단: 결론 두세 문장. 무엇이 어느 방향으로 얼마나였는지.
  2) "## 무엇을 본 연구인가" — 대상·설계·비교군·규모를 2~3문장.
  3) "## 결과" — 주요 지표가 어떻게 움직였는지. 숫자가 초록에 있으면 그대로.
  4) "## 이 결과를 진료에 쓸 때" — 한계와 주의. 초록에 한계가 없으면
     "초록에 명시된 한계가 없다" 고 적고 지어내지 마십시오.

지켜야 할 것:

1. 용량·투여횟수·시술 프로토콜을 쓰지 마십시오. "하루 3회", "황기 12g",
   "주 2회 20분" 같은 것은 넣지 않습니다. 옮기다 한 글자만 틀려도 그걸 보고
   처방하는 사람이 생깁니다. 필요한 사람은 원문을 봐야 합니다.

2. 받은 자료에 없는 말을 쓰지 마십시오. 효과를 부풀리지 말고, 자료가
   "유의한 차이 없음" 이라고 하면 그렇게 씁니다. 임상 해석을 덧붙이지
   마십시오. 다른 논문 이야기를 끌어오지 마십시오.

3. 용어는 한국 한의계에서 쓰는 말로. 처방명·혈위는 한글과 원어를 함께
   적습니다: 작약감초탕(芍藥甘草湯), 족삼리(ST36).

4. 문체는 "~습니다". 동료에게 설명하듯 씁니다.

5. 마크다운은 제목(##)·강조(**)·목록(-)·표(|)·인용(>)만 씁니다.

JSON 배열로만 답하십시오. 설명을 덧붙이지 마십시오.
[{"id":"<받은 id 그대로>","question":"...","answer":"..."}]`;

interface Job {
  id: string;
  title: string;
  summary: string;
  digest: string;
  journal: string | null;
  year: number | null;
}

interface Card {
  question: string;
  answer: string;
}

async function callModel(jobs: Job[]): Promise<Map<string, Card>> {
  const userMsg = `다음 문헌 ${jobs.length}건을 처리하십시오.\n\n${JSON.stringify(jobs, null, 1)}`;

  let text = '';
  if (process.env.ANTHROPIC_API_KEY) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    });
    text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  } else {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: process.env.GPT_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.3,
    });
    text = res.choices[0]?.message?.content ?? '';
  }

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end < 0) {
    throw new Error(`JSON 배열을 못 찾음: ${cleaned.slice(0, 120)}`);
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Array<{
    id: string;
    question?: string;
    answer?: string;
  }>;

  const out = new Map<string, Card>();
  for (const r of parsed) {
    const q = r?.question?.trim();
    const a = r?.answer?.trim();
    if (!r?.id || !q || !a) continue;
    // 검사. 하나라도 걸리면 버리고 다음 실행에서 다시 받는다.
    if (q.length < 8 || q.length > 90) continue;
    if (!q.includes('?') && !q.includes('까') && !q.includes('나요')) continue;
    if (a.length < 200) continue;
    out.set(r.id, { question: q, answer: a });
  }
  return out;
}

/** 본문 끝에 붙는 것 — 출처와 고지. 이것 없이는 올리지 않는다. */
function buildBody(card: Card, r: Reference): string {
  const NL = String.fromCharCode(10);
  const parts: string[] = [card.answer.trim()];

  const rows: string[] = ['| 항목 | 내용 |', '|---|---|'];
  if (r.journal) {
    rows.push(
      '| 근거 문헌 | ' +
        (r.titleKo || r.title).replace(/\|/g, '/') +
        ' |',
    );
    rows.push(
      '| 학술지 | ' +
        r.journal +
        (r.publishedYear ? ' · ' + r.publishedYear + '년' : '') +
        ' |',
    );
  }
  parts.push('## 근거' + NL + NL + rows.join(NL));

  parts.push(
    '---' +
      NL +
      NL +
      '이 답은 논문 한 편이 보여준 것만 정리한 것입니다. 용량과 시술 ' +
      '프로토콜은 넣지 않았으니 처방을 정하기 전에 원문을 확인해 주세요. ' +
      '다르게 경험하셨다면 댓글로 알려 주세요.',
  );

  const sources = ['- [원문 보기](' + r.url + ')'];
  if (r.doi) sources.push('- DOI: ' + r.doi);
  if (r.source === 'kci') sources.push('- KCI(한국학술지인용색인) 데이터 활용');
  parts.push('**출처**' + NL + NL + sources.join(NL));

  return parts.join(NL + NL);
}

/** 주제 태그 — 제목과 요약에서 찾은 것만. 지어내지 않는다. */
function buildTags(r: Reference, question: string): string[] {
  const hay = `${r.titleKo ?? ''} ${r.summaryKo ?? ''} ${question}`;
  const tags: string[] = [EVIDENCE_TAG];
  for (const t of CLINIC_TOPICS) {
    if (tags.length >= 5) break;
    if (hay.includes(t) && !tags.includes(t)) tags.push(t);
  }
  return tags;
}

async function main(): Promise<void> {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const refRepo = ds.getRepository(Reference);
    const postRepo = ds.getRepository(Post);
    const userRepo = ds.getRepository(User);

    // 후보: 한국어 제목과 우리가 만든 구조 요약이 둘 다 있고, 아직 어느
    // 게시판에도 올리지 않은 문헌. 그중 임상 주제어가 걸리는 것.
    const topicWhere = CLINIC_TOPICS.map(
      (_, i) => `(r."titleKo" LIKE :t${i} OR r."summaryKo" LIKE :t${i})`,
    ).join(' OR ');
    const topicParams: Record<string, string> = {};
    CLINIC_TOPICS.forEach((t, i) => (topicParams[`t${i}`] = `%${t}%`));

    const base = () =>
      refRepo
        .createQueryBuilder('r')
        .where('r."featuredInCommunity" = false')
        .andWhere('r."titleKo" IS NOT NULL')
        .andWhere('r."abstractKo" IS NOT NULL')
        .andWhere(`(${topicWhere})`, topicParams);

    const total = await base().getCount();
    console.log(`Q&A 후보 ${total.toLocaleString()}건`);
    const already = await postRepo
      .createQueryBuilder('p')
      .where('p.type = :t', { t: PostType.QNA })
      .getCount();
    console.log(`지금 Q&A 게시판 ${already.toLocaleString()}편`);
    if (STATS_ONLY) return;

    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      console.error('ANTHROPIC_API_KEY 또는 OPENAI_API_KEY 가 필요합니다.');
      process.exit(1);
    }

    const author = await userRepo.findOne({
      where: { role: 'content_manager' as User['role'] },
    });
    if (!author) {
      // 시드가 사용자를 창조하기 시작하면 어디까지가 진짜인지 알 수 없어진다.
      console.error('운영팀 계정(content_manager)이 없습니다.');
      process.exit(1);
    }

    const qb = base()
      // 근거 수준이 높은 것부터. 같은 질문이라면 체계적 고찰이 답이 된다.
      .orderBy(
        `CASE r."evidenceType"
           WHEN 'systematic_review' THEN 1
           WHEN 'rct' THEN 2
           WHEN 'guideline' THEN 3
           ELSE 4 END`,
        'ASC',
      )
      .addOrderBy('r."publishedAt"', 'DESC', 'NULLS LAST')
      .take(LIMIT);
    if (SHARD) {
      qb.andWhere(`(('x' || right(r.id::text, 1))::bit(4)::int) % :n = :i`, {
        n: SHARD.n,
        i: SHARD.i,
      });
      console.log(`분할 ${SHARD.i}/${SHARD.n} 만 처리합니다.`);
    }

    const rows = await qb.getMany();
    if (rows.length === 0) {
      console.log('대상이 없습니다.');
      return;
    }

    let ok = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const jobs: Job[] = chunk.map((r) => ({
        id: r.id,
        title: r.titleKo || r.title,
        summary: r.summaryKo ?? '',
        digest: (r.abstractKo ?? '').slice(0, 1800),
        journal: r.journal,
        year: r.publishedYear,
      }));

      try {
        const res = await callModel(jobs);
        for (const r of chunk) {
          const card = res.get(r.id);
          if (!card) {
            failed += 1;
            continue;
          }

          const title =
            card.question.length > 200
              ? card.question.slice(0, 197) + '…'
              : card.question;

          if (DRY_RUN) {
            console.log(`\n${'='.repeat(70)}\nQ. ${title}\n${'-'.repeat(70)}`);
            console.log(buildBody(card, r));
            console.log('태그:', buildTags(r, card.question).join(', '));
            ok += 1;
            continue;
          }

          // 같은 질문이 두 번 올라가지 않게. 제목이 멱등 키다.
          const exists = await postRepo.findOne({ where: { title } });
          if (exists) {
            await refRepo.update({ id: r.id }, { featuredInCommunity: true });
            skipped += 1;
            continue;
          }

          await postRepo.save(
            postRepo.create({
              title,
              content: buildBody(card, r),
              type: PostType.QNA,
              authorId: author.id,
              // 운영팀 글이라는 것이 보여야 한다.
              isAnonymous: false,
              tags: buildTags(r, card.question),
              status: PostStatus.ACTIVE,
            }),
          );
          await refRepo.update({ id: r.id }, { featuredInCommunity: true });
          ok += 1;
        }
        console.log(
          `  ${Math.min(i + BATCH, rows.length)}/${rows.length} — 올림 ${ok} · 건너뜀 ${skipped} · 실패 ${failed}`,
        );
      } catch (e) {
        failed += chunk.length;
        console.log(`  묶음 실패: ${(e as Error).message}`);
      }
    }

    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}Q&A ${ok}건 · 건너뜀 ${skipped}건 · 실패 ${failed}건`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
