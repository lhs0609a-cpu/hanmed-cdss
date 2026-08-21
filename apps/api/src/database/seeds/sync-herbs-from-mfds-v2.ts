import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';
import axios from 'axios';

/**
 * 식약처 생약 약재정보 2,060건을 약재 마스터에 채운다.
 *
 * 왜 — 약재 마스터 248종은 딥리서치로 모은 게 아니라 처방 구성에서 이름만
 * 긁어 만든 부산물이다. 그래서 성미·귀경이 156종에만 있고, 107종은 분류가
 * '미분류' 이며, 학명·라틴생약명은 절반 가까이 비어 있다.
 *
 * 이 API 는 폐기된 줄 알았다. NO_OPENAPI_SERVICE 가 떠서 서비스가 없어진 것으로
 * 보고했는데, 실제로는 오퍼레이션명이 틀렸다 — getMdntfList 가 아니라 getMdntf.
 * DUR 용량주의·서방정분할과 똑같은 유형의 오류였다. 폐기로 단정하기 전에
 * 오퍼레이션명부터 의심할 것.
 *
 * 덮어쓰지 않는다 — 이미 사람이/모델이 채워 둔 성미·귀경·효능·분류는 그대로
 * 두고, 비어 있는 칸만 메운다. 이름이 같은 행이 있으면 갱신하고 없으면 넣는다.
 *
 * 약전 근거(KP/KHP/ChP/DPRK)를 기록한다. 우리는 한국 임상 도구라 중국약전에만
 * 실린 약재와 대한민국약전 수재 약재를 구분할 수 있어야 한다.
 *
 * 실행: npx ts-node --transpile-only -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/sync-herbs-from-mfds-v2.ts [--limit=200] [--dry-run] [--kp-only]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const KP_ONLY = process.argv.includes('--kp-only');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.slice('--limit='.length), 10) : 5000;

const BASE = 'https://apis.data.go.kr/1471057/HerbMdntfService/getMdntf';
const PAGE_SIZE = 100;

interface MfdsHerb {
  DRGNM?: string;
  TAXON_NM?: string;
  TAXON_SCNCENM?: string;
  LATIN_HBDCNM?: string;
  ENG_DRGNM?: string;
  MDCUS_REGN?: string;
  MDCUS_BASIS_CODE_LIST_NM?: string;
}

/** "None" 을 문자열로 주는 필드가 있다. 값이 없다는 뜻이다. */
function clean(v?: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === 'None' || s === 'null') return null;
  return s;
}

/** "[Ref. KP 12.]" 같은 출전 표기를 떼어 읽기 좋게 만든다. */
function stripRef(v: string | null): string | null {
  if (!v) return null;
  const s = v.replace(/\[Ref\.[^\]]*\]/g, '').replace(/\s*\/\s*$/, '').trim();
  return s || null;
}

/**
 * DRGNM 은 "당귀(當歸),참당귀" 처럼 한글명·한자·별칭이 한 칸에 들어 있다.
 * 첫 이름을 표준명으로, 괄호 안을 한자로, 나머지를 별칭으로 나눈다.
 */
function parseName(raw: string): {
  korean: string;
  hanja: string | null;
  aliases: string[];
} {
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const first = parts[0] ?? raw.trim();
  const m = first.match(/^([^(（]+)[(（]([^)）]+)[)）]\s*$/);
  const korean = (m ? m[1] : first).trim();
  const hanja = m ? m[2].trim() : null;
  const aliases = parts
    .slice(1)
    .map((a) => a.replace(/[(（][^)）]*[)）]/g, '').trim())
    .filter((a) => a && a !== korean);
  return { korean, hanja, aliases };
}

async function fetchPage(key: string, pageNo: number): Promise<MfdsHerb[]> {
  const url = `${BASE}?serviceKey=${key}&type=json&pageNo=${pageNo}&numOfRows=${PAGE_SIZE}`;
  const res = await axios.get(url, { timeout: 30000, responseType: 'json' });
  const items = res.data?.body?.items;
  return Array.isArray(items) ? items : items ? [items] : [];
}

