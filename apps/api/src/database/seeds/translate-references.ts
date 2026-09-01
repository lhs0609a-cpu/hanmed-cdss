import { DataSource, IsNull, Not } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import {
  Reference,
  ReferenceEvidenceType,
} from '../entities/reference.entity';

/**
 * 문헌을 한국어로 — 제목 번역 + 요약 3~4줄.
 *
 * 자료실 14,804건 중 한국어는 11건이었다. 진료 중에 영어 초록을 읽는 한의사는
 * 거의 없다. 검색해서 제목만 보고 닫는다. "자료가 있다" 와 "읽는다" 사이의
 * 간극을 메우는 것이 이 스크립트의 전부다.
 *
 * 초록을 통째로 번역하지 않는다. 초록에는 용량·투여횟수·혈위·처방명이 들어
 * 있고, "3 times daily" 를 "3일마다" 로 한 번 잘못 옮기면 그걸 보고 처방하는
 * 사람이 생긴다. 그래서 요약은 "무엇을 대상으로, 무엇과 비교해, 어떤 결과" 까지만
 * 담고 용량·프로토콜은 원문을 보게 한다. 번역본이 원문을 대체하지 않는 구조다.
 *
 * 우선순위는 근거 수준이다. 체계적 고찰·진료지침·RCT 부터 번역한다 — 예산이
 * 유한한데 종설과 증례보고를 먼저 번역하면 정작 쓸 것이 뒤로 밀린다.
 *
 * 이어서 돌릴 수 있다. titleKo 가 채워진 건 건너뛴다.
 *
 * 실행:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/translate-references.ts --limit=20
 *   ... --limit=1500              (본 작업)
 *   ... --limit=20 --dry-run      (저장 없이 결과만 보기)
 *   ... --stats-only              (번역 현황)
 */

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const LIMIT = Number(argValue('limit') ?? '20') || 20;
const DRY_RUN = process.argv.includes('--dry-run');
const STATS_ONLY = process.argv.includes('--stats-only');
/**
 * 이미 번역된 것 중 품질이 나쁜 것만 다시 돌린다.
 *
 * 3,834건을 뽑아 보니 6%가 "연구의 한계가 명시되었다" 로 끝났다. 한계가
 * 있다는 사실만 적고 무엇이 한계인지는 안 적은 문장이라 한 줄을 쓰면서
 * 독자에게 주는 것이 없다. 프롬프트를 고쳤으니 그 건들만 다시 받는다.
 */
const REDO_BAD = process.argv.includes('--redo-bad');

/** 한 번에 모델에 보내는 문헌 수. 너무 크면 한 건 실패가 묶음 전체를 버린다. */
const BATCH = 5;

/** 초록을 이만큼만 보낸다. 뒤쪽은 대개 결론 반복이라 요약에 보태는 것이 적다. */
const ABSTRACT_CHARS = 2500;

/**
 * 근거 수준 우선순위. 낮은 숫자부터 번역한다.
 *
 * 종설(review)과 증례보고는 뒤로 뺐다. 예산이 유한할 때 먼저 한국어가 되어야
 * 하는 것은 "이 치료가 효과가 있는가" 에 답하는 문헌이다.
 */
/**
 * 한의원에서 실제로 보는 주소증. 번역 대상을 이걸로 좁힌다.
 *
 * 자료실 14,804건을 다 번역할 이유가 없다. 근거 수준이 높아도 전립선암
 * 안드로겐 억제요법이나 카테터 절제술 후 심방세동은 한의원 진료와 멀다.
 * 이 조건을 걸면 대상이 약 3,000건으로 줄고, 그 3,000건이 열었을 때
 * 쓸모 있는 쪽이다.
 */
const CLINIC_SYMPTOMS =
  '(low back pain|lumbar|sciatica|disc herniation' +
  '|neck pain|cervical|whiplash' +
  '|shoulder pain|frozen shoulder|adhesive capsulitis|rotator cuff' +
  '|knee osteoarthritis|knee pain|osteoarthritis' +
  '|headache|migraine' +
  '|insomnia|sleep quality' +
  '|dyspepsia|functional gastrointestinal|irritable bowel|constipation' +
  '|dysmenorrhea|menopaus|premenstrual' +
  '|allergic rhinitis|atopic dermatitis|eczema|urticaria' +
  "|bell's palsy|bell palsy|facial paralysis|facial palsy" +
  '|post-stroke|stroke rehabilitation|hemiplegia' +
  '|fibromyalgia|myofascial|trigger point' +
  '|tinnitus|vertigo|dizziness' +
  '|chronic fatigue|depression|anxiety' +
  '|carpal tunnel|tennis elbow|plantar fasciitis)';

const PRIORITY: ReferenceEvidenceType[] = [
  ReferenceEvidenceType.SYSTEMATIC_REVIEW,
  ReferenceEvidenceType.GUIDELINE,
  ReferenceEvidenceType.RCT,
  ReferenceEvidenceType.OBSERVATIONAL,
  ReferenceEvidenceType.CASE_REPORT,
  ReferenceEvidenceType.REVIEW,
];

