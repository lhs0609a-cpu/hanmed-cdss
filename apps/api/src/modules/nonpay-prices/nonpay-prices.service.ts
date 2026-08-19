import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

/**
 * 심평원 비급여 진료비용 — 지역별 가격 통계.
 *
 * 한방의료 기피 이유 1위가 "한약 값이 비싸서" 인데, 정작 얼마인지 미리 알 방법이
 * 없다. 심평원이 의료기관별 비급여 가격을 공개하고 있으므로 그중 한방 항목의
 * **지역별 통계**만 가져다 쓴다.
 *
 * 개별 한의원의 이름과 가격은 다루지 않는다. 기관별 목록을 주는 오퍼레이션
 * (getNonPaymentItemHospDtlList)도 있지만 쓰지 않는다 — 우리 고객인 한의원들을
 * 우리가 가격 비교 상품으로 만드는 셈이고, 환자에게 필요한 정보는 "이 지역에서
 * 대략 얼마" 까지다.
 *
 * 출처: 건강보험심사평가원 비급여진료비정보서비스 (data.go.kr, B551182)
 *       오퍼레이션 getNonPaymentItemSidoCdList (비급여진료비용지역별정보)
 *       갱신주기 월 1회.
 */

const ENDPOINT =
  'https://apis.data.go.kr/B551182/nonPaymentDamtInfoService/getNonPaymentItemSidoCdList';

/** 응답의 지역 접미사 → 화면에 쓰는 이름 */
export const NONPAY_REGIONS: Array<{ code: string; name: string }> = [
  { code: 'All', name: '전국' },
  { code: 'Sl', name: '서울' },
  { code: 'Ps', name: '부산' },
  { code: 'Tg', name: '대구' },
  { code: 'Ich', name: '인천' },
  { code: 'Kw', name: '광주' },
  { code: 'Dj', name: '대전' },
  { code: 'Usn', name: '울산' },
  { code: 'Sejong', name: '세종' },
  { code: 'Kyg', name: '경기' },
  { code: 'Kaw', name: '강원' },
  { code: 'Ccbk', name: '충북' },
  { code: 'Ccn', name: '충남' },
  { code: 'Clb', name: '전북' },
  { code: 'Cln', name: '전남' },
  { code: 'Ksb', name: '경북' },
  { code: 'Ksn', name: '경남' },
  { code: 'Chj', name: '제주' },
];

/** 한방 항목만 고른다. 검사료·시술료 전부 포함. */
const KOREAN_MEDICINE_KEYWORDS = ['한방', '한약', '추나', '약침', '첩약', '한의'];

export interface NonPayItemPrice {
  code: string;
  /** "한방 시술 및 처치료/추나요법/단순추나" 의 마지막 조각 */
  name: string;
  category: string;
  min: number | null;
  median: number | null;
  average: number | null;
  max: number | null;
}

export interface NonPayRegionResult {
  region: string;
  regionName: string;
  /** 심평원 자료 적용시작일 (YYYYMMDD) */
  appliedOn: string | null;
  items: NonPayItemPrice[];
}

@Injectable()
export class NonPayPricesService {
  private readonly logger = new Logger(NonPayPricesService.name);
  private static readonly CACHE_PREFIX = 'nonpay';
  /** 원자료는 월 1회 갱신이라 하루만 캐시해도 충분하다. */
  private static readonly CACHE_TTL = 60 * 60 * 24;
  /** 심평원이 답을 못 줄 때 내보낼 직전 결과. 원자료가 월 1회 갱신이라 길게 둔다. */
  private static readonly SNAPSHOT_TTL = 60 * 60 * 24 * 45;
  private static readonly PAGE_SIZE = 200;
  private static readonly MAX_PAGES = 10;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly REQUEST_TIMEOUT_MS = 20000;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  private tag(xml: string, name: string): string | null {
    const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
    return m ? m[1].trim() : null;
  }

