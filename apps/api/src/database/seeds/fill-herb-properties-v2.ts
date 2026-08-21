import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';
import OpenAI from 'openai';

/**
 * 약재의 성미·귀경·효능·분류를 채운다 — 근거를 붙여서.
 *
 * v1 이 실패한 이유 — 프롬프트에 약재명 한 줄만 넣었다. 근거가 없으니
 * 동음이의를 구별하지 못했다:
 *   백두옹의 한자가 白豆蔲(백두구)로 들어갔다. 전혀 다른 약재다.
 *   款冬花를 '완지화' 로 읽었다(관동화).
 *   죽여(竹茹)가 해표약, 도인(桃仁)이 소도약, 복신(茯神)이 보양약이 됐다.
 *   효능은 "영양 보충", "진정 효과" 같은 아무 정보 없는 문구였다.
 * 27종을 채웠다가 전부 되돌렸다. 빈 칸보다 나빴기 때문이다 —
 * 화면의 "-" 는 정보가 없다는 뜻이지만, 죽여가 해표약으로 뜨면 틀린 것을
 * 사실로 보여주는 것이다.
 *
 * 이제는 근거가 있다. 식약처 생약 약재정보를 적재해서 한자명·학명·
 * 라틴생약명·약용부위가 DB 에 들어왔다. 백두옹이 Pulsatilla koreana 라는
 * 것을 알면 백두구(Amomum)로 착각할 수 없다.
 *
 * 그래도 이건 참고값이다 — 고전 본초 기술을 모델이 정리한 것이지 1차 문헌
 * 인용이 아니다. 화면에 그렇게 표기해야 한다.
 *
 * 안전 항목은 채우지 않는다 — 금기(contraindications)는 여기서 건드리지
 * 않는다. 임상 판단에 직접 걸리는 값을 추정으로 채우면 안 된다.
 * 배합 금기는 herb-herb-taboo.ts 에 고전 목록을 상수로 두었다.
 *
 * 실행: ... fill-herb-properties-v2.ts [--limit=50] [--dry-run] [--force]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 2000;
const MODEL = 'gpt-4o-mini';
const BATCH = 12;

/** 본초학 분류. 화면 필터와 같은 값을 쓴다. */
const CATEGORIES = [
  '보기약', '보혈약', '보음약', '보양약', '청열약', '해표약', '이기약',
  '활혈약', '화담약', '이수약', '온리약', '소도약', '고삽약', '사하약',
  '안신약', '평간약', '개규약', '구충약', '지혈약', '거풍습약', '외용약',
] as const;

const MERIDIANS = [
  '폐', '비', '위', '간', '신', '심', '대장', '소장', '방광', '담', '심포', '삼초',
] as const;

const SYSTEM = `당신은 한국 한의학 본초 정보를 정리합니다. JSON 으로만 응답하세요.

입력은 약재마다 한자명·학명·라틴생약명·약용부위가 함께 옵니다.
**반드시 학명을 기준으로 판단하세요.** 이름이 비슷한 다른 약재와 혼동하면 안 됩니다.
예: 백두옹(白頭翁, Pulsatilla)과 백두구(白豆蔲, Amomum)는 전혀 다릅니다.

{"items":[{"name":"입력한 약재명 그대로","nature":"한|량|평|온|열","flavor":"산|고|감|신|함 중 해당되는 것을 쉼표로","meridians":["귀경 장부"],"category":"분류","efficacy":"주요 효능"}]}

분류는 다음 중 하나: ${CATEGORIES.join(' / ')}
귀경은 장부명만: ${MERIDIANS.join(' · ')}

원칙:
- 한국 한의학(동의보감·방약합편 계통)에서 통용되는 기술을 따릅니다.
- efficacy 는 실제 효능을 구체적으로 씁니다. "영양 보충", "진정 효과" 처럼
  아무 약재에나 붙는 문구는 쓰지 마세요. 무엇을 어떻게 하는지 적으세요.
  (좋은 예: "담을 삭이고 열을 내려 구역과 번조를 그친다")
- **확실하지 않으면 그 필드를 null 로 두세요.** 절반만 아는 것을 채우지 마세요.
  틀린 값은 빈 값보다 나쁩니다.`;

interface Item {
  name: string;
  nature: string | null;
  flavor: string | null;
  meridians: string[] | null;
  category: string | null;
  efficacy: string | null;
}

