/**
 * 본초/생약 약재정보 통합 API 서비스
 *
 * 1. 식품의약품안전처 생약 약재정보
 *    - API: https://www.data.go.kr/data/15076330/openapi.do
 *
 * 2. 지식재산처(특허청) 한국전통 약재정보
 *    - API: https://www.data.go.kr/data/15002148/openapi.do
 *
 * 3. 지식재산처(특허청) 한국전통 처방정보
 *    - API: https://www.data.go.kr/data/15057537/openapi.do
 */

import type {
  HerbMedicineItem,
  HerbSearchResult,
  TraditionalHerbItem,
  TraditionalPrescriptionItem,
  IntegratedHerbInfo,
} from '@/types'

// 환경변수에서 API 키 가져오기
const PUBLIC_DATA_API_KEY = import.meta.env.VITE_PUBLIC_DATA_API_KEY || ''

// API 엔드포인트
const API_ENDPOINTS = {
  // 식약처 생약 약재정보
  MFDS_HERB: 'https://apis.data.go.kr/1471057/HerbMdntfService/getMdntfList',
  // 지식재산처 한국전통 약재정보
  KIPO_HERB_SEARCH: 'https://apis.data.go.kr/1430000/MatInfoService/getMatInfoList',
  KIPO_HERB_DETAIL: 'https://apis.data.go.kr/1430000/MatInfoService/getMatInfoDetail',
  // 지식재산처 한국전통 처방정보
  KIPO_PRESC_SEARCH: 'https://apis.data.go.kr/1430000/PreInfoService/getPreInfoList',
  KIPO_PRESC_DETAIL: 'https://apis.data.go.kr/1430000/PreInfoService/getPreInfoDetail',
}

// 기존 MFDS API 엔드포인트 (하위호환)
const API_ENDPOINT = API_ENDPOINTS.MFDS_HERB

/**
 * 생약 약재 검색
 * @param herbName 약재명 (한글, 영문, 라틴명)
 * @param pageNo 페이지 번호
 * @param numOfRows 한 페이지 결과 수
 */
export async function searchHerbMedicine(
  herbName: string,
  pageNo: number = 1,
  numOfRows: number = 20
): Promise<{ items: HerbSearchResult[]; totalCount: number }> {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다. 데모 데이터를 반환합니다.')
    return getDemoHerbData(herbName)
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
      type: 'json',
    })

    // 검색어가 있으면 추가
    if (herbName.trim()) {
      params.append('herb_nm', herbName.trim())
    }

    const response = await fetch(`${API_ENDPOINT}?${params}`)
    const data = await response.json()

    // API 응답 구조 확인
    if (data.header?.resultCode !== '00' && data.response?.header?.resultCode !== '00') {
      const resultCode = data.header?.resultCode || data.response?.header?.resultCode
      const resultMsg = data.header?.resultMsg || data.response?.header?.resultMsg
      console.warn(`API 응답 코드: ${resultCode}, 메시지: ${resultMsg}`)

      // 결과 없음인 경우 빈 배열 반환
      if (resultCode === '03') {
        return { items: [], totalCount: 0 }
      }

      throw new Error(resultMsg || 'API 오류')
    }

    const body = data.body || data.response?.body
    const rawItems = body?.items?.item || body?.items || []

    // 단일 객체인 경우 배열로 변환
    const itemArray = Array.isArray(rawItems) ? rawItems : [rawItems]

    const items: HerbSearchResult[] = itemArray.map((item: HerbMedicineItem) => ({
      herbId: item.HERB_ID || '',
      herbName: item.HERB_NM || '',
      herbNameChinese: item.HERB_NM_CH,
      latinName: item.LATN_HERB_NM || '',
      englishName: item.ENG_HERB_NM || '',
      distributionName: item.DSTB_NM,
      medicinalPart: item.MED_PART || '',
      basisCode: item.MED_BSIS_CD_LIST_NM,
      basisEtc: item.MED_BSIS_ETC,
      classificationNo: item.CLSF_GRP_NO || '',
    }))

    return {
      items,
      totalCount: body?.totalCount || items.length,
    }
  } catch (error) {
    console.error('생약 약재 검색 API 오류:', error)
    return getDemoHerbData(herbName)
  }
}

