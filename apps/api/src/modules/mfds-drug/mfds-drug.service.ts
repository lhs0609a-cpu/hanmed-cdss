import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * 식약처 의약품 제품 허가정보 API 클라이언트
 * https://www.data.go.kr/data/15095677/openapi.do
 *
 * 3개 endpoint:
 *  - getDrugPrdtPrmsnInq07     : 의약품 제품 허가 목록
 *  - getDrugPrdtPrmsnDtlInq06  : 의약품 제품 허가 상세정보 (효능효과/용법용량/사용주의 XML 포함)
 *  - getDrugPrdtMcpnDtlInq07   : 의약품 제품 주성분 상세정보
 */
@Injectable()
export class MfdsDrugService {
  private readonly logger = new Logger(MfdsDrugService.name);
  private readonly baseUrl =
    'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07';
  private readonly serviceKey: string;
  private readonly cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.serviceKey = this.configService.get<string>('MFDS_API_KEY', '');
    if (!this.serviceKey) {
      this.logger.warn(
        '식약처 의약품 허가정보 API 키 (MFDS_API_KEY) 미설정 — 호출 시 503 반환',
      );
    }
  }

  /** 의약품 제품 허가 목록 검색 (제품명/주성분명/업체명 등) */
  async searchProducts(params: {
    itemName?: string;
    entpName?: string;
    itemIngrName?: string;
    permitKindName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<MfdsListResponse> {
    return this.fetch<MfdsListResponse>('getDrugPrdtPrmsnInq07', {
      item_name: params.itemName,
      entp_name: params.entpName,
      item_ingr_name: params.itemIngrName,
      permit_kind_name: params.permitKindName,
      pageNo: String(params.pageNo ?? 1),
      numOfRows: String(params.numOfRows ?? 20),
    });
  }

  /** 의약품 제품 허가 상세정보 */
  async getProductDetail(params: {
    itemSeq?: string;
    itemName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<MfdsDetailResponse> {
    return this.fetch<MfdsDetailResponse>('getDrugPrdtPrmsnDtlInq06', {
      item_seq: params.itemSeq,
      item_name: params.itemName,
      pageNo: String(params.pageNo ?? 1),
      numOfRows: String(params.numOfRows ?? 5),
    });
  }

  /** 의약품 제품 주성분 상세정보 */
  async getMainComponentDetail(params: {
    itemSeq?: string;
    itemName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<MfdsComponentResponse> {
    return this.fetch<MfdsComponentResponse>('getDrugPrdtMcpnDtlInq07', {
      item_seq: params.itemSeq,
      item_name: params.itemName,
      pageNo: String(params.pageNo ?? 1),
      numOfRows: String(params.numOfRows ?? 20),
    });
  }

  // ============== 내부 ==============

  private async fetch<T>(
    operation: string,
    params: Record<string, string | undefined>,
  ): Promise<T> {
    if (!this.serviceKey) {
      throw new ServiceUnavailableException(
        '식약처 API 키가 설정되지 않았습니다.',
      );
    }

    const cleanParams: Record<string, string> = {
      serviceKey: this.serviceKey,
      type: 'json',
    };
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') cleanParams[k] = v;
    }

    const cacheKey = `${operation}::${JSON.stringify(cleanParams)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<MfdsRawResponse>(
          `${this.baseUrl}/${operation}`,
          { params: cleanParams, timeout: 15_000 },
        ),
      );

      const body = response.data?.body;
      const header = response.data?.header;
      if (header?.resultCode && header.resultCode !== '00') {
        throw new BadGatewayException(
          `식약처 API 오류: ${header.resultCode} ${header.resultMsg}`,
        );
      }

      const result = {
        totalCount: body?.totalCount ?? 0,
        pageNo: body?.pageNo ?? 1,
        numOfRows: body?.numOfRows ?? 0,
        items: body?.items ?? [],
      } as T;

      this.cache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      // 캐시 크기 제한 (단순 LRU, 1000건 초과시 가장 오래된 1할 제거)
      if (this.cache.size > 1000) {
        const toRemove = Math.ceil(this.cache.size * 0.1);
        const keys = Array.from(this.cache.keys()).slice(0, toRemove);
        for (const k of keys) this.cache.delete(k);
      }

      return result;
    } catch (err: any) {
      if (err.response?.status) {
        throw new BadGatewayException(
          `식약처 API 호출 실패: ${err.response.status} ${err.response.statusText || ''}`,
        );
      }
      throw new BadGatewayException(
        `식약처 API 호출 실패: ${err.message || 'unknown'}`,
      );
    }
  }
}

// ============== Response Types ==============

interface MfdsRawResponse {
  header?: { resultCode: string; resultMsg: string };
  body?: {
    pageNo: number;
    totalCount: number;
    numOfRows: number;
    items?: any[];
  };
}

export interface MfdsListItem {
  ITEM_SEQ: string;
  ITEM_NAME: string;
  ITEM_ENG_NAME?: string | null;
  ENTP_NAME: string;
  ENTP_ENG_NAME?: string | null;
  ENTP_SEQ?: string;
  ENTP_NO?: string;
  ITEM_PERMIT_DATE?: string;
  INDUTY?: string;
  PRDLST_STDR_CODE?: string;
  SPCLTY_PBLC?: string;
  PRDUCT_TYPE?: string;
  PRDUCT_PRMISN_NO?: string;
  ITEM_INGR_NAME?: string;
  ITEM_INGR_CNT?: string;
  PERMIT_KIND_CODE?: string;
  CANCEL_DATE?: string | null;
  CANCEL_NAME?: string;
  EDI_CODE?: string | null;
  BIZRNO?: string;
}

export interface MfdsDetailItem {
  ITEM_SEQ: string;
  ITEM_NAME: string;
  ENTP_NAME: string;
  ITEM_PERMIT_DATE?: string;
  CHART?: string;          // 성상
  MATERIAL_NAME?: string;  // 성분/분량
  STORAGE_METHOD?: string; // 보관방법
  VALID_TERM?: string;     // 유효기간
  PACK_UNIT?: string;      // 포장단위
  EE_DOC_DATA?: string;    // 효능효과 XML
  UD_DOC_DATA?: string;    // 용법용량 XML
  NB_DOC_DATA?: string;    // 사용상의 주의사항 XML
  PN_DOC_DATA?: string | null;
  MAIN_ITEM_INGR?: string; // 주성분
  INGR_NAME?: string;      // 첨가제
  ATC_CODE?: string;
  ITEM_ENG_NAME?: string;
  ENTP_ENG_NAME?: string;
  MAIN_INGR_ENG?: string;
  RARE_DRUG_YN?: string;   // 희귀의약품 Y/N
}

export interface MfdsComponentItem {
  ITEM_SEQ: string;
  ITEM_NAME: string;
  ENTP_NAME: string;
  MAIN_ITEM_INGR?: string;
  INGR_NAME?: string;
  MATERIAL_NAME?: string;
  TOTAL_CONTENT?: string;
}

export interface MfdsListResponse {
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: MfdsListItem[];
}

export interface MfdsDetailResponse {
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: MfdsDetailItem[];
}

export interface MfdsComponentResponse {
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: MfdsComponentItem[];
}