/** 아무 약재에나 붙는 문구 — 이런 게 오면 버린다. */
const VAGUE = /^(영양\s*보충|진정\s*효과|열증\s*치료|체력\s*증진|소화\s*지원|소화\s*촉진|간\s*기능\s*조절|담\s*제거|해열\s*효과|장운동\s*촉진|기력\s*보강)\.?$/;

function describe(h: Herb): string {
  const bits = [
    `약재명: ${h.standardName}`,
    h.hanjaName ? `한자: ${h.hanjaName}` : null,
    h.scientificName ? `학명: ${h.scientificName}` : null,
    h.latinName ? `라틴생약명: ${h.latinName}` : null,
    h.medicinalPart ? `약용부위: ${h.medicinalPart}` : null,
  ].filter(Boolean);
  return bits.join(' | ');
}

async function classify(client: OpenAI, herbs: Herb[]): Promise<Map<string, Item>> {
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: herbs.map(describe).join('\n') },
    ],
  });
  const out = new Map<string, Item>();
  try {
    const parsed = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    for (const it of parsed.items || []) {
      if (it?.name) out.set(String(it.name).trim(), it as Item);
    }
  } catch {
    console.warn('[parse] 실패 — 배치 건너뜀');
  }
  return out;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY 필요');
    process.exit(1);
  }
  const client = new OpenAI({ apiKey });

  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  const repo = ds.getRepository(Herb);

  const all = await repo.find();
  // 학명이나 한자가 있어야 판단할 근거가 된다. 이름뿐인 약재는 건너뛴다 —
  // 근거 없이 채우다 v1 이 틀렸다.
  const targets = all
    .filter((h) => FORCE || !h.properties?.nature)
    .filter((h) => h.hanjaName || h.scientificName || h.latinName)
    .slice(0, LIMIT);

  const noBasis = all.filter(
    (h) => !h.properties?.nature && !h.hanjaName && !h.scientificName && !h.latinName,
  ).length;

  console.log(
    `[herb-props2] 전체 ${all.length}종 · 대상 ${targets.length}종 · 근거부족으로 제외 ${noBasis}종`,
  );

  let filled = 0;
  let rejected = 0;
  const samples: string[] = [];

  for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    const verdict = await classify(client, chunk);

    for (const h of chunk) {
      const v = verdict.get(h.standardName.trim());
      if (!v) continue;

      const nature = v.nature && /^(한|량|평|온|열)$/.test(v.nature) ? v.nature : null;
      const category =
        v.category && (CATEGORIES as readonly string[]).includes(v.category)
          ? v.category
          : null;
      const meridians = Array.isArray(v.meridians)
        ? v.meridians.filter((m) => (MERIDIANS as readonly string[]).includes(m))
        : [];
      const efficacy =
        v.efficacy && !VAGUE.test(v.efficacy.trim()) && v.efficacy.trim().length >= 8
          ? v.efficacy.trim()
          : null;

      // 성질도 분류도 없으면 채울 게 없다. 반쪽짜리를 넣지 않는다.
      if (!nature && !category && !efficacy) {
        rejected++;
        continue;
      }

      if (nature || v.flavor) {
        h.properties = {
          ...(h.properties ?? {}),
          ...(nature ? { nature } : {}),
          ...(v.flavor ? { flavor: v.flavor } : {}),
        } as Herb['properties'];
      }
      if (meridians.length) {
        h.meridianTropism = meridians as unknown as Herb['meridianTropism'];
      }
      if (category) h.category = category;
      if (efficacy) h.efficacy = efficacy;

      if (!DRY_RUN) await repo.save(h);
      filled++;
      if (samples.length < 12) {
        samples.push(
          `  ${h.standardName}(${h.hanjaName ?? '-'}): ${nature ?? '-'}/${v.flavor ?? '-'} · ${meridians.join('·') || '-'} · ${category ?? '-'} · ${efficacy ?? '-'}`,
        );
      }
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, targets.length)}/${targets.length}`);
  }

  console.log(`\n\n[herb-props2] ${DRY_RUN ? '미리보기' : '완료'} — 채움 ${filled}종 · 근거부족 거절 ${rejected}종`);
  console.log(samples.join('\n'));
  await ds.destroy();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[herb-props2] 실패:', e?.message ?? e);
    process.exit(1);
  });
