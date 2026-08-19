import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NonPayPrice } from '../../database/entities/nonpay-price.entity';

/**
 * 한방 비급여 항목의 지역별 가격.
 *
 * 한방의료 기피 이유 1위가 "한약 값이 비싸서" 인데 정작 얼마인지 미리 알 방법이
 * 없다. 심평원이 공개하는 비급여 가격 중 한방 항목의 **지역별 통계**를 보여준다.
 *
 * 원자료를 요청 때마다 부르지 않는다 — 우리 API 가 도는 도쿄에서 data.go.kr 을
 * 부르면 5건에 35초가 걸린다(해외 IP 스로틀). 미리 받아 DB 에 담아 두고
 * (sync-nonpay-prices) 여기서는 읽기만 한다. 원자료는 월 1회 갱신이다.
 *
 * 개별 한의원의 이름·가격은 다루지 않는다. 심평원에 기관별 오퍼레이션도 있지만
 * 쓰지 않는다 — 우리 고객인 한의원들을 우리가 가격 비교 상품으로 만드는 셈이고,
 * 환자에게 필요한 정보는 "이 지역에서 대략 얼마" 까지다.
 */

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

export interface NonPayItemPrice {
  code: string;
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

  constructor(
    @InjectRepository(NonPayPrice)
    private readonly prices: Repository<NonPayPrice>,
  ) {}

  listRegions() {
    return NONPAY_REGIONS;
  }

  /**
   * 한 지역의 한방 비급여 가격.
   * 그 지역에 자료가 없는 항목은 빼고 준다 — 빈 줄을 보여줄 이유가 없다.
   */
  async getKoreanMedicinePrices(region = 'All'): Promise<NonPayRegionResult> {
    const chosen = NONPAY_REGIONS.find((r) => r.code === region) ?? NONPAY_REGIONS[0];
    const rows = await this.prices.find({ order: { name: 'ASC' } });

    const items: NonPayItemPrice[] = [];
    let appliedOn: string | null = null;

    for (const row of rows) {
      const stat = row.regions?.[chosen.code];
      if (!stat) continue;
      appliedOn ??= row.appliedOn;
      items.push({
        code: row.code,
        name: row.name,
        category: row.category,
        min: stat.min ?? null,
        median: stat.median ?? null,
        average: stat.average ?? null,
        max: stat.max ?? null,
      });
    }

    // 비싼 항목이 위로 — 환자가 궁금해하는 순서다.
    items.sort((a, b) => (b.median ?? 0) - (a.median ?? 0));

    if (items.length === 0) {
      this.logger.warn(`비급여 가격 자료 없음 (region=${chosen.code})`);
    }
    return { region: chosen.code, regionName: chosen.name, appliedOn, items };
  }
}
