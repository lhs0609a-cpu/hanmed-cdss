/**
 * 건강보험심사평가원 API 서비스
 *
 * 1. 수가기준정보조회서비스
 *    - 한방수가, 진료수가, 약국수가 조회
 *    - API: https://www.data.go.kr/data/15021028/openapi.do
 *
 * 2. 질병정보서비스
 *    - 질병명칭/코드, 통계 조회
 *    - API: https://www.data.go.kr/data/15119055/openapi.do
 */

import type { FeeSearchResult } from '@/types'

// 환경변수에서 API 키 가져오기
const PUBLIC_DATA_API_KEY = import.meta.env.VITE_PUBLIC_DATA_API_KEY || ''

// 데모 모드 여부 확인
export const isInsuranceApiDemoMode = (): boolean => !PUBLIC_DATA_API_KEY

// API 엔드포인트
const API_ENDPOINTS = {
  // 수가기준정보조회서비스
  FEE_KOREAN: 'https://apis.data.go.kr/B551182/mdfeeCrtrInfoService/getOrmcCrtrList', // 한방수가
  FEE_MEDICAL: 'https://apis.data.go.kr/B551182/mdfeeCrtrInfoService/getMdCrtrList', // 진료수가
  FEE_PHARMACY: 'https://apis.data.go.kr/B551182/mdfeeCrtrInfoService/getPhmcCrtrList', // 약국수가
  // 질병정보서비스
  DISEASE_INFO: 'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissNameCodeList', // 질병명칭/코드
  DISEASE_INOUT: 'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissInoStatsList', // 입원외래별통계
  DISEASE_GENDER_AGE: 'https://apis.data.go.kr/B551182/diseaseInfoService1/getDissSexAggrStatsList', // 성별연령별통계
}

// ========== 수가정보 API ==========

/**
 * 한방 수가 검색
 * @param keyword 검색어 (수가코드 또는 수가명)
 * @param pageNo 페이지 번호
 * @param numOfRows 결과 수
 */
export async function searchKoreanMedicineFee(
  keyword: string,
  pageNo: number = 1,
  numOfRows: number = 20
): Promise<{ items: FeeSearchResult[]; totalCount: number; isDemo?: boolean }> {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다.')
    const demoResult = getDemoKoreanFeeData(keyword)
    return { ...demoResult, isDemo: true }
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
    })

    // 검색어가 숫자로 시작하면 코드로 검색, 아니면 한글명으로 검색
    if (keyword.trim()) {
      if (/^\d/.test(keyword.trim())) {
        params.append('diagCd', keyword.trim())
      } else {
        params.append('korNm', keyword.trim())
      }
    }

    const response = await fetch(`${API_ENDPOINTS.FEE_KOREAN}?${params}`)
    const text = await response.text()

    // XML 파싱
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, 'text/xml')

    const resultCode = xmlDoc.querySelector('resultCode')?.textContent
    if (resultCode !== '00') {
      console.warn('API 응답 코드:', resultCode)
      const demoResult = getDemoKoreanFeeData(keyword)
      return { ...demoResult, isDemo: true }
    }

    const items: FeeSearchResult[] = []
    const itemNodes = xmlDoc.querySelectorAll('item')

    itemNodes.forEach((node) => {
      const payTpCd = node.querySelector('payTpCd')?.textContent
      items.push({
        code: node.querySelector('diagCd')?.textContent || '',
        name: node.querySelector('korNm')?.textContent || '',
        classificationNo: node.querySelector('diagClsfNo')?.textContent || '',
        classificationName: node.querySelector('diagClsfNm')?.textContent || '',
        price: parseFloat(node.querySelector('insrPrc')?.textContent || '0') || undefined,
        payType: payTpCd === '1' ? 'covered' : payTpCd === '2' ? 'uncovered' : 'unknown',
        payTypeName: node.querySelector('payTpNm')?.textContent,
        applyDate: node.querySelector('applyDt')?.textContent || '',
        endDate: node.querySelector('endDt')?.textContent,
        remark: node.querySelector('rmk')?.textContent,
        feeType: 'korean',
      })
    })

    const totalCount = parseInt(xmlDoc.querySelector('totalCount')?.textContent || '0')

    return { items, totalCount }
  } catch (error) {
    console.error('한방 수가 검색 API 오류:', error)
    const demoResult = getDemoKoreanFeeData(keyword)
    return { ...demoResult, isDemo: true }
  }
}

/**
 * 진료 수가 검색 (양방)
 */