/**
 * 생약 약재 전체 목록 조회
 * @param pageNo 페이지 번호
 * @param numOfRows 한 페이지 결과 수
 */
export async function getHerbMedicineList(
  pageNo: number = 1,
  numOfRows: number = 50
): Promise<{ items: HerbSearchResult[]; totalCount: number }> {
  return searchHerbMedicine('', pageNo, numOfRows)
}

/**
 * 생약 약재 상세 정보 조회
 * @param herbId 약재번호
 */
export async function getHerbMedicineDetail(
  herbId: string
): Promise<HerbSearchResult | null> {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다.')
    const demoData = getDemoHerbData('')
    return demoData.items.find(item => item.herbId === herbId) || null
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: '1',
      numOfRows: '1',
      herb_id: herbId,
      type: 'json',
    })

    const response = await fetch(`${API_ENDPOINT}?${params}`)
    const data = await response.json()

    const body = data.body || data.response?.body
    const item = body?.items?.item?.[0] || body?.items?.[0]

    if (!item) return null

    return {
      herbId: item.HERB_ID || '',
      herbName: item.HERB_NM || '',
      herbNameChinese: item.HERB_NM_CH,
      latinName: item.LATN_HERB_NM || '',
      englishName: item.ENG_HERB_NM || '',
      distributionName: item.DSTB_NM,
      medicinalPart: item.MED_PART || '',
      basisCode: item.MED_BSIS_CD_LIST_NM,
      basisEtc: item.MED_BSIS_ETC,
      classificationNo: item.CLSF_GRP_NO || '',
    }
  } catch (error) {
    console.error('생약 약재 상세 조회 API 오류:', error)
    return null
  }
}

// ========== 데모 데이터 (API 키 없을 때 사용) ==========

