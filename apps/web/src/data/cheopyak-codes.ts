/**
 * 첩약 건강보험 시범사업 — 처방 ↔ 시범사업 코드 매핑.
 *
 * 사업 개요 (2단계 시범사업, 2024-04 ~ 2026-12):
 *   - 대상 질환은 **6개뿐**이다:
 *     월경통 · 안면신경마비 · 뇌혈관질환 후유증 · 알레르기비염 ·
 *     기능성소화불량 · 요추추간판탈출증
 *     (1단계 3개에서 2단계에 3개 추가. 보건복지부 보도자료 기준)
 *   - 환자 1인당 연간 2개 질환, 각 20일분까지.
 *   - 본인부담률: 한의원 30% / 한방병원 40% / 종합병원 50%.
 *
 * 주의 — 이 파일은 한때 16개 질환을 대상으로 표기하고 있었다.
 * 슬관절증·불면증·두통처럼 시범사업 대상이 아닌 질환까지 "첩약 보험 대상"으로
 * 띄우면 한의사가 그대로 청구했다가 삭감된다. 대상은 isPilotCovered 로 구분하고,
 * 비대상 질환은 화면에서 청구 후보로 제안하지 않는다.
 *
 * pilotCode 는 아직 심평원 고시값이 아니라 내부 가칭이다(CP01…).
 * 실제 청구 코드로 쓰면 안 되며, 화면에서도 그렇게 안내해야 한다.
 *
 * 정책:
 *   - 진단/변증 결과가 대상 질환과 일치할 때만 후보로 노출.
 *   - 한의사가 최종 코드 채택 — 본 매핑은 후보 제안 보조용.
 */

export interface CheopyakDisease {
  /**
   * 2단계 시범사업 실제 대상인지. false 면 청구 후보로 제안하지 않는다.
   * (임상 참고용으로 데이터는 남기되 보험 대상처럼 보이면 안 된다)
   */
  isPilotCovered?: boolean
  /** 내부 가칭 코드 — 심평원 고시값 아님. 그대로 청구하면 안 된다. */
  pilotCode: string
  /** KCD 코드 후보들 */
  kcdCodes: string[]
  /** 표시용 질환명 */
  name: string
  /** 검색용 키워드 (한글/한자 둘 다 포함) */
  keywords: string[]
  /** 시범사업이 인정하는 대표 처방들 */
  typicalFormulas: string[]
  /** 일반적 첩수 */
  defaultCheopCount: number
  /** 본인부담률 안내용 (%) */
  patientCopayPercent: number
}

