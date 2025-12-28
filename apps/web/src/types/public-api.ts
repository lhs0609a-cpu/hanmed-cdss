// ===========================
// 공공데이터 API 타입 정의
// ===========================

/**
 * 의약품개요정보(e약은요) API 응답 타입
 * 출처: 식품의약품안전처 공공데이터포털
 */
export interface DrugInfoResponse {
  header: {
    resultCode: string
    resultMsg: string
  }
  body: {
    pageNo: number
    totalCount: number
    numOfRows: number
    items: DrugInfo[]
  }
}

export interface DrugInfo {
  entpName: string // 업체명
  itemName: string // 제품명
  itemSeq: string // 품목기준코드
  efcyQesitm: string // 효능효과
  useMethodQesitm: string // 용법용량
  atpnWarnQesitm: string // 주의사항 경고
  atpnQesitm: string // 주의사항
  intrcQesitm: string // 상호작용
  seQesitm: string // 부작용
  depositMethodQesitm: string // 보관방법
  openDe: string // 공개일자
  updateDe: string // 수정일자
  itemImage?: string // 의약품 이미지
  bizrno?: string // 사업자등록번호
}

/**
 * DUR 병용금기 정보 API 응답 타입
 * 출처: 식품의약품안전처 의약품안전사용서비스(DUR)
 */
export interface DurResponse {
  header: {
    resultCode: string
    resultMsg: string
  }
  body: {
    pageNo: number
    totalCount: number
    numOfRows: number
    items: DurItem[]
  }
}

export interface DurItem {
  ITEM_SEQ: string // 품목기준코드
  ITEM_NAME: string // 품목명
  ENTP_NAME: string // 업체명
  CHART: string // 성상
  CLASS_NO: string // 분류번호
  CLASS_NAME: string // 분류명
  ETC_OTC_NAME: string // 전문/일반
  FORM_CODE_NAME: string // 제형코드명
  INGR_CODE: string // 성분코드
  INGR_NAME: string // 성분명(한글)
  INGR_ENG_NAME: string // 성분명(영문)
  MIX_INGR: string // 복합성분
  ITEM_PERMIT_DATE: string // 품목허가일자
  TYPE_NAME: string // DUR유형
  MIX_TYPE?: string // 복합유형
}

/**
 * DUR 병용금기 상세 정보
 */
export interface DurContraindicationItem {
  MIXTURE_ITEM_SEQ: string // 병용금기 품목기준코드
  MIXTURE_ITEM_NAME: string // 병용금기 품목명
  MIXTURE_INGR_CODE: string // 병용금기 성분코드
  MIXTURE_INGR_NAME: string // 병용금기 성분명
  MIXTURE_ENTP_NAME: string // 병용금기 업체명
  CLASS_NAME: string // 분류명
  PROHBT_CONTENT: string // 금기내용
  REMARK: string // 비고
  INGR_CODE: string // 주성분코드
  INGR_NAME: string // 주성분명
  ITEM_SEQ: string // 품목기준코드
  ITEM_NAME: string // 품목명
  FORM_CODE_NAME: string // 제형코드명
  ITEM_PERMIT_DATE: string // 품목허가일자
  ENTP_NAME: string // 업체명
  CHART: string // 성상
  TYPE_NAME: string // DUR유형
  NOTIFICATION_DATE: string // 고시일자
  ETC_OTC_NAME: string // 전문/일반
}

export interface DurContraindicationResponse {
  header: {
    resultCode: string
    resultMsg: string
  }
  body: {
    pageNo: number
    totalCount: number
    numOfRows: number
    items: DurContraindicationItem[]
  }
}

/**
 * 의약품 낱알식별 API 응답 타입
 */
export interface DrugIdentificationResponse {
  header: {
    resultCode: string
    resultMsg: string
  }
  body: {
    pageNo: number
    totalCount: number
    numOfRows: number
    items: DrugIdentificationItem[]
  }
}

