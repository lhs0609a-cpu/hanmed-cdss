import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 약재 마스터의 한글명과 한자명이 같은 약재인지 감사한다.
 *
 * 왜 — 표본에서 standardName "엿기름"(맥아) 과 hanjaName "薏苡仁"(율무) 이
 * 한 행에 묶여 있었다. 전혀 다른 약재다. 이런 행이 남아 있으면 상호작용·
 * 배합금기 판정이 엉뚱한 약재로 간다. 고치기 전에 몇 건인지부터 세야 한다.
 *
 * 고치지 않는다 — 이 스크립트는 읽기만 하고 목록을 파일로 낸다. 안전 데이터라
 * 사람이 보고 판단해야 한다.
 */
const MODEL = 'gpt-4o-mini';
const BATCH = 25;
const OUT = path.resolve(__dirname, 'herb-row-audit.json');

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY 가 필요합니다.');
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  const rows: Array<{ id: string; standardName: string; hanjaName: string }> =
    await ds.query(
      `SELECT "id","standardName","hanjaName" FROM "herbs_master"
        WHERE "standardName" IS NOT NULL AND "hanjaName" IS NOT NULL
        ORDER BY "standardName"`,
    );
  console.log(`[audit] ${rows.length}행 검사`);

  const bad: Array<Record<string, unknown>> = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `한의학 약재의 한글명과 한자명이 같은 약재를 가리키는지 판정합니다.
{"results":[{"index":0,"same":true,"correctHanja":"","reason":""}]} 형태 JSON 으로만 답하세요.
same=false 일 때만 correctHanja 에 한글명에 맞는 한자를 적고 reason 을 한 줄로 씁니다.
수치·부위 차이(阿膠/阿膠珠, 生薑/生薑皮)는 같은 약재로 봅니다.
이체자(杜冲/杜仲, 三稜/三棱)도 같은 것으로 봅니다.
확신이 없으면 same=true 로 두세요 — 멀쩡한 행을 틀렸다고 하면 안 됩니다.`,
        },
        {
          role: 'user',
          content: chunk
            .map((r, k) => `${k}. 한글="${r.standardName}" 한자="${r.hanjaName}"`)
            .join('\n'),
        },
      ],
    });
    try {
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}') as {
        results?: Array<{
          index: number;
          same: boolean;
          correctHanja?: string;
          reason?: string;
        }>;
      };
      for (const r of parsed.results ?? []) {
        if (r.same === false && chunk[r.index]) {
          bad.push({
            id: chunk[r.index].id,
            korean: chunk[r.index].standardName,
            hanja: chunk[r.index].hanjaName,
            correctHanja: r.correctHanja ?? '',
            reason: r.reason ?? '',
          });
        }
      }
    } catch {
      console.error(`  파싱 실패 ${i}~${i + BATCH}`);
    }
    console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  fs.writeFileSync(OUT, JSON.stringify(bad, null, 2), 'utf-8');
  console.log(`\n[audit] 불일치 의심 ${bad.length}행 → ${OUT}`);
  for (const b of bad.slice(0, 20)) {
    console.log(`  ${b.korean} / ${b.hanja} → ${b.correctHanja} (${b.reason})`);
  }
  await ds.destroy();
})();