function getDemoHerbData(searchTerm: string): { items: HerbSearchResult[]; totalCount: number } {
  const demoData: HerbSearchResult[] = [
    {
      herbId: '1',
      herbName: '감초',
      herbNameChinese: '甘草',
      latinName: 'Glycyrrhizae Radix et Rhizoma',
      englishName: 'Licorice Root',
      distributionName: '감초',
      medicinalPart: '뿌리 및 뿌리줄기',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '2',
      herbName: '인삼',
      herbNameChinese: '人蔘',
      latinName: 'Ginseng Radix',
      englishName: 'Ginseng Root',
      distributionName: '인삼',
      medicinalPart: '뿌리',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '3',
      herbName: '황기',
      herbNameChinese: '黃芪',
      latinName: 'Astragali Radix',
      englishName: 'Astragalus Root',
      distributionName: '황기',
      medicinalPart: '뿌리',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '4',
      herbName: '당귀',
      herbNameChinese: '當歸',
      latinName: 'Angelicae Gigantis Radix',
      englishName: 'Korean Angelica Root',
      distributionName: '당귀',
      medicinalPart: '뿌리',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '5',
      herbName: '백출',
      herbNameChinese: '白朮',
      latinName: 'Atractylodis Rhizoma Alba',
      englishName: 'White Atractylodes Rhizome',
      distributionName: '백출',
      medicinalPart: '뿌리줄기',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '6',
      herbName: '복령',
      herbNameChinese: '茯苓',
      latinName: 'Poria',
      englishName: 'Poria',
      distributionName: '복령',
      medicinalPart: '균핵',
      basisCode: '대한민국약전',
      classificationNo: '2',
    },
    {
      herbId: '7',
      herbName: '천궁',
      herbNameChinese: '川芎',
      latinName: 'Cnidii Rhizoma',
      englishName: 'Cnidium Rhizome',
      distributionName: '천궁',
      medicinalPart: '뿌리줄기',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '8',
      herbName: '작약',
      herbNameChinese: '芍藥',
      latinName: 'Paeoniae Radix',
      englishName: 'Peony Root',
      distributionName: '백작약, 적작약',
      medicinalPart: '뿌리',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '9',
      herbName: '생강',
      herbNameChinese: '生薑',
      latinName: 'Zingiberis Rhizoma Crudus',
      englishName: 'Fresh Ginger',
      distributionName: '생강',
      medicinalPart: '뿌리줄기',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '10',
      herbName: '대추',
      herbNameChinese: '大棗',
      latinName: 'Zizyphi Fructus',
      englishName: 'Jujube Fruit',
      distributionName: '대추',
      medicinalPart: '열매',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '11',
      herbName: '갈근',
      herbNameChinese: '葛根',
      latinName: 'Puerariae Radix',
      englishName: 'Kudzu Root',
      distributionName: '갈근, 칡뿌리',
      medicinalPart: '뿌리',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '12',
      herbName: '마황',
      herbNameChinese: '麻黃',
      latinName: 'Ephedrae Herba',
      englishName: 'Ephedra Herb',
      distributionName: '마황',
      medicinalPart: '지상부',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '13',
      herbName: '계지',
      herbNameChinese: '桂枝',
      latinName: 'Cinnamomi Ramulus',
      englishName: 'Cinnamon Twig',
      distributionName: '계피나무가지',
      medicinalPart: '어린가지',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '14',
      herbName: '반하',
      herbNameChinese: '半夏',
      latinName: 'Pinelliae Tuber',
      englishName: 'Pinellia Tuber',
      distributionName: '반하',
      medicinalPart: '덩이줄기',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
    {
      herbId: '15',
      herbName: '황련',
      herbNameChinese: '黃連',
      latinName: 'Coptidis Rhizoma',
      englishName: 'Coptis Rhizome',
      distributionName: '황련',
      medicinalPart: '뿌리줄기',
      basisCode: '대한민국약전',
      classificationNo: '1',
    },
  ]

  if (!searchTerm.trim()) {
    return { items: demoData, totalCount: demoData.length }
  }

  const searchLower = searchTerm.toLowerCase()
  const filtered = demoData.filter(
    (herb) =>
      herb.herbName.includes(searchTerm) ||
      herb.herbNameChinese?.includes(searchTerm) ||
      herb.latinName.toLowerCase().includes(searchLower) ||
      herb.englishName.toLowerCase().includes(searchLower) ||
      herb.distributionName?.includes(searchTerm)
  )

  return {
    items: filtered,
    totalCount: filtered.length,
  }
}

// ========== 지식재산처(특허청) 한국전통 약재정보 API ==========

/**
 * 한국전통 약재 검색 (지식재산처)
 * @param keyword 검색어
 * @param pageNo 페이지 번호
 * @param numOfRows 한 페이지 결과 수
 */
export async function searchTraditionalHerb(
  keyword: string,
  pageNo: number = 1,
  numOfRows: number = 20
): Promise<{ items: TraditionalHerbItem[]; totalCount: number }> {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다.')
    return getDemoTraditionalHerbData(keyword)
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
    })

    if (keyword.trim()) {
      params.append('searchWrd', keyword.trim())
    }

    const response = await fetch(`${API_ENDPOINTS.KIPO_HERB_SEARCH}?${params}`)
    const text = await response.text()

    // XML 파싱
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, 'text/xml')

    const resultCode = xmlDoc.querySelector('resultCode')?.textContent
    if (resultCode !== '00') {
      console.warn('API 응답 코드:', resultCode)
      return getDemoTraditionalHerbData(keyword)
    }

    const items: TraditionalHerbItem[] = []
    const itemNodes = xmlDoc.querySelectorAll('item')

    itemNodes.forEach((node) => {
      items.push({
        cntntsNo: node.querySelector('cntntsNo')?.textContent || '',
        hanbangNm: node.querySelector('hanbangNm')?.textContent || '',
        hanbangNmHanja: node.querySelector('hanbangNmHanja')?.textContent ?? undefined,
        hanbangNmLatin: node.querySelector('hanbangNmLatin')?.textContent ?? undefined,
        source: node.querySelector('source')?.textContent ?? undefined,
        medicalPart: node.querySelector('medicalPart')?.textContent ?? undefined,
        efficacy: node.querySelector('efficacy')?.textContent ?? undefined,
        symptoms: node.querySelector('symptoms')?.textContent ?? undefined,
        nature: node.querySelector('nature')?.textContent ?? undefined,
        taste: node.querySelector('taste')?.textContent ?? undefined,
        meridian: node.querySelector('meridian')?.textContent ?? undefined,
        contraindication: node.querySelector('contraindication')?.textContent ?? undefined,
      })
    })

    const totalCount = parseInt(xmlDoc.querySelector('totalCount')?.textContent || '0')

    return { items, totalCount }
  } catch (error) {
    console.error('한국전통 약재 검색 API 오류:', error)
    return getDemoTraditionalHerbData(keyword)
  }
}

