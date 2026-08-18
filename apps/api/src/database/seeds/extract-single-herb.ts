import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { ClinicalCase } from '../entities/clinical-case.entity';
import { Herb } from '../entities/herb.entity';

/**
 * 단방·식용약초 치험례에서 약재명을 뽑아 singleHerb 에 저장한다.
 *
 * 원문 첫 줄이 `●오미자(식용약초) – 알레르기성 비염...` / `●대추 단방(본초) 불면...`
 * / `●생강(식용약초) 추위탐...` 형태다. 괄호 안 분류어(식용약초·민간방·단방·본초)가
 * 단방 사례임을 알려준다.
 *
 * 방제 사례(●보중익기탕(1-021))와 구분하려면 뽑은 이름이 약재인지 확인해야 한다.
 * herbs_master 와 대조하고, 없더라도 분류어가 단방 계열이면 인정한다 —
 * 마스터 248종이 모든 본초를 담고 있지 않다.
 *
 * 멱등.
 */

const DRY_RUN = process.argv.includes('--dry-run');

// 괄호 안이 단방 계열임을 알리는 표지
const SINGLE_MARKERS = ['식용약초', '식용본초', '민간방', '단방', '본초', '손익본초', '약초'];

function extract(text: string): string | null {
  if (!text) return null;
  const first = text.split('\n').find((l) => l.trim().length > 0);
  if (!first) return null;

  // ●약재명(분류어) 또는 ●약재명 단방(분류어)
  const m = first.trim().match(/^[\s●○◆■□*・\-]*([가-힣A-Za-z]{2,10})\s*(?:단방)?\s*\(([^)]{1,20})\)/u);
  if (!m) return null;

  const name = m[1].trim();
  const marker = m[2].trim();
  const isSingle =
    SINGLE_MARKERS.some((k) => marker.includes(k)) || /단방/.test(first.slice(0, 30));
  if (!isSingle) return null;
  // 방제 접미사로 끝나면 단방이 아니다(●향부자 팔물탕(사상방) 같은 경우)
  if (/(탕|산|환|음|원|고|단)$/u.test(name)) return null;
  return name;
}

async function main(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log(`[single-herb] DB 연결됨${DRY_RUN ? ' (dry-run)' : ''}`);

  try {
    const herbNames = new Set(
      (await ds.getRepository(Herb).find()).map((h) => h.standardName),
    );
    const repo = ds.getRepository(ClinicalCase);
    const total = await repo.count();

    let found = 0;
    let inMaster = 0;
    const freq = new Map<string, number>();

    const PAGE = 500;
    for (let off = 0; off < total; off += PAGE) {
      const rows = await repo.find({ order: { createdAt: 'ASC' }, skip: off, take: PAGE });
      for (const r of rows) {
        const herb = extract(r.originalText || '');
        if (!herb) continue;
        found++;
        if (herbNames.has(herb)) inMaster++;
        freq.set(herb, (freq.get(herb) || 0) + 1);
        if (!DRY_RUN && r.singleHerb !== herb) {
          await repo.update({ id: r.id }, { singleHerb: herb });
        }
      }
      process.stdout.write(`\r  ${Math.min(off + PAGE, total)}/${total}`);
    }

    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log('\n=== 결과 ===');
    console.log(`  단방 사례로 판정: ${found}건`);
    console.log(`  약재 마스터에 있는 이름: ${inMaster}건`);
    console.log(`  고유 약재: ${freq.size}종`);
    console.log(`  상위: ${top.map(([n, c]) => `${n}(${c})`).join(', ')}`);
  } finally {
    await ds.destroy();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