const SYSTEM_PROMPT = `당신은 한국 한의사를 위한 의학 문헌 큐레이터입니다.
영문 의학 문헌의 제목을 한국어로 옮기고, 짧은 요약을 만듭니다.

지켜야 할 것:

1. 용어는 한국 한의계에서 실제로 쓰는 말로 옮깁니다.
   - acupuncture → 침 치료, electroacupuncture → 전침
   - moxibustion → 뜸, cupping → 부항, herbal medicine → 한약
   - low back pain → 요통, frozen shoulder → 오십견(유착성 관절낭염)
   - Bell's palsy → 구안와사(말초성 안면신경마비)

2. 본초 학명은 한국 본초명으로 옮깁니다. 소리나는 대로 음역하지 마십시오.
   "Saururus chinensis" 를 "사우루루스" 로 적는 것은 틀린 번역입니다. 삼백초입니다.
   자주 나오는 것:
   Saururus chinensis 삼백초 / Astragalus 황기 / Angelica gigas 당귀
   Paeonia lactiflora 작약 / Glycyrrhiza 감초 / Panax ginseng 인삼
   Zingiber officinale 생강 / Cinnamomum cassia 계피 / Poria cocos 복령
   Atractylodes 백출 / Bupleurum 시호 / Scutellaria baicalensis 황금
   Coptis chinensis 황련 / Rehmannia glutinosa 지황 / Salvia miltiorrhiza 단삼
   Ephedra 마황 / Pueraria 갈근 / Curcuma 울금 / Citrus unshiu 진피
   목록에 없고 한국 본초명을 모르면 학명을 그대로 두십시오. 음역은 금지입니다.

3. 처방명과 혈위는 한글과 원어를 함께 적습니다.
   - Shaoyao Gancao Tang → 작약감초탕(芍藥甘草湯)
   - PC6 → 내관(PC6)
   중국 중성약(Shensong Yangxin capsule 등)은 한국에서 쓰지 않으므로 원어를
   그대로 두고 한글 음역을 붙이지 마십시오.
   확실하지 않으면 원어를 그대로 두십시오. 비슷한 이름으로 바꾸지 마십시오.

4. 요약에는 용량·투여횟수·시술 프로토콜을 넣지 마십시오.
   "하루 3회", "6주간 주 2회 20분" 같은 것은 쓰지 않습니다. 그 정보가 필요한
   사람은 원문을 봐야 합니다. 옮기다 한 글자만 틀려도 그걸 보고 처방하는
   사람이 생깁니다.

5. 논문이 말한 것만 씁니다. 효과를 부풀리지 말고, 논문이 "유의한 차이 없음"
   이라고 하면 그렇게 씁니다. 논문에 없는 임상 해석을 덧붙이지 마십시오.

6. 요약은 3~4문장. 이 순서로 씁니다.
   (1) 무엇을 대상으로 (환자군, 몇 명 또는 몇 편)
   (2) 무엇과 비교해 (대조군)
   (3) 어떤 결과 (주요 지표와 방향)
   (4) 한계가 있으면 그 한계가 무엇인지 구체적으로 한 문장

   (4)에서 "연구의 한계가 명시되었다", "한계점이 언급되었다" 처럼 한계가
   있다는 사실만 적는 문장은 쓰지 마십시오. 읽는 사람에게 아무것도 주지
   않습니다. 무엇이 한계인지 적으십시오 —
   "포함된 연구 수가 7편으로 적고 이질성이 컸다",
   "대조군이 무처치라 위약 효과를 가릴 수 없다" 처럼 씁니다.
   초록에 한계가 안 적혀 있으면 (4)를 아예 쓰지 말고 3문장으로 끝내십시오.

8. 혈위는 한글 혈위명과 코드를 함께 적습니다. 로마자를 그대로 두지 마십시오.
   Huantiao 환도(GB30) / Zusanli 족삼리(ST36) / Neiguan 내관(PC6)
   Sanyinjiao 삼음교(SP6) / Hegu 합곡(LI4) / Baihui 백회(GV20)
   Taichong 태충(LR3) / Quchi 곡지(LI11) / Fengchi 풍지(GB20)
   Yanglingquan 양릉천(GB34) / Shenmen 신문(HT7) / Guanyuan 관원(CV4)
   모르면 로마자를 그대로 두되 코드가 있으면 코드는 살립니다.

7. 문체는 평서형 "~했다/~였다" 로 씁니다. 마크다운 기호(**, ##, -)를 쓰지 마십시오.

JSON 배열로만 답하십시오. 설명을 덧붙이지 마십시오.
[{"id":"<받은 id 그대로>","titleKo":"<한국어 제목>","summaryKo":"<3~4문장>"}]`;

interface Job {
  id: string;
  title: string;
  abstract: string | null;
  journal: string | null;
  year: number | null;
}