export async function searchMedicalFee(
  keyword: string,
  pageNo: number = 1,
  numOfRows: number = 20
): Promise<{ items: FeeSearchResult[]; totalCount: number }> {
  if (!PUBLIC_DATA_API_KEY) {
    return { items: [], totalCount: 0 }
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
    })

    if (keyword.trim()) {
      if (/^\d/.test(keyword.trim())) {
        params.append('diagCd', keyword.trim())
      } else {
        params.append('korNm', keyword.trim())
      }
    }

    const response = await fetch(`${API_ENDPOINTS.FEE_MEDICAL}?${params}`)
    const text = await response.text()

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, 'text/xml')

    const items: FeeSearchResult[] = []
    const itemNodes = xmlDoc.querySelectorAll('item')

    itemNodes.forEach((node) => {
      const payTpCd = node.querySelector('payTpCd')?.textContent
      items.push({
        code: node.querySelector('diagCd')?.textContent || '',
        name: node.querySelector('korNm')?.textContent || '',
        classificationNo: node.querySelector('diagClsfNo')?.textContent || '',
        classificationName: node.querySelector('diagClsfNm')?.textContent || '',
        price: parseFloat(node.querySelector('insrPrc')?.textContent || '0') || undefined,
        payType: payTpCd === '1' ? 'covered' : payTpCd === '2' ? 'uncovered' : 'unknown',
        payTypeName: node.querySelector('payTpNm')?.textContent,
        applyDate: node.querySelector('applyDt')?.textContent || '',
        endDate: node.querySelector('endDt')?.textContent,
        remark: node.querySelector('rmk')?.textContent,
        feeType: 'medical',
      })
    })

    const totalCount = parseInt(xmlDoc.querySelector('totalCount')?.textContent || '0')

    return { items, totalCount }
  } catch (error) {
    console.error('진료 수가 검색 API 오류:', error)
    return { items: [], totalCount: 0 }
  }
}

// ========== 질병정보 API ==========

export interface DiseaseInfo {
  dissCd: string // 상병코드
  dissNm: string // 상병명
  dissEngNm?: string // 상병영문명
  dissClsfCd?: string // 분류코드
  dissClsfNm?: string // 분류명
  mdTpCd?: string // 의과/한방 구분 (1: 의과, 2: 한방)
  mdTpNm?: string // 의과/한방명
}

export interface DiseaseStatistics {
  dissCd: string
  dissNm: string
  year: string
  patientCount?: number
  visitCount?: number
  inpatientCount?: number
  outpatientCount?: number
}

/**
 * 질병 명칭/코드 검색
 * @param keyword 검색어 (상병코드 또는 상병명)
 * @param mdTpCd 의과/한방 구분 (1: 의과, 2: 한방)
 */
export async function searchDiseaseCode(
  keyword: string,
  mdTpCd?: '1' | '2',
  pageNo: number = 1,
  numOfRows: number = 20
): Promise<{ items: DiseaseInfo[]; totalCount: number; isDemo?: boolean }> {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다.')
    const demoResult = getDemoDiseaseData(keyword, mdTpCd)
    return { ...demoResult, isDemo: true }
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
    })

    if (keyword.trim()) {
      // 상병코드 형식인지 확인 (예: U00, K00.0 등)
      if (/^[A-Z]\d/.test(keyword.trim().toUpperCase())) {
        params.append('dissCd', keyword.trim().toUpperCase())
      } else {
        params.append('dissNm', keyword.trim())
      }
    }

    if (mdTpCd) {
      params.append('mdTpCd', mdTpCd)
    }

    const response = await fetch(`${API_ENDPOINTS.DISEASE_INFO}?${params}`)
    const text = await response.text()

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, 'text/xml')

    const resultCode = xmlDoc.querySelector('resultCode')?.textContent
    if (resultCode !== '00') {
      console.warn('API 응답 코드:', resultCode)
      const demoResult = getDemoDiseaseData(keyword, mdTpCd)
      return { ...demoResult, isDemo: true }
    }

    const items: DiseaseInfo[] = []
    const itemNodes = xmlDoc.querySelectorAll('item')

    itemNodes.forEach((node) => {
      items.push({
        dissCd: node.querySelector('dissCd')?.textContent || '',
        dissNm: node.querySelector('dissNm')?.textContent || '',
        dissEngNm: node.querySelector('dissEngNm')?.textContent,
        dissClsfCd: node.querySelector('dissClsfCd')?.textContent,
        dissClsfNm: node.querySelector('dissClsfNm')?.textContent,
        mdTpCd: node.querySelector('mdTpCd')?.textContent,
        mdTpNm: node.querySelector('mdTpNm')?.textContent,
      })
    })

    const totalCount = parseInt(xmlDoc.querySelector('totalCount')?.textContent || '0')

    return { items, totalCount }
  } catch (error) {
    console.error('질병 코드 검색 API 오류:', error)
    const demoResult = getDemoDiseaseData(keyword, mdTpCd)
    return { ...demoResult, isDemo: true }
  }
}

/**
 * 한방 상병코드만 검색
 */
export async function searchKoreanMedicineDisease(
  keyword: string,
  pageNo: number = 1,
  numOfRows: number = 20
): Promise<{ items: DiseaseInfo[]; totalCount: number; isDemo?: boolean }> {
  return searchDiseaseCode(keyword, '2', pageNo, numOfRows)
}

