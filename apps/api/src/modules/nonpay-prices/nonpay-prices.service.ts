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

  private async fetchRaw(): Promise<string> {
    const key =
      this.config.get<string>('HIRA_NONPAY_API_KEY') ??
      this.config.get<string>('PUBLIC_DATA_API_KEY');
    if (!key) {
      throw new ServiceUnavailableException('비급여 가격 조회 키가 설정되지 않았습니다.');
    }
    const url =
      `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}` +
      `&pageNo=1&numOfRows=2000`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new ServiceUnavailableException(`심평원 응답 오류 (${res.status})`);
    }
    const xml = await res.text();
    if (!xml.includes('<resultCode>00</resultCode>')) {
      const msg = this.tag(xml, 'errMsg') ?? this.tag(xml, 'resultMsg') ?? '알 수 없음';
      throw new ServiceUnavailableException(`심평원 조회 실패: ${msg}`);
    }
    return xml;
  }

  /**
   * 한 지역의 한방 비급여 가격.
   * 그 지역에 자료가 없는 항목은 빼고 준다 — 빈 줄을 보여줄 이유가 없다.
   */
  async getKoreanMedicinePrices(region = 'All'): Promise<NonPayRegionResult> {
    const chosen = NONPAY_REGIONS.find((r) => r.code === region) ?? NONPAY_REGIONS[0];

    return this.cache.getOrSet(
      `km:${chosen.code}`,
      async () => {
        const xml = await this.fetchRaw();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

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
        return { region: chosen.code, regionName: chosen.name, appliedOn, items: rows };
      },
      { prefix: NonPayPricesService.CACHE_PREFIX, ttl: NonPayPricesService.CACHE_TTL },
    );
  }

  listRegions() {
    return NONPAY_REGIONS;
  }
}
