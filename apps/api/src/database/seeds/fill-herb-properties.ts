import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';
import OpenAI from 'openai';

/**
 * 약재의 성미귀경·효능·분류를 채운다.
 *
 * 약재 마스터는 처방 구성에서 이름만 뽑아 만든 것이라 성질·맛·귀경·효능이
 * 전부 비어 있었다. 화면에는 "-" 만 나오고 분류는 전부 '미분류' 다.
 * 본초 지식이 없으면 약재 화면은 이름표에 불과하다.
 *
 * 출처 주의 — 이 값은 고전 본초 기술을 모델이 정리한 참고값이지 1차 문헌 인용이
 * 아니다. 화면에도 그렇게 표기해야 하며, 임상 적용 전 본초서 확인이 필요하다.
 * 그래서 efficacy 앞에 출처 표기를 붙이지 않고, UI 고지로 일괄 처리한다.
 *
 * 멱등: 이미 성질이 채워진 항목은 건너뛴다.
 */

const DRY_RUN = process.argv.includes('--dry-run');
const MODEL = 'gpt-4o-mini';
const BATCH = 20;

const SYSTEM = `당신은 한국 한의학 본초 정보를 정리합니다. JSON 으로만 응답하세요.

{"items":[{"name":"입력 약재명","nature":"한|량|평|온|열","flavor":"산|고|감|신|함 중 해당되는 것들을 쉼표로","meridians":["귀경 장부"],"category":"보기약|보혈약|보음약|보양약|청열약|해표약|이기약|활혈약|화담약|이수약|온리약|소도약|고삽약|사하약|안신약|평간약|개규약|구충약|외용약|기타","efficacy":"주요 효능 한 줄(한글)"}]}

원칙:
- 한국 한의학(동의보감·방약합편 계통)에서 통용되는 기술을 따른다.
- 확실하지 않으면 해당 필드를 null 로 둔다. 지어내지 않는다.
- 귀경은 장부명만 (폐, 비, 위, 간, 신, 심, 대장, 소장, 방광, 담, 심포, 삼초).`;

interface Item {
  name: string;
  nature: string | null;
  flavor: string | null;
  meridians: string[] | null;
  category: string | null;
  efficacy: string | null;
}

async function classify(client: OpenAI, names: string[]): Promise<Map<string, Item>> {
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify(names) },
    ],
  });
  const out = new Map<string, Item>();
  try {
    const parsed = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    for (const it of parsed.items || []) {
      if (it?.name) out.set(String(it.name), it as Item);
    }
  } catch {
    console.warn('[parse] 실패 — 배치 건너뜀');
  }
  return out;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { console.error('OPENAI_API_KEY 필요'); process.exit(1); }
  const client = new OpenAI({ apiKey });

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log(`[herb-props] DB 연결됨${DRY_RUN ? ' (dry-run)' : ''}`);

  try {
    const repo = ds.getRepository(Herb);
    const all = await repo.find();
    const targets = all.filter((h) => !h.properties?.nature);
    console.log(`[herb-props] 전체 ${all.length}종 중 미기재 ${targets.length}종`);

    let filled = 0;
    let skipped = 0;
    const samples: string[] = [];

    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      const verdict = await classify(client, chunk.map((h) => h.standardName));

      for (const herb of chunk) {
        const v = verdict.get(herb.standardName);
        if (!v || !v.nature) { skipped++; continue; }

        filled++;
        if (samples.length < 10) {
          samples.push(`  ${herb.standardName}: ${v.nature}/${v.flavor ?? '-'} · ${(v.meridians ?? []).join('·') || '-'} · ${v.category ?? '-'}`);
        }
        if (!DRY_RUN) {
          await repo.update(
            { id: herb.id },
            {
              properties: { nature: v.nature, flavor: v.flavor ?? undefined },
              meridianTropism: v.meridians ?? [],
              efficacy: v.efficacy ?? '',
              category: v.category && v.category !== '기타' ? v.category : herb.category,
            },
          );
        }
      }
      process.stdout.write(`\r  ${Math.min(i + BATCH, targets.length)}/${targets.length}`);
    }

    console.log('\n=== 결과 ===');
    console.log(`  채움: ${filled}종`);
    console.log(`  모델이 판단 못함(유지): ${skipped}종`);
    samples.forEach((s) => console.log(s));
  } finally {
    await ds.destroy();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
