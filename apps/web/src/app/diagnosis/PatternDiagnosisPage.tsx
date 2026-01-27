import { useState } from 'react'
import {
  Brain,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Activity,
  Thermometer,
  Moon,
  Utensils,
  Heart,
  Droplets,
  Flame,
  CircleDot,
  ArrowRight,
  RotateCcw,
  FileText,
  Pill,
  Scale,
  Dumbbell,
  CheckCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { PalGangAnalysis, BodyConstitutionResult } from '@/types'
import { PalGangAnalyzer, PalGangSummary, PalGangDiagram } from '@/components/diagnosis/PalGangAnalyzer'
import { BodyConstitutionAssessment } from '@/components/diagnosis/BodyConstitutionAssessment'
import { SimilarCaseSuccessCard } from '@/components/diagnosis/SimilarCaseSuccessCard'
import { AIResultDisclaimer, PrescriptionDisclaimer } from '@/components/common/MedicalDisclaimer'
import { TermTooltip } from '@/components/common'

interface SymptomCategory {
  id: string
  name: string
  icon: React.ElementType
  symptoms: { id: string; name: string; patterns: string[] }[]
}

interface PulseType {
  id: string
  name: string
  hanja: string
  patterns: string[]
}

interface TongueFeature {
  category: string
  options: { id: string; name: string; patterns: string[] }[]
}

const symptomCategories: SymptomCategory[] = [
  {
    id: 'general',
    name: '전신 증상',
    icon: Activity,
    symptoms: [
      { id: 'fatigue', name: '피로/무력감', patterns: ['기허', '혈허', '양허'] },
      { id: 'heaviness', name: '몸이 무거움', patterns: ['습', '담음', '비기허'] },
      { id: 'heat-sensation', name: '몸에 열감', patterns: ['음허', '실열', '간화'] },
      { id: 'cold-sensation', name: '몸이 차가움', patterns: ['양허', '한증'] },
      { id: 'sweating', name: '자한/도한', patterns: ['기허', '음허'] },
      { id: 'edema', name: '부종', patterns: ['비기허', '신양허', '수습'] },
    ],
  },
  {
    id: 'head',
    name: '두면부',
    icon: Brain,
    symptoms: [
      { id: 'headache-top', name: '두정부 두통', patterns: ['간혈허', '궐음두통'] },
      { id: 'headache-side', name: '측두부 두통', patterns: ['간양상항', '소양두통'] },
      { id: 'headache-front', name: '전두부 두통', patterns: ['양명두통', '위열'] },
      { id: 'headache-back', name: '후두부 두통', patterns: ['태양두통', '풍한'] },
      { id: 'dizziness', name: '어지러움', patterns: ['간양상항', '담음', '혈허'] },
      { id: 'tinnitus', name: '이명', patterns: ['신허', '간화상염'] },
    ],
  },
  {
    id: 'chest',
    name: '흉복부',
    icon: Heart,
    symptoms: [
      { id: 'chest-stuffiness', name: '흉민/답답함', patterns: ['기울', '담음', '심기허'] },
      { id: 'palpitation', name: '심계/두근거림', patterns: ['심혈허', '심기허', '담화'] },
      { id: 'hypochondriac', name: '흉협고만', patterns: ['간기울결', '소시호증'] },
      { id: 'epigastric', name: '상복부 불편', patterns: ['위기허', '식적', '간위불화'] },
      { id: 'abdominal-pain', name: '복통', patterns: ['한증', '어혈', '기체'] },
      { id: 'bloating', name: '복창/가스', patterns: ['비기허', '기체', '식적'] },
    ],
  },
  {
    id: 'digestion',
    name: '소화기',
    icon: Utensils,
    symptoms: [
      { id: 'poor-appetite', name: '식욕부진', patterns: ['비기허', '습곤비', '간위불화'] },
      { id: 'nausea', name: '오심/구역', patterns: ['담음', '위열', '간기범위'] },
      { id: 'acid-reflux', name: '신물/역류', patterns: ['위열', '간위불화'] },
      { id: 'loose-stool', name: '변당/설사', patterns: ['비기허', '비양허', '신양허'] },
      { id: 'constipation', name: '변비', patterns: ['장조', '혈허', '기체', '열결'] },
      { id: 'thirst', name: '구갈', patterns: ['음허', '열증', '소갈'] },
    ],
  },
  {
    id: 'sleep',
    name: '수면/정신',
    icon: Moon,
    symptoms: [
      { id: 'insomnia', name: '불면', patterns: ['심혈허', '음허화왕', '담화요심'] },
      { id: 'dream-disturbed', name: '다몽', patterns: ['심담허', '간화'] },
      { id: 'anxiety', name: '불안/초조', patterns: ['심기허', '간울', '음허'] },
      { id: 'depression', name: '우울/의욕저하', patterns: ['간기울결', '심비양허'] },
      { id: 'irritability', name: '조급/화를 잘 냄', patterns: ['간화', '간양상항'] },
      { id: 'poor-memory', name: '건망', patterns: ['심비양허', '신정휴손'] },
    ],
  },
  {
    id: 'temperature',
    name: '한열',
    icon: Thermometer,
    symptoms: [
      { id: 'aversion-cold', name: '오한/추위를 탐', patterns: ['표한', '양허'] },
      { id: 'aversion-heat', name: '오열/더위를 싫어함', patterns: ['음허', '실열'] },
      { id: 'tidal-fever', name: '조열 (오후 미열)', patterns: ['음허', '습열'] },
      { id: 'alternating', name: '한열왕래', patterns: ['소양증', '학질'] },
      { id: 'five-palm-heat', name: '오심번열', patterns: ['음허화왕'] },
      { id: 'cold-limbs', name: '수족냉', patterns: ['양허', '기울', '혈어'] },
    ],
  },
]

const pulseTypes: PulseType[] = [
  { id: 'floating', name: '부맥', hanja: '浮脈', patterns: ['표증', '풍'] },
  { id: 'sinking', name: '침맥', hanja: '沈脈', patterns: ['리증', '습'] },
  { id: 'slow', name: '지맥', hanja: '遲脈', patterns: ['한증', '양허'] },
  { id: 'rapid', name: '삭맥', hanja: '數脈', patterns: ['열증', '음허'] },
  { id: 'wiry', name: '현맥', hanja: '弦脈', patterns: ['간담병', '통증', '담음'] },
  { id: 'slippery', name: '활맥', hanja: '滑脈', patterns: ['담음', '식적', '임신'] },
  { id: 'thin', name: '세맥', hanja: '細脈', patterns: ['혈허', '음허', '습'] },
  { id: 'weak', name: '약맥', hanja: '弱脈', patterns: ['기혈허', '양허'] },
  { id: 'choppy', name: '삽맥', hanja: '澁脈', patterns: ['혈어', '정상', '혈허'] },
  { id: 'tight', name: '긴맥', hanja: '緊脈', patterns: ['한증', '통증'] },
  { id: 'soggy', name: '유맥', hanja: '濡脈', patterns: ['습', '허증'] },
  { id: 'full', name: '실맥', hanja: '實脈', patterns: ['실증'] },
]

const tongueFeatures: TongueFeature[] = [
  {
    category: '설질 (혀 본체)',
    options: [
      { id: 'pale', name: '담백 (연한 색)', patterns: ['기허', '혈허', '양허', '한증'] },
      { id: 'red', name: '홍설 (붉음)', patterns: ['열증', '음허'] },
      { id: 'crimson', name: '강설 (진홍)', patterns: ['열입영혈', '음허화왕'] },
      { id: 'purple', name: '자설 (보라)', patterns: ['어혈', '한응'] },
      { id: 'pale-purple', name: '담자 (연보라)', patterns: ['기체혈어'] },
    ],
  },
  {
    category: '설태 (혀 이끼)',
    options: [
      { id: 'thin-white', name: '박백태', patterns: ['정상', '표증'] },
      { id: 'thick-white', name: '후백태', patterns: ['한습', '담음'] },
      { id: 'yellow', name: '황태', patterns: ['열증', '습열'] },
      { id: 'gray-black', name: '회흑태', patterns: ['열극', '한극'] },
      { id: 'peeled', name: '무태/박락태', patterns: ['음허', '위음허'] },
      { id: 'greasy', name: '니태 (기름기)', patterns: ['습담', '식적'] },
    ],
  },
  {
    category: '설형 (혀 모양)',
    options: [
      { id: 'swollen', name: '호대설 (부은)', patterns: ['담습', '비허'] },
      { id: 'thin-small', name: '수박설 (마른)', patterns: ['음허', '혈허'] },
      { id: 'teeth-marks', name: '치흔설 (이빨자국)', patterns: ['비기허', '습'] },
      { id: 'cracked', name: '열문설 (갈라짐)', patterns: ['음허', '열상'] },
      { id: 'thorny', name: '망자설 (까끌)', patterns: ['열증'] },
    ],
  },
]

interface PatternResult {
  pattern: string
  hanja: string
  confidence: number
  description: string
  treatment: string
  formulas: string[]
}

const patternDatabase: Record<string, Omit<PatternResult, 'pattern' | 'confidence'>> = {
  // ===== 허증 (虛證) =====
  '기허': {
    hanja: '氣虛',
    description: '원기가 부족하여 장부 기능이 저하된 상태',
    treatment: '보기(補氣)',
    formulas: ['사군자탕', '보중익기탕', '생맥산'],
  },
  '혈허': {
    hanja: '血虛',
    description: '혈액이 부족하여 장부와 조직을 영양하지 못하는 상태',
    treatment: '보혈(補血)',
    formulas: ['사물탕', '당귀보혈탕', '귀비탕'],
  },
  '음허': {
    hanja: '陰虛',
    description: '음액이 부족하여 허열이 발생한 상태',
    treatment: '자음(滋陰)',
    formulas: ['육미지황환', '좌귀음', '대보음환'],
  },
  '양허': {
    hanja: '陽虛',
    description: '양기가 부족하여 온후 기능이 저하된 상태',
    treatment: '온양(溫陽)',
    formulas: ['팔미지황환', '우귀환', '진무탕'],
  },
  '기혈양허': {
    hanja: '氣血兩虛',
    description: '기와 혈이 모두 부족한 상태',
    treatment: '기혈쌍보(氣血雙補)',
    formulas: ['팔진탕', '십전대보탕', '인삼양영탕'],
  },
  '음양양허': {
    hanja: '陰陽兩虛',
    description: '음과 양이 모두 부족한 상태',
    treatment: '음양쌍보(陰陽雙補)',
    formulas: ['지황음자', '귀기건중탕', '보원탕'],
  },

  // ===== 장부 변증 - 간 (肝) =====
  '간기울결': {
    hanja: '肝氣鬱結',
    description: '간의 소설 기능이 저하되어 기가 울체된 상태',
    treatment: '소간해울(疏肝解鬱)',
    formulas: ['소요산', '시호소간산', '월국환'],
  },
  '간양상항': {
    hanja: '肝陽上亢',
    description: '간양이 위로 치솟아 오른 상태',
    treatment: '평간잠양(平肝潛陽)',
    formulas: ['천마구등음', '용담사간탕', '진간식풍탕'],
  },
  '간화': {
    hanja: '肝火',
    description: '간에 화열이 성한 상태',
    treatment: '청간사화(清肝瀉火)',
    formulas: ['용담사간탕', '당귀용회환', '좌금환'],
  },
  '간화상염': {
    hanja: '肝火上炎',
    description: '간화가 위로 타올라 상부에 증상이 나타나는 상태',
    treatment: '청간사화(清肝瀉火)',
    formulas: ['용담사간탕', '시호청간탕', '하고초산'],
  },
  '간혈허': {
    hanja: '肝血虛',
    description: '간장의 혈이 부족하여 근맥과 눈을 영양하지 못하는 상태',
    treatment: '보혈양간(補血養肝)',
    formulas: ['사물탕', '보간탕', '일관전'],
  },
  '간음허': {
    hanja: '肝陰虛',
    description: '간장의 음액이 부족한 상태',
    treatment: '자양간음(滋養肝陰)',
    formulas: ['일관전', '보간탕', '기국지황환'],
  },
  '간풍내동': {
    hanja: '肝風內動',
    description: '간풍이 내부에서 일어나 경련, 진전 등이 나타나는 상태',
    treatment: '식풍지경(息風止痙)',
    formulas: ['천마구등음', '영양각구등탕', '진간식풍탕'],
  },
  '간담습열': {
    hanja: '肝膽濕熱',
    description: '간담에 습열이 울체된 상태',
    treatment: '청리간담습열(清利肝膽濕熱)',
    formulas: ['용담사간탕', '인진호탕', '시호청간탕'],
  },
  '간위불화': {
    hanja: '肝胃不和',
    description: '간기가 위를 범하여 위의 기능이 저하된 상태',
    treatment: '소간화위(疏肝和胃)',
    formulas: ['시호소간산', '좌금환', '사역산'],
  },
  '간기범위': {
    hanja: '肝氣犯胃',
    description: '간기가 횡역하여 위기능을 침범한 상태',
    treatment: '소간화위(疏肝和胃)',
    formulas: ['시호소간산', '사역산', '반하사심탕'],
  },

  // ===== 장부 변증 - 심 (心) =====
  '심혈허': {
    hanja: '心血虛',
    description: '심장의 혈이 부족한 상태',
    treatment: '보혈양심(補血養心)',
    formulas: ['귀비탕', '천왕보심단', '양심탕'],
  },
  '심기허': {
    hanja: '心氣虛',
    description: '심장의 기가 허약한 상태',
    treatment: '보심익기(補心益氣)',
    formulas: ['양심탕', '안신정지환', '천왕보심단'],
  },
  '심양허': {
    hanja: '心陽虛',
    description: '심장의 양기가 부족한 상태',
    treatment: '온보심양(溫補心陽)',
    formulas: ['계지감초탕', '귀기탕', '보원탕'],
  },
  '심음허': {
    hanja: '心陰虛',
    description: '심장의 음액이 부족한 상태',
    treatment: '자음양심(滋陰養心)',
    formulas: ['천왕보심단', '생맥산', '자감초탕'],
  },
  '심담허': {
    hanja: '心膽虛',
    description: '심담이 함께 허약하여 놀람과 두려움이 쉽게 생기는 상태',
    treatment: '보심담익기(補心膽益氣)',
    formulas: ['안신정지환', '온담탕', '정지환'],
  },
  '심비양허': {
    hanja: '心脾兩虛',
    description: '심장과 비장이 함께 허약한 상태',
    treatment: '보심건비(補心健脾)',
    formulas: ['귀비탕', '양심탕', '삼령백출산'],
  },
  '심신불교': {
    hanja: '心腎不交',
    description: '심화와 신수가 상호 교류하지 못하는 상태',
    treatment: '교통심신(交通心腎)',
    formulas: ['황련아교탕', '교태환', '천왕보심단'],
  },
  '담화요심': {
    hanja: '痰火擾心',
    description: '담과 화가 심을 어지럽히는 상태',
    treatment: '청열화담(清熱化痰)',
    formulas: ['온담탕', '황련온담탕', '도담탕'],
  },

  // ===== 장부 변증 - 비 (脾) =====
  '비기허': {
    hanja: '脾氣虛',
    description: '비장의 기가 허약한 상태',
    treatment: '건비익기(健脾益氣)',
    formulas: ['사군자탕', '삼령백출산', '보중익기탕'],
  },
  '비양허': {
    hanja: '脾陽虛',
    description: '비장의 양기가 부족하여 운화기능이 저하된 상태',
    treatment: '온중건비(溫中健脾)',
    formulas: ['이중탕', '부자이중환', '실비산'],
  },
  '비허습곤': {
    hanja: '脾虛濕困',
    description: '비허로 습이 정체되어 비장을 곤란하게 하는 상태',
    treatment: '건비이습(健脾利濕)',
    formulas: ['삼령백출산', '평위산', '위령탕'],
  },
  '습곤비': {
    hanja: '濕困脾',
    description: '습사가 비장을 곤란하게 하는 상태',
    treatment: '운비화습(運脾化濕)',
    formulas: ['평위산', '곽향정기산', '위령탕'],
  },
  '비불통혈': {
    hanja: '脾不統血',
    description: '비장이 혈을 통솔하지 못하여 출혈이 나타나는 상태',
    treatment: '보기섭혈(補氣攝血)',
    formulas: ['귀비탕', '보중익기탕가감', '십회산'],
  },
  '중기하함': {
    hanja: '中氣下陷',
    description: '비기가 하함하여 장기가 하수되는 상태',
    treatment: '익기승양(益氣升陽)',
    formulas: ['보중익기탕', '승양익위탕', '거원전'],
  },

  // ===== 장부 변증 - 폐 (肺) =====
  '폐기허': {
    hanja: '肺氣虛',
    description: '폐의 기가 허약한 상태',
    treatment: '보폐익기(補肺益氣)',
    formulas: ['보폐탕', '옥병풍산', '생맥산'],
  },
  '폐음허': {
    hanja: '肺陰虛',
    description: '폐의 음액이 부족한 상태',
    treatment: '자음윤폐(滋陰潤肺)',
    formulas: ['백합고금탕', '사삼맥문동탕', '양음청폐탕'],
  },
  '폐열': {
    hanja: '肺熱',
    description: '폐에 열이 있는 상태',
    treatment: '청폐사열(清肺瀉熱)',
    formulas: ['사백산', '청폐탕', '마행감석탕'],
  },
  '풍한범폐': {
    hanja: '風寒犯肺',
    description: '풍한사가 폐를 침범한 상태',
    treatment: '선폐산한(宣肺散寒)',
    formulas: ['삼소음', '행소산', '마황탕'],
  },
  '풍열범폐': {
    hanja: '風熱犯肺',
    description: '풍열사가 폐를 침범한 상태',
    treatment: '소풍청열(疏風清熱)',
    formulas: ['상국음', '은교산', '마행감석탕'],
  },
  '조사범폐': {
    hanja: '燥邪犯肺',
    description: '조사가 폐를 침범하여 폐가 건조해진 상태',
    treatment: '윤폐지해(潤肺止咳)',
    formulas: ['상행탕', '청조구폐탕', '맥문동탕'],
  },
  '담습저폐': {
    hanja: '痰濕阻肺',
    description: '담습이 폐에 정체된 상태',
    treatment: '조습화담(燥濕化痰)',
    formulas: ['이진탕', '삼소음', '삼자양친탕'],
  },
  '담열옹폐': {
    hanja: '痰熱壅肺',
    description: '담열이 폐를 옹체시킨 상태',
    treatment: '청폐화담(清肺化痰)',
    formulas: ['청금화담탕', '소청룡탕', '마행감석탕'],
  },

  // ===== 장부 변증 - 신 (腎) =====
  '신양허': {
    hanja: '腎陽虛',
    description: '신장의 양기가 부족한 상태',
    treatment: '온보신양(溫補腎陽)',
    formulas: ['팔미지황환', '우귀환', '금궤신기환'],
  },
  '신음허': {
    hanja: '腎陰虛',
    description: '신장의 음액이 부족한 상태',
    treatment: '자보신음(滋補腎陰)',
    formulas: ['육미지황환', '좌귀환', '대보음환'],
  },
  '신허': {
    hanja: '腎虛',
    description: '신장의 정기가 전반적으로 부족한 상태',
    treatment: '보신(補腎)',
    formulas: ['육미지황환', '팔미지황환', '좌귀환'],
  },
  '신정부족': {
    hanja: '腎精不足',
    description: '신장의 정기가 부족한 상태',
    treatment: '보신익정(補腎益精)',
    formulas: ['좌귀환', '우귀환', '하수오환'],
  },
  '신정휴손': {
    hanja: '腎精虧損',
    description: '신정이 휴손된 상태',
    treatment: '보익신정(補益腎精)',
    formulas: ['육미지황환', '좌귀환', '오자연종환'],
  },
  '신기불고': {
    hanja: '腎氣不固',
    description: '신기가 견고하지 못하여 정, 소변 등이 쉽게 빠져나가는 상태',
    treatment: '보신고섭(補腎固攝)',
    formulas: ['금쇄고정환', '축천환', '상표소산'],
  },
  '신불납기': {
    hanja: '腎不納氣',
    description: '신이 기를 받아들이지 못하여 호흡곤란이 나타나는 상태',
    treatment: '보신납기(補腎納氣)',
    formulas: ['금궤신기환', '인삼호도탕', '도기환'],
  },

  // ===== 장부 변증 - 위 (胃) =====
  '위기허': {
    hanja: '胃氣虛',
    description: '위의 기가 허약한 상태',
    treatment: '보기건위(補氣健胃)',
    formulas: ['사군자탕', '향사육군자탕', '보중익기탕'],
  },
  '위음허': {
    hanja: '胃陰虛',
    description: '위의 음액이 부족한 상태',
    treatment: '자양위음(滋養胃陰)',
    formulas: ['익위탕', '사삼맥문동탕', '맥문동탕'],
  },
  '위열': {
    hanja: '胃熱',
    description: '위에 열이 있는 상태',
    treatment: '청위사열(清胃瀉熱)',
    formulas: ['청위산', '백호탕', '옥녀전'],
  },
  '위한': {
    hanja: '胃寒',
    description: '위에 한이 있는 상태',
    treatment: '온위산한(溫胃散寒)',
    formulas: ['이중탕', '오수유탕', '부자이중환'],
  },

  // ===== 병리 변증 =====
  '담음': {
    hanja: '痰飮',
    description: '체내에 담음(병리적 수액)이 정체된 상태',
    treatment: '화담(化痰)',
    formulas: ['이진탕', '온담탕', '도담탕'],
  },
  '담열': {
    hanja: '痰熱',
    description: '담과 열이 결합된 상태',
    treatment: '청열화담(清熱化痰)',
    formulas: ['청기화담환', '황련온담탕', '소함흉탕'],
  },
  '담습': {
    hanja: '痰濕',
    description: '담과 습이 결합된 상태',
    treatment: '조습화담(燥濕化痰)',
    formulas: ['이진탕', '평위산', '삼자양친탕'],
  },
  '어혈': {
    hanja: '瘀血',
    description: '혈액 순환이 정체되어 어혈이 형성된 상태',
    treatment: '활혈거어(活血祛瘀)',
    formulas: ['혈부축어탕', '도핵승기탕', '통규활혈탕'],
  },
  '기체혈어': {
    hanja: '氣滯血瘀',
    description: '기의 울체로 혈어가 생긴 상태',
    treatment: '행기활혈(行氣活血)',
    formulas: ['혈부축어탕', '시호소간산', '격하축어탕'],
  },
  '기체': {
    hanja: '氣滯',
    description: '기의 순환이 정체된 상태',
    treatment: '행기(行氣)',
    formulas: ['목향순기산', '지각산', '월국환'],
  },
  '습열': {
    hanja: '濕熱',
    description: '습과 열이 결합된 병리 상태',
    treatment: '청열이습(清熱利濕)',
    formulas: ['인진호탕', '용담사간탕', '삼인탕'],
  },
  '한습': {
    hanja: '寒濕',
    description: '한과 습이 결합된 병리 상태',
    treatment: '온화한습(溫化寒濕)',
    formulas: ['평위산', '위령탕', '오적산'],
  },
  '수습': {
    hanja: '水濕',
    description: '수습이 정체된 상태',
    treatment: '이수삼습(利水滲濕)',
    formulas: ['오령산', '저령탕', '오피산'],
  },
  '습': {
    hanja: '濕',
    description: '습사가 있는 상태',
    treatment: '이습(利濕)',
    formulas: ['평위산', '삼인탕', '오령산'],
  },
  '식적': {
    hanja: '食積',
    description: '음식이 소화되지 않고 체한 상태',
    treatment: '소식도체(消食導滯)',
    formulas: ['보화환', '지실도체환', '평위산'],
  },

  // ===== 외감 변증 =====
  '풍한': {
    hanja: '風寒',
    description: '풍한사가 침범한 표증',
    treatment: '신온해표(辛溫解表)',
    formulas: ['마황탕', '계지탕', '갈근탕'],
  },
  '풍열': {
    hanja: '風熱',
    description: '풍열사가 침범한 표증',
    treatment: '신량해표(辛涼解表)',
    formulas: ['은교산', '상국음', '승마갈근탕'],
  },
  '풍습': {
    hanja: '風濕',
    description: '풍습사가 침범한 상태',
    treatment: '거풍제습(祛風除濕)',
    formulas: ['강활승습탕', '독활기생탕', '방풍통성산'],
  },
  '표한': {
    hanja: '表寒',
    description: '표부에 한사가 있는 상태',
    treatment: '해표산한(解表散寒)',
    formulas: ['마황탕', '계지탕', '갈근탕'],
  },
  '표열': {
    hanja: '表熱',
    description: '표부에 열이 있는 상태',
    treatment: '신량해표(辛涼解表)',
    formulas: ['은교산', '상국음', '시호탕'],
  },
  '표증': {
    hanja: '表證',
    description: '외사가 표부에 있는 상태',
    treatment: '해표(解表)',
    formulas: ['마황탕', '계지탕', '갈근탕'],
  },
  '리증': {
    hanja: '裏證',
    description: '병사가 리에 있는 상태',
    treatment: '청리(清裏) 또는 온리(溫裏)',
    formulas: ['백호탕', '이중탕', '대승기탕'],
  },
  '한증': {
    hanja: '寒證',
    description: '한사로 인한 병증',
    treatment: '온리산한(溫裏散寒)',
    formulas: ['이중탕', '사역탕', '오수유탕'],
  },
  '열증': {
    hanja: '熱證',
    description: '열로 인한 병증',
    treatment: '청열(清熱)',
    formulas: ['백호탕', '황련해독탕', '청영탕'],
  },
  '실열': {
    hanja: '實熱',
    description: '실한 열이 있는 상태',
    treatment: '청열사화(清熱瀉火)',
    formulas: ['백호탕', '황련해독탕', '대승기탕'],
  },
  '음허화왕': {
    hanja: '陰虛火旺',
    description: '음허로 인해 허화가 왕성해진 상태',
    treatment: '자음강화(滋陰降火)',
    formulas: ['지백지황환', '대보음환', '청골산'],
  },
  '열입영혈': {
    hanja: '熱入營血',
    description: '열사가 영분과 혈분에 침입한 상태',
    treatment: '청영양혈(清營凉血)',
    formulas: ['청영탕', '서각지황탕', '황련해독탕'],
  },

  // ===== 기타 변증 =====
  '소양증': {
    hanja: '少陽證',
    description: '병사가 반표반리에 있는 소양병 상태',
    treatment: '화해소양(和解少陽)',
    formulas: ['소시호탕', '시호가용골모려탕', '대시호탕'],
  },
  '소시호증': {
    hanja: '少柴胡證',
    description: '소시호탕증에 해당하는 상태',
    treatment: '화해소양(和解少陽)',
    formulas: ['소시호탕', '시호가용골모려탕', '시호계지탕'],
  },
  '양명두통': {
    hanja: '陽明頭痛',
    description: '양명경 부위(전두부)의 두통',
    treatment: '청양명열(清陽明熱)',
    formulas: ['백호탕', '갈근탕', '청위산'],
  },
  '태양두통': {
    hanja: '太陽頭痛',
    description: '태양경 부위(후두부)의 두통',
    treatment: '해표산한(解表散寒)',
    formulas: ['갈근탕', '천궁다조탕', '마황탕'],
  },
  '소양두통': {
    hanja: '少陽頭痛',
    description: '소양경 부위(측두부)의 두통',
    treatment: '화해소양(和解少陽)',
    formulas: ['소시호탕', '천궁다조탕', '시호탕'],
  },
  '궐음두통': {
    hanja: '厥陰頭痛',
    description: '궐음경 부위(두정부)의 두통',
    treatment: '온간해울(溫肝解鬱)',
    formulas: ['오수유탕', '천궁다조탕', '당귀사역탕'],
  },
  '한응': {
    hanja: '寒凝',
    description: '한사로 인해 기혈이 응체된 상태',
    treatment: '온경산한(溫經散寒)',
    formulas: ['당귀사역탕', '온경탕', '오수유탕'],
  },
  '장조': {
    hanja: '腸燥',
    description: '장에 진액이 부족하여 건조해진 상태',
    treatment: '윤장통변(潤腸通便)',
    formulas: ['마자인환', '오인환', '증액승기탕'],
  },
  '열결': {
    hanja: '熱結',
    description: '열이 장에 결체된 상태',
    treatment: '청열사하(清熱瀉下)',
    formulas: ['대승기탕', '소승기탕', '조위승기탕'],
  },
  '소갈': {
    hanja: '消渴',
    description: '당뇨병과 유사한 다음, 다식, 다뇨 증상',
    treatment: '생진지갈(生津止渴)',
    formulas: ['육미지황환', '백호가인삼탕', '지백지황환'],
  },
  '학질': {
    hanja: '瘧疾',
    description: '한열왕래가 규칙적으로 나타나는 말라리아 유사 상태',
    treatment: '화해달학(和解達瘧)',
    formulas: ['소시호탕', '청비음', '달원음'],
  },
  '실증': {
    hanja: '實證',
    description: '사기가 성한 상태',
    treatment: '사실(瀉實)',
    formulas: ['대승기탕', '도핵승기탕', '방풍통성산'],
  },
  '허증': {
    hanja: '虛證',
    description: '정기가 허약한 상태',
    treatment: '보허(補虛)',
    formulas: ['사군자탕', '사물탕', '팔진탕'],
  },
}

export default function PatternDiagnosisPage() {
  const { toast } = useToast()
  const [step, setStep] = useState<'constitution' | 'symptoms' | 'pulse' | 'tongue' | 'palgang' | 'result'>('constitution')
  const [bodyConstitution, setBodyConstitution] = useState<BodyConstitutionResult | null>(null)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [selectedPulses, setSelectedPulses] = useState<string[]>([])
  const [selectedTongue, setSelectedTongue] = useState<string[]>([])
  const [palGangAnalysis, setPalGangAnalysis] = useState<PalGangAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<PatternResult[]>([])
  const [isSavingToChart, setIsSavingToChart] = useState(false)

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((id) => id !== symptomId) : [...prev, symptomId]
    )
  }

  const togglePulse = (pulseId: string) => {
    setSelectedPulses((prev) =>
      prev.includes(pulseId) ? prev.filter((id) => id !== pulseId) : [...prev, pulseId]
    )
  }

  const toggleTongue = (tongueId: string) => {
    setSelectedTongue((prev) =>
      prev.includes(tongueId) ? prev.filter((id) => id !== tongueId) : [...prev, tongueId]
    )
  }

  const analyzePatterns = () => {
    setAnalyzing(true)

    // Collect all patterns from selected items
    const patternScores: Record<string, number> = {}

    // From symptoms
    symptomCategories.forEach((category) => {
      category.symptoms.forEach((symptom) => {
        if (selectedSymptoms.includes(symptom.id)) {
          symptom.patterns.forEach((pattern) => {
            patternScores[pattern] = (patternScores[pattern] || 0) + 2
          })
        }
      })
    })

    // From pulses
    pulseTypes.forEach((pulse) => {
      if (selectedPulses.includes(pulse.id)) {
        pulse.patterns.forEach((pattern) => {
          patternScores[pattern] = (patternScores[pattern] || 0) + 1.5
        })
      }
    })

    // From tongue
    tongueFeatures.forEach((feature) => {
      feature.options.forEach((option) => {
        if (selectedTongue.includes(option.id)) {
          option.patterns.forEach((pattern) => {
            patternScores[pattern] = (patternScores[pattern] || 0) + 1.5
          })
        }
      })
    })

    // Calculate results
    const maxScore = Math.max(...Object.values(patternScores), 1)
    const sortedPatterns = Object.entries(patternScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern, score]): PatternResult => {
        const info = patternDatabase[pattern] || {
          hanja: '',
          description: '상세 정보 준비 중',
          treatment: '변증시치',
          formulas: [],
        }
        return {
          pattern,
          confidence: Math.round((score / maxScore) * 100),
          ...info,
        }
      })

    setTimeout(() => {
      setResults(sortedPatterns)
      setAnalyzing(false)
      setStep('result')
    }, 1500)
  }

  const resetDiagnosis = () => {
    setStep('constitution')
    setBodyConstitution(null)
    setSelectedSymptoms([])
    setSelectedPulses([])
    setSelectedTongue([])
    setPalGangAnalysis(null)
    setResults([])
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100'
    if (confidence >= 60) return 'text-amber-600 bg-amber-100'
    return 'text-gray-600 bg-gray-100'
  }

  // 차트에 기록 저장
  const saveToChart = async () => {
    if (results.length === 0) return

    setIsSavingToChart(true)

    try {
      // 진단 결과를 로컬 스토리지에 임시 저장 (실제 구현 시 API 호출로 대체)
      const diagnosisRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        patternDiagnosis: results[0].pattern,
        patternHanja: results[0].hanja,
        confidence: results[0].confidence,
        treatment: results[0].treatment,
        formulas: results[0].formulas,
        bodyConstitution,
        selectedSymptoms: selectedSymptoms.map(id => {
          const found = symptomCategories.flatMap(c => c.symptoms).find(s => s.id === id)
          return found?.name || id
        }),
        selectedPulses: selectedPulses.map(id => {
          const found = pulseTypes.find(p => p.id === id)
          return found?.name || id
        }),
        selectedTongue,
        palGangAnalysis,
        allResults: results,
      }

      // 기존 진단 기록 가져오기
      const existingRecords = JSON.parse(localStorage.getItem('diagnosisRecords') || '[]')
      existingRecords.unshift(diagnosisRecord)
      localStorage.setItem('diagnosisRecords', JSON.stringify(existingRecords.slice(0, 50))) // 최근 50개만 유지

      // 성공 토스트 표시
      toast({
        title: '차트에 기록되었습니다',
        description: `${results[0].pattern} (${results[0].hanja}) 진단 결과가 저장되었습니다.`,
      })

      // 잠시 후 환자 관리 페이지로 이동 옵션 안내
      setTimeout(() => {
        toast({
          title: '환자 차트에서 확인하세요',
          description: '환자 관리 페이지에서 전체 기록을 확인할 수 있습니다.',
        })
      }, 1000)

    } catch {
      toast({
        title: '저장 실패',
        description: '차트 기록 중 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingToChart(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-500" />
            AI 변증 진단
          </h1>
          <p className="mt-1 text-gray-500">
            증상, 맥, 설을 입력하면 AI가 변증을 분석합니다
          </p>
        </div>
        {step !== 'symptoms' && (
          <button
            onClick={resetDiagnosis}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            처음부터
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between overflow-x-auto">
          {[
            { key: 'constitution', label: '체열/근실도', icon: Dumbbell },
            { key: 'symptoms', label: '증상 선택', icon: Activity },
            { key: 'pulse', label: '맥진', icon: CircleDot },
            { key: 'tongue', label: '설진', icon: Droplets },
            { key: 'palgang', label: '팔강변증', icon: Scale },
            { key: 'result', label: '결과', icon: Sparkles },
          ].map((s, index) => (
            <div key={s.key} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                  step === s.key
                    ? 'bg-purple-100 text-purple-700'
                    : results.length > 0 ||
                      (s.key === 'constitution' && bodyConstitution !== null) ||
                      (s.key === 'symptoms' && selectedSymptoms.length > 0) ||
                      (s.key === 'pulse' && selectedPulses.length > 0) ||
                      (s.key === 'tongue' && selectedTongue.length > 0) ||
                      (s.key === 'palgang' && palGangAnalysis !== null)
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-400'
                )}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden md:inline">{s.label}</span>
              </div>
              {index < 5 && <ChevronRight className="h-4 w-4 text-gray-300 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {step === 'constitution' && (
        <div className="space-y-6">
          <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4">
            <p className="text-indigo-700 text-sm">
              ⚡ <strong>이종대 선생님 기준:</strong>{' '}
              <TermTooltip term="체열">체열</TermTooltip>(몸이 차가운지/더운지)과{' '}
              <TermTooltip term="근실도">근실도</TermTooltip>(기운이 약한지/튼튼한지)는 처방 선택의 핵심입니다.
              이 두 가지만 정확히 파악하면 치료 확률 50% 이상, 부작용 최소화!
            </p>
          </div>

          <BodyConstitutionAssessment
            initialResult={bodyConstitution || undefined}
            onComplete={(result) => {
              setBodyConstitution(result)
              setStep('symptoms')
            }}
          />
        </div>
      )}

      {step === 'symptoms' && (
        <div className="space-y-6">
          <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
            <p className="text-purple-700 text-sm">
              💡 환자가 호소하는 증상을 모두 선택해주세요. 정확한 변증을 위해 가능한 많은 증상을 선택하세요.
            </p>
          </div>

          {symptomCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <category.icon className="h-5 w-5 text-purple-500" />
                <h3 className="font-bold text-gray-900">{category.name}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {category.symptoms.map((symptom) => (
                  <button
                    key={symptom.id}
                    onClick={() => toggleSymptom(symptom.id)}
                    className={cn(
                      'p-3 rounded-xl text-left transition-all',
                      selectedSymptoms.includes(symptom.id)
                        ? 'bg-purple-100 border-2 border-purple-500 text-purple-700'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 text-gray-700'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {selectedSymptoms.includes(symptom.id) ? (
                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="font-medium">{symptom.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              선택된 증상: <span className="font-bold text-purple-600">{selectedSymptoms.length}개</span>
            </p>
            <button
              onClick={() => setStep('pulse')}
              disabled={selectedSymptoms.length === 0}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                selectedSymptoms.length > 0
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              다음: 맥진 입력
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'pulse' && (
        <div className="space-y-6">
          <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
            <p className="text-purple-700 text-sm">
              💡 진맥에서 느껴지는 맥상을 선택해주세요. 복합맥(예: 현활맥)의 경우 해당하는 것을 모두 선택합니다.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">맥상 선택</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pulseTypes.map((pulse) => (
                <button
                  key={pulse.id}
                  onClick={() => togglePulse(pulse.id)}
                  className={cn(
                    'p-4 rounded-xl text-left transition-all',
                    selectedPulses.includes(pulse.id)
                      ? 'bg-purple-100 border-2 border-purple-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {selectedPulses.includes(pulse.id) ? (
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className="font-bold text-gray-900">{pulse.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">{pulse.hanja}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep('symptoms')}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              ← 이전
            </button>
            <button
              onClick={() => setStep('tongue')}
              className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
            >
              다음: 설진 입력
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'tongue' && (
        <div className="space-y-6">
          <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
            <p className="text-purple-700 text-sm">
              💡 혀의 상태를 관찰하여 해당하는 특징을 선택해주세요.
            </p>
          </div>

          {tongueFeatures.map((feature) => (
            <div
              key={feature.category}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="font-bold text-gray-900 mb-4">{feature.category}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {feature.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleTongue(option.id)}
                    className={cn(
                      'p-3 rounded-xl text-left transition-all',
                      selectedTongue.includes(option.id)
                        ? 'bg-purple-100 border-2 border-purple-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {selectedTongue.includes(option.id) ? (
                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="font-medium text-gray-900">{option.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep('pulse')}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              ← 이전
            </button>
            <button
              onClick={() => setStep('palgang')}
              className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
            >
              다음: 팔강변증
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'palgang' && (
        <div className="space-y-6">
          <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
            <p className="text-purple-700 text-sm">
              💡 수집된 정보를 바탕으로 팔강변증(음양, 표리, 한열, 허실)을 선택해주세요. AI가 자동으로 분석하거나 직접 선택할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 팔강변증 분석기 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <PalGangAnalyzer
                initialAnalysis={palGangAnalysis || undefined}
                onAnalysisChange={(analysis) => setPalGangAnalysis(analysis)}
              />
            </div>

            {/* 팔강변증 다이어그램 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">팔강변증 시각화</h3>
              {palGangAnalysis ? (
                <PalGangDiagram analysis={palGangAnalysis} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>왼쪽에서 팔강을 선택하면 다이어그램이 표시됩니다</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep('tongue')}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              ← 이전
            </button>
            <button
              onClick={analyzePatterns}
              disabled={analyzing}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              {analyzing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  변증 분석하기
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && results.length > 0 && (
        <div className="space-y-6">
          {/* 킬러 피처: 유사 환자 성공 사례 통계 */}
          <SimilarCaseSuccessCard
            chiefComplaint={results[0].pattern}
            symptoms={selectedSymptoms.map(id => {
              const found = symptomCategories.flatMap(c => c.symptoms).find(s => s.id === id)
              return { name: found?.name || id }
            })}
            diagnosis={results[0].pattern}
            bodyHeat={bodyConstitution?.bodyHeat}
            bodyStrength={bodyConstitution?.bodyStrength}
          />

          {/* AI 결과 면책 조항 */}
          <AIResultDisclaimer />

          {/* Main Result */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-purple-200 text-sm mb-1">AI 변증 결과</p>
                <h2 className="text-3xl font-bold">
                  {results[0].pattern} ({results[0].hanja})
                </h2>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                일치도 {results[0].confidence}%
              </div>
            </div>
            <p className="text-purple-100 mb-4">{results[0].description}</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-lg text-sm">
                <Flame className="h-3 w-3 inline mr-1" />
                치법: {results[0].treatment}
              </span>
            </div>
          </div>

          {/* 처방 전 필수 확인 사항 */}
          <PrescriptionDisclaimer />

          {/* Recommended Formulas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              추천 처방 <span className="text-xs font-normal text-gray-500">(참고용)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {results[0].formulas.map((formula, index) => (
                <div
                  key={formula}
                  className="p-4 bg-purple-50 rounded-xl border border-purple-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="font-bold text-purple-900">{formula}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Other Possible Patterns */}
          {results.length > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                감별 변증
              </h3>
              <div className="space-y-3">
                {results.slice(1).map((result) => (
                  <div
                    key={result.pattern}
                    className="p-4 bg-gray-50 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-gray-900">
                        {result.pattern} ({result.hanja})
                      </p>
                      <p className="text-sm text-gray-500">{result.description}</p>
                    </div>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium',
                        getConfidenceColor(result.confidence)
                      )}
                    >
                      {result.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 체열/근실도 결과 */}
          {bodyConstitution && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-indigo-500" />
                체열/근실도 평가 결과
              </h3>
              <p className="text-sm text-gray-500 mb-4">몸의 온기(차가운지/더운지)와 기운(약한지/튼튼한지) 상태</p>
              <div className="grid grid-cols-2 gap-4">
                <div className={cn(
                  'p-4 rounded-xl',
                  bodyConstitution.bodyHeat === 'cold' ? 'bg-blue-50 border border-blue-200' :
                  bodyConstitution.bodyHeat === 'hot' ? 'bg-orange-50 border border-orange-200' :
                  'bg-gray-50 border border-gray-200'
                )}>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <TermTooltip term="체열">체열</TermTooltip>
                    <span className="text-xs text-gray-400">(몸의 온기)</span>
                  </p>
                  <p className="font-bold text-lg">
                    {bodyConstitution.bodyHeat === 'cold' ? '한(寒) - 몸이 차가움' :
                     bodyConstitution.bodyHeat === 'hot' ? '열(熱) - 몸에 열이 많음' :
                     '평(平) - 균형 상태'}
                  </p>
                  <p className="text-sm text-gray-500">점수: {bodyConstitution.bodyHeatScore}</p>
                </div>
                <div className={cn(
                  'p-4 rounded-xl',
                  bodyConstitution.bodyStrength === 'deficient' ? 'bg-purple-50 border border-purple-200' :
                  bodyConstitution.bodyStrength === 'excess' ? 'bg-green-50 border border-green-200' :
                  'bg-gray-50 border border-gray-200'
                )}>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <TermTooltip term="근실도">근실도</TermTooltip>
                    <span className="text-xs text-gray-400">(기운 상태)</span>
                  </p>
                  <p className="font-bold text-lg">
                    {bodyConstitution.bodyStrength === 'deficient' ? '허(虛) - 기운이 약함' :
                     bodyConstitution.bodyStrength === 'excess' ? '실(實) - 기운이 충실함' :
                     '평(平) - 균형 상태'}
                  </p>
                  <p className="text-sm text-gray-500">점수: {bodyConstitution.bodyStrengthScore}</p>
                </div>
              </div>
            </div>
          )}

          {palGangAnalysis && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-purple-500" />
                팔강변증 분석
              </h3>
              <PalGangSummary analysis={palGangAnalysis} />
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              입력 요약
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">체열/근실도</p>
                <p className="font-medium text-gray-900">
                  {bodyConstitution
                    ? `${bodyConstitution.bodyHeat === 'cold' ? '한' : bodyConstitution.bodyHeat === 'hot' ? '열' : '평'}/${bodyConstitution.bodyStrength === 'deficient' ? '허' : bodyConstitution.bodyStrength === 'excess' ? '실' : '평'}`
                    : '미평가'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">선택된 증상</p>
                <p className="font-medium text-gray-900">{selectedSymptoms.length}개</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">맥상</p>
                <p className="font-medium text-gray-900">
                  {selectedPulses
                    .map((id) => pulseTypes.find((p) => p.id === id)?.name)
                    .filter(Boolean)
                    .join(', ') || '미선택'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">설진</p>
                <p className="font-medium text-gray-900">
                  {selectedTongue.length > 0 ? `${selectedTongue.length}개 특징` : '미선택'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">팔강변증</p>
                <p className="font-medium text-gray-900">
                  {palGangAnalysis ? '입력됨' : '미선택'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetDiagnosis}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              새로운 진단
            </button>
            <button
              onClick={saveToChart}
              disabled={isSavingToChart}
              className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingToChart ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  차트에 기록
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