export interface DrugIdentificationItem {
  ITEM_SEQ: string // 품목기준코드
  ITEM_NAME: string // 품목명
  ENTP_NAME: string // 업체명
  CHART: string // 성상
  ITEM_IMAGE: string // 의약품 이미지
  PRINT_FRONT: string // 표시(앞)
  PRINT_BACK: string // 표시(뒤)
  DRUG_SHAPE: string // 의약품 모양
  COLOR_CLASS1: string // 색상(앞)
  COLOR_CLASS2: string // 색상(뒤)
  LINE_FRONT: string // 분할선(앞)
  LINE_BACK: string // 분할선(뒤)
  LENG_LONG: string // 크기(장축)
  LENG_SHORT: string // 크기(단축)
  THICK: string // 크기(두께)
  IMG_REGIST_TS: string // 이미지 등록일
  CLASS_NO: string // 분류번호
  CLASS_NAME: string // 분류명
  ETC_OTC_NAME: string // 전문/일반
  ITEM_PERMIT_DATE: string // 품목허가일자
  FORM_CODE_NAME: string // 제형코드명
  MARK_CODE_FRONT_ANAL: string // 마크내용(앞)
  MARK_CODE_BACK_ANAL: string // 마크내용(뒤)
  MARK_CODE_FRONT_IMG: string // 마크이미지(앞)
  MARK_CODE_BACK_IMG: string // 마크이미지(뒤)
  ITEM_ENG_NAME: string // 품목영문명
  CHANGE_DATE: string // 변경일자
  MARK_CODE_FRONT: string // 마크코드(앞)
  MARK_CODE_BACK: string // 마크코드(뒤)
  EDI_CODE: string // 보험코드
}

/**
 * 검색 결과 통합 타입
 */
export interface DrugSearchResult {
  itemSeq: string
  itemName: string
  entpName: string
  efficacy?: string
  usage?: string
  warning?: string
  interaction?: string
  sideEffect?: string
  imageUrl?: string
  className?: string
  etcOtcName?: string
}

/**
 * DUR 체크 결과 타입
 */
export interface DurCheckResult {
  hasDurInfo: boolean
  totalCount: number
  contraindications: {
    itemName: string
    mixtureName: string
    reason: string
    severity: 'critical' | 'warning' | 'info'
    typeName: string
  }[]
  pregnancyWarnings: DurItem[]
  elderlyWarnings: DurItem[]
  ageRestrictions: DurItem[]
  durationWarnings: DurItem[]
  dosageWarnings: DurItem[]
  duplicateEfficacy: DurItem[]
  extendedReleaseWarnings: DurItem[] // 서방정분할주의
}

// ===========================
// 생약 약재정보 API 타입 정의
// ===========================

/**
 * 생약 약재정보 API 응답 타입
 * 출처: 식품의약품안전처 식품의약품안전평가원
 */
export interface HerbMedicineResponse {
  header: {
    resultCode: string
    resultMsg: string
  }
  body: {
    pageNo: number
    totalCount: number
    numOfRows: number
    items: HerbMedicineItem[]
  }
}

export interface HerbMedicineItem {
  HERB_ID: string // 약재번호
  HERB_NM_ID: string // 약명번호
  HERB_NM: string // 약명 (한글)
  HERB_NM_CH?: string // 약명 (한자)
  CLSF_GRP_NO: string // 분류군번호
  LATN_HERB_NM: string // 라틴생약명
  ENG_HERB_NM: string // 영문약명
  DSTB_NM?: string // 유통명
  MED_PART: string // 약용부위
  MED_BSIS_CD_LIST_NM?: string // 약용근거코드목록명
  MED_BSIS_ETC?: string // 약용근거기타
  REG_DT: string // 등록일시
}

/**
 * 생약 검색 결과 타입
 */
export interface HerbSearchResult {
  herbId: string
  herbName: string
  herbNameChinese?: string
  latinName: string
  englishName: string
  distributionName?: string
  medicinalPart: string
  basisCode?: string
  basisEtc?: string
  classificationNo: string
}

// ===========================
// 한국전통 약재정보 API 타입 정의
// 출처: 지식재산처 (특허청)
// ===========================

/**
 * 한국전통 약재 정보 타입
 */
