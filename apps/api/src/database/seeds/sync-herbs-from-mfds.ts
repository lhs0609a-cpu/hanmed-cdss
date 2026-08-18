import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Herb } from '../entities/herb.entity';

/**
 * 식약처 공정서 생약정보로 약재 마스터를 보강한다.
 *
 * 지금 약재의 성미귀경·효능은 AI 가 고전 기술을 정리한 참고값이다. 학명·라틴생약명·
 * 약용부위 같은 규격 정보는 대한민국약전(KP)에 근거한 공식 데이터가 공개돼 있으므로
 * 추정값을 쓸 이유가 없다.
 *
 * 출처: 식품의약품안전평가원 「생약 약재정보」 (data.go.kr, 2,060건)
 *   GET apis.data.go.kr/1471057/HerbMdntfService/getMdntf
 *
 * 매칭 방식 — API 의 DRGNM 은 "당귀(當歸),참당귀" 처럼 한글·한자·이명이 한 필드에
 * 쉼표로 들어온다. 이걸 쪼개서 우리 standardName / hanjaName 과 맞춘다.
 * 애매한 부분 일치는 쓰지 않는다 — 약재를 잘못 붙이면 임상 정보가 오염된다.
 *
 * 멱등: 같은 값이면 쓰지 않는다.
 *
 * 실행: npx ts-node -r tsconfig-paths/register src/database/seeds/sync-herbs-from-mfds.ts [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const ENDPOINT = 'https://apis.data.go.kr/1471057/HerbMdntfService/getMdntf';
const PAGE_SIZE = 100;

interface MfdsItem {
  DRGNM?: string | null;
  TAXON_NM?: string | null;
  TAXON_SCNCENM?: string | null;
  LATIN_HBDCNM?: string | null;
  ENG_DRGNM?: string | null;
  MDCUS_REGN?: string | null;
  MDCUS_BASIS_CODE_LIST_NM?: string | null;
}

/** "Angelicae Gigantis Radix [Ref. KP 12.] / Radix Angelicae [Ref. DPRKP 8.]" → 앞부분만 */
function firstVariant(value?: string | null): string | null {
  if (!value) return null;
  const head = value.split('/')[0].trim();
  return head || null;
}

/** "{Angelica gigas} Nakai" → "Angelica gigas Nakai" */
function cleanScientific(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim() || null;
}

/** "뿌리 [Ref. KP 12.]" → "뿌리" */
function stripRef(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/\[Ref\.[^\]]*\]/g, '').replace(/\s+/g, ' ').trim() || null;
}

/** "당귀(當歸),참당귀" → ["당귀", "當歸", "참당귀"] */
function nameVariants(drgnm?: string | null): string[] {
  if (!drgnm) return [];
  const out: string[] = [];
  for (const chunk of drgnm.split(',')) {
    const t = chunk.trim();
    if (!t) continue;
    const m = t.match(/^([^(]+)\(([^)]+)\)$/);
    if (m) {
      out.push(m[1].trim(), m[2].trim());
    } else {
      out.push(t);
    }
  }
  return out.filter((v) => v.length >= 2);
}

async function fetchAll(serviceKey: string): Promise<MfdsItem[]> {
  const items: MfdsItem[] = [];
  let page = 1;
  for (;;) {
    const url =
      `${ENDPOINT}?serviceKey=${encodeURIComponent(serviceKey)}` +
      `&pageNo=${page}&numOfRows=${PAGE_SIZE}&type=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`식약처 API ${res.status}`);
    const json: any = await res.json();
    if (json?.header?.resultCode !== '00') {
      throw new Error(`식약처 API 오류: ${json?.header?.resultMsg}`);
    }
    const batch: MfdsItem[] = json?.body?.items ?? [];
    items.push(...batch);
    const total: number = json?.body?.totalCount ?? 0;
    process.stdout.write(`\r  수신 ${items.length}/${total}`);
    if (items.length >= total || batch.length === 0) break;
    page += 1;
  }
  console.log('');
  return items;
}

async function main(): Promise<void> {
  // 공공데이터 키는 웹 앱 .env 에 이미 있다(VITE_PUBLIC_DATA_API_KEY).
  const serviceKey = process.env.PUBLIC_DATA_API_KEY || process.env.VITE_PUBLIC_DATA_API_KEY;
  if (!serviceKey) {
    console.error('PUBLIC_DATA_API_KEY (또는 VITE_PUBLIC_DATA_API_KEY) 가 필요합니다.');
    process.exit(1);
  }

  console.log(`[mfds] 식약처 생약 약재정보 수신${DRY_RUN ? ' (dry-run)' : ''}`);
  const items = await fetchAll(serviceKey);

  // 이름 변형 → 공식 정보 색인
  const index = new Map<string, MfdsItem>();
  for (const it of items) {
    for (const v of [...nameVariants(it.DRGNM), ...nameVariants(it.TAXON_NM)]) {
      if (!index.has(v)) index.set(v, it);
    }
  }
  console.log(`[mfds] 약재 ${items.length}건 · 이름 색인 ${index.size}개`);

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();

  try {
    const repo = ds.getRepository(Herb);
    const herbs = await repo.find();

    let matched = 0;
    let unmatched = 0;
    const samples: string[] = [];
    const missing: string[] = [];

    for (const herb of herbs) {
      const hit =
        index.get(herb.standardName) ||
        (herb.hanjaName ? index.get(herb.hanjaName) : undefined);

      if (!hit) {
        unmatched++;
        if (missing.length < 15) missing.push(herb.standardName);
        continue;
      }

      const next = {
        scientificName: cleanScientific(hit.TAXON_SCNCENM),
        latinName: firstVariant(stripRef(hit.LATIN_HBDCNM)),
        englishName: firstVariant(stripRef(hit.ENG_DRGNM)),
        medicinalPart: stripRef(hit.MDCUS_REGN),
        pharmacopoeia: hit.MDCUS_BASIS_CODE_LIST_NM?.trim() || null,
      };

      const changed =
        next.scientificName !== herb.scientificName ||
        next.latinName !== herb.latinName ||
        next.englishName !== herb.englishName ||
        next.medicinalPart !== herb.medicinalPart ||
        next.pharmacopoeia !== herb.pharmacopoeia;

      matched++;
      if (samples.length < 10) {
        samples.push(
          `  ${herb.standardName}: ${next.scientificName ?? '-'} · ${next.medicinalPart ?? '-'} · ${next.pharmacopoeia ?? '-'}`,
        );
      }
      if (!DRY_RUN && changed) {
        await repo.update({ id: herb.id }, next);
      }
    }

    console.log('\n=== 결과 ===');
    console.log(`  약재 마스터 ${herbs.length}종`);
    console.log(`  공정서 정보 연결: ${matched}종`);
    console.log(`  공정서에 없음: ${unmatched}종`);
    samples.forEach((s) => console.log(s));
    if (missing.length) {
      console.log(`  미매칭 예시: ${missing.join(', ')}`);
    }
  } finally {
    await ds.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[mfds] 실패:', e);
    process.exit(1);
  });