// ========== 데모 데이터 ==========

function getDemoKoreanFeeData(keyword: string): { items: FeeSearchResult[]; totalCount: number } {
  const demoData: FeeSearchResult[] = [
    {
      code: 'M0010',
      name: '침술-자침술(1일당)',
      classificationNo: 'M001',
      classificationName: '침술',
      price: 5630,
      payType: 'covered',
      payTypeName: '급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
    {
      code: 'M0020',
      name: '전침술(1일당)',
      classificationNo: 'M002',
      classificationName: '전침',
      price: 7340,
      payType: 'covered',
      payTypeName: '급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
    {
      code: 'M0030',
      name: '뜸술-직접구술(1일당)',
      classificationNo: 'M003',
      classificationName: '뜸술',
      price: 4520,
      payType: 'covered',
      payTypeName: '급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
    {
      code: 'M0040',
      name: '뜸술-간접구술(1일당)',
      classificationNo: 'M003',
      classificationName: '뜸술',
      price: 4520,
      payType: 'covered',
      payTypeName: '급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
    {
      code: 'M0050',
      name: '부항술(1일당)',
      classificationNo: 'M005',
      classificationName: '부항술',
      price: 3610,
      payType: 'covered',
      payTypeName: '급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
    {
      code: 'M0110',
      name: '추나요법-단순추나',
      classificationNo: 'M011',
      classificationName: '추나요법',
      price: 20870,
      payType: 'covered',
      payTypeName: '급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
    {
      code: 'M0120',
      name: '추나요법-복잡추나',
      classificationNo: 'M011',
      classificationName: '추나요법',
      price: 25040,
      payType: 'covered',
      payTypeName: '급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
    {
      code: 'M0130',
      name: '추나요법-특수추나',
      classificationNo: 'M011',
      classificationName: '추나요법',
      price: 29210,
      payType: 'covered',
      payTypeName: '급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
    {
      code: 'M0060',
      name: '약침술(1일당)',
      classificationNo: 'M006',
      classificationName: '약침술',
      price: 8200,
      payType: 'uncovered',
      payTypeName: '비급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
    {
      code: 'M0070',
      name: '봉독약침(1일당)',
      classificationNo: 'M007',
      classificationName: '봉침',
      price: 15000,
      payType: 'uncovered',
      payTypeName: '비급여',
      applyDate: '20240101',
      feeType: 'korean',
    },
  ]

  if (!keyword.trim()) {
    return { items: demoData, totalCount: demoData.length }
  }

  const searchLower = keyword.toLowerCase()
  const filtered = demoData.filter(
    (item) =>
      item.code.toLowerCase().includes(searchLower) ||
      item.name.includes(keyword) ||
      item.classificationName.includes(keyword)
  )

  return { items: filtered, totalCount: filtered.length }
}

function getDemoDiseaseData(keyword: string, mdTpCd?: '1' | '2'): { items: DiseaseInfo[]; totalCount: number } {
  const demoData: DiseaseInfo[] = [
    // 한방 상병 (U코드)
    { dissCd: 'U200', dissNm: '기허증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U201', dissNm: '혈허증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U202', dissNm: '음허증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U203', dissNm: '양허증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U204', dissNm: '기혈양허증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U210', dissNm: '간기울결증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U211', dissNm: '간화상염증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U220', dissNm: '심화항성증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U230', dissNm: '비기허증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U240', dissNm: '폐기허증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U250', dissNm: '신양허증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U251', dissNm: '신음허증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U300', dissNm: '풍한증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U301', dissNm: '풍열증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U310', dissNm: '습열증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U320', dissNm: '담음증', mdTpCd: '2', mdTpNm: '한방' },
    { dissCd: 'U330', dissNm: '어혈증', mdTpCd: '2', mdTpNm: '한방' },
    // 의과 상병 (일부)
    { dissCd: 'M545', dissNm: '요통', mdTpCd: '1', mdTpNm: '의과' },
    { dissCd: 'M791', dissNm: '근막통증', mdTpCd: '1', mdTpNm: '의과' },
    { dissCd: 'G43', dissNm: '편두통', mdTpCd: '1', mdTpNm: '의과' },
    { dissCd: 'K30', dissNm: '기능성 소화불량', mdTpCd: '1', mdTpNm: '의과' },
  ]

  let filtered = demoData

  // 의과/한방 필터
  if (mdTpCd) {
    filtered = filtered.filter((item) => item.mdTpCd === mdTpCd)
  }

  // 키워드 검색
  if (keyword.trim()) {
    const searchLower = keyword.toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.dissCd.toLowerCase().includes(searchLower) ||
        item.dissNm.includes(keyword)
    )
  }

  return { items: filtered, totalCount: filtered.length }
}

export default {
  // 수가 검색
  searchKoreanMedicineFee,
  searchMedicalFee,
  // 질병 검색
  searchDiseaseCode,
  searchKoreanMedicineDisease,
}