async function main(): Promise<void> {
  const key = process.env.PUBLIC_DATA_API_KEY || process.env.MFDS_API_KEY;
  if (!key) {
    console.error('PUBLIC_DATA_API_KEY 또는 MFDS_API_KEY 가 필요합니다.');
    process.exit(1);
  }

  const ds = new DataSource({ ...dataSourceOptions, logging: false } as never);
  await ds.initialize();
  const repo = ds.getRepository(Herb);

  const existing = await repo.find();
  const byName = new Map<string, Herb>();
  for (const h of existing) {
    if (h.standardName) byName.set(h.standardName.trim(), h);
  }
  console.log(`[mfds-herb] 기존 ${existing.length}종`);

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let seen = 0;

  for (let page = 1; seen < LIMIT; page++) {
    const items = await fetchPage(key, page);
    if (items.length === 0) break;

    for (const it of items) {
      seen++;
      const rawName = clean(it.DRGNM);
      if (!rawName) continue;

      const basis = clean(it.MDCUS_BASIS_CODE_LIST_NM);
      // 대한민국약전(KP)·한약규격집(KHP) 수재만 받고 싶을 때
      if (KP_ONLY && !(basis && /KP|KHP/i.test(basis))) {
        skipped++;
        continue;
      }

      const { korean, hanja, aliases } = parseName(rawName);
      if (!korean) continue;

      const patch = {
        hanjaName: hanja,
        aliases: aliases.length ? aliases : null,
        scientificName: stripRef(clean(it.TAXON_SCNCENM)?.replace(/[{}]/g, '') ?? null),
        latinName: stripRef(clean(it.LATIN_HBDCNM)),
        englishName: stripRef(clean(it.ENG_DRGNM)),
        medicinalPart: stripRef(clean(it.MDCUS_REGN)),
        pharmacopoeia: basis,
      };

      const found = byName.get(korean);
      if (found) {
        // 이미 있는 값은 건드리지 않는다. 빈 칸만 메운다.
        let touched = false;
        for (const [k, v] of Object.entries(patch)) {
          if (v == null) continue;
          const cur = (found as unknown as Record<string, unknown>)[k];
          const empty =
            cur == null || cur === '' || (Array.isArray(cur) && cur.length === 0);
          if (empty) {
            (found as unknown as Record<string, unknown>)[k] = v;
            touched = true;
            continue;
          }

          // 같은 약재명이 여러 행으로 오는 것은 중복이 아니라 기원종이 다른
          // 것이다. 감초는 Glycyrrhiza uralensis · glabra · inflata 세 종을
          // 약전이 모두 인정한다. 먼저 온 행만 남기면 한국에서 주로 쓰는
          // uralensis 가 빠질 수 있다. 학명과 약전근거는 이어 붙인다.
          if ((k === 'scientificName' || k === 'pharmacopoeia') && typeof cur === 'string') {
            const parts = cur.split(' / ').map((x) => x.trim());
            if (!parts.includes(String(v))) {
              (found as unknown as Record<string, unknown>)[k] = [...parts, String(v)].join(' / ');
              touched = true;
            }
          }

          // 별칭은 합집합으로 모은다 — 기원종마다 다른 이름이 붙는다.
          if (k === 'aliases' && Array.isArray(cur) && Array.isArray(v)) {
            const merged = Array.from(new Set([...(cur as string[]), ...v]));
            if (merged.length !== cur.length) {
              (found as unknown as Record<string, unknown>)[k] = merged;
              touched = true;
            }
          }
        }
        if (touched) {
          if (!DRY_RUN) await repo.save(found);
          updated++;
        }
      } else {
        // 새 약재 — 성미·효능은 비워 둔다. 이 API 가 주지 않는 값이고
        // 지어내면 안 된다. fill-herb-properties.ts 가 나중에 채운다.
        const herb = repo.create({
          standardName: korean,
          category: '미분류',
          ...patch,
        } as Partial<Herb>);
        if (!DRY_RUN) await repo.save(herb);
        byName.set(korean, herb as Herb);
        added++;
      }
    }

    if (page % 5 === 0) console.log(`  ${seen}건 처리 · 신규 ${added} · 보완 ${updated}`);
    if (items.length < PAGE_SIZE) break;
  }

  console.log(
    `\n[mfds-herb] ${DRY_RUN ? '미리보기' : '완료'} — 조회 ${seen}건 · 신규 ${added} · 보완 ${updated}${KP_ONLY ? ` · 약전 밖 제외 ${skipped}` : ''}`,
  );
  await ds.destroy();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[mfds-herb] 실패:', e?.message ?? e);
    process.exit(1);
  });
