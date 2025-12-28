/**
 * 공공데이터포털 API 서비스
 * - 의약품개요정보(e약은요) API
 * - DUR 병용금기 정보 API
 * - 의약품 낱알식별 정보 API
 *
 * API 키 발급: https://www.data.go.kr
 */

import type {
  DrugInfo,
  DrugSearchResult,
  DurItem,
  DurCheckResult,
  DrugIdentificationItem,
} from '@/types'

// 환경변수에서 API 키 가져오기
const PUBLIC_DATA_API_KEY = import.meta.env.VITE_PUBLIC_DATA_API_KEY || ''

// API 엔드포인트
const API_ENDPOINTS = {
  // 의약품개요정보(e약은요)
  DRUG_INFO: 'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList',
  // DUR 품목정보 - 병용금기
  DUR_CONTRAINDICATION: 'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03',
  // DUR 품목정보 - 임부금기
  DUR_PREGNANCY: 'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getPwnmTabooInfoList03',
  // DUR 품목정보 - 노인주의
  DUR_ELDERLY: 'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getOdsnAtentInfoList03',
  // DUR 품목정보 - 특정연령금기
  DUR_AGE: 'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getSpcifyAgrdeTabooInfoList03',
  // DUR 품목정보 - 용량주의
  DUR_DOSAGE: 'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getMdctnDosgeCautInfoList03',
  // DUR 품목정보 - 투여기간주의
  DUR_DURATION: 'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getMdctnPdAtentInfoList03',
  // DUR 품목정보 - 효능군중복
  DUR_DUPLICATE: 'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getEfcyDplctInfoList03',
  // DUR 품목정보 - 서방정분할주의
  DUR_EXTENDED_RELEASE: 'https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getSeobangjeongDivideAtentInfoList03',
  // 의약품 낱알식별 정보
  DRUG_IDENTIFICATION: 'https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01',
}

/**
 * 의약품 검색 (e약은요 API)
 * @param itemName 제품명
 * @param pageNo 페이지 번호
 * @param numOfRows 한 페이지 결과 수
 */
export async function searchDrugs(
  itemName: string,
  pageNo: number = 1,
  numOfRows: number = 10
): Promise<{ items: DrugSearchResult[]; totalCount: number }> {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다. 데모 데이터를 반환합니다.')
    return getDemoDrugData(itemName)
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
      itemName: itemName,
      type: 'json',
    })

    const response = await fetch(`${API_ENDPOINTS.DRUG_INFO}?${params}`)
    const data = await response.json()

    if (data.header?.resultCode !== '00') {
      throw new Error(data.header?.resultMsg || 'API 오류')
    }

    const items: DrugSearchResult[] = (data.body?.items || []).map((item: DrugInfo) => ({
      itemSeq: item.itemSeq,
      itemName: item.itemName,
      entpName: item.entpName,
      efficacy: item.efcyQesitm,
      usage: item.useMethodQesitm,
      warning: item.atpnQesitm,
      interaction: item.intrcQesitm,
      sideEffect: item.seQesitm,
      imageUrl: item.itemImage,
    }))

    return {
      items,
      totalCount: data.body?.totalCount || 0,
    }
  } catch (error) {
    console.error('의약품 검색 API 오류:', error)
    return getDemoDrugData(itemName)
  }
}

/**
 * 의약품 낱알식별 검색
 * @param params 검색 조건 (품목명, 모양, 색상 등)
 */
export async function searchDrugByIdentification(params: {
  itemName?: string
  drugShape?: string
  colorClass1?: string
  printFront?: string
  printBack?: string
  pageNo?: number
  numOfRows?: number
}): Promise<{ items: DrugIdentificationItem[]; totalCount: number }> {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다.')
    return { items: [], totalCount: 0 }
  }

  try {
    const searchParams = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: String(params.pageNo || 1),
      numOfRows: String(params.numOfRows || 10),
      type: 'json',
    })

    if (params.itemName) searchParams.append('item_name', params.itemName)
    if (params.drugShape) searchParams.append('drug_shape', params.drugShape)
    if (params.colorClass1) searchParams.append('color_class1', params.colorClass1)
    if (params.printFront) searchParams.append('print_front', params.printFront)
    if (params.printBack) searchParams.append('print_back', params.printBack)

    const response = await fetch(`${API_ENDPOINTS.DRUG_IDENTIFICATION}?${searchParams}`)
    const data = await response.json()

    if (data.header?.resultCode !== '00') {
      throw new Error(data.header?.resultMsg || 'API 오류')
    }

    return {
      items: data.body?.items || [],
      totalCount: data.body?.totalCount || 0,
    }
  } catch (error) {
    console.error('의약품 낱알식별 API 오류:', error)
    return { items: [], totalCount: 0 }
  }
}

