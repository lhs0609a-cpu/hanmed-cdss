import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';
import { FormulaHerb } from '../entities/formula-herb.entity';
import OpenAI from 'openai';

/**
 * 약재 마스터를 한의사가 쓰는 이름으로 정규화한다.
 *
 * 현재 herbs_master 는 처방 구성 JSON 에서 뽑은 한자 표기 그대로다 —
 * 丁香皮, 乾葛, 人蔘. 화면에는 한자만 나오는데 한의사가 검색창에 치는 건 '건갈',
 * '인삼' 이다. 게다가 처방명(人蔘敗毒散)과 문장 조각(乾), 변증어(中腑中臟)가
 * 약재로 섞여 들어가 있다.
 *
 * gpt-4o-mini 로 한 번 훑어:
 *   - 한자 표기 → 한국 한의학 표준 약재명(한글)
 *   - 약재가 아닌 항목(처방명·문장 조각·변증어)은 표시해서 제거
 *
 * hanjaName 에는 원래 표기를 남긴다 — 원문 대조에 필요하다.
 * 멱등: 이미 한글인 항목은 모델에 보내지 않는다.
 *
 * 실행: npx ts-node -r tsconfig-paths/register src/database/seeds/normalize-herb-names.ts [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const MODEL = 'gpt-4o-mini';
const BATCH = 40;

const SYSTEM = `당신은 한의학 본초 표기를 정리합니다.
입력은 처방 구성에서 추출한 표기 목록입니다. 각 항목에 대해 JSON 으로만 응답하세요.

{"items":[{"input":"입력값","korean":"한글 표준 약재명 또는 null","isHerb":true/false}]}

원칙:
- 한자 약재 표기는 한국 한의학에서 통용되는 한글 표준명으로 (人蔘→인삼, 乾葛→갈근, 白茯苓→백복령).
- 포제·가공 표기가 붙어도 기본 약재명으로 (人蔘末→인삼, 使君子肉煨→사군자).
- 약재가 아닌 것은 isHerb=false: 처방명(人蔘敗毒散), 변증·증상 용어(中腑中臟),
  한 글자 조각(乾), 용량·조제문.
- 확신이 없으면 isHerb=false 로 두지 말고 korean 을 null 로 두되 isHerb 는 판단대로.`;

interface ModelItem { input: string; korean: string | null; isHerb: boolean }

async function classify(client: OpenAI, names: string[]): Promise<Map<string, ModelItem>> {
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify(names) },
    ],
  });
  const out = new Map<string, ModelItem>();
  try {
    const parsed = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    for (const it of parsed.items || []) {
      if (it?.input) out.set(String(it.input), it as ModelItem);
    }
  } catch {
    console.warn('[parse] 실패 — 이 배치는 건너뜁니다.');
  }
  return out;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { console.error('OPENAI_API_KEY 필요'); process.exit(1); }
  const client = new OpenAI({ apiKey });

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log(`[herb-name] DB 연결됨${DRY_RUN ? ' (dry-run)' : ''}`);

  try {
    const herbRepo = ds.getRepository(Herb);
    const linkRepo = ds.getRepository(FormulaHerb);
    const all = await herbRepo.find();

    // 이미 한글인 항목은 손대지 않는다.
    const targets = all.filter((h) => /[\u4e00-\u9fff]/.test(h.standardName));
    console.log(`[herb-name] 전체 ${all.length}종 중 한자 표기 ${targets.length}종`);

    let renamed = 0, merged = 0, removed = 0, kept = 0;
    const samples: string[] = [];

    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      const verdict = await classify(client, chunk.map((h) => h.standardName));

      for (const herb of chunk) {
        const v = verdict.get(herb.standardName);
        if (!v) { kept++; continue; }

        if (!v.isHerb) {
          removed++;
          if (samples.length < 12) samples.push(`  삭제: ${herb.standardName}`);
          if (!DRY_RUN) {
            await linkRepo.delete({ herbId: herb.id });
            await ds.query(`DELETE FROM "formula_herbs" WHERE herb_id = $1`, [herb.id]).catch(() => undefined);
            await herbRepo.delete({ id: herb.id });
          }
          continue;
        }

        const korean = (v.korean || '').trim();
        if (!korean || korean === herb.standardName) { kept++; continue; }

        // 같은 한글명이 이미 있으면 링크를 그쪽으로 합치고 이 행은 지운다.
        const existing = await herbRepo.findOne({ where: { standardName: korean } });
        if (existing && existing.id !== herb.id) {
          merged++;
          if (samples.length < 12) samples.push(`  병합: ${herb.standardName} → ${korean}`);
          if (!DRY_RUN) {
            await linkRepo.update({ herbId: herb.id }, { herbId: existing.id });
            await ds.query(`UPDATE "formula_herbs" SET herb_id = $1 WHERE herb_id = $2`, [existing.id, herb.id]).catch(() => undefined);
            await herbRepo.delete({ id: herb.id });
          }
          continue;
        }

        renamed++;
        if (samples.length < 12) samples.push(`  이름: ${herb.standardName} → ${korean}`);
        if (!DRY_RUN) {
          await herbRepo.update(
            { id: herb.id },
            { standardName: korean, hanjaName: herb.hanjaName || herb.standardName },
          );
        }
      }
      process.stdout.write(`\r  ${Math.min(i + BATCH, targets.length)}/${targets.length}`);
    }

    const remaining = await herbRepo.count();
    console.log('\n=== 결과 ===');
    console.log(`  한글명으로 변경: ${renamed}종`);
    console.log(`  기존 한글명에 병합: ${merged}종`);
    console.log(`  약재 아님 → 삭제: ${removed}종`);
    console.log(`  판단 보류(유지): ${kept}종`);
    console.log(`  남은 약재: ${remaining}종`);
    samples.forEach((s) => console.log(s));
  } finally {
    await ds.destroy();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
