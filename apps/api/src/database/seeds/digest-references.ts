import { DataSource, IsNull, Not } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Reference, ReferenceSource } from '../entities/reference.entity';

/**
 * 영문 초록을 한국어 구조 요약으로 다시 쓴다.
 *
 * 왜 만들었나: 커뮤니티 문헌 소개글 본문 한가운데에 영문 초록이 그대로
 * 박혀 있었다. 한글 게시판인데 읽히지 않는 영어가 절반이라, 그건 콘텐츠가
 * 아니라 자리 채우기다.
 *
 * summaryKo 로는 모자란다. 평균 166자짜리 3~4문장이라 목록에서 훑기에는
 * 맞지만 상세 화면 한 편을 채우지 못한다. 원문 초록은 평균 1,913자다.
 *
 * 초록을 통째로 번역하지 않는다.
 *
 *   저작권 — 초록 저작권은 대개 출판사에 있다. 출처를 밝힌 짧은 인용은
 *   정당한 범위로 볼 여지가 있어도 전문 번역은 2차적 저작물 작성이다.
 *   우리가 다시 쓴 요약은 우리 글이라 그 문제가 없다.
 *
 *   오역 — 초록에는 용량과 시술 프로토콜이 들어 있다. 옮기다 한 글자만
 *   틀려도 그걸 보고 처방하는 사람이 생긴다. 그래서 용량은 넣지 않고,
 *   그 정보가 필요한 사람은 원문으로 가게 한다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/digest-references.ts --limit=50
 *   ... --dry-run       (저장하지 않고 결과만 본다)
 *   ... --featured-only (커뮤니티에 이미 올린 것만 — 화면에 바로 보인다)
 *   ... --stats-only
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const LIMIT = Number(argValue('limit') ?? '20') || 20;
const DRY_RUN = process.argv.includes('--dry-run');
const STATS_ONLY = process.argv.includes('--stats-only');
const FEATURED_ONLY = process.argv.includes('--featured-only');

/**
 * 여러 개를 동시에 돌리기 위한 분할. --shard=0/4 처럼 준다.
 *
 * 한 프로세스로는 1분에 20건이라 14,000건에 12시간이 걸린다. 그런데 그냥
 * 여러 개를 띄우면 전부 같은 행을 집어 온다 — 조건이 "abstractKo IS NULL"
 * 하나뿐이라 네 프로세스가 같은 논문을 네 번 요약하고 API 값만 네 배로 쓴다.
 *
 * UUID 끝 한 글자로 나눈다. 16진수라 고르게 흩어지고, 질의에 인덱스가
 * 필요 없는 값이라 부담도 없다.
 */
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

/** 초록에서 모델에 넘길 길이. 넘겨 봐야 결론은 앞쪽에 다 있다. */
const ABSTRACT_CHARS = 3000;

