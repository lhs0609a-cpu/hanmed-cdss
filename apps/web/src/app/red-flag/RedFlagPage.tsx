import { useState } from 'react'
import {
  AlertTriangle,
  Search,
  Shield,
  Phone,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Clock,
  Heart,
  Brain,
  Bone,
  Stethoscope,
  Thermometer,
  Activity,
  AlertCircle,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SymptomCategory {
  id: string
  name: string
  icon: React.ElementType
  color: string
  symptoms: Symptom[]
}

interface Symptom {
  id: string
  name: string
  description: string
}

interface RedFlag {
  id: string
  severity: 'critical' | 'urgent' | 'moderate'
  condition: string
  description: string
  symptoms: string[]
  action: string
  referral: string
  mustAsk: string[]
  timeframe: string
}

const symptomCategories: SymptomCategory[] = [
  {
    id: 'head',
    name: '두통/두면부',
    icon: Brain,
    color: 'purple',
    symptoms: [
      { id: 'sudden-severe-headache', name: '갑자기 시작된 심한 두통', description: '평생 처음 느끼는 강도의 두통' },
      { id: 'thunderclap', name: '벼락두통', description: '1분 내 최고 강도 도달' },
      { id: 'headache-with-fever', name: '두통 + 발열', description: '38도 이상의 열과 함께' },
      { id: 'headache-with-stiff-neck', name: '두통 + 경부 강직', description: '목을 굽히기 어려움' },
      { id: 'headache-with-vomiting', name: '두통 + 구토', description: '분출성 구토 동반' },
      { id: 'headache-vision-change', name: '두통 + 시력 변화', description: '시야 장애, 복시 동반' },
      { id: 'headache-weakness', name: '두통 + 편측 마비', description: '한쪽 팔다리 힘 빠짐' },
      { id: 'chronic-worsening', name: '점점 악화되는 만성 두통', description: '수주에 걸쳐 악화' },
      { id: 'headache-after-trauma', name: '외상 후 두통', description: '머리 다친 후 발생' },
      { id: 'morning-headache', name: '아침에 심한 두통', description: '기상 시 최악, 구토 동반' },
    ],
  },
  {
    id: 'chest',
    name: '흉통/호흡기',
    icon: Heart,
    color: 'red',
    symptoms: [
      { id: 'chest-pressure', name: '가슴 압박감/조임', description: '쥐어짜는 듯한 통증' },
      { id: 'chest-pain-arm', name: '흉통 + 팔/턱 방사통', description: '왼팔, 턱으로 퍼지는 통증' },
      { id: 'chest-pain-dyspnea', name: '흉통 + 호흡곤란', description: '숨쉬기 힘듦 동반' },
      { id: 'chest-pain-sweating', name: '흉통 + 식은땀', description: '흉통과 함께 식은땀' },
      { id: 'sudden-dyspnea', name: '갑자기 숨이 참', description: '갑자기 시작된 호흡곤란' },
      { id: 'cough-blood', name: '피섞인 가래', description: '객혈, 혈담' },
      { id: 'pleuritic-pain', name: '숨쉴 때 찌르는 흉통', description: '흡기 시 악화' },
      { id: 'calf-swelling', name: '한쪽 다리 부종 + 흉통', description: 'DVT/PE 의심' },
    ],
  },
  {
    id: 'abdomen',
    name: '복통/소화기',
    icon: Stethoscope,
    color: 'orange',
    symptoms: [
      { id: 'severe-abdominal', name: '심한 복통', description: '참을 수 없는 복통' },
      { id: 'rigid-abdomen', name: '복벽 경직', description: '배가 딱딱하게 굳음' },
      { id: 'abdominal-trauma', name: '외상 후 복통', description: '복부 다친 후 통증' },
      { id: 'vomiting-blood', name: '피를 토함', description: '토혈' },
      { id: 'black-stool', name: '검은 변/혈변', description: '흑색변, 혈변' },
      { id: 'abdominal-pulsation', name: '복부에서 맥박 느낌', description: '대동맥류 의심' },
      { id: 'sudden-severe-flank', name: '갑자기 옆구리 통증', description: '매우 심함' },
      { id: 'jaundice-pain', name: '황달 + 복통 + 발열', description: '담관염 의심' },
    ],
  },
  {
    id: 'neuro',
    name: '신경계',
    icon: Activity,
    color: 'blue',
    symptoms: [
      { id: 'sudden-weakness', name: '갑자기 팔다리 힘 빠짐', description: '편측 마비' },
      { id: 'sudden-speech', name: '갑자기 말이 어눌해짐', description: '구음장애' },
      { id: 'sudden-vision-loss', name: '갑자기 한쪽 눈 안 보임', description: '급성 시력 소실' },
      { id: 'facial-droop', name: '얼굴 한쪽이 처짐', description: '안면 비대칭' },
      { id: 'seizure-first', name: '처음 겪는 경련', description: '첫 발작' },
      { id: 'confusion-sudden', name: '갑자기 의식이 흐려짐', description: '급성 의식 변화' },
      { id: 'worst-headache', name: '인생 최악의 두통', description: '지금까지 경험 중 최악' },
      { id: 'progressive-weakness', name: '점점 팔다리 힘 빠짐', description: '수일에 걸쳐 진행' },
    ],
  },
  {
    id: 'musculoskeletal',
    name: '근골격계',
    icon: Bone,
    color: 'amber',
    symptoms: [
      { id: 'back-pain-incontinence', name: '요통 + 대소변 장애', description: '마미증후군 의심' },
      { id: 'back-pain-weakness', name: '요통 + 하지 마비', description: '급성 하지 위약' },
      { id: 'back-pain-fever', name: '요통 + 발열', description: '척추 감염 의심' },
      { id: 'back-pain-weight-loss', name: '요통 + 체중 감소', description: '척추 종양 의심' },
      { id: 'back-pain-night', name: '밤에 심한 요통', description: '누워도 호전 없음' },
      { id: 'back-pain-history', name: '요통 + 암 병력', description: '전이 의심' },
      { id: 'joint-hot-swollen', name: '관절 발적/열감/부종', description: '화농성 관절염 의심' },
      { id: 'trauma-deformity', name: '외상 후 변형', description: '골절 의심' },
    ],
  },
  {
    id: 'general',
    name: '전신/기타',
    icon: Thermometer,
    color: 'green',
    symptoms: [
      { id: 'high-fever-rash', name: '고열 + 발진', description: '감염성 질환 의심' },
      { id: 'unexplained-weight-loss', name: '설명 안 되는 체중 감소', description: '3개월 내 10% 이상' },
      { id: 'night-sweats', name: '야간 발한 (식은땀)', description: '잠옷 흠뻑 젖음' },
      { id: 'lymph-node', name: '만져지는 덩어리', description: '경부, 액와 등' },
      { id: 'syncope', name: '실신/의식 소실', description: '갑자기 쓰러짐' },
      { id: 'severe-allergy', name: '전신 알레르기 반응', description: '호흡곤란, 부종 동반' },
      { id: 'suicidal', name: '자해/자살 사고', description: '자해 충동, 자살 생각' },
    ],
  },
]

const redFlagDatabase: Record<string, RedFlag> = {
  'sudden-severe-headache': {
    id: 'sudden-severe-headache',
    severity: 'critical',
    condition: '뇌출혈/지주막하출혈',
    description: '갑자기 시작된 매우 심한 두통은 뇌혈관 파열의 징후일 수 있습니다.',
    symptoms: ['sudden-severe-headache', 'thunderclap', 'worst-headache'],
    action: '즉시 119 호출 또는 응급실 이송',
    referral: '신경외과/응급의학과',
    mustAsk: [
      '두통이 갑자기 시작했나요, 서서히 시작했나요?',
      '이전에 이런 두통을 경험한 적 있나요?',
      '구토가 있나요?',
      '의식이 명료한가요?',
      '팔다리에 힘이 빠지거나 저린 곳이 있나요?',
    ],
    timeframe: '즉시 (수분 내)',
  },
  'headache-with-fever': {
    id: 'headache-with-fever',
    severity: 'critical',
    condition: '수막염/뇌염',
    description: '발열과 함께 심한 두통, 경부 강직은 중추신경계 감염을 시사합니다.',
    symptoms: ['headache-with-fever', 'headache-with-stiff-neck'],
    action: '즉시 응급실 이송',
    referral: '신경과/감염내과',
    mustAsk: [
      '열이 얼마나 되나요?',
      '목을 앞으로 숙일 수 있나요?',
      '빛이 눈부시나요?',
      '의식이 혼미하거나 혼란스러운가요?',
      '최근 감기나 상기도 감염이 있었나요?',
    ],
    timeframe: '즉시 (1시간 내)',
  },
  'chest-pressure': {
    id: 'chest-pressure',
    severity: 'critical',
    condition: '급성 심근경색',
    description: '가슴을 쥐어짜는 듯한 통증은 심장 동맥이 막힌 상황일 수 있습니다.',
    symptoms: ['chest-pressure', 'chest-pain-arm', 'chest-pain-sweating'],
    action: '119 호출, 아스피린 복용 고려 (알레르기 없으면)',
    referral: '심장내과/응급의학과',
    mustAsk: [
      '통증이 왼팔이나 턱으로 퍼지나요?',
      '식은땀이 나나요?',
      '숨이 차나요?',
      '이전에 심장 질환 진단 받은 적 있나요?',
      '당뇨, 고혈압, 고지혈증이 있나요?',
    ],
    timeframe: '즉시 (수분 내)',
  },
  'sudden-weakness': {
    id: 'sudden-weakness',
    severity: 'critical',
    condition: '뇌졸중 (뇌경색/뇌출혈)',
    description: '갑자기 한쪽 팔다리에 힘이 빠지는 것은 뇌졸중의 전형적 증상입니다.',
    symptoms: ['sudden-weakness', 'sudden-speech', 'facial-droop'],
    action: '119 호출, FAST 체크 (Face-Arm-Speech-Time)',
    referral: '신경과/응급의학과',
    mustAsk: [
      '증상이 언제 시작되었나요? (정확한 시간)',
      '얼굴이 한쪽으로 처지나요?',
      '말이 어눌한가요?',
      '양팔을 들어올릴 수 있나요?',
      '혈압약, 항응고제 복용 중인가요?',
    ],
    timeframe: '즉시 - 골든타임 4.5시간',
  },
  'back-pain-incontinence': {
    id: 'back-pain-incontinence',
    severity: 'critical',
    condition: '마미증후군 (Cauda Equina Syndrome)',
    description: '허리 통증과 대소변 장애는 응급 척추 수술이 필요한 상태입니다.',
    symptoms: ['back-pain-incontinence', 'back-pain-weakness'],
    action: '즉시 응급실 이송 (MRI 필요)',
    referral: '신경외과/정형외과',
    mustAsk: [
      '소변이 안 나오거나 조절이 안 되나요?',
      '대변 조절이 안 되나요?',
      '회음부(사타구니 부위) 감각이 둔해졌나요?',
      '양쪽 다리에 힘이 빠지나요?',
      '언제부터 이런 증상이 있었나요?',
    ],
    timeframe: '24-48시간 내 수술 필요',
  },
  'vomiting-blood': {
    id: 'vomiting-blood',
    severity: 'critical',
    condition: '상부위장관 출혈',
    description: '피를 토하는 것은 심각한 내부 출혈의 징후입니다.',
    symptoms: ['vomiting-blood', 'black-stool'],
    action: '119 호출, 금식 유지',
    referral: '소화기내과/응급의학과',
    mustAsk: [
      '토한 피의 양이 얼마나 되나요?',
      '검은 변을 본 적 있나요?',
      '어지럽거나 식은땀이 나나요?',
      '아스피린, 진통제, 항응고제 복용 중인가요?',
      '간 질환이나 위궤양 병력이 있나요?',
    ],
    timeframe: '즉시',
  },
  'suicidal': {
    id: 'suicidal',
    severity: 'critical',
    condition: '자살 위험',
    description: '자해나 자살 사고는 즉각적인 정신건강 개입이 필요합니다.',
    symptoms: ['suicidal'],
    action: '자살예방상담전화 1393, 정신건강위기상담전화 1577-0199',
    referral: '정신건강의학과',
    mustAsk: [
      '지금 자해하거나 자살하고 싶은 생각이 있나요?',
      '구체적인 계획이 있나요?',
      '이전에 자해나 자살 시도를 한 적 있나요?',
      '혼자 있나요? 같이 있을 수 있는 사람이 있나요?',
    ],
    timeframe: '즉시 (보호자 동반, 전문기관 연계)',
  },
}

export default function RedFlagPage() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [detectedFlags, setDetectedFlags] = useState<RedFlag[]>([])

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((id) => id !== symptomId) : [...prev, symptomId]
    )
    setShowResult(false)
  }

  const analyzeRedFlags = () => {
    const flags: RedFlag[] = []

    Object.values(redFlagDatabase).forEach((flag) => {
      const hasMatchingSymptom = flag.symptoms.some((s) => selectedSymptoms.includes(s))
      if (hasMatchingSymptom) {
        flags.push(flag)
      }
    })

    // Sort by severity
    flags.sort((a, b) => {
      const order = { critical: 0, urgent: 1, moderate: 2 }
      return order[a.severity] - order[b.severity]
    })

    setDetectedFlags(flags)
    setShowResult(true)
  }

  const resetAnalysis = () => {
    setSelectedSymptoms([])
    setShowResult(false)
    setDetectedFlags([])
    setActiveCategory(null)
  }

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white'
      case 'urgent':
        return 'bg-orange-500 text-white'
      case 'moderate':
        return 'bg-yellow-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '즉시 응급'
      case 'urgent':
        return '긴급'
      case 'moderate':
        return '주의'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-red-500" />
            위험 신호 감지
          </h1>
          <p className="mt-1 text-gray-500">
            응급 상황을 조기에 발견하고 적절한 조치를 취하세요
          </p>
        </div>
        {(selectedSymptoms.length > 0 || showResult) && (
          <button
            onClick={resetAnalysis}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* Warning Banner */}
      <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900">응급 상황 발생 시</h3>
            <p className="text-red-700 text-sm mt-1">
              생명이 위험한 응급 상황에서는 즉시 <strong>119</strong>에 연락하세요.
              이 도구는 참고용이며, 의료 전문가의 판단을 대체하지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {!showResult ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="증상 검색..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          {/* Symptom Categories */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {symptomCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                className={cn(
                  'p-4 rounded-xl text-center transition-all',
                  activeCategory === category.id
                    ? 'bg-red-100 border-2 border-red-500'
                    : 'bg-white border-2 border-gray-100 hover:border-red-200'
                )}
              >
                <category.icon
                  className={cn(
                    'h-6 w-6 mx-auto mb-2',
                    activeCategory === category.id ? 'text-red-600' : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    activeCategory === category.id ? 'text-red-900' : 'text-gray-600'
                  )}
                >
                  {category.name}
                </span>
              </button>
            ))}
          </div>

          {/* Symptom List */}
          {activeCategory && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                {symptomCategories.find((c) => c.id === activeCategory)?.name} 증상 선택
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {symptomCategories
                  .find((c) => c.id === activeCategory)
                  ?.symptoms.filter(
                    (s) =>
                      searchQuery === '' ||
                      s.name.includes(searchQuery) ||
                      s.description.includes(searchQuery)
                  )
                  .map((symptom) => (
                    <button
                      key={symptom.id}
                      onClick={() => toggleSymptom(symptom.id)}
                      className={cn(
                        'p-4 rounded-xl text-left transition-all',
                        selectedSymptoms.includes(symptom.id)
                          ? 'bg-red-100 border-2 border-red-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {selectedSymptoms.includes(symptom.id) ? (
                          <CheckCircle2 className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{symptom.name}</p>
                          <p className="text-sm text-gray-500">{symptom.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Selected Symptoms */}
          {selectedSymptoms.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                선택된 증상 ({selectedSymptoms.length}개)
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSymptoms.map((symptomId) => {
                  const symptom = symptomCategories
                    .flatMap((c) => c.symptoms)
                    .find((s) => s.id === symptomId)
                  return (
                    <span
                      key={symptomId}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm flex items-center gap-2"
                    >
                      {symptom?.name}
                      <button
                        onClick={() => toggleSymptom(symptomId)}
                        className="hover:text-red-900"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </span>
                  )
                })}
              </div>
              <button
                onClick={analyzeRedFlags}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <AlertTriangle className="h-5 w-5" />
                위험 신호 분석
              </button>
            </div>
          )}
        </>
      ) : (
        // Results
        <div className="space-y-6">
          {detectedFlags.length > 0 ? (
            <>
              {/* Critical Alert */}
              {detectedFlags.some((f) => f.severity === 'critical') && (
                <div className="bg-red-600 rounded-2xl p-6 text-white animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">🚨 응급 상황 가능성</h2>
                      <p className="text-red-100 mt-1">
                        선택하신 증상은 즉각적인 의료 조치가 필요할 수 있습니다
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <a
                      href="tel:119"
                      className="flex-1 py-3 bg-white text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                    >
                      <Phone className="h-5 w-5" />
                      119 전화하기
                    </a>
                  </div>
                </div>
              )}

              {/* Detected Red Flags */}
              <div className="space-y-4">
                {detectedFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <div
                      className={cn(
                        'px-6 py-4 flex items-center justify-between',
                        getSeverityStyle(flag.severity)
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-6 w-6" />
                        <div>
                          <h3 className="font-bold text-lg">{flag.condition}</h3>
                          <p className="text-sm opacity-90">{getSeverityLabel(flag.severity)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">{flag.timeframe}</span>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <p className="text-gray-700">{flag.description}</p>

                      <div className="p-4 bg-red-50 rounded-xl">
                        <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" />
                          권장 조치
                        </h4>
                        <p className="text-red-800">{flag.action}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          필수 확인 질문
                        </h4>
                        <ul className="space-y-2">
                          {flag.mustAsk.map((question, index) => (
                            <li key={index} className="flex items-start gap-2 text-gray-700">
                              <ChevronRight className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                              {question}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">권장 의뢰:</span> {flag.referral}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-green-50 rounded-2xl border border-green-200 p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                긴급 위험 신호 미감지
              </h2>
              <p className="text-green-700">
                선택하신 증상에서 즉각적인 응급 상황을 시사하는 패턴은 발견되지 않았습니다.
                <br />
                그러나 증상이 지속되거나 악화되면 반드시 전문의와 상담하세요.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetAnalysis}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              다시 검사하기
            </button>
            <button className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors">
              차트에 기록
            </button>
          </div>
        </div>
      )}

      {/* Emergency Contacts */}
      <div className="bg-gray-900 rounded-2xl p-6 text-white">
        <h3 className="font-bold text-lg mb-4">응급 연락처</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="tel:119" className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
            <p className="text-2xl font-bold">119</p>
            <p className="text-sm text-gray-300">응급 구조</p>
          </a>
          <a href="tel:1339" className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
            <p className="text-2xl font-bold">1339</p>
            <p className="text-sm text-gray-300">응급 의료 상담</p>
          </a>
          <a href="tel:1393" className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
            <p className="text-2xl font-bold">1393</p>
            <p className="text-sm text-gray-300">자살예방상담</p>
          </a>
          <a href="tel:110" className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
            <p className="text-2xl font-bold">110</p>
            <p className="text-sm text-gray-300">경찰</p>
          </a>
        </div>
      </div>
    </div>
  )
}
