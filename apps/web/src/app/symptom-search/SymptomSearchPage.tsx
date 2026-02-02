import { useState, useMemo } from 'react'
import {
  Search,
  X,
  Sparkles,
  ChevronRight,
  Plus,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Zap,
  TrendingUp,
  Thermometer,
  Brain,
  Heart,
  Activity,
  Moon,
  Droplets,
  Wind,
  Eye,
  BookOpen,
  Leaf,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Symptom {
  id: string
  name: string
  category: string
}

interface FormulaHerb {
  name: string
  hanja: string
  amount: string
  role: '군' | '신' | '좌' | '사'
}

interface FormulaResult {
  id: string
  name: string
  hanja: string
  category: string
  matchScore: number
  matchedSymptoms: string[]
  indication: string
  keyHerbs: string[]
  // 상세 정보
  source?: string
  pathogenesis?: string
  contraindications?: string[]
  herbs?: FormulaHerb[]
}

interface QuickPreset {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  symptoms: string[]
  description: string
}

// 카테고리별 아이콘과 색상
const categoryStyles: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  '전신': { icon: <Activity className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  '두면부': { icon: <Eye className="h-4 w-4" />, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  '흉복부': { icon: <Heart className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-50' },
  '사지': { icon: <Wind className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-50' },
  '정신': { icon: <Brain className="h-4 w-4" />, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  '부인과': { icon: <Moon className="h-4 w-4" />, color: 'text-pink-600', bgColor: 'bg-pink-50' },
  '비뇨기': { icon: <Droplets className="h-4 w-4" />, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
}

// 빠른 증상 조합 프리셋
const quickPresets: QuickPreset[] = [
  {
    id: 'cold',
    name: '감기',
    icon: <Thermometer className="h-5 w-5" />,
    color: 'from-blue-500 to-cyan-500',
    symptoms: ['발열', '오한', '두통', '인후통'],
    description: '발열, 오한, 두통 등 감기 증상',
  },
  {
    id: 'digestion',
    name: '소화불량',
    icon: <Activity className="h-5 w-5" />,
    color: 'from-orange-500 to-amber-500',
    symptoms: ['오심', '구토', '복통', '복창'],
    description: '소화기 관련 증상',
  },
  {
    id: 'insomnia',
    name: '불면증',
    icon: <Moon className="h-5 w-5" />,
    color: 'from-indigo-500 to-purple-500',
    symptoms: ['불면', '불안', '심계', '다몽'],
    description: '수면 장애 관련 증상',
  },
  {
    id: 'fatigue',
    name: '만성피로',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'from-green-500 to-emerald-500',
    symptoms: ['피로', '무력감', '현훈', '자한'],
    description: '기력 저하 관련 증상',
  },
  {
    id: 'pain',
    name: '근골격통증',
    icon: <Zap className="h-5 w-5" />,
    color: 'from-red-500 to-rose-500',
    symptoms: ['요통', '관절통', '사지마비', '수족냉'],
    description: '관절, 근육 통증',
  },
  {
    id: 'gynecology',
    name: '부인과',
    icon: <Heart className="h-5 w-5" />,
    color: 'from-pink-500 to-rose-400',
    symptoms: ['월경불조', '월경통', '대하'],
    description: '여성 건강 관련 증상',
  },
]

// 함께 자주 선택되는 증상 연관 관계
const relatedSymptoms: Record<string, string[]> = {
  '발열': ['오한', '두통', '피로'],
  '오한': ['발열', '두통', '해수'],
  '피로': ['무력감', '현훈', '자한'],
  '무력감': ['피로', '현훈', '식욕부진'],
  '두통': ['현훈', '이명', '목적'],
  '현훈': ['이명', '두통', '오심'],
  '심계': ['불안', '불면', '흉민'],
  '불면': ['불안', '심계', '다몽'],
  '불안': ['불면', '심계', '울증'],
  '해수': ['천식', '흉민', '발열'],
  '구토': ['오심', '복통', '설사'],
  '오심': ['구토', '현훈', '복창'],
  '복통': ['설사', '복창', '구토'],
  '설사': ['복통', '복창', '피로'],
  '요통': ['관절통', '사지마비', '수족냉'],
  '관절통': ['요통', '사지마비', '부종'],
  '월경불조': ['월경통', '피로', '현훈'],
  '월경통': ['월경불조', '복통', '요통'],
}

const symptomCategories = [
  { name: '전신', symptoms: ['발열', '오한', '피로', '무력감', '자한', '도한', '부종'] },
  { name: '두면부', symptoms: ['두통', '현훈', '이명', '목적', '비색', '인후통', '구안와사'] },
  { name: '흉복부', symptoms: ['흉민', '심계', '해수', '천식', '구토', '오심', '복통', '복창', '설사', '변비'] },
  { name: '사지', symptoms: ['요통', '관절통', '사지마비', '수족냉', '수족열'] },
  { name: '정신', symptoms: ['불면', '다몽', '건망', '불안', '울증', '심번'] },
  { name: '부인과', symptoms: ['월경불조', '월경통', '대하', '붕루', '임신오저'] },
  { name: '비뇨기', symptoms: ['소변불리', '빈뇨', '야뇨', '유정'] },
]

const allSymptoms = symptomCategories.flatMap((cat) =>
  cat.symptoms.map((s) => ({ id: s, name: s, category: cat.name }))
)

const formulaDatabase: FormulaResult[] = [
  {
    id: '1',
    name: '소시호탕',
    hanja: '小柴胡湯',
    category: '화해제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '왕래한열, 흉협고만, 묵묵불욕식, 심번희구, 구고, 인건, 목현',
    keyHerbs: ['시호', '황금', '반하', '인삼'],
    source: '상한론',
    pathogenesis: '소양병의 반표반리 상태로, 사기가 표에서 이로 들어가는 과정에서 발생',
    contraindications: ['양명병 환자 금기', '진액휴손 환자 주의'],
    herbs: [
      { name: '시호', hanja: '柴胡', amount: '12g', role: '군' },
      { name: '황금', hanja: '黃芩', amount: '9g', role: '신' },
      { name: '반하', hanja: '半夏', amount: '9g', role: '좌' },
      { name: '인삼', hanja: '人蔘', amount: '6g', role: '좌' },
      { name: '생강', hanja: '生薑', amount: '6g', role: '좌' },
      { name: '대조', hanja: '大棗', amount: '4매', role: '사' },
      { name: '감초', hanja: '甘草', amount: '3g', role: '사' },
    ],
  },
  {
    id: '2',
    name: '보중익기탕',
    hanja: '補中益氣湯',
    category: '보익제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '비위기허, 사지무력, 중기하함, 탈항, 자궁하수, 만성설사',
    keyHerbs: ['황기', '인삼', '백출', '당귀'],
    source: '비위론',
    pathogenesis: '비위기허로 인해 중기가 하함하여 발생하는 제반 증상',
    contraindications: ['외감병 초기 환자 금기', '음허화왕 환자 주의', '실열증 환자 금기'],
    herbs: [
      { name: '황기', hanja: '黃芪', amount: '15g', role: '군' },
      { name: '인삼', hanja: '人蔘', amount: '9g', role: '신' },
      { name: '백출', hanja: '白朮', amount: '9g', role: '신' },
      { name: '당귀', hanja: '當歸', amount: '6g', role: '좌' },
      { name: '진피', hanja: '陳皮', amount: '6g', role: '좌' },
      { name: '승마', hanja: '升麻', amount: '3g', role: '좌' },
      { name: '시호', hanja: '柴胡', amount: '3g', role: '좌' },
      { name: '감초', hanja: '甘草', amount: '6g', role: '사' },
    ],
  },
  {
    id: '3',
    name: '귀비탕',
    hanja: '歸脾湯',
    category: '보익제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '심비양허, 건망, 불면, 심계, 맥세약, 식소체권, 붕루',
    keyHerbs: ['인삼', '황기', '당귀', '용안육', '산조인'],
    source: '제생방',
    pathogenesis: '심비양허로 기혈이 부족하고 심신이 실양되어 발생',
    contraindications: ['외감병 환자 금기', '실열증 환자 금기', '담습 심한 환자 주의'],
    herbs: [
      { name: '인삼', hanja: '人蔘', amount: '9g', role: '군' },
      { name: '황기', hanja: '黃芪', amount: '12g', role: '군' },
      { name: '백출', hanja: '白朮', amount: '9g', role: '신' },
      { name: '복신', hanja: '茯神', amount: '9g', role: '신' },
      { name: '산조인', hanja: '酸棗仁', amount: '9g', role: '좌' },
      { name: '용안육', hanja: '龍眼肉', amount: '9g', role: '좌' },
      { name: '당귀', hanja: '當歸', amount: '6g', role: '좌' },
      { name: '원지', hanja: '遠志', amount: '6g', role: '좌' },
      { name: '목향', hanja: '木香', amount: '3g', role: '좌' },
      { name: '감초', hanja: '甘草', amount: '3g', role: '사' },
    ],
  },
  {
    id: '4',
    name: '소청룡탕',
    hanja: '小靑龍湯',
    category: '해표제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '외한내음, 오한발열, 무한, 해수, 담다청희, 흉만, 천급',
    keyHerbs: ['마황', '계지', '세신', '반하', '오미자'],
    source: '상한론',
    pathogenesis: '외감풍한으로 표가 막히고, 한음이 폐에 정체되어 발생',
    contraindications: ['음허화왕 환자 금기', '출혈 경향 환자 주의', '고혈압 환자 신중 투여'],
    herbs: [
      { name: '마황', hanja: '麻黃', amount: '9g', role: '군' },
      { name: '계지', hanja: '桂枝', amount: '6g', role: '신' },
      { name: '작약', hanja: '芍藥', amount: '6g', role: '신' },
      { name: '세신', hanja: '細辛', amount: '3g', role: '좌' },
      { name: '건강', hanja: '乾薑', amount: '3g', role: '좌' },
      { name: '반하', hanja: '半夏', amount: '6g', role: '좌' },
      { name: '오미자', hanja: '五味子', amount: '3g', role: '좌' },
      { name: '감초', hanja: '甘草', amount: '3g', role: '사' },
    ],
  },
  {
    id: '5',
    name: '반하사심탕',
    hanja: '半夏瀉心湯',
    category: '화해제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '한열호결, 심하비경, 오심구토, 장명설사',
    keyHerbs: ['반하', '황금', '황련', '인삼', '건강'],
    source: '상한론',
    pathogenesis: '한열이 중초에 호결하여 비위의 승강 기능이 실조되어 발생',
    contraindications: ['허한 환자 주의', '음허 환자 신중'],
    herbs: [
      { name: '반하', hanja: '半夏', amount: '12g', role: '군' },
      { name: '황금', hanja: '黃芩', amount: '9g', role: '신' },
      { name: '황련', hanja: '黃連', amount: '3g', role: '신' },
      { name: '건강', hanja: '乾薑', amount: '6g', role: '좌' },
      { name: '인삼', hanja: '人蔘', amount: '9g', role: '좌' },
      { name: '대조', hanja: '大棗', amount: '4매', role: '사' },
      { name: '감초', hanja: '甘草', amount: '6g', role: '사' },
    ],
  },
  {
    id: '6',
    name: '천왕보심단',
    hanja: '天王補心丹',
    category: '안신제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '심신부족, 불면다몽, 심계정충, 건망, 대변건조, 구설생창',
    keyHerbs: ['생지황', '인삼', '단삼', '현삼', '산조인'],
    source: '세의득효방',
    pathogenesis: '심음부족, 음허내열로 심신이 불안하여 발생',
    contraindications: ['비위허약 환자 주의', '설사 환자 금기'],
    herbs: [
      { name: '생지황', hanja: '生地黃', amount: '120g', role: '군' },
      { name: '인삼', hanja: '人蔘', amount: '15g', role: '신' },
      { name: '단삼', hanja: '丹蔘', amount: '15g', role: '신' },
      { name: '현삼', hanja: '玄蔘', amount: '15g', role: '신' },
      { name: '산조인', hanja: '酸棗仁', amount: '30g', role: '좌' },
      { name: '백자인', hanja: '柏子仁', amount: '30g', role: '좌' },
      { name: '원지', hanja: '遠志', amount: '15g', role: '좌' },
      { name: '오미자', hanja: '五味子', amount: '30g', role: '좌' },
    ],
  },
  {
    id: '7',
    name: '사물탕',
    hanja: '四物湯',
    category: '보익제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '혈허, 월경불조, 월경통, 안색위황, 현훈, 심계',
    keyHerbs: ['숙지황', '당귀', '백작약', '천궁'],
    source: '태평혜민화제국방',
    pathogenesis: '영혈부족으로 장부, 경락이 실양되어 발생',
    contraindications: ['소화불량 환자 주의', '음허화왕 환자는 숙지황을 생지황으로 대체'],
    herbs: [
      { name: '숙지황', hanja: '熟地黃', amount: '12g', role: '군' },
      { name: '당귀', hanja: '當歸', amount: '9g', role: '신' },
      { name: '백작약', hanja: '白芍藥', amount: '9g', role: '좌' },
      { name: '천궁', hanja: '川芎', amount: '6g', role: '사' },
    ],
  },
  {
    id: '8',
    name: '육미지황환',
    hanja: '六味地黃丸',
    category: '보익제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '신음허, 요슬산연, 두훈이명, 유정, 도한, 소갈, 골증조열',
    keyHerbs: ['숙지황', '산수유', '산약', '택사', '목단피', '복령'],
    source: '소아약증직결',
    pathogenesis: '신음부족으로 허화가 상염하여 발생하는 제반 증상',
    contraindications: ['비위허약 환자 주의', '설사 환자 금기'],
    herbs: [
      { name: '숙지황', hanja: '熟地黃', amount: '24g', role: '군' },
      { name: '산수유', hanja: '山茱萸', amount: '12g', role: '신' },
      { name: '산약', hanja: '山藥', amount: '12g', role: '신' },
      { name: '택사', hanja: '澤瀉', amount: '9g', role: '좌' },
      { name: '목단피', hanja: '牧丹皮', amount: '9g', role: '좌' },
      { name: '복령', hanja: '茯苓', amount: '9g', role: '좌' },
    ],
  },
  {
    id: '9',
    name: '독활기생탕',
    hanja: '獨活寄生湯',
    category: '거풍습제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '간신양허, 풍한습비, 요슬냉통, 지절굴신불리, 하지마비',
    keyHerbs: ['독활', '상기생', '두충', '우슬', '숙지황'],
    source: '비급천금요방',
    pathogenesis: '간신부족, 기혈허약에 풍한습이 침습하여 발생하는 비증',
    contraindications: ['음허화왕 환자 주의', '습열비증 환자 금기'],
    herbs: [
      { name: '독활', hanja: '獨活', amount: '9g', role: '군' },
      { name: '상기생', hanja: '桑寄生', amount: '12g', role: '신' },
      { name: '두충', hanja: '杜冲', amount: '9g', role: '신' },
      { name: '우슬', hanja: '牛膝', amount: '9g', role: '좌' },
      { name: '숙지황', hanja: '熟地黃', amount: '12g', role: '좌' },
      { name: '당귀', hanja: '當歸', amount: '9g', role: '좌' },
      { name: '백작약', hanja: '白芍藥', amount: '9g', role: '좌' },
      { name: '감초', hanja: '甘草', amount: '3g', role: '사' },
    ],
  },
  {
    id: '10',
    name: '온담탕',
    hanja: '溫膽湯',
    category: '이기제',
    matchScore: 0,
    matchedSymptoms: [],
    indication: '담열내요, 허번불면, 경계불안, 구역, 현훈',
    keyHerbs: ['반하', '진피', '복령', '지실', '죽여'],
    source: '삼인극일병증방론',
    pathogenesis: '담화내요, 담열상요로 심신이 불안하여 발생',
    contraindications: ['음허 환자 주의', '열담 심한 환자는 황련 가미'],
    herbs: [
      { name: '반하', hanja: '半夏', amount: '6g', role: '군' },
      { name: '진피', hanja: '陳皮', amount: '9g', role: '신' },
      { name: '복령', hanja: '茯苓', amount: '6g', role: '좌' },
      { name: '지실', hanja: '枳實', amount: '6g', role: '좌' },
      { name: '죽여', hanja: '竹茹', amount: '6g', role: '좌' },
      { name: '생강', hanja: '生薑', amount: '3g', role: '사' },
      { name: '감초', hanja: '甘草', amount: '3g', role: '사' },
    ],
  },
]

const symptomToFormulas: Record<string, string[]> = {
  '발열': ['소시호탕', '소청룡탕'],
  '오한': ['소청룡탕', '소시호탕'],
  '피로': ['보중익기탕', '귀비탕'],
  '무력감': ['보중익기탕', '귀비탕'],
  '자한': ['보중익기탕'],
  '도한': ['육미지황환'],
  '두통': ['소시호탕', '천왕보심단'],
  '현훈': ['귀비탕', '사물탕', '육미지황환', '온담탕'],
  '이명': ['육미지황환'],
  '흉민': ['소시호탕'],
  '심계': ['귀비탕', '천왕보심단', '사물탕'],
  '해수': ['소청룡탕'],
  '구토': ['반하사심탕', '소시호탕'],
  '오심': ['반하사심탕', '소시호탕'],
  '복통': ['반하사심탕'],
  '설사': ['보중익기탕', '반하사심탕'],
  '변비': ['천왕보심단'],
  '요통': ['독활기생탕', '육미지황환'],
  '관절통': ['독활기생탕'],
  '사지마비': ['독활기생탕'],
  '수족냉': ['독활기생탕'],
  '불면': ['귀비탕', '천왕보심단', '온담탕'],
  '다몽': ['천왕보심단'],
  '건망': ['귀비탕', '천왕보심단'],
  '불안': ['귀비탕', '온담탕'],
  '울증': ['소시호탕'],
  '월경불조': ['사물탕', '귀비탕'],
  '월경통': ['사물탕'],
  '유정': ['육미지황환'],
}

// 군신좌사 색상
const roleColors: Record<string, { bg: string; text: string; label: string }> = {
  '군': { bg: 'bg-red-100', text: 'text-red-700', label: '君' },
  '신': { bg: 'bg-orange-100', text: 'text-orange-700', label: '臣' },
  '좌': { bg: 'bg-blue-100', text: 'text-blue-700', label: '佐' },
  '사': { bg: 'bg-green-100', text: 'text-green-700', label: '使' },
}

export default function SymptomSearchPage() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<FormulaResult[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedFormula, setSelectedFormula] = useState<FormulaResult | null>(null)

  // 실시간 처방 미리보기 계산
  const previewFormulas = useMemo(() => {
    if (selectedSymptoms.length === 0) return []

    const formulaScores: Record<string, { score: number; matched: string[] }> = {}

    selectedSymptoms.forEach((symptom) => {
      const matchingFormulas = symptomToFormulas[symptom.name] || []
      matchingFormulas.forEach((formulaName) => {
        if (!formulaScores[formulaName]) {
          formulaScores[formulaName] = { score: 0, matched: [] }
        }
        formulaScores[formulaName].score += 1
        formulaScores[formulaName].matched.push(symptom.name)
      })
    })

    return formulaDatabase
      .map((formula) => ({
        ...formula,
        matchScore: formulaScores[formula.name]?.score || 0,
        matchedSymptoms: formulaScores[formula.name]?.matched || [],
      }))
      .filter((f) => f.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3)
  }, [selectedSymptoms])

  // 스마트 추천 증상 (선택된 증상과 관련된 증상들)
  const suggestedSymptoms = useMemo(() => {
    if (selectedSymptoms.length === 0) return []

    const suggestions = new Set<string>()
    const selectedNames = new Set(selectedSymptoms.map((s) => s.name))

    selectedSymptoms.forEach((symptom) => {
      const related = relatedSymptoms[symptom.name] || []
      related.forEach((r) => {
        if (!selectedNames.has(r)) {
          suggestions.add(r)
        }
      })
    })

    return Array.from(suggestions).slice(0, 6)
  }, [selectedSymptoms])

  const handleAddSymptom = (symptom: Symptom) => {
    if (!selectedSymptoms.find((s) => s.id === symptom.id)) {
      setSelectedSymptoms([...selectedSymptoms, symptom])
    }
  }

  const handleRemoveSymptom = (symptomId: string) => {
    setSelectedSymptoms(selectedSymptoms.filter((s) => s.id !== symptomId))
  }

  const handlePresetClick = (preset: QuickPreset) => {
    const newSymptoms = preset.symptoms.map((s) => {
      const found = allSymptoms.find((as) => as.name === s)
      return found || { id: s, name: s, category: '기타' }
    })
    setSelectedSymptoms(newSymptoms)
  }

  const handleSearch = () => {
    if (selectedSymptoms.length === 0) return

    const formulaScores: Record<string, { score: number; matched: string[] }> = {}

    selectedSymptoms.forEach((symptom) => {
      const matchingFormulas = symptomToFormulas[symptom.name] || []
      matchingFormulas.forEach((formulaName) => {
        if (!formulaScores[formulaName]) {
          formulaScores[formulaName] = { score: 0, matched: [] }
        }
        formulaScores[formulaName].score += 1
        formulaScores[formulaName].matched.push(symptom.name)
      })
    })

    const scoredResults = formulaDatabase
      .map((formula) => ({
        ...formula,
        matchScore: formulaScores[formula.name]?.score || 0,
        matchedSymptoms: formulaScores[formula.name]?.matched || [],
      }))
      .filter((f) => f.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)

    setResults(scoredResults)
    setShowResults(true)
  }

  const filteredSymptoms = allSymptoms.filter((s) =>
    s.name.includes(searchQuery)
  )

  const getCategoryStyle = (categoryName: string) => {
    return categoryStyles[categoryName] || { icon: <Activity className="h-4 w-4" />, color: 'text-gray-600', bgColor: 'bg-gray-50' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Search className="h-7 w-7 text-indigo-500" />
          증상→처방 검색
        </h1>
        <p className="mt-1 text-gray-500">
          증상을 선택하면 적합한 처방을 추천해 드립니다
        </p>
      </div>

      {/* Quick Presets */}
      {!showResults && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="font-bold text-gray-900">빠른 증상 조합</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'group relative p-4 rounded-xl border-2 border-transparent bg-gradient-to-br text-white transition-all hover:scale-105 hover:shadow-lg',
                  preset.color
                )}
              >
                <div className="flex flex-col items-center gap-2">
                  {preset.icon}
                  <span className="font-bold">{preset.name}</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-center px-2">{preset.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Symptoms with Real-time Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            선택된 증상
            {selectedSymptoms.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                {selectedSymptoms.length}개
              </span>
            )}
          </h2>
          {selectedSymptoms.length > 0 && (
            <button
              onClick={() => setSelectedSymptoms([])}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              모두 지우기
            </button>
          )}
        </div>

        {selectedSymptoms.length === 0 ? (
          <p className="text-gray-400 text-center py-6 bg-gray-50 rounded-xl">
            아래에서 증상을 선택하거나, 위의 빠른 조합을 클릭하세요
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {selectedSymptoms.map((symptom) => {
                const style = getCategoryStyle(symptom.category)
                return (
                  <span
                    key={symptom.id}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all animate-in fade-in slide-in-from-bottom-2 duration-200',
                      style.bgColor,
                      style.color
                    )}
                  >
                    {style.icon}
                    {symptom.name}
                    <button
                      onClick={() => handleRemoveSymptom(symptom.id)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )
              })}
            </div>

            {/* Real-time Formula Preview */}
            {previewFormulas.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  예상 추천 처방
                </p>
                <div className="flex flex-wrap gap-2">
                  {previewFormulas.map((formula, index) => (
                    <div
                      key={formula.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                        index === 0
                          ? 'bg-indigo-100 text-indigo-700 font-semibold'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      <FlaskConical className="h-4 w-4" />
                      {formula.name}
                      <span className="text-xs opacity-75">
                        ({formula.matchScore}/{selectedSymptoms.length})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Symptom Suggestions */}
            {suggestedSymptoms.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  함께 자주 선택되는 증상
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedSymptoms.map((symptomName) => {
                    const symptom = allSymptoms.find((s) => s.name === symptomName)
                    if (!symptom) return null
                    const style = getCategoryStyle(symptom.category)
                    return (
                      <button
                        key={symptomName}
                        onClick={() => handleAddSymptom(symptom)}
                        className={cn(
                          'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border-2 border-dashed transition-all hover:scale-105',
                          'border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {symptomName}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={selectedSymptoms.length === 0}
          className="w-full mt-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="h-5 w-5" />
          처방 검색 ({selectedSymptoms.length}개 증상)
        </button>
      </div>

      {/* Symptom Selection */}
      {!showResults && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Quick Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="증상 검색..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeCategory === null
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            {symptomCategories.map((cat) => {
              const style = getCategoryStyle(cat.name)
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeCategory === cat.name
                      ? `${style.bgColor} ${style.color}`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {style.icon}
                  {cat.name}
                </button>
              )
            })}
          </div>

          {searchQuery ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">
                검색 결과 ({filteredSymptoms.length}건)
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredSymptoms.map((symptom) => {
                  const isSelected = selectedSymptoms.some((s) => s.id === symptom.id)
                  const style = getCategoryStyle(symptom.category)
                  return (
                    <button
                      key={symptom.id}
                      onClick={() => handleAddSymptom(symptom)}
                      disabled={isSelected}
                      className={cn(
                        'px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                        isSelected
                          ? `${style.bgColor} ${style.color}`
                          : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-105'
                      )}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {symptom.name}
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        isSelected ? 'bg-black/10' : 'bg-gray-200'
                      )}>
                        {symptom.category}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {symptomCategories
                .filter((cat) => activeCategory === null || activeCategory === cat.name)
                .map((category) => {
                  const style = getCategoryStyle(category.name)
                  return (
                    <div key={category.name} className="animate-in fade-in duration-300">
                      <h3 className={cn(
                        'font-semibold mb-3 flex items-center gap-2 pb-2 border-b',
                        style.color
                      )}>
                        {style.icon}
                        {category.name}
                        <span className="text-gray-400 font-normal text-sm">
                          ({category.symptoms.length})
                        </span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {category.symptoms.map((symptom) => {
                          const isSelected = selectedSymptoms.some((s) => s.name === symptom)
                          return (
                            <button
                              key={symptom}
                              onClick={() => handleAddSymptom({ id: symptom, name: symptom, category: category.name })}
                              className={cn(
                                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                                isSelected
                                  ? `${style.bgColor} ${style.color} ring-2 ring-offset-1 ring-current`
                                  : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-105 hover:shadow-sm'
                              )}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4 opacity-50" />
                              )}
                              {symptom}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-indigo-500" />
              추천 처방
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                {results.length}건
              </span>
            </h2>
            <button
              onClick={() => setShowResults(false)}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              증상 수정
            </button>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">선택한 증상에 맞는 처방을 찾지 못했습니다</p>
              <button
                onClick={() => setShowResults(false)}
                className="mt-4 text-indigo-600 hover:underline"
              >
                다른 증상으로 검색
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((formula, index) => (
                <div
                  key={formula.id}
                  className={cn(
                    'bg-white rounded-2xl shadow-sm border p-6 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-300',
                    index === 0 ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-gray-100'
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {index === 0 && (
                        <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          최적 추천
                        </span>
                      )}
                      {index === 1 && (
                        <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                          2순위
                        </span>
                      )}
                      {index === 2 && (
                        <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                          3순위
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <div className="text-2xl font-bold text-indigo-600">
                          {Math.round((formula.matchScore / selectedSymptoms.length) * 100)}%
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">일치도</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                      <FlaskConical className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{formula.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{formula.hanja}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {formula.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      일치 증상
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formula.matchedSymptoms.map((symptom, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-lg font-medium"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-1">주치</p>
                    <p className="text-gray-700">{formula.indication}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-500">주요 약재:</span>
                      {formula.keyHerbs.slice(0, 5).map((herb, i) => (
                        <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs rounded-lg font-medium">
                          {herb}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => setSelectedFormula(formula)}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium text-sm hover:underline"
                    >
                      상세 보기
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formula Detail Modal */}
      {selectedFormula && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedFormula(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FlaskConical className="h-8 w-8" />
                    <div>
                      <h2 className="text-2xl font-bold">{selectedFormula.name}</h2>
                      <p className="text-white/80">{selectedFormula.hanja}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                      {selectedFormula.category}
                    </span>
                    {selectedFormula.source && (
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {selectedFormula.source}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFormula(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Pathogenesis */}
              {selectedFormula.pathogenesis && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-indigo-500" />
                    병기 (病機)
                  </h3>
                  <p className="text-gray-700 bg-indigo-50 p-4 rounded-xl">
                    {selectedFormula.pathogenesis}
                  </p>
                </div>
              )}

              {/* Indication */}
              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  주치 (主治)
                </h3>
                <p className="text-gray-700 bg-green-50 p-4 rounded-xl">
                  {selectedFormula.indication}
                </p>
              </div>

              {/* Contraindications */}
              {selectedFormula.contraindications && selectedFormula.contraindications.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    금기 및 주의
                  </h3>
                  <ul className="space-y-2">
                    {selectedFormula.contraindications.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-gray-700 bg-amber-50 p-3 rounded-lg"
                      >
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Herbs Table */}
              {selectedFormula.herbs && selectedFormula.herbs.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-emerald-500" />
                    구성 약재 (君臣佐使)
                  </h3>

                  {/* Role Legend */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(roleColors).map(([role, style]) => (
                      <span
                        key={role}
                        className={cn(
                          'px-3 py-1 rounded-lg text-xs font-medium',
                          style.bg,
                          style.text
                        )}
                      >
                        {style.label} ({role})
                      </span>
                    ))}
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">역할</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">약재</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">한자</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">용량</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFormula.herbs.map((herb, i) => {
                          const roleStyle = roleColors[herb.role]
                          return (
                            <tr
                              key={i}
                              className={cn(
                                'border-b border-gray-100 last:border-b-0',
                                i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              )}
                            >
                              <td className="px-4 py-3">
                                <span className={cn(
                                  'px-2.5 py-1 rounded-lg text-xs font-bold',
                                  roleStyle.bg,
                                  roleStyle.text
                                )}>
                                  {roleStyle.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {herb.name}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {herb.hanja}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-700 font-mono">
                                {herb.amount}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Matched Symptoms in Modal */}
              {selectedFormula.matchedSymptoms.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    일치 증상 ({selectedFormula.matchedSymptoms.length}개)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedFormula.matchedSymptoms.map((symptom, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg font-medium text-sm"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => setSelectedFormula(null)}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