const SYSTEM_PROMPT = `당신은 한국 한의사를 위한 의학 문헌 큐레이터입니다.
초록을 읽고 한국어 구조 요약을 씁니다. 번역이 아니라 다시 쓰는 것입니다.

초록이 영어면 한국어로 다시 씁니다. 초록이 한국어면 그 내용을 같은 구조로
정리하고, 한자로 적힌 말은 한글 독음으로 바꿉니다. 처방명·서명·인명처럼
원어가 필요한 것만 "보중익기탕(補中益氣湯)" 처럼 병기합니다.

형식 — 아래 네 항목을 이 순서로, 각 항목을 한 줄로 씁니다.
항목 이름을 그대로 쓰고 전각 콜론 없이 "배경: " 처럼 씁니다.

배경: 무엇이 문제였고 왜 이 연구를 했는지. 1~2문장.
방법: 어떤 대상에게 무엇을 했고 무엇과 비교했는지. 1~2문장.
결과: 주요 지표가 어느 방향으로 얼마나 움직였는지. 2~3문장.
한계: 이 결과를 진료에 쓸 때 걸리는 점. 1~2문장.

네 항목을 하나도 빠뜨리지 마십시오. 특히 "한계:" 줄을 빼지 마십시오.
초록의 결론은 "결과:" 줄 끝에 녹여 쓰고 "결론:" 이라는 말은 쓰지 마십시오.

지켜야 할 것:

1. 용량·투여횟수·시술 프로토콜을 쓰지 마십시오.
   "하루 3회", "6주간 주 2회 20분", "황기 12g" 같은 것은 넣지 않습니다.
   그 정보가 필요한 사람은 원문을 봐야 합니다. 옮기다 한 글자만 틀려도
   그걸 보고 처방하는 사람이 생깁니다. 대신 "6주간 시행했다" 처럼 기간만
   적거나 아예 생략하십시오.

2. 초록에 없는 말을 쓰지 마십시오. 효과를 부풀리지 말고, 초록이 "유의한
   차이 없음" 이라고 하면 그렇게 씁니다. 임상 해석을 덧붙이지 마십시오.

3. 한계는 구체적으로 씁니다. "연구의 한계가 있다" 는 읽는 사람에게 아무것도
   주지 않습니다. "포함 연구가 7편으로 적고 이질성이 컸다",
   "대조군이 무처치라 위약 효과를 가릴 수 없다" 처럼 씁니다.
   초록에 한계가 안 적혀 있으면 "한계: 초록에 명시된 한계가 없다." 라고
   쓰십시오. 지어내지 마십시오.

4. 용어는 한국 한의계에서 실제로 쓰는 말로 옮깁니다.
   acupuncture 침 치료 / electroacupuncture 전침 / moxibustion 뜸
   cupping 부항 / herbal medicine 한약 / low back pain 요통
   frozen shoulder 오십견(유착성 관절낭염) / Bell's palsy 구안와사

5. 본초 학명은 한국 본초명으로 옮깁니다. 음역하지 마십시오.
   "Saururus chinensis" 를 "사우루루스" 로 적는 것은 틀렸습니다. 삼백초입니다.
   Astragalus 황기 / Angelica gigas 당귀 / Paeonia lactiflora 작약
   Glycyrrhiza 감초 / Panax ginseng 인삼 / Cinnamomum cassia 계피
   Poria cocos 복령 / Atractylodes 백출 / Bupleurum 시호
   Scutellaria baicalensis 황금 / Coptis chinensis 황련
   Rehmannia glutinosa 지황 / Ephedra 마황 / Pueraria 갈근
   모르면 학명을 그대로 두십시오. 음역은 금지입니다.

6. 처방명과 혈위는 한글과 원어를 함께 적습니다.
   Shaoyao Gancao Tang 작약감초탕(芍藥甘草湯) / PC6 내관(PC6)
   Zusanli 족삼리(ST36) / Hegu 합곡(LI4) / Baihui 백회(GV20)
   중국 중성약은 한국에서 쓰지 않으므로 원어를 그대로 두십시오.

7. 문체는 평서형 "~했다/~였다". 마크다운 기호(**, ##, -)를 쓰지 마십시오.

8. summaryKo 도 함께 씁니다. 목록 카드에 한 줄로 나가는 문장이라 무엇을
   알아냈는지가 2~3문장 안에 들어와야 합니다. 결과를 앞세우십시오.
   "이 연구는 ~하기 위해 수행되었다" 로 시작하지 마십시오 — 목록에서
   제목 아래 붙는 문장이라 그렇게 쓰면 배경만 두 번 읽게 됩니다.
   여기에도 용량과 프로토콜은 쓰지 않습니다.

JSON 배열로만 답하십시오. 설명을 덧붙이지 마십시오.
[{"id":"<받은 id 그대로>","summaryKo":"...","abstractKo":"배경: ...\\n방법: ...\\n결과: ...\\n한계: ..."}]`;

interface Job {
  id: string;
  title: string;
  abstract: string;
  journal: string | null;
  year: number | null;
}

interface Digest {
  abstractKo: string;
  /** 목록 카드에 나가는 한 줄 요약. 이미 있는 문헌은 덮어쓰지 않는다. */
  summaryKo: string | null;
}