/**
 * 한국전통 약재 상세 조회 (지식재산처)
 * @param cntntsNo 관리번호
 */
export async function getTraditionalHerbDetail(
  cntntsNo: string
): Promise<TraditionalHerbItem | null> {
  if (!PUBLIC_DATA_API_KEY) {
    return null
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      cntntsNo: cntntsNo,
    })

    const response = await fetch(`${API_ENDPOINTS.KIPO_HERB_DETAIL}?${params}`)
    const text = await response.text()

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, 'text/xml')

    const item = xmlDoc.querySelector('item')
    if (!item) return null

    return {
      cntntsNo: item.querySelector('cntntsNo')?.textContent || '',
      hanbangNm: item.querySelector('hanbangNm')?.textContent || '',
      hanbangNmHanja: item.querySelector('hanbangNmHanja')?.textContent ?? undefined,
      hanbangNmLatin: item.querySelector('hanbangNmLatin')?.textContent ?? undefined,
      source: item.querySelector('source')?.textContent ?? undefined,
      medicalPart: item.querySelector('medicalPart')?.textContent ?? undefined,
      efficacy: item.querySelector('efficacy')?.textContent ?? undefined,
      symptoms: item.querySelector('symptoms')?.textContent ?? undefined,
      nature: item.querySelector('nature')?.textContent ?? undefined,
      taste: item.querySelector('taste')?.textContent ?? undefined,
      meridian: item.querySelector('meridian')?.textContent ?? undefined,
      contraindication: item.querySelector('contraindication')?.textContent ?? undefined,
      processingMethod: item.querySelector('processingMethod')?.textContent ?? undefined,
      relatedPrescription: item.querySelector('relatedPrescription')?.textContent ?? undefined,
    }
  } catch (error) {
    console.error('한국전통 약재 상세 조회 API 오류:', error)
    return null
  }
}

// ========== 지식재산처(특허청) 한국전통 처방정보 API ==========

/**
 * 한국전통 처방 검색 (지식재산처)
 * @param keyword 검색어
 * @param pageNo 페이지 번호
 * @param numOfRows 한 페이지 결과 수
 */
