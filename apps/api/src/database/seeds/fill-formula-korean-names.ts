import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

/**
 * 한자로만 된 처방명에 한글 독음을 채운다.
 *
 * 429건 중 18건이 '梔子淸肝湯' 처럼 한자명뿐이라 한글로 검색하면 안 잡힌다.
 * 한의사는 "치자청간탕" 이라고 친다. 이름을 바꾸지는 않고 검색용 독음만 더한다.
 *
 * 독음은 규칙적이라 지어내는 값이 아니다. 다만 동음이의(行 행/항 등)가 있어
 * 처방명 관례를 아는 모델에게 묻고, 한글 외 문자가 섞이면 버린다.
 */
const WEB_DATA = path.resolve(__dirname, '../../../../../apps/web/public/data/formulas');
const SRC_FILE = path.join(WEB_DATA, 'all-formulas.json');
const OUT_FILE = path.join(WEB_DATA, 'formula-structured.json');
const HANJA = /[\u4e00-\u9fff]/;

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY 가 필요합니다.');
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const formulas = JSON.parse(fs.readFileSync(SRC_FILE, 'utf-8')) as Array<{
    id: string;
    name: string;
  }>;
  const out = JSON.parse(fs.readFileSync(OUT_FILE, 'utf-8')) as Record<
    string,
    Record<string, unknown>
  >;

  const targets = formulas.filter(
    (f) => HANJA.test(f.name) && !out[f.id]?.koreanName,
  );
  console.log(`[names] 대상 ${targets.length}건`);

  for (const f of targets) {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '한의학 처방명의 한글 독음을 답합니다. {"korean":"..."} 형태 JSON 으로만, 한글만 쓰세요. 처방명 관례를 따르세요.',
        },
        { role: 'user', content: f.name },
      ],
    });
    try {
      const korean = String(
        (JSON.parse(res.choices[0]?.message?.content ?? '{}') as { korean?: string })
          .korean ?? '',
      ).trim();
      // 한글만 남아야 한다. 한자나 빈 값이 오면 버린다.
      if (!korean || /[^\uac00-\ud7a3]/.test(korean)) {
        console.log(`  건너뜀 ${f.name} → "${korean}"`);
        continue;
      }
      out[f.id] = { ...(out[f.id] ?? {}), koreanName: korean };
      console.log(`  ${f.name} → ${korean}`);
    } catch {
      console.log(`  실패 ${f.name}`);
    }
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 0), 'utf-8');
  console.log('저장:', OUT_FILE);
})();