async function callModel(jobs: Job[]): Promise<Map<string, Digest>> {
  const payload = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    journal: j.journal,
    year: j.year,
    abstract: j.abstract.slice(0, ABSTRACT_CHARS),
  }));
  const userMsg = `다음 문헌 ${jobs.length}건을 처리하십시오.\n\n${JSON.stringify(payload, null, 1)}`;

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
      temperature: 0.2,
    });
    text = res.choices[0]?.message?.content ?? '';
  }

  // 모델이 코드펜스를 붙이는 경우가 있다.
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
    abstractKo?: string;
    summaryKo?: string;
  }>;

  const out = new Map<string, Digest>();
  for (const r of parsed) {
    const v = r?.abstractKo?.trim();
    if (!r?.id || !v) continue;
    // 네 항목이 다 있는지 본다. 하나라도 빠지면 화면에서 토막 난 것처럼
    // 보이므로 저장하지 않고 다음 실행에서 다시 시도한다.
    if (!/배경:/.test(v) || !/결과:/.test(v) || !/한계:/.test(v)) continue;
    const one = r.summaryKo?.trim();
    out.set(r.id, {
      abstractKo: splitSections(v),
      // 한 줄 요약은 짧아야 뜻이 있다. 길게 온 것은 버리고 구조 요약만 쓴다.
      summaryKo: one && one.length >= 20 && one.length <= 400 ? one : null,
    });
  }
  return out;
}

/**
 * 항목을 줄로 나눈다.
 *
 * 프롬프트에서 줄바꿈을 요구했는데도 모델이 네 항목을 한 줄로 붙여 보내는
 * 일이 잦다. 화면에서는 벽 같은 문단 하나가 되어 구조 요약을 만든 뜻이
 * 없어진다. 모델에 다시 부탁하는 것보다 여기서 나누는 편이 확실하다 —
 * 항목 이름은 우리가 정한 넷뿐이라 규칙이 흔들리지 않는다.
 */
function splitSections(v: string): string {
  return v
    .replace(/\s*(방법:|결과:|한계:)/g, String.fromCharCode(10) + '$1')
    .split(String.fromCharCode(10))
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join(String.fromCharCode(10));
}

