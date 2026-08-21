import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';
import axios from 'axios';

/**
 * 식약처 생약 구성성분 1,466건을 약재 마스터에 채운다.
 *
 * 왜 — activeCompounds 가 636종 전부 비어 있었다. 약재 상세에서 "무엇이
 * 들어 있는지" 를 전혀 볼 수 없었다.
 *
 * 이건 성미·귀경과 다르다. 성미·귀경은 모델로 채우려다 두 번 실패했다
 * (죽여를 해표약, 도인을 소도약으로 분류했다). 구성성분은 식약처가 HPLC 로
 * 분석한 실측값이고 PubChem CID 까지 붙어 있어 출처가 분명하다.
 *
 * 오퍼레이션명은 응답으로 확인했다. 이 코드베이스에서 추측한 주소가 계속
 * 문제를 만들었다 — getMdntfList, getDissNameCodeList 가 그랬다.
 *
 * 실행: ... sync-herb-compounds.ts [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const BASE =
  'https://apis.data.go.kr/1471057/HerbHbdcirdntAnalsService/getHbdcirdntAnals';
const PAGE_SIZE = 100;

interface Compound {
  DRGNM?: string;
  CPD_NM?: string;
  MLCLFM?: string;
  PUBCHEM_CID?: string;
}

function clean(v?: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  return !s || s === 'None' || s === 'null' ? null : s;
}

/**
 * CPD_NM 은 "푸에라린\npuerarin" 처럼 국문·영문이 줄바꿈으로 붙어 온다.
 * 국문을 앞세우고 영문을 괄호로 넣는다.
 */
function compoundName(raw: string): string {
  const lines = raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (lines.length >= 2) return `${lines[0]} (${lines[1]})`;
  return lines[0] ?? raw.trim();
}

/** 분자식의 아래첨자 표기 C[_21_]H[_20_]O[_9_] 를 C21H20O9 로 편다. */
function formula(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/\[_(\d+)_\]/g, '$1').trim() || null;
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

  const herbs = await repo.find();
  const byName = new Map<string, Herb>();
  for (const h of herbs) {
    if (h.standardName) byName.set(h.standardName.trim(), h);
  }

  // 약재별로 성분을 모은 다음 한 번에 저장한다. 성분마다 저장하면
  // 같은 약재를 수십 번 쓰게 된다.
  const collected = new Map<string, string[]>();
  let rows = 0;
  let unmatched = 0;

  for (let page = 1; ; page++) {
    const url = `${BASE}?serviceKey=${key}&type=json&pageNo=${page}&numOfRows=${PAGE_SIZE}`;
    const res = await axios.get(url, { timeout: 30000 });
    const items = res.data?.body?.items;
    const list: Compound[] = Array.isArray(items) ? items : items ? [items] : [];
    if (list.length === 0) break;

    for (const it of list) {
      rows++;
      const herbName = clean(it.DRGNM);
      const cpd = clean(it.CPD_NM);
      if (!herbName || !cpd) continue;

      if (!byName.has(herbName)) {
        unmatched++;
        continue;
      }
      const label = [
        compoundName(cpd),
        formula(clean(it.MLCLFM) ?? null),
        clean(it.PUBCHEM_CID) ? `PubChem ${clean(it.PUBCHEM_CID)}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const arr = collected.get(herbName) ?? [];
      if (!arr.includes(label)) arr.push(label);
      collected.set(herbName, arr);
    }

    if (list.length < PAGE_SIZE) break;
  }

  let saved = 0;
  for (const [name, compounds] of collected) {
    const herb = byName.get(name);
    if (!herb) continue;
    herb.activeCompounds = compounds as unknown as Herb['activeCompounds'];
    if (!DRY_RUN) await repo.save(herb);
    saved++;
  }

  console.log(
    `[compounds] ${DRY_RUN ? '미리보기' : '완료'} — 성분 ${rows}행 · 약재 ${saved}종에 반영 · 마스터에 없는 약재 ${unmatched}행`,
  );
  const sample = [...collected.entries()].slice(0, 3);
  for (const [n, c] of sample) console.log(`  ${n}: ${c.slice(0, 3).join(' / ')}`);

  await ds.destroy();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[compounds] 실패:', e?.message ?? e);
    process.exit(1);
  });
