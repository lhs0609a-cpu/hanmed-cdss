import { ByeongYangEntry } from '@/types'

// 병양도표 샘플 데이터
export const BYEONGYANG_DATA: ByeongYangEntry[] = [
  // ========== 두통 ==========
  {
    id: 'headache',
    disease: '두통',
    hanja: '頭痛',
    category: 'miscellaneous',
    description: '머리의 통증을 주소로 하는 병증. 외감과 내상으로 크게 나뉨.',
    patterns: [
      {
        id: 'headache-wind-cold',
        patternName: '풍한두통',
        hanja: '風寒頭痛',
        symptoms: [
          { name: '두통', isKey: true, specifics: '후두부 또는 전두부 통증' },
          { name: '오한', isKey: true },
          { name: '발열', isKey: false, specifics: '경미함' },
          { name: '무한', isKey: true, specifics: '땀이 나지 않음' },
          { name: '항강', isKey: false, specifics: '목덜미 뻣뻣함' },
          { name: '비색', isKey: false, specifics: '코막힘' },
        ],
        tongue: { body: '담홍', coating: '박백태', description: '설담홍 태박백' },
        pulse: { type: '부긴맥', description: '浮緊脈, 표한증의 맥상' },
        treatment: {
          principle: '소풍산한(疏風散寒)',
          formulaIds: ['chungung-dato-san', 'gyeji-tang'],
          formulaNames: ['천궁다조산', '계지탕'],
          acupoints: ['풍지', '합곡', '열결', '태양'],
          notes: '초기에 발한해표법 시행',
        },
        differentialPoints: [
          '오한이 두드러지고 땀이 없음',
          '맥이 부긴(浮緊)',
          '두통이 풍열두통에 비해 덜 심함',
        ],
      },
      {
        id: 'headache-wind-heat',
        patternName: '풍열두통',
        hanja: '風熱頭痛',
        symptoms: [
          { name: '두통', isKey: true, specifics: '창통(脹痛), 터질듯한 통증' },
          { name: '발열', isKey: true },
          { name: '오풍', isKey: false, specifics: '바람을 싫어함' },
          { name: '면홍', isKey: false, specifics: '얼굴이 붉음' },
          { name: '인통', isKey: false, specifics: '목이 아픔' },
          { name: '구갈', isKey: false, specifics: '입이 마름' },
        ],
        tongue: { body: '홍', coating: '박황태', description: '설홍 태박황' },
        pulse: { type: '부삭맥', description: '浮數脈, 표열증의 맥상' },
        treatment: {
          principle: '소풍청열(疏風淸熱)',
          formulaIds: ['sanguk-eum'],
          formulaNames: ['상국음'],
          acupoints: ['풍지', '곡지', '합곡', '외관'],
          notes: '열이 높으면 청열약 가미',
        },
        differentialPoints: [
          '열감이 두드러짐',
          '두통이 창통(脹痛) 양상',
          '맥이 부삭(浮數)',
        ],
      },
      {
        id: 'headache-liver-yang',
        patternName: '간양두통',
        hanja: '肝陽頭痛',
        symptoms: [
          { name: '두통', isKey: true, specifics: '양측 측두부, 창통' },
          { name: '현훈', isKey: true, specifics: '어지러움' },
          { name: '이명', isKey: false },
          { name: '심번', isKey: false, specifics: '답답함, 짜증' },
          { name: '면홍', isKey: false },
          { name: '구고', isKey: false, specifics: '입이 씀' },
        ],
        tongue: { body: '홍', coating: '황태', description: '설홍 태황, 설변홍' },
        pulse: { type: '현맥', description: '弦脈, 간병의 맥상' },
        treatment: {
          principle: '평간잠양(平肝潛陽)',
          formulaIds: ['chunma-gudeung-eum'],
          formulaNames: ['천마구등음'],
          acupoints: ['풍지', '태충', '태계', '백회'],
          notes: '고혈압 동반 시 혈압 관리 병행',
        },
        differentialPoints: [
          '스트레스, 화병과 관련',
          '측두부 두통이 특징',
          '현훈, 이명 동반',
          '맥이 현(弦)',
        ],
      },
      {
        id: 'headache-blood-stasis',
        patternName: '어혈두통',
        hanja: '瘀血頭痛',
        symptoms: [
          { name: '두통', isKey: true, specifics: '자통(刺痛), 고정된 위치' },
          { name: '야간악화', isKey: true, specifics: '밤에 심해짐' },
          { name: '두부외상력', isKey: false, specifics: '과거 머리 다친 적 있음' },
        ],
        tongue: { body: '암자', coating: '박태', description: '설암자, 어반어점' },
        pulse: { type: '세삽맥', description: '細澀脈, 어혈의 맥상' },
        treatment: {
          principle: '활혈화어(活血化瘀)',
          formulaIds: ['tongkyu-hwalhyeol-tang'],
          formulaNames: ['통규활혈탕'],
          acupoints: ['합곡', '혈해', '삼음교', '태양'],
          notes: '만성 두통, 외상 후 두통에 적용',
        },
        differentialPoints: [
          '두통이 고정된 한 곳에서 발생',
          '찌르는 듯한 통증(자통)',
          '밤에 악화',
          '설질 암자색, 어반',
        ],
      },
      {
        id: 'headache-phlegm',
        patternName: '담탁두통',
        hanja: '痰濁頭痛',
        symptoms: [
          { name: '두통', isKey: true, specifics: '무거운 느낌, 몽롱함' },
          { name: '흉민', isKey: false, specifics: '가슴 답답함' },
          { name: '오심', isKey: false },
          { name: '식욕부진', isKey: false },
          { name: '다담', isKey: false, specifics: '가래가 많음' },
        ],
        tongue: { body: '담', coating: '백니태', description: '설담 태백니' },
        pulse: { type: '활맥', description: '滑脈, 담의 맥상' },
        treatment: {
          principle: '화담강역(化痰降逆)',
          formulaIds: ['banha-baekchul-chunma-tang'],
          formulaNames: ['반하백출천마탕'],
          acupoints: ['풍륭', '중완', '내관', '태양'],
          notes: '비만, 과식 습관이 있는 환자에 적합',
        },
        differentialPoints: [
          '두통이 무겁고 몽롱함',
          '담이 많음',
          '비만 체형',
          '맥이 활(滑)',
        ],
      },
      {
        id: 'headache-qi-deficiency',
        patternName: '기허두통',
        hanja: '氣虛頭痛',
        symptoms: [
          { name: '두통', isKey: true, specifics: '은은한 통증, 피로 시 악화' },
          { name: '권태', isKey: true },
          { name: '기단', isKey: false, specifics: '숨이 참' },
          { name: '자한', isKey: false, specifics: '저절로 땀남' },
          { name: '식후악화', isKey: false },
        ],
        tongue: { body: '담백', coating: '박백태', description: '설담백 태박백' },
        pulse: { type: '허맥', description: '虛脈, 기허의 맥상' },
        treatment: {
          principle: '보기승청(補氣升淸)',
          formulaIds: ['bojung-ikgi-tang'],
          formulaNames: ['보중익기탕'],
          acupoints: ['백회', '족삼리', '기해', '관원'],
          notes: '과로, 만성 피로 환자에 적합',
        },
        differentialPoints: [
          '피로 시 두통 악화',
          '전반적인 무력감',
          '식후에 더 심해짐',
          '맥이 허약',
        ],
      },
    ],
  },

  // ========== 기침 ==========
  {
    id: 'cough',
    disease: '기침',
    hanja: '咳嗽',
    category: 'external',
    description: '폐기상역으로 인한 해수. 외감과 내상으로 구분.',
    patterns: [
      {
        id: 'cough-wind-cold',
        patternName: '풍한해수',
        hanja: '風寒咳嗽',
        symptoms: [
          { name: '해수', isKey: true, specifics: '가래가 희고 묽음' },
          { name: '오한', isKey: true },
          { name: '비색', isKey: false },
          { name: '청체', isKey: false, specifics: '맑은 콧물' },
          { name: '두통', isKey: false },
        ],
        tongue: { body: '담홍', coating: '박백태' },
        pulse: { type: '부긴맥' },
        treatment: {
          principle: '소풍산한 선폐지해(疏風散寒 宣肺止咳)',
          formulaIds: ['samso-eum', 'sochungryong-tang'],
          formulaNames: ['삼소음', '소청룡탕'],
          notes: '초기 감기 기침에 적합',
        },
        differentialPoints: [
          '가래가 희고 묽음',
          '오한 동반',
          '맑은 콧물',
        ],
      },
      {
        id: 'cough-wind-heat',
        patternName: '풍열해수',
        hanja: '風熱咳嗽',
        symptoms: [
          { name: '해수', isKey: true, specifics: '가래가 노랗고 끈적함' },
          { name: '인통', isKey: true, specifics: '목이 아프고 붉음' },
          { name: '발열', isKey: false },
          { name: '구갈', isKey: false },
        ],
        tongue: { body: '홍', coating: '박황태' },
        pulse: { type: '부삭맥' },
        treatment: {
          principle: '소풍청열 선폐지해(疏風淸熱 宣肺止咳)',
          formulaIds: ['sanguk-eum'],
          formulaNames: ['상국음'],
          notes: '인후통 동반 시 우선 고려',
        },
        differentialPoints: [
          '가래가 노랗고 끈적임',
          '인후 발적, 동통',
          '열감',
        ],
      },
      {
        id: 'cough-phlegm-damp',
        patternName: '담습해수',
        hanja: '痰濕咳嗽',
        symptoms: [
          { name: '해수', isKey: true, specifics: '가래가 많고 흰색' },
          { name: '흉민', isKey: false },
          { name: '식욕부진', isKey: false },
          { name: '신체비만', isKey: false },
        ],
        tongue: { body: '담', coating: '백니태' },
        pulse: { type: '활맥' },
        treatment: {
          principle: '조습화담 지해(燥濕化痰 止咳)',
          formulaIds: ['iin-tang', 'yukgunja-tang'],
          formulaNames: ['이인탕', '육군자탕'],
          notes: '비만 체형, 과식 습관 환자에 적합',
        },
        differentialPoints: [
          '가래가 많고 흰색',
          '비위 증상 동반',
          '비만 체형',
        ],
      },
      {
        id: 'cough-yin-deficiency',
        patternName: '음허해수',
        hanja: '陰虛咳嗽',
        symptoms: [
          { name: '건해', isKey: true, specifics: '마른 기침, 가래 적음' },
          { name: '인건', isKey: true, specifics: '목이 마름' },
          { name: '조열', isKey: false, specifics: '오후에 미열' },
          { name: '도한', isKey: false, specifics: '식은땀' },
          { name: '오심번열', isKey: false },
        ],
        tongue: { body: '홍', coating: '소태', description: '설홍 소태' },
        pulse: { type: '세삭맥' },
        treatment: {
          principle: '자음윤폐 지해(滋陰潤肺 止咳)',
          formulaIds: ['makmundong-tang', 'baekhap-gojeum-tang'],
          formulaNames: ['맥문동탕', '백합고금탕'],
          notes: '만성 기침, 마른 기침에 적합',
        },
        differentialPoints: [
          '마른 기침',
          '입과 목이 마름',
          '설태가 적거나 없음',
        ],
      },
    ],
  },

  // ========== 불면 ==========
  {
    id: 'insomnia',
    disease: '불면',
    hanja: '不眠',
    category: 'internal',
    description: '잠들기 어렵거나 수면을 유지하기 어려운 증상.',
    patterns: [
      {
        id: 'insomnia-heart-spleen',
        patternName: '심비양허',
        hanja: '心脾兩虛',
        symptoms: [
          { name: '불면', isKey: true, specifics: '잠들기 어려움' },
          { name: '다몽', isKey: true, specifics: '꿈이 많음' },
          { name: '심계', isKey: false },
          { name: '건망', isKey: false },
          { name: '식욕부진', isKey: false },
          { name: '권태', isKey: false },
        ],
        tongue: { body: '담백', coating: '박백태' },
        pulse: { type: '세약맥' },
        treatment: {
          principle: '보익심비 양혈안신(補益心脾 養血安神)',
          formulaIds: ['gwibi-tang'],
          formulaNames: ['귀비탕'],
          notes: '과도한 사고, 스트레스 환자에 적합',
        },
        differentialPoints: [
          '사고과다로 인한 심비 손상',
          '피로와 함께 나타남',
          '식욕부진 동반',
        ],
      },
      {
        id: 'insomnia-yin-deficiency',
        patternName: '심신불교',
        hanja: '心腎不交',
        symptoms: [
          { name: '불면', isKey: true, specifics: '잠이 얕고 자주 깸' },
          { name: '오심번열', isKey: true },
          { name: '요슬산연', isKey: false, specifics: '허리 무릎이 시큼' },
          { name: '이명', isKey: false },
          { name: '도한', isKey: false },
        ],
        tongue: { body: '홍', coating: '소태' },
        pulse: { type: '세삭맥' },
        treatment: {
          principle: '자음강화 교통심신(滋陰降火 交通心腎)',
          formulaIds: ['hwangryun-ajiao-tang', 'yukmi-jihwang-hwan'],
          formulaNames: ['황련아교탕', '육미지황환'],
          notes: '갱년기 불면에 적합',
        },
        differentialPoints: [
          '열감, 도한 동반',
          '심신이 불교',
          '설홍 소태',
        ],
      },
      {
        id: 'insomnia-liver-fire',
        patternName: '간화요성',
        hanja: '肝火擾性',
        symptoms: [
          { name: '불면', isKey: true, specifics: '잠을 못 이룸' },
          { name: '심번이노', isKey: true, specifics: '짜증, 화가 잘 남' },
          { name: '두통', isKey: false },
          { name: '목적', isKey: false, specifics: '눈이 충혈' },
          { name: '구고', isKey: false },
        ],
        tongue: { body: '홍', coating: '황태' },
        pulse: { type: '현삭맥' },
        treatment: {
          principle: '청간사화 진심안신(淸肝瀉火 鎭心安神)',
          formulaIds: ['yongdam-sahgan-tang'],
          formulaNames: ['용담사간탕'],
          notes: '스트레스성 불면에 적합',
        },
        differentialPoints: [
          '화를 잘 내고 짜증이 많음',
          '눈이 충혈',
          '맥이 현삭',
        ],
      },
      {
        id: 'insomnia-phlegm-heat',
        patternName: '담열요심',
        hanja: '痰熱擾心',
        symptoms: [
          { name: '불면', isKey: true },
          { name: '흉민', isKey: false },
          { name: '다담', isKey: false, specifics: '가래가 많음' },
          { name: '구고', isKey: false },
          { name: '오심', isKey: false },
        ],
        tongue: { body: '홍', coating: '황니태' },
        pulse: { type: '활삭맥' },
        treatment: {
          principle: '청화담열 안신(淸化痰熱 安神)',
          formulaIds: ['ondamtang-gami'],
          formulaNames: ['온담탕가미'],
          notes: '비만, 과식 환자에 적합',
        },
        differentialPoints: [
          '담이 많음',
          '가슴 답답함',
          '설태 황니',
        ],
      },
    ],
  },

  // ========== 소화불량 ==========
  {
    id: 'dyspepsia',
    disease: '소화불량',
    hanja: '消化不良',
    category: 'internal',
    description: '비위 기능 저하로 인한 소화 장애.',
    patterns: [
      {
        id: 'dyspepsia-food-stag',
        patternName: '식적',
        hanja: '食積',
        symptoms: [
          { name: '완복창만', isKey: true, specifics: '배가 더부룩함' },
          { name: '애부탄산', isKey: true, specifics: '트림, 신물' },
          { name: '식욕부진', isKey: false },
          { name: '대변불쾌', isKey: false },
          { name: '오심', isKey: false },
        ],
        tongue: { body: '담홍', coating: '후니태' },
        pulse: { type: '활맥' },
        treatment: {
          principle: '소식화적(消食化積)',
          formulaIds: ['bojae-hwan', 'pyeongwi-san'],
          formulaNames: ['보제환', '평위산'],
          notes: '과식 후 급성 소화불량에 적합',
        },
        differentialPoints: [
          '과식 후 발생',
          '트림, 신물',
          '설태 두껍고 기름기',
        ],
      },
      {
        id: 'dyspepsia-spleen-qi',
        patternName: '비기허',
        hanja: '脾氣虛',
        symptoms: [
          { name: '식욕부진', isKey: true },
          { name: '복창', isKey: true, specifics: '식후 배가 부름' },
          { name: '변당', isKey: false, specifics: '대변이 무름' },
          { name: '권태', isKey: false },
          { name: '면색위황', isKey: false },
        ],
        tongue: { body: '담백', coating: '박백태' },
        pulse: { type: '완약맥' },
        treatment: {
          principle: '건비익기(健脾益氣)',
          formulaIds: ['yukgunja-tang', 'sagunja-tang'],
          formulaNames: ['육군자탕', '사군자탕'],
          notes: '만성 소화불량에 적합',
        },
        differentialPoints: [
          '만성적 경과',
          '피로감 동반',
          '식후 복부 팽만',
        ],
      },
      {
        id: 'dyspepsia-cold',
        patternName: '비위허한',
        hanja: '脾胃虛寒',
        symptoms: [
          { name: '위완냉통', isKey: true, specifics: '위가 차고 아픔' },
          { name: '온안희압', isKey: true, specifics: '따뜻하게 누르면 편함' },
          { name: '희온', isKey: false, specifics: '따뜻한 것을 좋아함' },
          { name: '대변당', isKey: false },
          { name: '사지냉', isKey: false },
        ],
        tongue: { body: '담백', coating: '백태' },
        pulse: { type: '침지맥' },
        treatment: {
          principle: '온중건비(溫中健脾)',
          formulaIds: ['ijn-tang', 'sogunjung-tang'],
          formulaNames: ['이중탕', '소건중탕'],
          notes: '냉한 체질, 만성 위염에 적합',
        },
        differentialPoints: [
          '찬 것에 악화',
          '따뜻하게 하면 호전',
          '사지가 차가움',
        ],
      },
      {
        id: 'dyspepsia-liver-stomach',
        patternName: '간위불화',
        hanja: '肝胃不和',
        symptoms: [
          { name: '위완창통', isKey: true, specifics: '명치 부위 통증' },
          { name: '흉협창만', isKey: true, specifics: '옆구리 답답함' },
          { name: '애기', isKey: false, specifics: '트림' },
          { name: '심번이노', isKey: false },
        ],
        tongue: { body: '담홍', coating: '박백태' },
        pulse: { type: '현맥' },
        treatment: {
          principle: '소간이기 화위(疏肝理氣 和胃)',
          formulaIds: ['siho-sogan-san', 'banha-husa-tang'],
          formulaNames: ['시호소간산', '반하후사탕'],
          notes: '스트레스성 소화불량에 적합',
        },
        differentialPoints: [
          '스트레스와 관련',
          '옆구리 불편감',
          '맥이 현(弦)',
        ],
      },
    ],
  },

  // ========== 변비 ==========
  {
    id: 'constipation',
    disease: '변비',
    hanja: '便秘',
    category: 'internal',
    description: '대변이 굳고 배변이 어려운 증상.',
    patterns: [
      {
        id: 'constipation-heat',
        patternName: '열비',
        hanja: '熱秘',
        symptoms: [
          { name: '변비', isKey: true, specifics: '대변이 굳고 건조' },
          { name: '복창', isKey: false },
          { name: '구취', isKey: false },
          { name: '구갈', isKey: false },
          { name: '소변황', isKey: false },
        ],
        tongue: { body: '홍', coating: '황조태' },
        pulse: { type: '활삭맥' },
        treatment: {
          principle: '사열통변(瀉熱通便)',
          formulaIds: ['majain-hwan', 'daehwangdam-tang'],
          formulaNames: ['마자인환', '대황담탕'],
          notes: '실열 변비에 적합',
        },
        differentialPoints: [
          '열감, 갈증 동반',
          '소변이 노랗고 짧음',
          '설홍 황조태',
        ],
      },
      {
        id: 'constipation-qi',
        patternName: '기비',
        hanja: '氣秘',
        symptoms: [
          { name: '변비', isKey: true, specifics: '변의는 있으나 배변 곤란' },
          { name: '복창', isKey: true },
          { name: '애기', isKey: false },
          { name: '협늑창만', isKey: false },
        ],
        tongue: { body: '담홍', coating: '박니태' },
        pulse: { type: '현맥' },
        treatment: {
          principle: '순기도체(順氣導滯)',
          formulaIds: ['yukmo-tang'],
          formulaNames: ['육마탕'],
          notes: '기체 변비에 적합',
        },
        differentialPoints: [
          '복부 팽만감',
          '트림이 잦음',
          '스트레스와 관련',
        ],
      },
      {
        id: 'constipation-blood-def',
        patternName: '혈허비',
        hanja: '血虛秘',
        symptoms: [
          { name: '변비', isKey: true, specifics: '대변이 토끼똥처럼' },
          { name: '면색창백', isKey: false },
          { name: '현훈', isKey: false },
          { name: '심계', isKey: false },
        ],
        tongue: { body: '담백', coating: '소태' },
        pulse: { type: '세삽맥' },
        treatment: {
          principle: '양혈윤장(養血潤腸)',
          formulaIds: ['yunji-tang'],
          formulaNames: ['윤장탕'],
          notes: '빈혈, 산후 변비에 적합',
        },
        differentialPoints: [
          '빈혈 증상 동반',
          '설담백 소태',
          '맥이 세삽',
        ],
      },
      {
        id: 'constipation-cold',
        patternName: '냉비',
        hanja: '冷秘',
        symptoms: [
          { name: '변비', isKey: true },
          { name: '복냉', isKey: true, specifics: '배가 차가움' },
          { name: '요슬냉통', isKey: false },
          { name: '소변청장', isKey: false },
        ],
        tongue: { body: '담백', coating: '백태' },
        pulse: { type: '침지맥' },
        treatment: {
          principle: '온양통변(溫陽通便)',
          formulaIds: ['jebi-tang'],
          formulaNames: ['제비탕'],
          notes: '노인, 양허 체질에 적합',
        },
        differentialPoints: [
          '배가 차가움',
          '찬 것을 싫어함',
          '소변이 맑고 많음',
        ],
      },
    ],
  },

  // ========== 어지러움 ==========
  {
    id: 'dizziness',
    disease: '현훈',
    hanja: '眩暈',
    category: 'internal',
    description: '어지럽고 눈앞이 아찔한 증상.',
    patterns: [
      {
        id: 'dizziness-liver-yang',
        patternName: '간양상항',
        hanja: '肝陽上亢',
        symptoms: [
          { name: '현훈', isKey: true, specifics: '어지러움, 두통' },
          { name: '이명', isKey: false },
          { name: '면홍', isKey: false },
          { name: '심번이노', isKey: false },
        ],
        tongue: { body: '홍', coating: '황태' },
        pulse: { type: '현맥' },
        treatment: {
          principle: '평간잠양(平肝潛陽)',
          formulaIds: ['chunma-gudeung-eum'],
          formulaNames: ['천마구등음'],
          notes: '고혈압 어지러움에 적합',
        },
        differentialPoints: [
          '화를 잘 냄',
          '두통 동반',
          '맥이 현(弦)',
        ],
      },
      {
        id: 'dizziness-phlegm',
        patternName: '담탁중조',
        hanja: '痰濁中阻',
        symptoms: [
          { name: '현훈', isKey: true, specifics: '머리가 무겁고 멍함' },
          { name: '흉민', isKey: false },
          { name: '오심', isKey: false },
          { name: '다담', isKey: false },
        ],
        tongue: { body: '담', coating: '백니태' },
        pulse: { type: '활맥' },
        treatment: {
          principle: '조습화담(燥濕化痰)',
          formulaIds: ['banha-baekchul-chunma-tang'],
          formulaNames: ['반하백출천마탕'],
          notes: '비만, 메니에르병에 적합',
        },
        differentialPoints: [
          '머리가 무거운 느낌',
          '비만 체형',
          '담이 많음',
        ],
      },
      {
        id: 'dizziness-blood-def',
        patternName: '기혈양허',
        hanja: '氣血兩虛',
        symptoms: [
          { name: '현훈', isKey: true, specifics: '일어설 때 악화' },
          { name: '면색창백', isKey: true },
          { name: '권태', isKey: false },
          { name: '심계', isKey: false },
        ],
        tongue: { body: '담백', coating: '박백태' },
        pulse: { type: '세약맥' },
        treatment: {
          principle: '보익기혈(補益氣血)',
          formulaIds: ['gwibi-tang', 'palgye-tang'],
          formulaNames: ['귀비탕', '팔계탕'],
          notes: '빈혈, 기립성저혈압에 적합',
        },
        differentialPoints: [
          '빈혈 증상',
          '기립 시 악화',
          '피로감 동반',
        ],
      },
      {
        id: 'dizziness-kidney',
        patternName: '신정부족',
        hanja: '腎精不足',
        symptoms: [
          { name: '현훈', isKey: true },
          { name: '이명', isKey: true },
          { name: '요슬산연', isKey: false },
          { name: '건망', isKey: false },
          { name: '발탈', isKey: false, specifics: '머리카락 빠짐' },
        ],
        tongue: { body: '담홍', coating: '소태' },
        pulse: { type: '세맥' },
        treatment: {
          principle: '보신익정(補腎益精)',
          formulaIds: ['yukmi-jihwang-hwan'],
          formulaNames: ['육미지황환'],
          notes: '노화, 만성 어지러움에 적합',
        },
        differentialPoints: [
          '이명 동반',
          '허리 무릎이 시큼',
          '노화 증상',
        ],
      },
    ],
  },
]

// 병증 카테고리별 조회
export function getByeongYangByCategory(category: 'external' | 'internal' | 'miscellaneous') {
  return BYEONGYANG_DATA.filter(entry => entry.category === category)
}

// 질환명으로 검색
export function searchByeongYang(keyword: string) {
  return BYEONGYANG_DATA.filter(
    entry =>
      entry.disease.includes(keyword) ||
      entry.hanja.includes(keyword) ||
      entry.patterns.some(p => p.patternName.includes(keyword))
  )
}

// ID로 조회
export function getByeongYangById(id: string) {
  return BYEONGYANG_DATA.find(entry => entry.id === id)
}