async function main(): Promise<void> {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const repo = ds.getRepository(Reference);

    const done = await repo.count({ where: { abstractKo: Not(IsNull()) } });
    // 아래 조회 조건과 같은 것을 센다. 다르면 "남은 대상" 이 거짓말을 한다.
    const target = await repo
      .createQueryBuilder('r')
      .where('r."abstractKo" IS NULL')
      .andWhere('r."abstract" IS NOT NULL')
      .andWhere(`(r."source" = :kci OR r."summaryKo" IS NOT NULL)`, {
        kci: ReferenceSource.KCI,
      })
      .getCount();
    const targetFeatured = await repo
      .createQueryBuilder('r')
      .where('r."abstractKo" IS NULL')
      .andWhere('r."abstract" IS NOT NULL')
      .andWhere('r."featuredInCommunity" = true')
      .andWhere(`(r."source" = :kci OR r."summaryKo" IS NOT NULL)`, {
        kci: ReferenceSource.KCI,
      })
      .getCount();
    console.log(
      `구조 요약 ${done.toLocaleString()}건 완료 · 남은 대상 ${target.toLocaleString()}건` +
        ` (그중 게시판에 올린 글 ${targetFeatured.toLocaleString()}건)`,
    );
    if (STATS_ONLY) return;

    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      console.error('ANTHROPIC_API_KEY 또는 OPENAI_API_KEY 가 필요합니다.');
      process.exit(1);
    }

    // 커뮤니티에 이미 올린 것을 먼저 한다. 화면에 바로 보이는 것부터
    // 고쳐야 원장이 결과를 확인할 수 있다.
    const qb = repo
      .createQueryBuilder('r')
      .where('r."abstractKo" IS NULL')
      .andWhere('r."abstract" IS NOT NULL')
      // 초록이 한국어라도 요약한다.
      //
      // 앞서 두 번 좁혔다가 두 번 다 틀렸다. 처음에는 KCI 를 통째로 뺐다 —
      // 이용 약관의 '데이터 공신력 유지' 조항 때문이고, KCI 는 국문 초록이
      // 오니 요약할 이유도 없다고 봤다. 재 보니 국문 초록은 4%뿐이었다.
      // 그래서 영문 초록만 요약하도록 고쳤는데, 이번에는 한글이 한 글자라도
      // 섞인 영문 초록 110편이 조건을 빠져나가 게시판에 영어로 남았다.
      //
      // 이제 초록이 있으면 언어를 가리지 않고 요약한다. 국문 초록도
      // 1,900자짜리 한 덩어리에 한자가 섞여 있어 진료 중에 훑기 어렵다.
      // 배경·방법·결과·한계로 갈라 놓는 것은 원문을 대신하는 것이 아니라
      // 원문으로 갈지 말지를 30초 안에 정하게 해 주는 일이다.
      //
      // 약관 위험은 남아 있으므로 줄일 수 있는 만큼 줄인다 — 원문 초록을
      // 지우지 않고 그대로 두며, 기계가 만든 요약임을 글마다 밝히고, KCI
      // 출처 표기와 원문 링크를 함께 단다.
      //
      // PubMed 는 여전히 우리가 번역한 것(summaryKo)만 본다. 번역 대상을
      // 한의원에서 실제로 보는 주소증으로 좁혀 놨는데, 그 조건을 여기서
      // 풀면 전립선암 안드로겐 억제요법 같은 것에 값을 쓰게 된다.
      .andWhere(
        `(r."source" = :kci OR r."summaryKo" IS NOT NULL)`,
        { kci: ReferenceSource.KCI },
      )
      .orderBy('r."featuredInCommunity"', 'DESC')
      .take(LIMIT);
    if (FEATURED_ONLY) qb.andWhere('r."featuredInCommunity" = true');
    if (SHARD) {
      // UUID 끝 한 글자(16진수)를 숫자로 바꿔 나눈다.
      qb.andWhere(
        `(('x' || right(r.id::text, 1))::bit(4)::int) % :n = :i`,
        { n: SHARD.n, i: SHARD.i },
      );
      console.log(`분할 ${SHARD.i}/${SHARD.n} 만 처리합니다.`);
    }

    const rows = await qb.getMany();
    if (rows.length === 0) {
      console.log('대상이 없습니다.');
      return;
    }

    let ok = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const jobs: Job[] = chunk.map((r) => ({
        id: r.id,
        title: r.titleKo || r.title,
        abstract: r.abstract ?? '',
        journal: r.journal,
        year: r.publishedYear,
      }));

      try {
        const res = await callModel(jobs);
        for (const r of chunk) {
          const v = res.get(r.id);
          if (!v) {
            failed += 1;
            continue;
          }
          // 한 줄 요약은 비어 있을 때만 채운다. 이미 있는 것을 덮어쓰면
          // 원장이 확인한 문장이 모델 실행 때마다 바뀐다.
          const patch: Partial<Reference> = { abstractKo: v.abstractKo };
          if (!r.summaryKo && v.summaryKo) patch.summaryKo = v.summaryKo;
          if (!DRY_RUN) {
            await repo.update({ id: r.id }, patch);
          }
          ok += 1;
          if (DRY_RUN) {
            console.log(
              `\n${'='.repeat(70)}\n${r.titleKo || r.title}\n${'-'.repeat(70)}\n` +
                (patch.summaryKo ? `[한 줄] ${patch.summaryKo}\n\n` : '') +
                v.abstractKo,
            );
          }
        }
        console.log(
          `  ${Math.min(i + BATCH, rows.length)}/${rows.length} — 성공 ${ok} · 실패 ${failed}`,
        );
      } catch (e) {
        failed += chunk.length;
        console.log(`  묶음 실패: ${(e as Error).message}`);
      }
    }

    console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}구조 요약 ${ok}건 · 실패 ${failed}건`);
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