export async function searchTraditionalPrescription(
  keyword: string,
  pageNo: number = 1,
  numOfRows: number = 20
): Promise<{ items: TraditionalPrescriptionItem[]; totalCount: number }> {
  if (!PUBLIC_DATA_API_KEY) {
    console.warn('공공데이터 API 키가 설정되지 않았습니다.')
    return getDemoTraditionalPrescriptionData(keyword)
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
    })

    if (keyword.trim()) {
      params.append('searchWrd', keyword.trim())
    }

    const response = await fetch(`${API_ENDPOINTS.KIPO_PRESC_SEARCH}?${params}`)
    const text = await response.text()

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, 'text/xml')

    const resultCode = xmlDoc.querySelector('resultCode')?.textContent
    if (resultCode !== '00') {
      console.warn('API 응답 코드:', resultCode)
      return getDemoTraditionalPrescriptionData(keyword)
    }

    const items: TraditionalPrescriptionItem[] = []
    const itemNodes = xmlDoc.querySelectorAll('item')

    itemNodes.forEach((node) => {
      items.push({
        cntntsNo: node.querySelector('cntntsNo')?.textContent || '',
        prescNm: node.querySelector('prescNm')?.textContent || '',
        prescNmHanja: node.querySelector('prescNmHanja')?.textContent ?? undefined,
        source: node.querySelector('source')?.textContent ?? undefined,
        ingredients: node.querySelector('ingredients')?.textContent ?? undefined,
        preparation: node.querySelector('preparation')?.textContent ?? undefined,
        symptoms: node.querySelector('symptoms')?.textContent ?? undefined,
        efficacy: node.querySelector('efficacy')?.textContent ?? undefined,
        contraindication: node.querySelector('contraindication')?.textContent ?? undefined,
      })
    })

    const totalCount = parseInt(xmlDoc.querySelector('totalCount')?.textContent || '0')

    return { items, totalCount }
  } catch (error) {
    console.error('한국전통 처방 검색 API 오류:', error)
    return getDemoTraditionalPrescriptionData(keyword)
  }
}

/**
 * 한국전통 처방 상세 조회 (지식재산처)
 * @param cntntsNo 관리번호
 */
export async function getTraditionalPrescriptionDetail(
  cntntsNo: string
): Promise<TraditionalPrescriptionItem | null> {
  if (!PUBLIC_DATA_API_KEY) {
    return null
  }

  try {
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      cntntsNo: cntntsNo,
    })

    const response = await fetch(`${API_ENDPOINTS.KIPO_PRESC_DETAIL}?${params}`)
    const text = await response.text()

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, 'text/xml')

    const item = xmlDoc.querySelector('item')
    if (!item) return null

    return {
      cntntsNo: item.querySelector('cntntsNo')?.textContent || '',
      prescNm: item.querySelector('prescNm')?.textContent || '',
      prescNmHanja: item.querySelector('prescNmHanja')?.textContent ?? undefined,
      source: item.querySelector('source')?.textContent ?? undefined,
      ingredients: item.querySelector('ingredients')?.textContent ?? undefined,
      preparation: item.querySelector('preparation')?.textContent ?? undefined,
      symptoms: item.querySelector('symptoms')?.textContent ?? undefined,
      efficacy: item.querySelector('efficacy')?.textContent ?? undefined,
      contraindication: item.querySelector('contraindication')?.textContent ?? undefined,
      modification: item.querySelector('modification')?.textContent ?? undefined,
      category: item.querySelector('category')?.textContent ?? undefined,
    }
  } catch (error) {
    console.error('한국전통 처방 상세 조회 API 오류:', error)
    return null
  }
}

// ========== 통합 검색 기능 ==========

/**
 * 통합 본초 검색 (생약 + 전통약재)
 * @param keyword 검색어
 */
export async function searchIntegratedHerb(
  keyword: string
): Promise<{ items: IntegratedHerbInfo[]; totalCount: number }> {
  const [mfdsResult, kipoResult] = await Promise.all([
    searchHerbMedicine(keyword, 1, 20),
    searchTraditionalHerb(keyword, 1, 20),
  ])

  const integratedItems: IntegratedHerbInfo[] = []

  // MFDS 데이터 추가
  mfdsResult.items.forEach((item) => {
    integratedItems.push({
      id: `mfds-${item.herbId}`,
      koreanName: item.herbName,
      chineseName: item.herbNameChinese,
      latinName: item.latinName,
      englishName: item.englishName,
      medicinalPart: item.medicinalPart,
      source: item.basisCode,
      dataSource: 'mfds',
    })
  })

  // KIPO 데이터 추가 (중복 제거)
  kipoResult.items.forEach((item) => {
    const isDuplicate = integratedItems.some(
      (existing) =>
        existing.koreanName === item.hanbangNm ||
        existing.chineseName === item.hanbangNmHanja
    )

    if (!isDuplicate) {
      integratedItems.push({
        id: `kipo-${item.cntntsNo}`,
        koreanName: item.hanbangNm,
        chineseName: item.hanbangNmHanja,
        latinName: item.hanbangNmLatin,
        medicinalPart: item.medicalPart,
        nature: item.nature,
        taste: item.taste,
        meridian: item.meridian,
        efficacy: item.efficacy,
        symptoms: item.symptoms,
        contraindication: item.contraindication,
        source: item.source,
        dataSource: 'kipo',
      })
    } else {
      // 중복인 경우 KIPO 데이터로 보강
      const existing = integratedItems.find(
        (e) => e.koreanName === item.hanbangNm || e.chineseName === item.hanbangNmHanja
      )
      if (existing) {
        existing.nature = item.nature
        existing.taste = item.taste
        existing.meridian = item.meridian
        existing.efficacy = item.efficacy || existing.efficacy
        existing.symptoms = item.symptoms
        existing.contraindication = item.contraindication
        existing.dataSource = 'both'
      }
    }
  })

  return {
    items: integratedItems,
    totalCount: integratedItems.length,
  }
}

