import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { ClinicalCase } from '../entities/clinical-case.entity';
import { Formula } from '../entities/formula.entity';

/**
 * 처방명 정확도 실태 조사 (읽기 전용).
 *
 * repair-case-formula-names 는 "원문에 등장하는 카탈로그 처방명 중 가장 긴 것" 을
 * 골랐다. 원문에 처방이 하나만 나오면 안전하지만, 여러 개가 언급되면
 * 실제 처방한 것이 아니라 그냥 언급된 것을 고를 수 있다.
 * 고치기 전에 그 비율부터 잰다.
 */
async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  try {
    const formulas = await ds.getRepository(Formula).find();
    const dict = Array.from(
      new Set(formulas.flatMap((f) => [f.name, f.hanja].filter(Boolean).map((v) => v.trim()))),
    )
      .filter((n) => n.length >= 2)
      .sort((a, b) => b.length - a.length);

    const repo = ds.getRepository(ClinicalCase);
    const total = await repo.count();

    let empty = 0;
    let single = 0;      // 원문에 처방이 1개만 등장 — 안전
    let multi = 0;       // 여러 개 등장 — 오선택 가능
    let notInText = 0;   // 저장된 이름이 원문에 없음 — 이상
    const multiSamples: string[] = [];

    const PAGE = 500;
    for (let off = 0; off < total; off += PAGE) {
      const rows = await repo.find({ order: { createdAt: 'ASC' }, skip: off, take: PAGE });
      for (const r of rows) {
        const name = (r.herbalFormulas?.[0]?.formulaName || '').trim();
        if (!name) { empty++; continue; }
        const text = r.originalText || '';
        if (!text.includes(name)) { notInText++; continue; }
        const hits = dict.filter((n) => text.includes(n));
        if (hits.length <= 1) single++;
        else {
          multi++;
          if (multiSamples.length < 8) {
            multiSamples.push(`  선택="${name}" · 원문 등장=${hits.slice(0, 6).join(', ')}`);
          }
        }
      }
      process.stdout.write(`\r  ${Math.min(off + PAGE, total)}/${total}`);
    }

    console.log('\n=== 처방명 실태 ===');
    console.log(`  전체: ${total}건`);
    console.log(`  비어 있음: ${empty}건`);
    console.log(`  원문에 처방 1개만 등장(안전): ${single}건`);
    console.log(`  여러 개 등장(오선택 가능): ${multi}건`);
    console.log(`  저장값이 원문에 없음: ${notInText}건`);
    if (multiSamples.length) {
      console.log('  다중 등장 예시:');
      multiSamples.forEach((s) => console.log(s));
    }
  } finally {
    await ds.destroy();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
