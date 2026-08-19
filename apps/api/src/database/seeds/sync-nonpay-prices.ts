import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { NonPayPrice, NonPayRegionStat } from '../entities/nonpay-price.entity';

/**
 * 심평원 비급여 진료비용(지역별 통계) 중 한방 항목을 DB 로 옮긴다.
 *
 * 왜 미리 받아 두나 — 우리 API 는 도쿄에서 도는데 거기서 data.go.kr 을 부르면
 * 5건 받는 데 35초가 걸린다(해외 IP 스로틀로 보인다). 요청 때마다 부를 수 없다.
 * 원자료가 월 1회 갱신이므로 미리 받아 두는 편이 맞다.
 *
 * 한국에서 실행하면 빠르게 끝난다.
 *
 * 출처: 건강보험심사평가원 비급여진료비정보서비스 (data.go.kr, B551182)
 *       getNonPaymentItemSidoCdList — 비급여진료비용지역별정보
 *
 * 개별 의료기관 정보는 가져오지 않는다. 기관별 오퍼레이션도 있지만 쓰지 않는다.
 *
 * 멱등: 코드 기준 upsert. 값이 같으면 그대로 덮어써도 결과가 같다.
 *
 * 실행: npx ts-node -r tsconfig-paths/register -r dotenv/config \
 *         src/database/seeds/sync-nonpay-prices.ts [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');
const ENDPOINT =
  'https://apis.data.go.kr/B551182/nonPaymentDamtInfoService/getNonPaymentItemSidoCdList';
const PAGE_SIZE = 300;

/** 응답 접미사 = 지역 코드 */
const REGION_CODES = [
  'All', 'Sl', 'Ps', 'Tg', 'Ich', 'Kw', 'Dj', 'Usn', 'Sejong',
  'Kyg', 'Kaw', 'Ccbk', 'Ccn', 'Clb', 'Cln', 'Ksb', 'Ksn', 'Chj',
];

const KOREAN_MEDICINE_KEYWORDS = ['한방', '한약', '추나', '약침', '첩약', '한의'];

function tag(xml: string, name: string): string | null {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? m[1].trim() : null;
}

/** 0 은 '그 지역에 그 항목을 하는 기관이 없음' 이다. 0원으로 저장하면 안 된다. */
function price(xml: string, prefix: string, region: string): number | null {
  const raw = tag(xml, `${prefix}${region}`);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchPage(key: string, page: number): Promise<string> {
  const url =
    `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}` +
    `&pageNo=${page}&numOfRows=${PAGE_SIZE}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      if (!xml.includes('<resultCode>00</resultCode>')) {
        throw new Error(tag(xml, 'errMsg') ?? tag(xml, 'resultMsg') ?? '알 수 없음');
      }
      return xml;
    } catch (e) {
      if (attempt === 3) throw e;
      console.log(`  ${page}페이지 재시도 ${attempt}: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error('unreachable');
}

async function main(): Promise<void> {
  const key = process.env.HIRA_NONPAY_API_KEY || process.env.PUBLIC_DATA_API_KEY;
  if (!key) {
    console.error('HIRA_NONPAY_API_KEY 가 필요합니다.');
    process.exit(1);
  }

  console.log(`[nonpay] 심평원 지역별 비급여 가격 수신${DRY_RUN ? ' (dry-run)' : ''}`);

  const items: string[] = [];
  const first = await fetchPage(key, 1);
  const total = Number(tag(first, 'totalCount') ?? '0');
  items.push(...(first.match(/<item>[\s\S]*?<\/item>/g) ?? []));
  const pages = Math.ceil(total / PAGE_SIZE);
  for (let p = 2; p <= pages; p++) {
    const xml = await fetchPage(key, p);
    items.push(...(xml.match(/<item>[\s\S]*?<\/item>/g) ?? []));
    console.log(`  ${items.length}/${total}`);
  }
  console.log(`[nonpay] 전체 ${items.length}건 수신`);

  const rows = items
    .map((item) => ({ item, name: tag(item, 'npayKorNm') }))
    .filter(
      (r): r is { item: string; name: string } =>
        !!r.name && KOREAN_MEDICINE_KEYWORDS.some((k) => r.name!.includes(k)),
    );
  console.log(`[nonpay] 한방 항목 ${rows.length}건`);

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  try {
    const repo = ds.getRepository(NonPayPrice);
    let saved = 0;

    for (const { item, name } of rows) {
      const code = tag(item, 'npayCd');
      if (!code) continue;

      const regions: Record<string, NonPayRegionStat> = {};
      for (const region of REGION_CODES) {
        const stat: NonPayRegionStat = {
          min: price(item, 'prcMin', region),
          median: price(item, 'middAvg', region),
          average: price(item, 'prcAvg', region),
          max: price(item, 'prcMax', region),
        };
        // 네 값이 다 없으면 그 지역에는 자료가 없다. 키 자체를 만들지 않는다.
        if (stat.min ?? stat.median ?? stat.average ?? stat.max) {
          regions[region] = stat;
        }
      }

      const parts = name.split('/');
      const payload = {
        code,
        fullName: name,
        category: parts[0] ?? '',
        name: parts.slice(1).join(' · ') || name,
        appliedOn: tag(item, 'stdDate'),
        regions,
      };

      if (DRY_RUN) {
        console.log(
          `  ${payload.name} — 지역 ${Object.keys(regions).length}곳, 전국 중간 ${
            regions.All?.median ?? '-'
          }`,
        );
        continue;
      }

      const existing = await repo.findOne({ where: { code } });
      await repo.save(existing ? Object.assign(existing, payload) : repo.create(payload));
      saved++;
    }

    console.log(`\n[nonpay] 저장 ${saved}건${DRY_RUN ? ' (dry-run — 저장 안 함)' : ''}`);
  } finally {
    await ds.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[nonpay] 실패:', e);
    process.exit(1);
  });