/**
 * DUR 병용금기 정보 조회
 * @param itemName 제품명 또는 성분명
 */
export async function checkDurContraindication(
  itemName: string
): Promise<DurItem[]> {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다.')
    return getDemoDurData(itemName)
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: '1',
      numOfRows: '100',
      itemName: itemName,
      type: 'json',
    })

    const response = await fetch(`${API_ENDPOINTS.DUR_CONTRAINDICATION}?${params}`)
    const data = await response.json()

    if (data.header?.resultCode !== '00') {
      throw new Error(data.header?.resultMsg || 'API 오류')
    }

    return data.body?.items || []
  } catch (error) {
    console.error('DUR 병용금기 API 오류:', error)
    return getDemoDurData(itemName)
  }
}

/**
 * 종합 DUR 체크 (병용금기, 임부금기, 노인주의 등)
 * @param drugNames 검사할 의약품명 목록
 */
export async function checkDurComprehensive(
  drugNames: string[]
): Promise<DurCheckResult> {
  const result: DurCheckResult = {
    hasDurInfo: false,
    totalCount: 0,
    contraindications: [],
    pregnancyWarnings: [],
    elderlyWarnings: [],
    ageRestrictions: [],
    durationWarnings: [],
    dosageWarnings: [],
    duplicateEfficacy: [],
    extendedReleaseWarnings: [],
  }

  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다. 데모 데이터를 반환합니다.')
    return getDemoDurCheckResult(drugNames)
  }

  try {
    // 각 의약품에 대해 DUR 정보 조회
    for (const drugName of drugNames) {
      const durItems = await checkDurContraindication(drugName)

      for (const item of durItems) {
        result.hasDurInfo = true
        result.totalCount++

        // DUR 유형에 따라 분류
        if (item.TYPE_NAME?.includes('병용금기')) {
          result.contraindications.push({
            itemName: item.ITEM_NAME,
            mixtureName: item.MIX_INGR || '',
            reason: `${item.CLASS_NAME || ''} - ${item.TYPE_NAME}`,
            severity: 'critical',
            typeName: item.TYPE_NAME,
          })
        } else if (item.TYPE_NAME?.includes('임부')) {
          result.pregnancyWarnings.push(item)
        } else if (item.TYPE_NAME?.includes('노인')) {
          result.elderlyWarnings.push(item)
        } else if (item.TYPE_NAME?.includes('연령')) {
          result.ageRestrictions.push(item)
        } else if (item.TYPE_NAME?.includes('투여기간')) {
          result.durationWarnings.push(item)
        } else if (item.TYPE_NAME?.includes('용량')) {
          result.dosageWarnings.push(item)
        } else if (item.TYPE_NAME?.includes('효능군')) {
          result.duplicateEfficacy.push(item)
        } else if (item.TYPE_NAME?.includes('서방정') || item.TYPE_NAME?.includes('분할')) {
          result.extendedReleaseWarnings.push(item)
        }
      }
    }

    return result
  } catch (error) {
    console.error('DUR 종합 체크 오류:', error)
    return getDemoDurCheckResult(drugNames)
  }
}

// ========== 데모 데이터 (API 키 없을 때 사용) ==========