// ========== 데모 데이터 (한국전통 약재) ==========

function getDemoTraditionalHerbData(keyword: string): { items: TraditionalHerbItem[]; totalCount: number } {
  const demoData: TraditionalHerbItem[] = [
    {
      cntntsNo: 'T001',
      hanbangNm: '감초',
      hanbangNmHanja: '甘草',
      hanbangNmLatin: 'Glycyrrhizae Radix',
      source: '신농본초경',
      medicalPart: '뿌리',
      efficacy: '보비익기, 청열해독, 거담지해, 완급지통, 조화제약',
      symptoms: '비위허약, 권태핍력, 심계기단, 기침가래, 인후종통',
      nature: '평(平)',
      taste: '감(甘)',
      meridian: '심, 폐, 비, 위',
      contraindication: '습성창만, 구역',
    },
    {
      cntntsNo: 'T002',
      hanbangNm: '인삼',
      hanbangNmHanja: '人蔘',
      hanbangNmLatin: 'Ginseng Radix',
      source: '신농본초경',
      medicalPart: '뿌리',
      efficacy: '대보원기, 복맥고탈, 보비익폐, 생진지갈, 안신익지',
      symptoms: '기허휴克, 맥미욕절, 폐허천해, 소갈, 불면',
      nature: '온(溫)',
      taste: '감(甘), 미고(微苦)',
      meridian: '비, 폐, 심',
      contraindication: '실증, 열증',
    },
    {
      cntntsNo: 'T003',
      hanbangNm: '황기',
      hanbangNmHanja: '黃芪',
      hanbangNmLatin: 'Astragali Radix',
      source: '신농본초경',
      medicalPart: '뿌리',
      efficacy: '보기승양, 고표지한, 이수소종, 탁창생기',
      symptoms: '기허휴수, 자한, 부종, 창양불렴',
      nature: '온(溫)',
      taste: '감(甘)',
      meridian: '비, 폐',
      contraindication: '표실사성, 기체습조, 식적, 음허양항',
    },
    {
      cntntsNo: 'T004',
      hanbangNm: '당귀',
      hanbangNmHanja: '當歸',
      hanbangNmLatin: 'Angelicae Gigantis Radix',
      source: '신농본초경',
      medicalPart: '뿌리',
      efficacy: '보혈활혈, 조경지통, 윤장통변',
      symptoms: '혈허위황, 현훈심계, 월경부조, 경폐통경, 허한복통',
      nature: '온(溫)',
      taste: '감(甘), 신(辛)',
      meridian: '간, 심, 비',
      contraindication: '습성설사, 비허식소',
    },
    {
      cntntsNo: 'T005',
      hanbangNm: '백출',
      hanbangNmHanja: '白朮',
      hanbangNmLatin: 'Atractylodis Rhizoma Alba',
      source: '신농본초경',
      medicalPart: '뿌리줄기',
      efficacy: '건비익기, 조습이수, 지한, 안태',
      symptoms: '비허식소, 복창설사, 담음, 수종, 자한, 태동불안',
      nature: '온(溫)',
      taste: '고(苦), 감(甘)',
      meridian: '비, 위',
      contraindication: '음허내열, 진액휴손',
    },
  ]

  if (!keyword.trim()) {
    return { items: demoData, totalCount: demoData.length }
  }

  const filtered = demoData.filter(
    (item) =>
      item.hanbangNm.includes(keyword) ||
      item.hanbangNmHanja?.includes(keyword) ||
      item.efficacy?.includes(keyword) ||
      item.symptoms?.includes(keyword)
  )

  return { items: filtered, totalCount: filtered.length }
}

