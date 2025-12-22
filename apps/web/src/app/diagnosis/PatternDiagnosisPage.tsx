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
  Wind,
  Droplets,
  Flame,
  CircleDot,
  ArrowRight,
  RotateCcw,
  FileText,
  Pill,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  '심혈허': {
    hanja: '心血虛',
    description: '심장의 혈이 부족한 상태',
    treatment: '보혈양심(補血養心)',
    formulas: ['귀비탕', '천왕보심단', '양심탕'],
  },
  '비기허': {
    hanja: '脾氣虛',
    description: '비장의 기가 허약한 상태',
    treatment: '건비익기(健脾益氣)',
    formulas: ['사군자탕', '삼령백출산', '보중익기탕'],
  },
  '신양허': {
    hanja: '腎陽虛',
    description: '신장의 양기가 부족한 상태',
    treatment: '온보신양(溫補腎陽)',
    formulas: ['팔미지황환', '우귀환', '금궤신기환'],
  },
  '담음': {
    hanja: '痰飮',
    description: '체내에 담음(병리적 수액)이 정체된 상태',
    treatment: '화담(化痰)',
    formulas: ['이진탕', '온담탕', '도담탕'],
  },
  '어혈': {
    hanja: '瘀血',
    description: '혈액 순환이 정체되어 어혈이 형성된 상태',
    treatment: '활혈거어(活血祛瘀)',
    formulas: ['혈부축어탕', '도핵승기탕', '통규활혈탕'],
  },
  '습열': {
    hanja: '濕熱',
    description: '습과 열이 결합된 병리 상태',
    treatment: '청열이습(清熱利濕)',
    formulas: ['인진호탕', '용담사간탕', '삼인탕'],
  },
  '풍한': {
    hanja: '風寒',
    description: '풍한사가 침범한 표증',
    treatment: '신온해표(辛溫解表)',
    formulas: ['마황탕', '계지탕', '갈근탕'],
  },
}

export default function PatternDiagnosisPage() {
  const [step, setStep] = useState<'symptoms' | 'pulse' | 'tongue' | 'result'>('symptoms')
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [selectedPulses, setSelectedPulses] = useState<string[]>([])
  const [selectedTongue, setSelectedTongue] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<PatternResult[]>([])

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
    setStep('symptoms')
    setSelectedSymptoms([])
    setSelectedPulses([])
    setSelectedTongue([])
    setResults([])
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100'
    if (confidence >= 60) return 'text-amber-600 bg-amber-100'
    return 'text-gray-600 bg-gray-100'
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
        <div className="flex items-center justify-between">
          {[
            { key: 'symptoms', label: '증상 선택', icon: Activity },
            { key: 'pulse', label: '맥진 입력', icon: CircleDot },
            { key: 'tongue', label: '설진 입력', icon: Droplets },
            { key: 'result', label: '변증 결과', icon: Sparkles },
          ].map((s, index) => (
            <div key={s.key} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
                  step === s.key
                    ? 'bg-purple-100 text-purple-700'
                    : results.length > 0 ||
                      (s.key === 'symptoms' && selectedSymptoms.length > 0) ||
                      (s.key === 'pulse' && selectedPulses.length > 0) ||
                      (s.key === 'tongue' && selectedTongue.length > 0)
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-400'
                )}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </div>
              {index < 3 && <ChevronRight className="h-4 w-4 text-gray-300 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
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

          {/* Recommended Formulas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              추천 처방
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

          {/* Summary */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              입력 요약
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
            <button className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors">
              차트에 기록
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
