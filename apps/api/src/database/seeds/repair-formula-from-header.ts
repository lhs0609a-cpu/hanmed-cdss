import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { ClinicalCase } from '../entities/clinical-case.entity';

/**
 * 원문 헤더에서 실제 처방명을 복원한다.
 *
 * 치험례 원문은 `●삼출건비탕(1-021) 만성 소화불량. 식욕부진...` 처럼
 * 첫 줄에 실제 처방한 방제명이 적혀 있다. 본문 뒤쪽에는 비교·감별을 위해
 * 다른 처방이 여럿 언급된다.
 *
 * 이전 정리(repair-case-formula-names)는 "카탈로그 429건 중 원문에 등장하는
 * 가장 긴 이름" 을 골랐다. 그래서 헤더가 삼출건비탕인 사례에 본문에 언급된
 * 전씨이공산이 저장됐고, 헤더가 온백원인 사례는 카탈로그에 없다는 이유로 비워졌다.
 * 전체의 74%(4,747건)가 본문에 처방을 여러 개 언급하므로 오선택 위험이 그만큼 컸다.
 *
 * 헤더는 문서 자신이 밝힌 처방이므로 어떤 추론보다 정확하다.
 * 카탈로그에 없는 방제(온백원 등)도 그대로 쓴다 — 429건은 전체 방제의 일부일 뿐이고,
 * 비워 두는 것보다 실제 이름을 남기는 편이 치험례로서 훨씬 쓸모 있다.
 *
 * 멱등: 몇 번 돌려도 결과가 같다.
 */

const DRY_RUN = process.argv.includes('--dry-run');

// 방제 접미사 — 한글/한자 모두. 이걸로 끝나는 첫 토큰만 처방명으로 인정한다.
const SUFFIX = '(탕|산|환|음|원|고|단|음자|전|첩|湯|散|丸|飮|元|膏|丹)';
const HEADER_RE = new RegExp(`^[\\s●○◆■□*・-]*([가-힣A-Za-z]{2,12}${SUFFIX})`, 'u');

function extractHeaderFormula(text: string): string | null {
  if (!text) return null;
  // 첫 비어 있지 않은 줄만 본다. 본문으로 내려가면 언급된 처방이 섞인다.
  const firstLine = text.split('\n').find((l) => l.trim().length > 0);
  if (!firstLine) return null;
  const m = firstLine.trim().match(HEADER_RE);
  if (!m) return null;
  const name = m[1].trim();
  // "증보" 같은 편집 표기가 붙어 오는 경우 방어
  if (name.length < 2 || name.length > 12) return null;
  return name;
}

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log(`[header] DB 연결됨${DRY_RUN ? ' (dry-run)' : ''}`);

  try {
    const repo = ds.getRepository(ClinicalCase);
    const total = await repo.count();

    let corrected = 0;   // 기존값과 다른 이름으로 교정
    let filled = 0;      // 비어 있던 것을 채움
    let same = 0;        // 이미 헤더와 일치
    let noHeader = 0;    // 헤더에서 처방명을 못 찾음
    const samples: string[] = [];

    const PAGE = 500;
    for (let off = 0; off < total; off += PAGE) {
      const rows = await repo.find({ order: { createdAt: 'ASC' }, skip: off, take: PAGE });
      for (const r of rows) {
        const header = extractHeaderFormula(r.originalText || '');
        if (!header) { noHeader++; continue; }

        const existing = (r.herbalFormulas?.[0]?.formulaName || '').trim();
        if (existing === header) { same++; continue; }

        if (existing) {
          corrected++;
          if (samples.length < 10) samples.push(`  "${existing}" → "${header}"`);
        } else {
          filled++;
          if (samples.length < 10) samples.push(`  (비어있음) → "${header}"`);
        }

        if (!DRY_RUN) {
          const base = Array.isArray(r.herbalFormulas) && r.herbalFormulas[0]
            ? r.herbalFormulas
            : [{ formulaName: '', herbs: [] } as any];
          const next = [...base];
          next[0] = { ...next[0], formulaName: header };
          await repo.update({ id: r.id }, { herbalFormulas: next });
        }
      }
      process.stdout.write(`\r  ${Math.min(off + PAGE, total)}/${total}`);
    }

    console.log('\n=== 결과 ===');
    console.log(`  헤더와 이미 일치: ${same}건`);
    console.log(`  잘못된 이름 교정: ${corrected}건`);
    console.log(`  비어 있던 것 채움: ${filled}건`);
    console.log(`  헤더에서 못 찾음(유지): ${noHeader}건`);
    if (samples.length) {
      console.log('  예시:');
      samples.forEach((s) => console.log(s));
    }
  } finally {
    await ds.destroy();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
