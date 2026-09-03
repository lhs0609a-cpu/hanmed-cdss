import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Post } from '../entities/post.entity';
import { Reference } from '../entities/reference.entity';
import { buildTitle } from './seed-community-references';

/**
 * 한자로 적힌 논문 제목에 한글 독음을 입힌다.
 *
 * 게시판 임상정보의 첫 화면이 이랬다.
 *
 *   喩昌의 生涯와 醫學思想
 *   寄經八脈 理論의 形成과 發展에 관한 醫史學的 考察
 *   四象人病證藥理의 成立過程과 그 運營精神에 대한 考察
 *
 * 한국어 제목이 맞다. 1990년대 학술지가 한자혼용으로 실었을 뿐이다. 그런데
 * 게시판에서 목록을 훑는 사람에게는 읽히지 않는 글자이고, 읽히지 않는 제목은
 * 안 열린다. 게시판에 올린 618편 중 369편이 이 상태였다.
 *
 * 번역이 아니라 독음이다. 뜻을 풀어 쓰면 그건 우리가 지은 다른 제목이 된다.
 * 醫史學的 은 "의사학적" 이지 "의학사 관점의" 가 아니다. 처방명·서명·인명처럼
 * 원어를 알아야 하는 말만 괄호로 병기한다 — 전부 병기하면 괄호가 제목을
 * 덮어 읽기가 더 나빠진다.
 *
 * 독음은 규칙적이라 지어내는 값이 아니다. 다만 동음이의(復 복/부, 樂 락/악)가
 * 있어 한의학 용례를 아는 모델에게 묻고, 받은 값은 기계가 검사한다.
 * 괄호 밖에 한자가 남아 있으면 버린다 — 절반만 바꾼 제목이 제일 나쁘다.
 *
 * 원제는 잃지 않는다. Reference.title 은 그대로 두고 titleKo 만 바꾸며,
 * 소개글 본문 서지정보 표에 원제가 그대로 실린다.
 *
 * 게시글 제목도 같이 고친다. 제목이 소개글의 멱등 키라, 문헌만 고치면
 * refresh-reference-posts 가 짝을 못 찾아 본문이 옛 제목에 남는다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *     src/database/seeds/hangulize-reference-titles.ts --limit=20 --dry-run
 *   ... --limit=400            (게시판에 올린 글)
 *   ... --all --limit=2000     (자료실 전체)
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const LIMIT = Number(argValue('limit') ?? '20') || 20;
const DRY_RUN = process.argv.includes('--dry-run');
const STATS_ONLY = process.argv.includes('--stats-only');
/** 게시판에 올린 것만 하지 않고 자료실 전체를 훑는다. */
const ALL = process.argv.includes('--all');

/** 한 번에 모델에 넘길 제목 수. 제목은 짧아 넉넉히 묶을 수 있다. */
const BATCH = 15;

const HANJA = /[㐀-䶿一-鿿豈-﫿]/;

const SYSTEM_PROMPT = `당신은 한국 한의학 논문 제목의 한자를 한글 독음으로 바꿉니다.
번역이 아니라 독음입니다. 뜻을 풀어 쓰지 마십시오.

지켜야 할 것:

1. 한자어는 한국 한의학계에서 읽는 대로 적습니다.
   中風 중풍 / 少陽人 소양인 / 醫史學的 의사학적 / 考察 고찰 / 硏究 연구
   血壓 혈압 / 白鼠 백서 / 影響 영향 / 治驗例 치험례 / 症例 증례

2. 원어를 알아야 하는 말만 한글 뒤에 괄호로 병기합니다.
   처방명 補中益氣湯 → 보중익기탕(補中益氣湯)
   서명 『東武遺藁』 → 『동무유고(東武遺藁)』
   인명 李濟馬 → 이제마(李濟馬)
   경혈명 足三里 → 족삼리(足三里)
   그 밖의 한자는 괄호 없이 한글로만 적습니다. 제목이 괄호로 뒤덮이면
   읽기가 더 나빠집니다.

3. 이미 한글인 부분, 영문, 숫자, 문장부호, 낱말 순서는 그대로 둡니다.
   조사와 어미를 바꾸지 마십시오.
   이미 괄호로 병기된 한자는 괄호째 그대로 두십시오 — 지우면 안 됩니다.
   서명 부호 『』 「」 와 따옴표도 그대로 둡니다.

4. 낱말이 붙어 읽기 어려우면 띄어쓰기만 더할 수 있습니다.
   中風入院患者 → 중풍 입원환자

5. 답에는 괄호 안을 빼고 한자가 남아 있으면 안 됩니다.

JSON 배열로만 답하십시오. 설명을 덧붙이지 마십시오.
[{"id":"<받은 id 그대로>","titleKo":"..."}]`;