export const CHEOPYAK_DISEASES: CheopyakDisease[] = [
  {
    isPilotCovered: true,
    pilotCode: 'CP01',
    kcdCodes: ['M51.2', 'M54.5'],
    name: '요추추간판탈출증·요통',
    keywords: ['요추', '디스크', '허리', '요통', '腰痛', '요추추간판탈출증'],
    typicalFormulas: ['오적산', '독활기생탕', '대강활탕', '소경활혈탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: true,
    pilotCode: 'CP02',
    kcdCodes: ['J30.1', 'J30.2', 'J30.3', 'J30.4'],
    name: '알레르기비염',
    keywords: ['비염', '알레르기', '코막힘', '재채기', '鼻炎'],
    typicalFormulas: ['소청룡탕', '갈근탕가천궁신이', '형개연교탕', '보중익기탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: true,
    pilotCode: 'CP03',
    kcdCodes: ['K30'],
    name: '기능성소화불량',
    keywords: ['소화불량', '속쓰림', '명치', '消化不良'],
    typicalFormulas: ['반하사심탕', '평위산', '향사평위산', '육군자탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: true,
    pilotCode: 'CP04',
    kcdCodes: ['N94.4', 'N94.5', 'N94.6'],
    name: '월경통(원발성/속발성)',
    keywords: ['월경통', '생리통', '生理痛', '월경곤란'],
    typicalFormulas: ['온경탕', '계지복령환', '도핵승기탕', '소요산'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: true,
    pilotCode: 'CP05',
    kcdCodes: ['G51.0'],
    name: '안면신경마비(구안와사)',
    keywords: ['구안와사', '안면마비', '벨마비', '面癱'],
    typicalFormulas: ['견정산', '서각승마탕', '소속명탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: true,
    pilotCode: 'CP06',
    kcdCodes: ['I63', 'I64', 'I69'],
    name: '뇌혈관질환후유증',
    keywords: ['중풍', '뇌졸중', '편마비', '中風', '腦卒中'],
    typicalFormulas: ['보양환오탕', '소속명탕', '청혈단'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP07',
    kcdCodes: ['M17'],
    name: '슬골관절증',
    keywords: ['무릎관절', '슬관절', '퇴행성', '膝關節'],
    typicalFormulas: ['독활기생탕', '대방풍탕', '계지작약지모탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP08',
    kcdCodes: ['M75', 'M75.0'],
    name: '견관절(어깨) 질환',
    keywords: ['오십견', '어깨', '견비통', '肩'],
    typicalFormulas: ['서경탕', '계지가갈근탕', '오약순기산'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP09',
    kcdCodes: ['F51.0', 'G47.0'],
    name: '불면증',
    keywords: ['불면', '잠', '수면장애', '失眠'],
    typicalFormulas: ['귀비탕', '천왕보심단', '산조인탕', '온담탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP10',
    kcdCodes: ['F45.0', 'F48.0'],
    name: '기능성신체증후군(화병/스트레스)',
    keywords: ['화병', '스트레스', '울증', '火病'],
    typicalFormulas: ['소요산', '시호가용골모려탕', '분심기음', '귀비탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP11',
    kcdCodes: ['M79.7'],
    name: '근막동통증후군',
    keywords: ['근막', '결림', '뭉침', '근육통'],
    typicalFormulas: ['갈근탕', '오적산', '서경탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP12',
    kcdCodes: ['G43', 'G44'],
    name: '두통(편두통/긴장성)',
    keywords: ['두통', '편두통', '頭痛'],
    typicalFormulas: ['반하백출천마탕', '천궁다조산', '청상견통탕', '오수유탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP13',
    kcdCodes: ['I10', 'I11', 'I12'],
    name: '본태성고혈압(동반증상)',
    keywords: ['고혈압', '高血壓'],
    typicalFormulas: ['천마구등음', '시호가용골모려탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP14',
    kcdCodes: ['L20', 'L23', 'L29'],
    name: '아토피성피부염·만성피부질환',
    keywords: ['아토피', '피부염', '소양증', '濕疹'],
    typicalFormulas: ['소풍산', '청기산', '온청음'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP15',
    kcdCodes: ['R53'],
    name: '만성피로증후군',
    keywords: ['만성피로', '피곤', '권태', '慢性疲勞'],
    typicalFormulas: ['보중익기탕', '십전대보탕', '귀비탕', '인삼양영탕'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
  {
    isPilotCovered: false,
    pilotCode: 'CP16',
    kcdCodes: ['N40'],
    name: '전립선비대증',
    keywords: ['전립선', '前立腺', '소변불리'],
    typicalFormulas: ['육미지황탕', '팔미지황탕', '오령산'],
    defaultCheopCount: 20,
    patientCopayPercent: 30,
  },
]

/** 진단/처방 후보 → 첩약 시범사업 추천 코드 */
export function suggestCheopyakCodes(input: {
  diagnosisName?: string
  kcdCodes?: string[]
  formulaNames?: string[]
}): CheopyakDisease[] {
  const matches = new Set<CheopyakDisease>()
  const dx = (input.diagnosisName || '').trim()
  const codes = input.kcdCodes || []
  const formulas = input.formulaNames || []

  for (const disease of CHEOPYAK_DISEASES) {
    const byKcd = codes.some((c) =>
      disease.kcdCodes.some((dc) => c === dc || c.startsWith(dc)),
    )
    const byKeyword =
      dx && disease.keywords.some((kw) => dx.includes(kw))
    const byFormula = formulas.some((f) => disease.typicalFormulas.includes(f))
    if (byKcd || byKeyword || byFormula) {
      matches.add(disease)
    }
  }
  // 시범사업 대상이 아닌 질환은 청구 후보로 내보내지 않는다.
  // 슬관절증·불면증·두통 등은 첩약 건강보험 대상이 아닌데 후보로 띄우면
  // 한의사가 그대로 청구했다가 삭감된다.
  return Array.from(matches).filter((d) => d.isPilotCovered !== false)
}

/**
 * 시범사업 안내 문구 — UI 표기용.
 * 내부 가칭 코드(CP01…)는 노출하지 않는다. 심평원 고시값이 아니라서
 * 화면에 코드처럼 보이면 그대로 청구에 옮겨 적게 된다.
 */
export function describeCheopyak(d: CheopyakDisease): string {
  return `${d.name} · ${d.defaultCheopCount}첩 · 본인부담 약 ${d.patientCopayPercent}%`
}

/** 첩약 시범사업 자체에 대한 고지 — 화면 하단에 함께 노출한다. */
export const CHEOPYAK_NOTICE =
  '첩약 건강보험 2단계 시범사업(2024-04~2026-12) 대상 6개 질환에 한합니다. ' +
  '환자 1인당 연간 2개 질환·각 20일분까지이며, 실제 청구 코드와 산정 기준은 ' +
  '심평원 고시로 확인해 주세요.'
