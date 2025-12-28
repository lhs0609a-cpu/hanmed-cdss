import { ByeongYakTable } from '@/types'

// 변비 병약도표 (이미지 기반)
export const CONSTIPATION_BYEONGYAK_TABLE: ByeongYakTable = {
  id: 'constipation-byeongyak',
  disease: '변비',
  hanja: '便秘',
  description: '병인 → 생리유형 병약도표: 체질과 건실도에 따른 처방 선택 가이드',
  rows: [
    // 장역복함형 (腸易腹函型)
    {
      pathogen: 'intestinal_stagnation',
      cells: {
        heat_high: [{ formula: '윤자탕', note: '潤子湯' }],
        solid_high: [{ formula: '당귀윤조탕', note: '當歸潤燥湯' }],
        medium: [{ formula: '자운탕', note: '紫雲湯', isRecommended: true }],
        solid_low: [{ formula: '제선산', note: '濟仙散' }],
        heat_low: [{ formula: '달사이상환', note: '撻邪理傷丸' }],
      },
    },
    // 정신이란형 (精神離亂型)
    {
      pathogen: 'mental_disorder',
      cells: {
        heat_high: [{ formula: '소요산', note: '逍遙散' }],
        solid_high: [{ formula: '당귀건중탕', note: '當歸建中湯' }],
        medium: [{ formula: '귀비탕', note: '歸脾湯', isRecommended: true }],
        heat_low: [{ formula: '대건중탕', note: '大建中湯' }],
      },
    },
    // 열실/상열형 (熱實/上熱型)
    {
      pathogen: 'heat_excess',
      cells: {
        heat_high: [{ formula: '방풍통성산', note: '防風通聖散' }],
        solid_high: [{ formula: '대승기탕', note: '大承氣湯' }],
        medium: [{ formula: '소승기탕', note: '小承氣湯' }],
        solid_low: [{ formula: '제지기약이탕', note: '制支氣藥餌湯' }],
        heat_low: [{ formula: '삼출건비탕', note: '蔘朮健脾湯*' }],
      },
    },
    // 소화관이완형 (消化管弛緩型)
    {
      pathogen: 'digestive_relaxation',
      cells: {
        solid_high: [{ formula: '삼심칠약산', note: '蔘心七藥散' }],
        medium: [{ formula: '조중어기탕', note: '調中御氣湯' }],
        heat_low: [{ formula: '귀비탕', note: '歸脾湯' }],
      },
    },
    // 정신간장형 (精神肝臟型)
    {
      pathogen: 'mental_tension',
      cells: {
        heat_high: [{ formula: '단치소요산', note: '丹梔逍遙散' }],
        solid_high: [{ formula: '가미귀비탕', note: '加味歸脾湯' }],
        medium: [{ formula: '귀비탕', note: '歸脾湯', isRecommended: true }],
      },
    },
    // 골반혈소형 (骨盤血瘀型)
    {
      pathogen: 'pelvic_blood_stasis',
      cells: {
        heat_high: [{ formula: '통경탕', note: '通經湯' }],
        solid_high: [{ formula: '지황대명전', note: '地黃大明煎' }],
        medium: [{ formula: '귀비탕', note: '歸脾湯' }],
        heat_low: [{ formula: '귀리사물환', note: '歸理四物丸' }],
      },
    },
    // 노인 (老人)
    {
      pathogen: 'elderly',
      cells: {
        solid_high: [{ formula: '소풍순기원', note: '疏風順氣元' }],
        medium: [{ formula: '윤혈음', note: '潤血飮', isRecommended: true }],
        solid_low: [{ formula: '생육고', note: '生肉膏' }],
        heat_low: [{ formula: '잡이지황원', note: '雜耳地黃元' }],
      },
    },
    // 소아 (小兒)
    {
      pathogen: 'child',
      cells: {
        solid_high: [{ formula: '대황감초탕', note: '大黃甘草湯' }],
        medium: [{ formula: '자운탕', note: '紫雲湯', isRecommended: true }],
        heat_low: [{ formula: '귀기건중탕', note: '歸氣建中湯' }],
      },
    },
    // 임신부 (妊娠婦)
    {
      pathogen: 'pregnant',
      cells: {
        solid_high: [{ formula: '사상탕', note: '四物湯' }],
        medium: [{ formula: '궁귀탕', note: '芎歸湯', isRecommended: true }],
        heat_low: [{ formula: '지소산', note: '止嗽散' }],
      },
    },
  ],
  footnotes: ['* 소양처방'],
}

// 모든 병약도표 데이터
export const BYEONGYAK_TABLES: ByeongYakTable[] = [CONSTIPATION_BYEONGYAK_TABLE]

// 질환명으로 병약도표 검색
export function getByeongYakTableByDisease(disease: string): ByeongYakTable | undefined {
  return BYEONGYAK_TABLES.find(
    (table) => table.disease === disease || table.id.includes(disease.toLowerCase())
  )
}

// ID로 병약도표 검색
export function getByeongYakTableById(id: string): ByeongYakTable | undefined {
  return BYEONGYAK_TABLES.find((table) => table.id === id)
}