  /** 0 은 '그 지역에 해당 항목을 하는 기관이 없음' 이다. 0원으로 보여주면 안 된다. */
  private price(xml: string, prefix: string, region: string): number | null {
    const raw = this.tag(xml, `${prefix}${region}`);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private serviceKey(): string {
    const key =
      this.config.get<string>('HIRA_NONPAY_API_KEY') ??
      this.config.get<string>('PUBLIC_DATA_API_KEY');
    if (!key) {
      throw new ServiceUnavailableException('비급여 가격 조회 키가 설정되지 않았습니다.');
    }
    return key;
  }

  /**
   * 한 페이지를 받아온다.
   *
   * 655건을 한 번에 달라고 하면 심평원 게이트웨이가 504 를 낸다(실제로 겪었다).
   * 나눠서 받고, 실패하면 잠깐 쉬었다 다시 시도한다.
   */
  private async fetchPage(page: number, rows: number, attempt = 1): Promise<string> {
    const url =
      `${ENDPOINT}?serviceKey=${encodeURIComponent(this.serviceKey())}` +
      `&pageNo=${page}&numOfRows=${rows}`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(NonPayPricesService.REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      if (!xml.includes('<resultCode>00</resultCode>')) {
        const msg = this.tag(xml, 'errMsg') ?? this.tag(xml, 'resultMsg') ?? '알 수 없음';
        // 키 문제 같은 건 다시 시도해도 똑같다.
        throw new ServiceUnavailableException(`심평원 조회 실패: ${msg}`);
      }
      return xml;
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      if (attempt >= NonPayPricesService.MAX_ATTEMPTS) {
        throw new ServiceUnavailableException(
          `심평원 응답 오류: ${(e as Error).message}`,
        );
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return this.fetchPage(page, rows, attempt + 1);
    }
  }

  /** 전체 항목을 페이지로 나눠 받는다. */
  private async fetchAllItems(): Promise<string[]> {
    const rows = NonPayPricesService.PAGE_SIZE;
    const first = await this.fetchPage(1, rows);
    const total = Number(this.tag(first, 'totalCount') ?? '0');
    const items: string[] = first.match(/<item>[\s\S]*?<\/item>/g) ?? [];

    const pages = Math.min(
      Math.ceil(total / rows),
      NonPayPricesService.MAX_PAGES,
    );
    for (let p = 2; p <= pages; p++) {
      const xml = await this.fetchPage(p, rows);
      items.push(...(xml.match(/<item>[\s\S]*?<\/item>/g) ?? []));
    }
    return items;
  }

  /**
   * 한 지역의 한방 비급여 가격.
   * 그 지역에 자료가 없는 항목은 빼고 준다 — 빈 줄을 보여줄 이유가 없다.
   */
  async getKoreanMedicinePrices(region = 'All'): Promise<NonPayRegionResult> {
    const chosen = NONPAY_REGIONS.find((r) => r.code === region) ?? NONPAY_REGIONS[0];

    try {
      return await this.cache.getOrSet(
      `km:${chosen.code}`,
      async () => {
        const items = await this.fetchAllItems();

        let appliedOn: string | null = null;
        const rows: NonPayItemPrice[] = [];

        for (const item of items) {
          const name = this.tag(item, 'npayKorNm');
          if (!name || !KOREAN_MEDICINE_KEYWORDS.some((k) => name.includes(k))) continue;

          const min = this.price(item, 'prcMin', chosen.code);
          const median = this.price(item, 'middAvg', chosen.code);
          const average = this.price(item, 'prcAvg', chosen.code);
          const max = this.price(item, 'prcMax', chosen.code);
          // 네 값이 전부 없으면 그 지역에 자료가 없는 항목이다.
          if (min === null && median === null && average === null && max === null) {
            continue;
          }

          appliedOn ??= this.tag(item, 'stdDate');
          const parts = name.split('/');
          rows.push({
            code: this.tag(item, 'npayCd') ?? '',
            name: parts.slice(1).join(' · ') || name,
            category: parts[0] ?? '',
            min,
            median,
            average,
            max,
          });
        }

        rows.sort((a, b) => (b.median ?? 0) - (a.median ?? 0));
        this.logger.log(`비급여 한방 가격 ${chosen.name}: ${rows.length}개 항목`);
        const result = {
          region: chosen.code,
          regionName: chosen.name,
          appliedOn,
          items: rows,
        };
        // 심평원이 답을 못 줄 때 내보낼 직전 결과를 따로 남긴다.
        await this.cache.set(`snapshot:${chosen.code}`, result, {
          prefix: NonPayPricesService.CACHE_PREFIX,
          ttl: NonPayPricesService.SNAPSHOT_TTL,
        });
        return result;
      },
      { prefix: NonPayPricesService.CACHE_PREFIX, ttl: NonPayPricesService.CACHE_TTL },
      );
    } catch (e) {
      // 심평원이 답을 못 주면 직전 결과라도 보여준다. 월 1회 갱신 자료라
      // 며칠 지난 값이 빈 화면보다 낫다.
      const snapshot = await this.cache.get<NonPayRegionResult>(
        `snapshot:${chosen.code}`,
        { prefix: NonPayPricesService.CACHE_PREFIX },
      );
      if (snapshot) {
        this.logger.warn(`심평원 조회 실패 — 직전 결과로 응답: ${(e as Error).message}`);
        return snapshot;
      }
      throw e;
    }
  }

  listRegions() {
    return NONPAY_REGIONS;
  }
}