/** 있는 키로 돈다. Anthropic 이 있으면 그쪽, 없으면 OpenAI. */
async function callModel(jobs: Job[]): Promise<Map<string, { titleKo: string; summaryKo: string }>> {
  const payload = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    journal: j.journal,
    year: j.year,
    abstract: (j.abstract ?? '').slice(0, ABSTRACT_CHARS),
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
    text = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');
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
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end < 0) throw new Error(`JSON 배열을 못 찾음: ${cleaned.slice(0, 120)}`);

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Array<{
    id: string;
    titleKo?: string;
    summaryKo?: string;
  }>;

  const out = new Map<string, { titleKo: string; summaryKo: string }>();
  for (const r of parsed) {
    if (!r?.id || !r.titleKo?.trim()) continue;
    out.set(r.id, {
      titleKo: r.titleKo.trim().slice(0, 500),
      summaryKo: (r.summaryKo ?? '').trim(),
    });
  }
  return out;
}

async function main(): Promise<void> {
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();

  try {
    const repo = ds.getRepository(Reference);

    const translated = await repo.count({ where: { titleKo: Not(IsNull()) } });
    const total = await repo.count();
    console.log(`번역 현황 — ${translated.toLocaleString()} / ${total.toLocaleString()}건`);
    if (STATS_ONLY) return;

    const provider = process.env.ANTHROPIC_API_KEY ? 'Claude' : 'OpenAI';
    console.log(`모델: ${provider}\n`);

    const targets: Reference[] = [];

    if (REDO_BAD) {
      const bad = await repo
        .createQueryBuilder('r')
        .where('r."titleKo" IS NOT NULL')
        .andWhere('r."abstract" IS NOT NULL')
        .andWhere(
          `(r."summaryKo" LIKE '%한계가 명시%'
            OR r."summaryKo" LIKE '%한계점이 언급%'
            OR r."summaryKo" LIKE '%한계가 언급%'
            OR r."titleKo" ~ '(Huantiao|Zusanli|Neiguan|Sanyinjiao|Hegu|Baihui|Taichong|Quchi|Fengchi)')`,
        )
        .take(LIMIT)
        .getMany();
      console.log(`다시 번역할 대상 ${bad.length}건
`);
      targets.push(...bad);
    }

    // 근거 수준 순서대로, 초록이 있고, 한의원에서 흔한 주소증인 것만.
    //
    // 주소증 조건을 넣은 이유: 근거 수준만 보고 뽑았더니 전립선암 안드로겐
    // 억제요법 중 열감, 카테터 절제술 후 심방세동 같은 것이 올라왔다. 좋은
    // 논문이지만 한의원 진료와 거리가 멀다. 번역 비용은 유한하고, 먼저
    // 한국어가 되어야 하는 것은 내일 진료실에서 만날 환자의 주소증이다.
    for (const ev of PRIORITY) {
      if (REDO_BAD) break;
      if (targets.length >= LIMIT) break;
      const rows = await repo
        .createQueryBuilder('r')
        .where('r."titleKo" IS NULL')
        .andWhere('r."abstract" IS NOT NULL')
        .andWhere('LENGTH(r."abstract") > 200')
        .andWhere('r."evidenceType" = :ev', { ev })
        .andWhere('(r.title ~* :sx OR r.abstract ~* :sx)', { sx: CLINIC_SYMPTOMS })
        .orderBy('r."publishedAt"', 'DESC', 'NULLS LAST')
        .take(LIMIT - targets.length)
        .getMany();
      targets.push(...rows);
    }

    if (targets.length === 0) {
      console.log('번역할 문헌이 없습니다.');
      return;
    }
    console.log(`대상 ${targets.length}건\n`);

    let ok = 0;
    let failed = 0;
    const started = Date.now();

    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      const jobs: Job[] = chunk.map((r) => ({
        id: r.id,
        title: r.title,
        abstract: r.abstract,
        journal: r.journal,
        year: r.publishedYear,
      }));

      try {
        const result = await callModel(jobs);
        for (const r of chunk) {
          const got = result.get(r.id);
          if (!got) { failed += 1; continue; }
          if (DRY_RUN) {
            console.log(`\n[${r.evidenceType}] ${r.title.slice(0, 80)}`);
            console.log(`  → ${got.titleKo}`);
            console.log(`  ${got.summaryKo}`);
          } else {
            await repo.update({ id: r.id }, {
              titleKo: got.titleKo,
              summaryKo: got.summaryKo || null,
            });
          }
          ok += 1;
        }
        if (!DRY_RUN) {
          process.stdout.write(`\r  ${Math.min(i + BATCH, targets.length)}/${targets.length} 처리`);
        }
      } catch (e) {
        // 한 묶음이 실패해도 나머지는 계속 간다. 긴 작업이라 중간에 통째로
        // 죽으면 그때까지 쓴 비용이 날아간다.
        failed += chunk.length;
        console.log(`\n  묶음 실패(계속 진행): ${(e as Error).message.slice(0, 120)}`);
      }
    }

    const mins = ((Date.now() - started) / 60000).toFixed(1);
    console.log(`\n\n완료 (${mins}분) — 성공 ${ok} · 실패 ${failed}`);
    if (!DRY_RUN) {
      const now = await repo.count({ where: { titleKo: Not(IsNull()) } });
      console.log(`번역 누계 ${now.toLocaleString()} / ${total.toLocaleString()}건`);
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(`실패: ${(e as Error).message}`);
  process.exit(1);
});
