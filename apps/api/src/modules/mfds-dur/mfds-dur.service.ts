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
 * 식약처 DUR (의약품안전사용서비스) API 클라이언트
 * - 품목정보: https://www.data.go.kr/data/15059486
 * - 성분정보: https://www.data.go.kr/data/15056780
 *
 * 인증키는 NEDRUG 와 동일 (MFDS_API_KEY 재사용).
 */
@Injectable()
export class MfdsDurService {
  private readonly logger = new Logger(MfdsDurService.name);
  private readonly prdlstUrl =
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03';
  private readonly irdntUrl =
    'https://apis.data.go.kr/1471000/DURIrdntInfoService03';
  private readonly serviceKey: string;
  private readonly cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.serviceKey = this.configService.get<string>('MFDS_API_KEY', '');
    if (!this.serviceKey) {
      this.logger.warn('MFDS_API_KEY 미설정 — DUR API 호출 시 503 반환');
    }
  }

  /**
   * 품목 단위 DUR 통합 조회 — TYPE_NAME 으로 모든 DUR 카테고리 반환
   * @param params itemSeq 또는 itemName 중 하나 필수
   */
  async getProductDurFlags(params: {
    itemSeq?: string;
    itemName?: string;
    typeName?: DurTypeName;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DurProductResponse> {
    return this.fetch<DurProductResponse>(
      this.prdlstUrl,
      'getDurPrdlstInfoList03',
      {
        itemSeq: params.itemSeq,
        itemName: params.itemName,
        typeName: params.typeName,
        pageNo: String(params.pageNo ?? 1),
        numOfRows: String(params.numOfRows ?? 50),
      },
    );
  }

  /** 병용금기 성분 조회 (itemName = 한글 성분명 부분 일치) */
  async getUsjntTaboo(params: {
    itemName?: string;
    ingrName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DurIngredientResponse> {
    return this.fetch<DurIngredientResponse>(
      this.irdntUrl,
      'getUsjntTabooInfoList02',
      this.normalizeIrdntParams(params),
    );
  }

  /** 임부금기 성분 */
  async getPwnmTaboo(params: {
    itemName?: string;
    ingrName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DurIngredientResponse> {
    return this.fetch<DurIngredientResponse>(
      this.irdntUrl,
      'getPwnmTabooInfoList02',
      {
        ...this.normalizeIrdntParams(params),
        // 임부금기는 typeName 필요할 수 있음 (안전하게 명시)
        typeName: '임부금기',
      },
    );
  }

  /** 노인주의 성분 */
  async getOdsnAtent(params: {
    itemName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DurIngredientResponse> {
    return this.fetch<DurIngredientResponse>(
      this.irdntUrl,
      'getOdsnAtentInfoList02',
      this.normalizeIrdntParams(params),
    );
  }

  /** 특정연령대금기 성분 (소아 등) */
  async getSpcifyAgrdeTaboo(params: {
    itemName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DurIngredientResponse> {
    return this.fetch<DurIngredientResponse>(
      this.irdntUrl,
      'getSpcifyAgrdeTabooInfoList02',
      this.normalizeIrdntParams(params),
    );
  }

  /** 용량주의 */
  async getCpctyAtent(params: {
    itemName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DurIngredientResponse> {
    return this.fetch<DurIngredientResponse>(
      this.irdntUrl,
      'getCpctyAtentInfoList02',
      this.normalizeIrdntParams(params),
    );
  }

  /** 투여기간주의 */
  async getMdctnPdAtent(params: {
    itemName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DurIngredientResponse> {
    return this.fetch<DurIngredientResponse>(
      this.irdntUrl,
      'getMdctnPdAtentInfoList02',
      this.normalizeIrdntParams(params),
    );
  }

  // ============== 내부 ==============

  private normalizeIrdntParams(params: {
    itemName?: string;
    ingrName?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Record<string, string | undefined> {
    return {
      itemName: params.itemName,
      ingrName: params.ingrName,
      pageNo: String(params.pageNo ?? 1),
      numOfRows: String(params.numOfRows ?? 20),
    };
  }

  private async fetch<T>(
    baseUrl: string,
    operation: string,
    params: Record<string, string | undefined>,
  ): Promise<T> {
    if (!this.serviceKey) {
      throw new ServiceUnavailableException('MFDS DUR API 키 미설정');
    }

    const cleanParams: Record<string, string> = {
      serviceKey: this.serviceKey,
      type: 'json',
    };
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') cleanParams[k] = v;
    }

    const cacheKey = `${baseUrl}::${operation}::${JSON.stringify(cleanParams)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<DurRawResponse>(`${baseUrl}/${operation}`, {
          params: cleanParams,
          timeout: 15_000,
        }),
      );

      const body = response.data?.body;
      const header = response.data?.header;
      if (header?.resultCode && header.resultCode !== '00') {
        throw new BadGatewayException(
          `식약처 DUR API 오류: ${header.resultCode} ${header.resultMsg}`,
        );
      }

      // DUR 성분정보 응답은 items 가 [{item: {...}}, ...] 형태로 한 번 더 래핑되어 있음
      const rawItems = body?.items ?? [];
      const items = rawItems.map((row: any) =>
        row && typeof row === 'object' && row.item ? row.item : row,
      );

      const result = {
        totalCount: body?.totalCount ?? 0,
        pageNo: body?.pageNo ?? 1,
        numOfRows: body?.numOfRows ?? 0,
        items,
      } as T;

      this.cache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      if (this.cache.size > 1000) {
        const toRemove = Math.ceil(this.cache.size * 0.1);
        const keys = Array.from(this.cache.keys()).slice(0, toRemove);
        for (const k of keys) this.cache.delete(k);
      }

      return result;
    } catch (err: any) {
      if (err.response?.status) {
        throw new BadGatewayException(
          `식약처 DUR API 호출 실패: ${err.response.status} ${err.response.statusText || ''}`,
        );
      }
      throw new BadGatewayException(
        `식약처 DUR API 호출 실패: ${err.message || 'unknown'}`,
      );
    }
  }
}

// ============== Types ==============

export type DurTypeName =
  | '병용금기'
  | '임부금기'
  | '특정연령대금기'
  | '노인주의'
  | '용량주의'
  | '투여기간주의'
  | '효능군중복'
  | '서방형분할주의';

interface DurRawResponse {
  header?: { resultCode: string; resultMsg: string };
  body?: {
    pageNo: number;
    totalCount: number;
    numOfRows: number;
    items?: any[];
  };
}

/** DURPrdlstInfoService03 — 품목 단위 응답 */
export interface DurProductItem {
  TYPE_NAME?: string; // "병용금기" | "임부금기" | "노인주의" | ...
  MIX_TYPE?: string; // 단일 / 복합
  INGR_CODE?: string;
  INGR_KOR_NAME?: string;
  INGR_ENG_NAME?: string;
  INGR_NAME?: string;
  ITEM_SEQ?: string;
  ITEM_NAME?: string;
  ENTP_NAME?: string;
  FORM_NAME?: string;
  ETC_OTC_CODE?: string;
  CLASS_CODE?: string;
  CLASS_NAME?: string;
  PROHBT_CONTENT?: string; // 금기 사유
  REMARK?: string;
  // 병용금기 시 상대방 정보
  MIXTURE_INGR_CODE?: string;
  MIXTURE_INGR_KOR_NAME?: string;
  MIXTURE_INGR_ENG_NAME?: string;
  MIXTURE_ITEM_SEQ?: string;
  MIXTURE_ITEM_NAME?: string;
}

export interface DurProductResponse {
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: DurProductItem[];
}

/** DURIrdntInfoService03 — 성분 단위 응답 */
export interface DurIngredientItem {
  DUR_SEQ?: string;
  TYPE_NAME?: string;
  MIX_TYPE?: string;
  INGR_CODE?: string;
  INGR_NAME?: string;
  INGR_KOR_NAME?: string;
  INGR_ENG_NAME?: string;
  MIX?: string;
  MIX_INGR?: string;
  ORI?: string;
  ORI_INGR?: string;
  CLASS_CODE?: string;
  CLASS_NAME?: string;
  PROHBT_CONTENT?: string;
  REMARK?: string;
  MIXTURE_INGR_CODE?: string;
  MIXTURE_INGR_KOR_NAME?: string;
  MIXTURE_INGR_ENG_NAME?: string;
  // 특정연령대금기 / 용량주의 / 투여기간주의 등에서 추가 필드
  FORM_NAME?: string;
  AGE_BASE?: string;
  AGE_BASE_GROUP?: string;
  MAX_QTY?: string;
  MAX_DOSAGE?: string;
  MAX_DOSAGE_PER_ONCE?: string;
  PD_CONDITION?: string;
}

export interface DurIngredientResponse {
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: DurIngredientItem[];
}