interface Job {
  id: string;
  titleKo: string;
}

/** 괄호 안(병기)을 뺀 나머지에 한자가 남았는가. */
function hasBareHanja(text: string): boolean {
  return HANJA.test(text.replace(/[(（][^)）]*[)）]/g, ''));
}

async function callModel(jobs: Job[]): Promise<Map<string, string>> {
  const userMsg = `다음 제목 ${jobs.length}건을 처리하십시오.\n\n${JSON.stringify(jobs, null, 1)}`;

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
      temperature: 0,
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
    titleKo?: string;
  }>;

  const byId = new Map(jobs.map((j) => [j.id, j.titleKo]));
  const out = new Map<string, string>();
  for (const r of parsed) {
    const before = r?.id ? byId.get(r.id) : undefined;
    let after = r?.titleKo?.trim();
    if (!before || !after) continue;
    // 검사. 하나라도 걸리면 버리고 다음 실행에서 다시 받는다.
    //
    //  - 괄호 밖에 한자가 남으면 절반만 바꾼 것이다.
    //  - 한글이 없으면 제목을 통째로 날린 것이다.
    //  - 길이가 크게 변하면 독음이 아니라 다시 쓴 것이다. 한자 한 글자가
    //    한글 한두 글자가 되므로 늘어나는 것은 정상이고, 줄어드는 쪽이
    //    위험하다(뜻만 남기고 잘라낸 경우).
    if (hasBareHanja(after)) continue;
    // 원래 있던 괄호 병기를 떼어내면 정보가 준다. 그건 고친 것이 아니다.
    //
    // 다만 "병기" 는 괄호 안이 한자로만 된 것을 말한다. "(東醫寶鑑을
    // 中心으로)" 처럼 괄호 안이 문장이면 그것도 읽어야 할 글이라 한글로
    // 바뀌는 것이 맞다. 이걸 가리지 않고 다 지키라고 했더니 13편이 계속
    // 버려졌다 — 검사가 목적을 거스른 셈이다.
    //
    // 병기인지는 괄호 앞 글자로 가른다. "보중익기탕(補中益氣湯)" 처럼 한글
    // 뒤에 붙은 한자만 독음을 이미 가진 병기다. "月令(四時)" 는 앞이 한자라
    // 병기가 아니라 그냥 한자 본문이고, 그것까지 지키라고 하면 제목이
    // 영원히 한자로 남는다.
    const glosses = [...before.matchAll(/[(（]([^)）]*)[)）]/g)].filter((m) => {
      const g = m[1];
      if (!HANJA.test(g) || /[가-힣]/.test(g)) return false;
      const prev = before.slice(0, m.index).trimEnd().slice(-1);
      return /[가-힣]/.test(prev);
    });

    // 떨어져 나간 병기는 도로 붙인다.
    //
    // 모델이 "소음인(少陰人)" 을 "소음인(소음인)" 으로 만들어 오는 일이
    // 잦다. 독음을 두 번 적고 한자를 지운 것이라 버려야 하는데, 그 제목만
    // 계속 한자로 남는다. 무엇이 무엇의 병기인지는 우리가 이미 알고 있으므로
    // 모델에 다시 묻지 않고 여기서 도로 끼운다.
    for (const m of glosses) {
      const gloss = m[1];
      if (after.includes(gloss)) continue;
      const word = /([가-힣]+)\s*$/.exec(before.slice(0, m.index))?.[1];
      if (!word || !after.includes(word)) break;
      after = after.replace(
        new RegExp(word + '(?:\\s*[(（][^)）]*[)）])?'),
        word + '(' + gloss + ')',
      );
    }
    if (!glosses.every((m) => after.includes(m[1]))) continue;
    if (!/[가-힣]/.test(after)) continue;
    if (after.length < before.length * 0.7) continue;
    if (after.length > before.length * 2.2 + 20) continue;
    if (after.length > 500) continue;
    if (after === before) continue;
    out.set(r.id, after);
  }
  return out;
}

