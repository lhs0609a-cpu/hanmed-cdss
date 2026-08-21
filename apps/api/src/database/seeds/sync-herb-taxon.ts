import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';
import axios from 'axios';

/**
 * 식약처 생약 분류군 5,912건으로 약재의 과명(科名)을 채운다.
 *
 * 왜 — 636종 중 상당수가 분류 '미분류' 다. 그런데 이 API 가 주는 것은
 * 식물분류학 분류(과·속·종)지 본초학 분류(청열약·보기약)가 아니다.
 * 서로 다른 축이라 category 를 덮어쓰면 안 된다. 죽여가 화담약이라는 것은
 * 여기에 없다.
 *
 * 그래서 taxonomy 로 따로 담는다. "벼과 · Poaceae" 는 그 자체로 쓸모가 있다 —
 * 알레르기가 있는 환자에게 같은 과 약재를 피하게 하거나, 기원 식물을 확인할 때
 * 쓴다. 본초학 분류는 출처를 따로 구해야 한다.
 *
 * 잇는 열쇠 — 약재정보(getMdntf)의 TAXON_NO 와 분류군(getTaxon)의 TAXON_NO 가
 * 맞물린다. 약재명으로 맞추려 하면 안 된다. 분류군 쪽은 식물명(NMNT)이라
 * '갈근' 이 아니라 '칡' 으로 들어 있다.
 *
 * 실행: ... sync-herb-taxon.ts [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const MDNTF = 'https://apis.data.go.kr/1471057/HerbMdntfService/getMdntf';
const TAXON = 'https://apis.data.go.kr/1471057/HerbTaxonService/getTaxon';
const PAGE_SIZE = 200;

function clean(v?: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  return !s || s === 'None' || s === 'null' ? null : s;
}

async function fetchAll<T>(base: string, key: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const url = `${base}?serviceKey=${key}&type=json&pageNo=${page}&numOfRows=${PAGE_SIZE}`;
    const res = await axios.get(url, { timeout: 40000 });
    const items = res.data?.body?.items;
    const list: T[] = Array.isArray(items) ? items : items ? [items] : [];
    out.push(...list);
    if (list.length < PAGE_SIZE) break;
  }
  return out;
}

async function main(): Promise<void> {
  const key = process.env.PUBLIC_DATA_API_KEY || process.env.MFDS_API_KEY;
  if (!key) {
    console.error('PUBLIC_DATA_API_KEY 가 필요합니다.');
    process.exit(1);
  }

  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  const repo = ds.getRepository(Herb);

  console.log('[taxon] 분류군 내려받는 중…');
  const taxa = await fetchAll<Record<string, string>>(TAXON, key);
  const byTaxonNo = new Map<string, { family: string; latin: string; plant: string }>();
  for (const t of taxa) {
    const no = clean(t.TAXON_NO);
    const family = clean(t.KOREAN_FMLNM);
    if (!no || !family) continue;
    byTaxonNo.set(no, {
      family,
      latin: clean(t.LATIN_FMLNM) ?? '',
      plant: clean(t.NMNT) ?? '',
    });
  }
  console.log(`[taxon] 분류군 ${taxa.length}건 · 과명 있는 것 ${byTaxonNo.size}건`);

  console.log('[taxon] 약재정보 내려받는 중…');
  const drugs = await fetchAll<Record<string, string>>(MDNTF, key);

  /** 약재명 → 과명. DRGNM 은 "당귀(當歸),참당귀" 형태라 첫 이름만 쓴다. */
  const herbFamily = new Map<string, { family: string; latin: string; plant: string }>();
  for (const d of drugs) {
    const raw = clean(d.DRGNM);
    const taxonNo = clean(d.TAXON_NO);
    if (!raw || !taxonNo) continue;
    const first = raw.split(',')[0].trim();
    const korean = first.replace(/[(（][^)）]*[)）]\s*$/, '').trim();
    const info = byTaxonNo.get(taxonNo);
    if (!korean || !info) continue;
    if (!herbFamily.has(korean)) herbFamily.set(korean, info);
  }
  console.log(`[taxon] 약재 ${drugs.length}행 → 과명 연결 ${herbFamily.size}종`);

  const herbs = await repo.find();
  let filled = 0;
  for (const h of herbs) {
    const info = herbFamily.get((h.standardName ?? '').trim());
    if (!info) continue;
    // category(본초학 분류)는 건드리지 않는다. 축이 다르다.
    const label = info.latin ? `${info.family} (${info.latin})` : info.family;
    if (h.taxonomy === label) continue;
    h.taxonomy = label;
    if (!DRY_RUN) await repo.save(h);
    filled++;
  }

  console.log(`\n[taxon] ${DRY_RUN ? '미리보기' : '완료'} — 과명 채움 ${filled}종 / 전체 ${herbs.length}종`);
  const sample = herbs.filter((h) => herbFamily.has((h.standardName ?? '').trim())).slice(0, 5);
  for (const h of sample) {
    const i = herbFamily.get(h.standardName.trim())!;
    console.log(`  ${h.standardName}: ${i.family} (${i.latin}) · 기원식물 ${i.plant}`);
  }

  await ds.destroy();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[taxon] 실패:', e?.message ?? e);
    process.exit(1);
  });