function getDemoDrugData(searchTerm: string): { items: DrugSearchResult[]; totalCount: number } {
  const demoData: DrugSearchResult[] = [
    {
      itemSeq: '200003422',
      itemName: '타이레놀정500밀리그램(아세트아미노펜)',
      entpName: '한국존슨앤드존슨판매(유)',
      efficacy: '감기로 인한 발열 및 동통(통증), 두통, 신경통, 근육통, 월경통, 염좌통(삔 통증)',
      usage: '만 12세 이상 소아 및 성인: 1회 1~2정씩, 1일 3~4회 (4~6시간 마다) 필요시 복용',
      warning: '이 약에 과민증 환자, 소화성궤양, 심한 혈액 이상 환자는 복용하지 마세요.',
      interaction: '와파린: 이 약이 와파린의 항응고 효과를 증가시킬 수 있습니다.',
      sideEffect: '쇼크, 아나필락시스양 증상, 피부점막안증후군, 중독성표피괴사용해',
      className: '해열진통소염제',
    },
    {
      itemSeq: '200003423',
      itemName: '아스피린프로텍트정100밀리그램',
      entpName: '바이엘코리아(주)',
      efficacy: '관상동맥질환, 뇌경색 예방을 위한 혈전생성 억제',
      usage: '1일 1회 100mg',
      warning: '출혈성 질환이 있는 환자, 위궤양 환자 주의',
      interaction: '와파린, 헤파린 등 항응고제와 병용 시 출혈 위험 증가',
      sideEffect: '위장장애, 출혈',
      className: '항혈전제',
    },
    {
      itemSeq: '200003424',
      itemName: '쿠마딘정2밀리그램(와파린나트륨)',
      entpName: '한국비엠에스제약(주)',
      efficacy: '혈전색전증의 예방 및 치료',
      usage: '개인별로 조절, INR 모니터링 필요',
      warning: '출혈 위험, 임산부 금기',
      interaction: '다수의 약물/음식과 상호작용. 비타민K 함유 식품 주의.',
      sideEffect: '출혈, 피부괴사',
      className: '항응고제',
    },
    {
      itemSeq: '200003425',
      itemName: '노바스크정5밀리그램(암로디핀베실산염)',
      entpName: '한국화이자제약(주)',
      efficacy: '고혈압, 협심증',
      usage: '1일 1회 5~10mg',
      warning: '임산부, 수유부 주의',
      interaction: '자몽주스와 병용 시 혈중농도 상승',
      sideEffect: '두통, 부종, 피로감',
      className: '칼슘채널차단제',
    },
    {
      itemSeq: '200003426',
      itemName: '글루코파지정500밀리그램(메트포르민염산염)',
      entpName: '한국엠에스디(주)',
      efficacy: '제2형 당뇨병',
      usage: '1일 500~2000mg 분할 투여',
      warning: '신장기능 저하 환자 주의',
      interaction: '요오드화 조영제 사용 전후 중단 필요',
      sideEffect: '소화기 장애, 유산산증(드묾)',
      className: '당뇨병용제',
    },
  ]

  const filtered = demoData.filter(
    (drug) =>
      drug.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drug.entpName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return {
    items: filtered.length > 0 ? filtered : demoData.slice(0, 3),
    totalCount: filtered.length > 0 ? filtered.length : 3,
  }
}

function getDemoDurData(itemName: string): DurItem[] {
  const demoDurData: DurItem[] = [
    {
      ITEM_SEQ: '200003422',
      ITEM_NAME: '타이레놀정500밀리그램',
      ENTP_NAME: '한국존슨앤드존슨',
      CHART: '흰색의 장방형 정제',
      CLASS_NO: '114',
      CLASS_NAME: '해열진통소염제',
      ETC_OTC_NAME: '일반의약품',
      FORM_CODE_NAME: '정제',
      INGR_CODE: 'M040420',
      INGR_NAME: '아세트아미노펜',
      INGR_ENG_NAME: 'Acetaminophen',
      MIX_INGR: '',
      ITEM_PERMIT_DATE: '19830301',
      TYPE_NAME: '병용금기',
    },
    {
      ITEM_SEQ: '200003423',
      ITEM_NAME: '아스피린프로텍트정100mg',
      ENTP_NAME: '바이엘코리아',
      CHART: '흰색의 원형 장용정',
      CLASS_NO: '219',
      CLASS_NAME: '항혈전제',
      ETC_OTC_NAME: '전문의약품',
      FORM_CODE_NAME: '장용정',
      INGR_CODE: 'M040101',
      INGR_NAME: '아스피린',
      INGR_ENG_NAME: 'Aspirin',
      MIX_INGR: '',
      ITEM_PERMIT_DATE: '20000101',
      TYPE_NAME: '병용금기',
    },
  ]

  return demoDurData.filter((item) =>
    item.ITEM_NAME.toLowerCase().includes(itemName.toLowerCase())
  )
}

function getDemoDurCheckResult(drugNames: string[]): DurCheckResult {
  const hasWarfarin = drugNames.some(
    (name) =>
      name.includes('와파린') ||
      name.toLowerCase().includes('warfarin') ||
      name.includes('쿠마딘')
  )

  const hasAspirin = drugNames.some(
    (name) =>
      name.includes('아스피린') || name.toLowerCase().includes('aspirin')
  )

  const contraindications: DurCheckResult['contraindications'] = []

  if (hasWarfarin && hasAspirin) {
    contraindications.push({
      itemName: '와파린',
      mixtureName: '아스피린',
      reason: '출혈 위험 증가 - 항응고제와 항혈소판제 병용',
      severity: 'critical',
      typeName: '병용금기',
    })
  }

  return {
    hasDurInfo: contraindications.length > 0,
    totalCount: contraindications.length,
    contraindications,
    pregnancyWarnings: [],
    elderlyWarnings: [],
    ageRestrictions: [],
    durationWarnings: [],
    dosageWarnings: [],
    duplicateEfficacy: [],
    extendedReleaseWarnings: [],
  }
}

export default {
  searchDrugs,
  searchDrugByIdentification,
  checkDurContraindication,
  checkDurComprehensive,
}