export interface TraditionalHerbItem {
  cntntsNo: string // 관리번호
  hanbangNm: string // 약재명 (한글)
  hanbangNmHanja?: string // 약재명 (한자)
  hanbangNmLatin?: string // 학명
  source?: string // 출전
  medicalPart?: string // 약용부위
  efficacy?: string // 효능
  symptoms?: string // 주치병증
  nature?: string // 성질 (한열온량)
  taste?: string // 맛 (오미)
  meridian?: string // 귀경
  contraindication?: string // 금기
  processingMethod?: string // 수치법
  relatedPrescription?: string // 관련처방
}

/**
 * 한국전통 처방 정보 타입
 */
export interface TraditionalPrescriptionItem {
  cntntsNo: string // 관리번호
  prescNm: string // 처방명 (한글)
  prescNmHanja?: string // 처방명 (한자)
  source?: string // 출전
  ingredients?: string // 구성약재
  preparation?: string // 조제용법
  symptoms?: string // 주치병증
  efficacy?: string // 효능
  contraindication?: string // 금기
  modification?: string // 가감법
  category?: string // 분류
}

/**
 * 통합 본초 정보 (생약 + 전통약재)
 */
export interface IntegratedHerbInfo {
  id: string
  koreanName: string
  chineseName?: string
  latinName?: string
  englishName?: string
  medicinalPart?: string
  nature?: string // 성미 (한열온량)
  taste?: string // 오미
  meridian?: string // 귀경
  efficacy?: string
  symptoms?: string
  contraindication?: string
  source?: string
  dataSource: 'mfds' | 'kipo' | 'both' // 데이터 출처
}

// ===========================
// 수가기준정보 API 타입 정의
// 출처: 건강보험심사평가원
// ===========================

/**
 * 한방 수가 정보 타입
 */
export interface KoreanMedicineFeeItem {
  diagClsfNo: string // 분류번호
  diagClsfNm: string // 분류명
  diagCd: string // 수가코드
  korNm: string // 수가한글명
  engNm?: string // 수가영문명
  applyDt: string // 적용시작일자
  endDt?: string // 적용종료일자
  insrPrc?: number // 보험가(단가)
  gnlNm?: string // 일반명
  clsfCd?: string // 분류코드
  sbscClsfCd?: string // 세분류코드
  payTpCd?: string // 급여구분코드 (1: 급여, 2: 비급여)
  payTpNm?: string // 급여구분명
  relMdCd?: string // 관련행위코드
  rmk?: string // 비고
}

/**
 * 진료 수가 정보 타입
 */
export interface MedicalFeeItem {
  diagClsfNo: string // 분류번호
  diagClsfNm: string // 분류명
  diagCd: string // 수가코드
  korNm: string // 수가한글명
  engNm?: string // 수가영문명
  applyDt: string // 적용시작일자
  endDt?: string // 적용종료일자
  insrPrc?: number // 보험가(단가)
  clsfCd?: string // 분류코드
  payTpCd?: string // 급여구분코드
  payTpNm?: string // 급여구분명
  rmk?: string // 비고
}

/**
 * 약국 수가 정보 타입
 */
export interface PharmacyFeeItem {
  diagClsfNo: string // 분류번호
  diagClsfNm: string // 분류명
  diagCd: string // 수가코드
  korNm: string // 수가한글명
  applyDt: string // 적용시작일자
  endDt?: string // 적용종료일자
  insrPrc?: number // 보험가(단가)
  payTpCd?: string // 급여구분코드
  payTpNm?: string // 급여구분명
  rmk?: string // 비고
}

/**
 * 수가 검색 결과 통합 타입
 */
export interface FeeSearchResult {
  code: string // 수가코드
  name: string // 수가명
  classificationNo: string // 분류번호
  classificationName: string // 분류명
  price?: number // 단가
  payType: 'covered' | 'uncovered' | 'unknown' // 급여구분
  payTypeName?: string // 급여구분명
  applyDate: string // 적용시작일
  endDate?: string // 적용종료일
  remark?: string // 비고
  feeType: 'korean' | 'medical' | 'pharmacy' // 수가유형
}
