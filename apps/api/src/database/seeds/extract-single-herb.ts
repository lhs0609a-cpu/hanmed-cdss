import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { ClinicalCase } from '../entities/clinical-case.entity';
import { Herb } from '../entities/herb.entity';

/**
 * 단방·식용약초 치험례에서 약재명을 뽑아 singleHerb 에 저장한다.
 *
 * 원문 첫 줄이 `●오미자(식용약초) – 알레르기성 비염...` / `●대추 단방(본초) 불면...`
 * 형태다. 괄호 안 분류어(식용약초·민간방·단방·본초)가 단방 사례임을 알려준다.
 *
 * 처방명이 없다는 이유로 이 사례들이 약재 화면에서 통째로 빠져 있었다.
 * 조회할 때마다 원문을 전문 스캔하면 약재 근거 조회가 9초까지 늘어지므로(실측)
 * 미리 뽑아 인덱스된 컬럼에 저장한다.
 *
 * 멱등.
 */

const DRY_RUN = process.argv.includes('--dry-run');

const SINGLE_MARKERS = ['식용약초', '식용본초', '민간방', '단방', '본초', '손익본초', '약초'];

function firstLineOf(text: string): string {
  const lines = text.split(/\r?\n/);
  for (const l of lines) {
    if (l.trim().length > 0) return l.trim();
  }
  return '';
}

function extract(text: string): string | null {
  if (!text) return null;
  const first = firstLineOf(text);
  if (!first) return null;

  // 단방 계열 표지가 첫머리에 있어야 한다. 없으면 방제 사례로 본다.
  const head = first.slice(0, 45);
  const isSingle = SINGLE_MARKERS.some((k) => head.includes(k));
  if (!isSingle) return null;

  const m = first.match(/^[\s●○◆■□*・-]*([가-힣A-Za-z]{2,10})/u);
  if (!m) return null;

  // "생강단방" 처럼 붙어 온 경우 접미어 제거
  const name = m[1].trim().replace(/단방$/u, '').trim();
  if (name.length < 2 || name.length > 6) return null;
  // 방제·제형 접미사면 약재가 아니다
  if (/(탕|산|환|음|원|고|단|액|정)$/u.test(name)) return null;
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
