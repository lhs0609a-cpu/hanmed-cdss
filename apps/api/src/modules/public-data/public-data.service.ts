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
  // 의약품 낱알식별 — 01 은 폐기됐다. 03 이 현행.
  DRUG_IDENTIFICATION:
    'https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03',
  // DUR 품목정보
  DUR_CONTRAINDICATION:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03',
  DUR_PREGNANCY:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getPwnmTabooInfoList03',
  DUR_ELDERLY:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getOdsnAtentInfoList03',
  DUR_AGE:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getSpcifyAgrdeTabooInfoList03',
  // 용량주의 — getMdctnDosgeCautInfoList03 은 없는 오퍼레이션이라 계속 404 였다.
  DUR_DOSAGE:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getCpctyAtentInfoList03',
  DUR_DURATION:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getMdctnPdAtentInfoList03',
  DUR_DUPLICATE:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getEfcyDplctInfoList03',
  // 서방정분할주의 — Divide 가 아니라 Partitn 이다.
  DUR_EXTENDED_RELEASE:
    'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getSeobangjeongPartitnAtentInfoList03',
  // 식약처 생약 약재정보 — 2,060건. 폐기된 게 아니라 오퍼레이션명이 틀렸다.
  // getMdntfList 로 부르면 NO_OPENAPI_SERVICE 가 떠서 서비스가 없어진 줄 알았다.
  // 실제 이름은 getMdntf 다. DUR 용량주의·서방정분할과 같은 유형의 오류였다.
  MFDS_HERB: 'https://apis.data.go.kr/1471057/HerbMdntfService/getMdntf',
  // 국내공정서 생약정보 — URL 은 정상, 활용신청만 하면 열린다.
  MFDS_HERB_OFFICIAL:
    'https://apis.data.go.kr/1471057/HerbDmstcOfcmService/getDmstcOfcm',

  // ── 아래 그룹은 2026-08-20 확인 시 NO_OPENAPI_SERVICE_ERROR 다.
  // 특허청·심평원 쪽은 아직 대체를 찾지 못했다. 식약처 생약처럼
  // 오퍼레이션명 문제일 수 있으니 폐기로 단정하지 말 것.
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
  // 심평원 질병정보 — 서비스명과 오퍼레이션명 양쪽에 1 이 붙는다.
  // 한때 diseaseInfoService(1 없음)로 고쳤는데 그게 잘못된 수정이었다.
  // 미신청 상태에서는 diseaseInfoService 가 '키 미등록'(30), 정본인
  // diseaseInfoService1 이 '서비스 없음'(12)을 반환해 반대로 읽었다.
  // 에러 코드만 보고 주소를 판단하면 안 된다는 사례가 하나 더 늘었다.
  //
  // 한방 상병은 sickType=2 & medTp=2 조합으로 1,592건 조회된다.
  // 응답은 XML 만 제공한다(JSON 없음).
  DISEASE_INFO:
    'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissNameCodeList1',
  // 입원외래·성별연령 통계는 오퍼레이션명을 아직 확인하지 못했다.
  // 추측한 주소를 남기면 다음 사람이 그걸 정답으로 읽는다 — 이번 세션에서
  // getMdntfList·getDissNameCodeList 가 정확히 그렇게 사람을 헷갈리게 했다.
  // 실제로 쓸 때 활용가이드 문서에서 확인하고 넣을 것.
  //   참고: https://www.data.go.kr/data/15119055/openapi.do
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