async function main(): Promise<void> {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const repo = ds.getRepository(Reference);
    const postRepo = ds.getRepository(Post);

    const base = () =>
      repo
        .createQueryBuilder('r')
        .where('r."titleKo" IS NOT NULL')
        // 괄호 밖에 한자가 남은 것만 고른다.
        //
        // "사호가용골모려탕(柴胡加龍骨牡蠣湯)" 은 이미 읽히는 제목이다.
        // 이런 것까지 대상에 넣었더니 모델이 병기를 떼어내 정보를 줄였다.
        // 고칠 것은 읽을 수 없는 제목뿐이다.
        .andWhere(
          `regexp_replace(r."titleKo", '\\([^)]*\\)', '', 'g') ~ '[一-龥]'`,
        );

    const total = await base().getCount();
    const featured = await base()
      .andWhere('r."featuredInCommunity" = true')
      .getCount();
    console.log(
      `한자 제목 ${total.toLocaleString()}건 · 그중 게시판에 올린 글 ${featured.toLocaleString()}건`,
    );
    if (STATS_ONLY) return;

    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      console.error('ANTHROPIC_API_KEY 또는 OPENAI_API_KEY 가 필요합니다.');
      process.exit(1);
    }

    // 게시판에 올린 것부터. 화면에 바로 보이는 것이 먼저 고쳐져야 한다.
    const qb = base().orderBy('r."featuredInCommunity"', 'DESC').take(LIMIT);
    if (!ALL) qb.andWhere('r."featuredInCommunity" = true');
    const rows = await qb.getMany();
    if (rows.length === 0) {
      console.log('대상이 없습니다.');
      return;
    }

    let ok = 0;
    let failed = 0;
    let posts = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      try {
        const res = await callModel(
          chunk.map((r) => ({ id: r.id, titleKo: r.titleKo as string })),
        );
        for (const r of chunk) {
          const next = res.get(r.id);
          if (!next) {
            failed += 1;
            continue;
          }
          if (DRY_RUN) {
            console.log(`  ${r.titleKo}\n→ ${next}`);
          } else {
            // 게시글을 먼저 찾는다. titleKo 를 먼저 바꾸면 옛 제목으로
            // 만든 게시글을 다시는 찾을 수 없다.
            const oldTitle = buildTitle(r);
            const post = await postRepo.findOne({ where: { title: oldTitle } });
            await repo.update({ id: r.id }, { titleKo: next });
            if (post) {
              await postRepo.update(
                { id: post.id },
                { title: buildTitle({ ...r, titleKo: next } as Reference) },
              );
              posts += 1;
            }
          }
          ok += 1;
        }
        console.log(
          `  ${Math.min(i + BATCH, rows.length)}/${rows.length} — 성공 ${ok} · 실패 ${failed}`,
        );
      } catch (e) {
        failed += chunk.length;
        console.log(`  묶음 실패: ${(e as Error).message}`);
      }
    }

    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}제목 ${ok}건 · 게시글 ${posts}건 · 버린 것 ${failed}건`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
