// ===========================
// 처방 데이터베이스 타입 정의
// ===========================

/**
 * 데이터 출처
 */
export type FormulaDataSource =
  | 'binyong101'      // 빈용 101처방
  | 'binyong202'      // 빈용 202처방
  | 'bangyak_sangton' // 방약합편 상통
  | 'bangyak_jungton' // 방약합편 중통
  | 'bangyak_haton'   // 방약합편 하통

/**
 * 질환 카테고리
 */
export type DiseaseCategoryDB =
  | 'musculoskeletal'   // 근골격계질환
  | 'digestive'         // 소화기질환
  | 'respiratory'       // 호흡기질환
  | 'cardiovascular'    // 순환기질환
  | 'neurological'      // 신경계질환
  | 'urological'        // 비뇨기질환
  | 'gynecological'     // 부인과질환
  | 'dermatological'    // 피부질환
  | 'metabolic'         // 대사질환
  | 'psychiatric'       // 정신과질환
  | 'pediatric'         // 소아질환
  | 'geriatric'         // 노인질환
  | 'immunological'     // 면역질환
  | 'oncological'       // 종양질환
  | 'etc'               // 기타

/**
 * 방약합편 분류
 */
export type BangyakCategory =
  | 'boik'        // 補益 (보익)
  | 'haepyo'      // 解表 (해표)
  | 'cheongryeol' // 清熱 (청열)
  | 'sawon'       // 瀉元 (사원)
  | 'onri'        // 溫裏 (온리)
  | 'lisu'        // 理水 (이수)
  | 'hwahae'      // 和解 (화해)
  | 'ligi'        // 理氣 (이기)
  | 'lihyeol'     // 理血 (이혈)
  | 'geotam'      // 祛痰 (거담)
  | 'sopung'      // 疏風 (소풍)
  | 'anchung'     // 安蟲 (안충)
  | 'etc'

/**
 * 약재 역할
 */
export type HerbRole = '군' | '신' | '좌' | '사'

/**
 * 처방 구성 약재
 */
export interface FormulaCompositionDB {
  herb: string              // 약재명 (한글)
  hanja?: string            // 약재명 (한자)
  amount: string            // 용량 (예: "3돈", "各等分")
  role?: HerbRole           // 군신좌사
  function?: string         // 효능 설명
  processing?: string       // 수치법 (예: "薑炒", "酒洗")
}

/**
 * 치험례 환자 정보
 */
export interface PatientInfoDB {
  gender: 'M' | 'F'
  age: number
  constitution?: string     // 체질 (예: "소음인", "태음인")
  location?: string         // 거주지
  occupation?: string       // 직업
  physique?: string         // 체격 (예: "건실", "허약")
}

/**
 * 치험례
 */
export interface ClinicalCaseDB {
  id: string
  title: string             // 증례 제목 (예: "언어곤란", "좌섬요통")
  patientInfo: PatientInfoDB
  chiefComplaint: string    // 주소증
  symptoms: string[]        // 증상 목록
  diagnosis: string         // 변증/진단
  treatment: {
    formula: string         // 투약 처방명
    modification?: string   // 가감
    dosage?: string         // 용량/복용법
    duration?: string       // 투약 기간
  }
  progress: string[]        // 경과
  result: string            // 결과
  notes?: string            // 비고
  source?: string           // 출처 (예: "조영재 선생 경험")
}

/**
 * 처방 비교 정보
 */
export interface FormulaComparisonDB {
  targetFormula: string     // 비교 대상 처방명
  difference: string        // 차이점 설명
}

/**
 * 처방 데이터베이스 메인 타입
 */
export interface FormulaDB {
  // 기본 정보
  id: string
  name: string              // 처방명 (한글)
  hanja: string             // 처방명 (한자)
  code: string              // 방약합편 코드 (예: "中統145", "上統1")

  // 분류
  category: DiseaseCategoryDB | BangyakCategory
  categoryLabel: string     // 분류 라벨 (예: "근골격계질환", "主로 補益하는 處方")

  // 출전
  source: string            // 출전 (예: "東醫寶鑑", "方藥合編")
  originalText?: string     // 원문

  // 구성
  composition: FormulaCompositionDB[]
  compositionText?: string  // 원문 구성 텍스트
  usage?: string            // 용법 (예: "左末 每二錢 溫酒調下")

  // 적응증
  indications: string[]     // 적응증 목록
  indicationText?: string   // 적응증 원문

  // 설명
  description: string       // 처방설명 (상세)
  mechanism?: string        // 작용 기전

  // 처방 구성 설명
  compositionExplanation?: string

  // 처방 비교
  comparisons?: FormulaComparisonDB[]
  comparisonText?: string   // 비교 원문

  // 치험례
  cases: ClinicalCaseDB[]

  // 주의사항
  contraindications?: string[]
  cautions?: string[]

  // 메타데이터
  dataSource: FormulaDataSource
  parseDate?: string

  // 검색용 키워드
  searchKeywords?: string[]
}

/**
 * 질환 카테고리 라벨
 */
export const DISEASE_CATEGORY_DB_LABELS: Record<DiseaseCategoryDB, string> = {
  musculoskeletal: '근골격계질환',
  digestive: '소화기질환',
  respiratory: '호흡기질환',
  cardiovascular: '순환기질환',
  neurological: '신경계질환',
  urological: '비뇨기질환',
  gynecological: '부인과질환',
  dermatological: '피부질환',
  metabolic: '대사질환',
  psychiatric: '정신과질환',
  pediatric: '소아질환',
  geriatric: '노인질환',
  immunological: '면역질환',
  oncological: '종양질환',
  etc: '기타',
}

/**
 * 방약합편 카테고리 라벨
 */
export const BANGYAK_CATEGORY_LABELS: Record<BangyakCategory, string> = {
  boik: '補益 (보익)',
  haepyo: '解表 (해표)',
  cheongryeol: '清熱 (청열)',
  sawon: '瀉元 (사원)',
  onri: '溫裏 (온리)',
  lisu: '理水 (이수)',
  hwahae: '和解 (화해)',
  ligi: '理氣 (이기)',
  lihyeol: '理血 (이혈)',
  geotam: '祛痰 (거담)',
  sopung: '疏風 (소풍)',
  anchung: '安蟲 (안충)',
  etc: '기타',
}

/**
 * 데이터 출처 라벨
 */
export const DATA_SOURCE_LABELS: Record<FormulaDataSource, string> = {
  binyong101: '빈용 101처방',
  binyong202: '빈용 202처방',
  bangyak_sangton: '방약합편 상통',
  bangyak_jungton: '방약합편 중통',
  bangyak_haton: '방약합편 하통',
}

/**
 * 검색 결과 타입
 */
export interface FormulaSearchResult {
  formula: FormulaDB
  matchScore: number
  matchedFields: string[]
}

/**
 * 검색 필터
 */
export interface FormulaSearchFilter {
  query?: string
  dataSource?: FormulaDataSource[]
  category?: (DiseaseCategoryDB | BangyakCategory)[]
  indication?: string
  herb?: string
}