// ========== 데모 데이터 (한국전통 처방) ==========

function getDemoTraditionalPrescriptionData(keyword: string): { items: TraditionalPrescriptionItem[]; totalCount: number } {
  const demoData: TraditionalPrescriptionItem[] = [
    {
      cntntsNo: 'P001',
      prescNm: '사군자탕',
      prescNmHanja: '四君子湯',
      source: '태평혜민화제국방',
      ingredients: '인삼, 백출, 복령, 자감초',
      preparation: '물로 달여 복용',
      symptoms: '비위기허, 면색위황, 어음저미, 사지무력',
      efficacy: '익기건비',
      category: '보익제',
    },
    {
      cntntsNo: 'P002',
      prescNm: '사물탕',
      prescNmHanja: '四物湯',
      source: '태평혜민화제국방',
      ingredients: '숙지황, 당귀, 백작약, 천궁',
      preparation: '물로 달여 복용',
      symptoms: '혈허증, 두훈목현, 면색무화, 심계실면',
      efficacy: '보혈조혈',
      category: '보익제',
    },
    {
      cntntsNo: 'P003',
      prescNm: '육군자탕',
      prescNmHanja: '六君子湯',
      source: '의학정전',
      ingredients: '인삼, 백출, 복령, 자감초, 진피, 반하',
      preparation: '생강, 대추를 넣어 물로 달여 복용',
      symptoms: '비위기허담정, 식소변당, 흉협비민, 구역',
      efficacy: '익기건비, 조습화담',
      category: '보익제',
    },
    {
      cntntsNo: 'P004',
      prescNm: '보중익기탕',
      prescNmHanja: '補中益氣湯',
      source: '비위론',
      ingredients: '황기, 인삼, 백출, 자감초, 당귀, 진피, 승마, 시호',
      preparation: '물로 달여 복용',
      symptoms: '비위기허, 중기하함, 식소권태, 설사구갈',
      efficacy: '보중익기, 승양거함',
      category: '보익제',
    },
    {
      cntntsNo: 'P005',
      prescNm: '팔물탕',
      prescNmHanja: '八物湯',
      source: '정체류요',
      ingredients: '인삼, 백출, 복령, 자감초, 숙지황, 당귀, 백작약, 천궁',
      preparation: '생강, 대추를 넣어 물로 달여 복용',
      symptoms: '기혈양허, 면색창백, 두훈심계, 권태무력',
      efficacy: '익기보혈',
      category: '보익제',
    },
  ]

  if (!keyword.trim()) {
    return { items: demoData, totalCount: demoData.length }
  }

  const filtered = demoData.filter(
    (item) =>
      item.prescNm.includes(keyword) ||
      item.prescNmHanja?.includes(keyword) ||
      item.ingredients?.includes(keyword) ||
      item.symptoms?.includes(keyword)
  )

  return { items: filtered, totalCount: filtered.length }
}

export default {
  // 식약처 생약 API
  searchHerbMedicine,
  getHerbMedicineList,
  getHerbMedicineDetail,
  // 지식재산처 약재 API
  searchTraditionalHerb,
  getTraditionalHerbDetail,
  // 지식재산처 처방 API
  searchTraditionalPrescription,
  getTraditionalPrescriptionDetail,
  // 통합 검색
  searchIntegratedHerb,
}
