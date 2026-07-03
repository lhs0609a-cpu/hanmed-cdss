import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * 공공데이터포털(data.go.kr) 프록시.
 *
 * serviceKey 는 서버 환경변수(PUBLIC_DATA_API_KEY)로만 보관한다.
 * 이전에는 프론트가 VITE_PUBLIC_DATA_API_KEY 로 직접 gov API 를 호출해
 * 키가 클라이언트 번들에 그대로 노출됐다 → 이 프록시로 서버에서만 키를 주입.
 *
 * endpoint 는 화이트리스트만 허용(SSRF 방지). 응답은 원본 그대로 통과
 * (JSON/XML 모두 프론트가 기존처럼 파싱).
 */
const ENDPOINTS: Record<string, string> = {
  // 의약품개요정보(e약은요)
  DRUG_INFO:
    'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList',
  // 의약품 낱알식별
  DRUG_IDENTIFICATION:
    'https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01',
  // DUR 품목정보
  DUR_CONTRAINDICATION:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03',
  DUR_PREGNANCY:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getPwnmTabooInfoList03',
  DUR_ELDERLY:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getOdsnAtentInfoList03',
  DUR_AGE:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getSpcifyAgrdeTabooInfoList03',
  DUR_DOSAGE:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getMdctnDosgeCautInfoList03',
  DUR_DURATION:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getMdctnPdAtentInfoList03',
  DUR_DUPLICATE:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getEfcyDplctInfoList03',
  DUR_EXTENDED_RELEASE:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getSeobangjeongDivideAtentInfoList03',
  // 식약처 생약 약재정보
  MFDS_HERB: 'https://apis.data.go.kr/1471057/HerbMdntfService/getMdntfList',
  // 지식재산처 한국전통 약재/처방
  KIPO_HERB_SEARCH:
    'https://apis.data.go.kr/1430000/MatInfoService/getMatInfoList',
  KIPO_HERB_DETAIL:
    'https://apis.data.go.kr/1430000/MatInfoService/getMatInfoDetail',
  KIPO_PRESC_SEARCH:
    'https://apis.data.go.kr/1430000/PreInfoService/getPreInfoList',
  KIPO_PRESC_DETAIL:
    'https://apis.data.go.kr/1430000/PreInfoService/getPreInfoDetail',
  // 건강보험심사평가원 수가기준정보
  FEE_KOREAN:
    'https://apis.data.go.kr/B551182/mdfeeCrtrInfoService/getOrmcCrtrList',
  FEE_MEDICAL:
    'https://apis.data.go.kr/B551182/mdfeeCrtrInfoService/getMdCrtrList',
  FEE_PHARMACY:
    'https://apis.data.go.kr/B551182/mdfeeCrtrInfoService/getPhmcCrtrList',
  // 건강보험심사평가원 질병정보
  DISEASE_INFO:
    'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissNameCodeList',
  DISEASE_INOUT:
    'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissInoStatsList',
  DISEASE_GENDER_AGE:
    'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissSexAggrStatsList',
};

export interface ProxyResult {
  status: number;
  contentType: string;
  body: string;
}

@Injectable()
export class PublicDataService {
  private readonly logger = new Logger(PublicDataService.name);
  private readonly serviceKey: string;

  constructor(private readonly config: ConfigService) {
    this.serviceKey = this.config.get<string>('PUBLIC_DATA_API_KEY') || '';
  }

  async proxy(
    endpoint: string,
    query: Record<string, unknown>,
  ): Promise<ProxyResult> {
    const baseUrl = ENDPOINTS[endpoint];
    if (!baseUrl) {
      throw new BadRequestException('허용되지 않은 공공데이터 endpoint 입니다.');
    }
    if (!this.serviceKey) {
      throw new ServiceUnavailableException(
        '공공데이터 API 키(PUBLIC_DATA_API_KEY)가 설정되지 않았습니다.',
      );
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === 'endpoint' || value === undefined || value === null) continue;
      params.append(key, String(value));
    }
    params.set('serviceKey', this.serviceKey);

    try {
      const res = await axios.get(`${baseUrl}?${params.toString()}`, {
        responseType: 'text',
        timeout: 10000,
        // 원본 응답을 가공 없이 그대로 통과
        transformResponse: (data) => data,
        validateStatus: () => true,
      });
      return {
        status: res.status,
        contentType:
          (res.headers['content-type'] as string) || 'application/json',
        body: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
      };
    } catch (error) {
      this.logger.error(
        `공공데이터 프록시 실패: endpoint=${endpoint}, ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException('공공데이터 API 호출에 실패했습니다.');
    }
  }
}
