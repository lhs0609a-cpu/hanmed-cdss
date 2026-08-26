import { NonPayRegionStat } from '../../database/entities/nonpay-price.entity';

/**
 * 심평원 비급여진료비용(지역별 통계) 수신·파싱.
 *
 * CLI 시드 스크립트와 월 1회 스케줄러가 같은 코드를 쓴다. 두 벌로 두면
 * 한쪽만 고쳐지고, 그러면 수동 실행과 자동 실행이 다른 값을 넣는다.
 *
 * 출처: 건강보험심사평가원 비급여진료비정보서비스 (data.go.kr, B551182)
 *       getNonPaymentItemSidoCdList — 비급여진료비용지역별정보
 *
 * 개별 의료기관 정보는 가져오지 않는다. 기관별 오퍼레이션도 있지만 쓰지 않는다 —
 * 우리 고객인 한의원들을 우리가 가격 비교 상품으로 만드는 셈이다.
 */

export const NONPAY_ENDPOINT =
  'https://apis.data.go.kr/B551182/nonPaymentDamtInfoService/getNonPaymentItemSidoCdList';

// 상류가 요청당 50초쯤 걸리고 게이트웨이 타임아웃이 60초라, 크게 달라고 하면
// 504 가 난다. 작게 여러 번 받는다(655건 → 7페이지, 약 6분).
const PAGE_SIZE = 100;
const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 8000;

/** 응답 접미사 = 지역 코드 */
export const REGION_CODES = [
  'All', 'Sl', 'Ps', 'Tg', 'Ich', 'Kw', 'Dj', 'Usn', 'Sejong',
  'Kyg', 'Kaw', 'Ccbk', 'Ccn', 'Clb', 'Cln', 'Ksb', 'Ksn', 'Chj',
];

export const KOREAN_MEDICINE_KEYWORDS = [
  '한방', '한약', '추나', '약침', '첩약', '한의',
];

export interface NonPayRow {
  code: string;
  fullName: string;
  category: string;
  name: string;
  appliedOn: string | null;
  regions: Record<string, NonPayRegionStat>;
}

export function tag(xml: string, name: string): string | null {
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

async function fetchPage(
  key: string,
  page: number,
  log: (msg: string) => void,
): Promise<string> {
  const url =
    `${NONPAY_ENDPOINT}?serviceKey=${encodeURIComponent(key)}` +
    `&pageNo=${page}&numOfRows=${PAGE_SIZE}`;
  // 상류가 자주 504 를 낸다. 죽은 게 아니라 느린 것이라 끈질기게 다시 부른다.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      if (!xml.includes('<resultCode>00</resultCode>')) {
        throw new Error(tag(xml, 'errMsg') ?? tag(xml, 'resultMsg') ?? '알 수 없음');
      }
      return xml;
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) throw e;
      log(`  ${page}페이지 재시도 ${attempt}: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw new Error('unreachable');
}

/** 전체 <item> 을 받아 온다. */
export async function fetchAllItems(
  key: string,
  log: (msg: string) => void = () => {},
): Promise<string[]> {
  const items: string[] = [];
  const first = await fetchPage(key, 1, log);
  const total = Number(tag(first, 'totalCount') ?? '0');
  items.push(...(first.match(/<item>[\s\S]*?<\/item>/g) ?? []));

  const pages = Math.ceil(total / PAGE_SIZE);
  for (let p = 2; p <= pages; p++) {
    const xml = await fetchPage(key, p, log);
    items.push(...(xml.match(/<item>[\s\S]*?<\/item>/g) ?? []));
    log(`  ${items.length}/${total}`);
  }
  return items;
}

/** 응답에서 한방 항목만 골라 저장 형태로 바꾼다. */
export function toRows(items: string[]): NonPayRow[] {
  const out: NonPayRow[] = [];
  for (const item of items) {
    const name = tag(item, 'npayKorNm');
    if (!name || !KOREAN_MEDICINE_KEYWORDS.some((k) => name.includes(k))) continue;

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
    out.push({
      code,
      fullName: name,
      category: parts[0] ?? '',
      name: parts.slice(1).join(' · ') || name,
      appliedOn: tag(item, 'stdDate'),
      regions,
    });
  }
  return out;
}
