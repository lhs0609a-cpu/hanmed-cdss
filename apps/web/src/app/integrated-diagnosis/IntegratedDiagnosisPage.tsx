import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { MedicineSchool, SCHOOL_INFO } from '@/types'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Stethoscope,
  Brain,
  Pill,
  ChevronRight,
  ChevronDown,
  Info,
  AlertTriangle,
  BookOpen,
  Activity,
  Scroll,
  Book,
  Users,
  FileText,
  ExternalLink,
} from 'lucide-react'

// ICD-10 샘플 데이터
interface ICD10Code {
  code: string
  name: string
  nameKr: string
  category: string
}

const ICD10_SAMPLE: ICD10Code[] = [
  { code: 'K29', name: 'Gastritis and duodenitis', nameKr: '위염 및 십이지장염', category: '소화기계' },
  { code: 'K30', name: 'Functional dyspepsia', nameKr: '기능성 소화불량', category: '소화기계' },
  { code: 'G43', name: 'Migraine', nameKr: '편두통', category: '신경계' },
  { code: 'G44', name: 'Other headache syndromes', nameKr: '기타 두통 증후군', category: '신경계' },
  { code: 'F51', name: 'Sleep disorders', nameKr: '수면 장애', category: '정신행동' },
  { code: 'R53', name: 'Malaise and fatigue', nameKr: '권태감 및 피로', category: '증상/징후' },
  { code: 'M54', name: 'Dorsalgia', nameKr: '등통증', category: '근골격계' },
  { code: 'J06', name: 'Upper respiratory infections', nameKr: '급성 상기도 감염', category: '호흡기계' },
  { code: 'I10', name: 'Essential hypertension', nameKr: '본태성 고혈압', category: '순환기계' },
  { code: 'E11', name: 'Type 2 diabetes mellitus', nameKr: '2형 당뇨병', category: '내분비계' },
]

// 서양의학-한의학 매핑 데이터
interface IntegrationData {
  icd10: string
  koreanPatterns: {
    pattern: string
    hanja: string
    description: string
    formulas: { name: string; school: MedicineSchool }[]
  }[]
  evidenceLevel: 'A' | 'B' | 'C'
  references: string[]
  cautions: string[]
}

const INTEGRATION_DATA: Record<string, IntegrationData> = {
  'K29': {
    icd10: 'K29',
    koreanPatterns: [
      {
        pattern: '비위허한증',
        hanja: '脾胃虛寒證',
        description: '비위의 양기가 부족하여 소화 기능이 저하된 상태. 복부 냉감, 무른 변, 식욕부진 동반.',
        formulas: [
          { name: '이중탕', school: 'classical' },
          { name: '소건중탕', school: 'classical' },
          { name: '육군자탕', school: 'later' },
        ],
      },
      {
        pattern: '간위불화증',
        hanja: '肝胃不和證',
        description: '스트레스로 인해 간기가 울결되어 위장 기능을 억제. 명치 통증, 트림, 짜증 동반.',
        formulas: [
          { name: '시호소간산', school: 'later' },
          { name: '소시호탕', school: 'classical' },
          { name: '반하후사탕', school: 'later' },
        ],
      },
      {
        pattern: '위음허증',
        hanja: '胃陰虛證',
        description: '위의 음액이 부족하여 건조해진 상태. 입마름, 공복감, 변비 경향.',
        formulas: [
          { name: '맥문동탕', school: 'later' },
          { name: '익위탕', school: 'later' },
        ],
      },
    ],
    evidenceLevel: 'A',
    references: [
      '대한한방내과학회지 2020;41(3):401-412',
      'Journal of Korean Medicine 2019;40(2):78-89',
    ],
    cautions: [
      'H. pylori 감염 확인 후 양방 치료와 병행 고려',
      '출혈 증상 시 양방 내시경 검사 우선',
    ],
  },
  'K30': {
    icd10: 'K30',
    koreanPatterns: [
      {
        pattern: '비기허증',
        hanja: '脾氣虛證',
        description: '비의 기가 허약하여 운화 기능이 저하. 식후 복부 팽만, 피로, 무른 변.',
        formulas: [
          { name: '사군자탕', school: 'later' },
          { name: '육군자탕', school: 'later' },
          { name: '보중익기탕', school: 'later' },
        ],
      },
      {
        pattern: '담음정체증',
        hanja: '痰飮停滯證',
        description: '담음이 정체되어 소화를 방해. 오심, 구역, 복부 답답함.',
        formulas: [
          { name: '이진탕', school: 'later' },
          { name: '반하백출천마탕', school: 'later' },
        ],
      },
    ],
    evidenceLevel: 'A',
    references: [
      '대한한방소화기학회지 2021;9(1):15-28',
    ],
    cautions: [
      '기질적 질환 배제 후 한방 치료 시작',
    ],
  },
  'G43': {
    icd10: 'G43',
    koreanPatterns: [
      {
        pattern: '간양상항증',
        hanja: '肝陽上亢證',
        description: '간의 양기가 상역하여 두통 유발. 측두부 박동성 통증, 눈 충혈, 짜증.',
        formulas: [
          { name: '천마구등음', school: 'later' },
          { name: '용담사간탕', school: 'later' },
        ],
      },
      {
        pattern: '어혈두통',
        hanja: '瘀血頭痛',
        description: '어혈이 경락을 막아 두통 유발. 고정된 위치의 찌르는 통증.',
        formulas: [
          { name: '통규활혈탕', school: 'later' },
          { name: '혈부축어탕', school: 'later' },
        ],
      },
    ],
    evidenceLevel: 'B',
    references: [
      '대한침구의학회지 2020;37(4):201-210',
    ],
    cautions: [
      '신경학적 이상 소견 시 MRI 등 추가 검사 권장',
      '급성 심한 두통 시 뇌출혈 감별 필요',
    ],
  },
  'F51': {
    icd10: 'F51',
    koreanPatterns: [
      {
        pattern: '심비양허증',
        hanja: '心脾兩虛證',
        description: '과도한 사고와 스트레스로 심비가 손상. 잠들기 어려움, 꿈 많음, 피로.',
        formulas: [
          { name: '귀비탕', school: 'later' },
          { name: '가미귀비탕', school: 'later' },
        ],
      },
      {
        pattern: '심신불교증',
        hanja: '心腎不交證',
        description: '심신의 기능이 교류하지 못함. 얕은 잠, 오심번열, 도한.',
        formulas: [
          { name: '황련아교탕', school: 'classical' },
          { name: '천왕보심단', school: 'later' },
        ],
      },
      {
        pattern: '간화요성증',
        hanja: '肝火擾性證',
        description: '간화가 심신을 교란. 짜증, 불안, 쉽게 깸.',
        formulas: [
          { name: '용담사간탕', school: 'later' },
        ],
      },
    ],
    evidenceLevel: 'A',
    references: [
      '동의신경정신과학회지 2021;32(2):89-102',
    ],
    cautions: [
      '수면무호흡증 등 기질적 원인 배제 필요',
      '약물 유발 불면 확인',
    ],
  },
  'R53': {
    icd10: 'R53',
    koreanPatterns: [
      {
        pattern: '기허증',
        hanja: '氣虛證',
        description: '원기가 부족하여 전신 피로. 기력저하, 자한, 숨참.',
        formulas: [
          { name: '보중익기탕', school: 'later' },
          { name: '사군자탕', school: 'later' },
          { name: '녹용대보탕', school: 'later' },
        ],
      },
      {
        pattern: '기혈양허증',
        hanja: '氣血兩虛證',
        description: '기와 혈이 모두 부족. 피로, 창백, 어지러움, 심계.',
        formulas: [
          { name: '팔진탕', school: 'later' },
          { name: '십전대보탕', school: 'later' },
        ],
      },
      {
        pattern: '신양허증',
        hanja: '腎陽虛證',
        description: '신의 양기가 부족. 피로와 함께 냉감, 요슬산연.',
        formulas: [
          { name: '팔미지황환', school: 'later' },
          { name: '우귀환', school: 'later' },
        ],
      },
    ],
    evidenceLevel: 'B',
    references: [
      '한방재활의학과학회지 2020;30(3):45-58',
    ],
    cautions: [
      '갑상선 기능 검사 등 기질적 원인 배제',
      '빈혈, 당뇨 등 기저 질환 확인',
    ],
  },
  'G44': {
    icd10: 'G44',
    koreanPatterns: [
      {
        pattern: '풍한두통',
        hanja: '風寒頭痛',
        description: '외감 풍한에 의한 두통. 후두부 통증, 오한, 발열, 무한.',
        formulas: [
          { name: '천궁다조산', school: 'later' },
          { name: '갈근탕', school: 'classical' },
        ],
      },
      {
        pattern: '기혈휴허',
        hanja: '氣血虧虛',
        description: '기혈 부족으로 인한 두통. 만성적, 은은한 통증, 피로 동반.',
        formulas: [
          { name: '보중익기탕', school: 'later' },
          { name: '팔진탕', school: 'later' },
        ],
      },
    ],
    evidenceLevel: 'B',
    references: [
      '대한침구의학회지 2019;36(2):89-98',
    ],
    cautions: [
      '긴장성 두통과 편두통 감별 필요',
      '신경학적 검사 권장',
    ],
  },
  'M54': {
    icd10: 'M54',
    koreanPatterns: [
      {
        pattern: '풍한습비',
        hanja: '風寒濕痺',
        description: '풍한습 사기가 경락에 침범하여 발생. 냉하면 악화, 온하면 호전.',
        formulas: [
          { name: '독활기생탕', school: 'later' },
          { name: '오적산', school: 'later' },
        ],
      },
      {
        pattern: '신허요통',
        hanja: '腎虛腰痛',
        description: '신기 부족으로 인한 요통. 만성, 은은한 통증, 시큰거림.',
        formulas: [
          { name: '육미지황환', school: 'later' },
          { name: '팔미지황환', school: 'later' },
        ],
      },
      {
        pattern: '어혈요통',
        hanja: '瘀血腰痛',
        description: '어혈로 인한 요통. 고정된 위치, 찌르는 통증, 야간 악화.',
        formulas: [
          { name: '신통축어탕', school: 'later' },
          { name: '도핵승기탕', school: 'classical' },
        ],
      },
    ],
    evidenceLevel: 'A',
    references: [
      '한방재활의학과학회지 2021;31(1):23-35',
      '대한침구의학회지 2020;37(4):178-189',
    ],
    cautions: [
      '디스크, 협착증 등 구조적 문제 배제',
      '하지 방사통 시 정밀 검사 권장',
    ],
  },
  'J06': {
    icd10: 'J06',
    koreanPatterns: [
      {
        pattern: '풍한표증',
        hanja: '風寒表證',
        description: '풍한 외감으로 인한 감기. 오한, 발열, 두통, 코막힘, 무한.',
        formulas: [
          { name: '갈근탕', school: 'classical' },
          { name: '마황탕', school: 'classical' },
          { name: '소청룡탕', school: 'classical' },
        ],
      },
      {
        pattern: '풍열표증',
        hanja: '風熱表證',
        description: '풍열 외감으로 인한 감기. 발열 위주, 인통, 황담, 유한.',
        formulas: [
          { name: '은교산', school: 'later' },
          { name: '상국음', school: 'later' },
        ],
      },
    ],
    evidenceLevel: 'A',
    references: [
      '대한한방내과학회지 2019;40(5):823-834',
    ],
    cautions: [
      '세균 감염 시 항생제 병용 고려',
      '고열 지속 시 정밀 검사',
    ],
  },
  'I10': {
    icd10: 'I10',
    koreanPatterns: [
      {
        pattern: '간양상항',
        hanja: '肝陽上亢',
        description: '간양이 상역하여 발생. 두통, 현훈, 안면홍조, 조급.',
        formulas: [
          { name: '천마구등음', school: 'later' },
          { name: '용담사간탕', school: 'later' },
        ],
      },
      {
        pattern: '음허양항',
        hanja: '陰虛陽亢',
        description: '음허로 양이 억제되지 못함. 현훈, 오심번열, 요슬산연.',
        formulas: [
          { name: '육미지황환', school: 'later' },
          { name: '지백지황환', school: 'later' },
        ],
      },
      {
        pattern: '담습옹성',
        hanja: '痰濕壅盛',
        description: '담습이 성하여 발생. 비만, 흉민, 담다, 어지러움.',
        formulas: [
          { name: '반하백출천마탕', school: 'later' },
          { name: '온담탕', school: 'later' },
        ],
      },
    ],
    evidenceLevel: 'B',
    references: [
      '대한한방내과학회지 2020;41(6):1012-1024',
    ],
    cautions: [
      '양방 혈압 약물과 병용 시 상호작용 주의',
      '정기적인 혈압 모니터링 필수',
      '합병증 동반 시 양방 치료 우선',
    ],
  },
  'E11': {
    icd10: 'E11',
    koreanPatterns: [
      {
        pattern: '음허조열',
        hanja: '陰虛燥熱',
        description: '음액 부족으로 조열 발생. 구갈, 다식, 다뇨, 체중감소.',
        formulas: [
          { name: '맥문동탕', school: 'later' },
          { name: '백호가인삼탕', school: 'classical' },
        ],
      },
      {
        pattern: '기음양허',
        hanja: '氣陰兩虛',
        description: '기와 음이 모두 허약. 피로, 구갈, 자한, 권태감.',
        formulas: [
          { name: '생맥산', school: 'later' },
          { name: '삼기음', school: 'later' },
        ],
      },
      {
        pattern: '신양허쇠',
        hanja: '腎陽虛衰',
        description: '신양이 쇠약해짐. 하지냉감, 부종, 다뇨, 야뇨.',
        formulas: [
          { name: '팔미지황환', school: 'later' },
          { name: '금궤신기환', school: 'classical' },
        ],
      },
    ],
    evidenceLevel: 'B',
    references: [
      '대한한방내과학회지 2019;40(3):456-470',
      '한방당뇨연구회지 2020;5(1):12-25',
    ],
    cautions: [
      '양방 혈당 조절 약물 병용 필수',
      '합병증 모니터링 중요',
      '저혈당 증상 주의',
    ],
  },
}

const schoolIcons: Record<MedicineSchool, React.ReactNode> = {
  classical: <Scroll className="w-4 h-4" />,
  later: <Book className="w-4 h-4" />,
  sasang: <Users className="w-4 h-4" />,
  hyungsang: <FileText className="w-4 h-4" />,
}

const schoolColors: Record<MedicineSchool, string> = {
  classical: 'bg-amber-100 text-amber-700 border-amber-200',
  later: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sasang: 'bg-violet-100 text-violet-700 border-violet-200',
  hyungsang: 'bg-sky-100 text-sky-700 border-sky-200',
}

const evidenceColors = {
  'A': 'bg-green-100 text-green-800',
  'B': 'bg-yellow-100 text-yellow-800',
  'C': 'bg-orange-100 text-orange-800',
}

const evidenceLabels = {
  'A': '높은 근거',
  'B': '중간 근거',
  'C': '제한적 근거',
}

export default function IntegratedDiagnosisPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedICD, setSelectedICD] = useState<ICD10Code | null>(null)
  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set())

  // AI 상담으로 이동
  const handleNavigateToConsultation = () => {
    if (selectedICD) {
      navigate('/consultation', {
        state: {
          icd10Code: selectedICD.code,
          diseaseName: selectedICD.nameKr,
          patterns: integrationData?.koreanPatterns.map(p => p.pattern) || []
        }
      })
    }
  }

  // 진료 기록 저장
  const handleSaveRecord = () => {
    if (selectedICD && integrationData) {
      // 로컬 스토리지에 저장
      const savedRecords = JSON.parse(localStorage.getItem('integratedDiagnosisRecords') || '[]')
      const newRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        icd10: selectedICD,
        patterns: integrationData.koreanPatterns,
        evidenceLevel: integrationData.evidenceLevel
      }
      savedRecords.push(newRecord)
      localStorage.setItem('integratedDiagnosisRecords', JSON.stringify(savedRecords))

      toast({
        title: '저장 완료',
        description: `${selectedICD.nameKr} (${selectedICD.code}) 진단 기록이 저장되었습니다.`,
      })
    }
  }

  // 검색 필터링
  const filteredCodes = ICD10_SAMPLE.filter(
    (code) =>
      code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.nameKr.includes(searchQuery)
  )

  const integrationData = selectedICD ? INTEGRATION_DATA[selectedICD.code] : null

  const togglePattern = (pattern: string) => {
    const newExpanded = new Set(expandedPatterns)
    if (newExpanded.has(pattern)) {
      newExpanded.delete(pattern)
    } else {
      newExpanded.add(pattern)
    }
    setExpandedPatterns(newExpanded)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">통합의학 진단</h1>
              <p className="text-sm text-gray-500">ICD-10 기반 양·한방 통합 진단 가이드</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ICD-10 코드 또는 질환명 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ICD-10 Code List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-32">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  ICD-10 코드
                </h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                {filteredCodes.map((code) => (
                  <button
                    key={code.code}
                    onClick={() => {
                      setSelectedICD(code)
                      setExpandedPatterns(new Set())
                    }}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                      selectedICD?.code === code.code && 'bg-blue-50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded">
                        {code.code}
                      </span>
                      <span className="text-xs text-gray-500">{code.category}</span>
                    </div>
                    <div className="font-medium text-gray-900 mt-1">{code.nameKr}</div>
                    <div className="text-xs text-gray-500">{code.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Integration Data */}
          <div className="lg:col-span-2">
            {integrationData ? (
              <div className="space-y-4">
                {/* Selected Code Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-mono font-bold rounded">
                          {selectedICD?.code}
                        </span>
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', evidenceColors[integrationData.evidenceLevel])}>
                          {evidenceLabels[integrationData.evidenceLevel]}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedICD?.nameKr}</h2>
                      <p className="text-sm text-gray-500">{selectedICD?.name}</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <Stethoscope className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Korean Medicine Patterns */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-emerald-50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-teal-600" />
                      한의학 변증
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">해당 질환에 적용 가능한 한의학적 변증 패턴</p>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {integrationData.koreanPatterns.map((pattern, idx) => (
                      <div key={idx} className="p-4">
                        <button
                          onClick={() => togglePattern(pattern.pattern)}
                          className="w-full flex items-center justify-between"
                        >
                          <div className="text-left">
                            <span className="font-bold text-gray-900">{pattern.pattern}</span>
                            <span className="ml-2 text-gray-400 text-sm">{pattern.hanja}</span>
                          </div>
                          {expandedPatterns.has(pattern.pattern) ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </button>

                        {expandedPatterns.has(pattern.pattern) && (
                          <div className="mt-4 space-y-4">
                            {/* Description */}
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              {pattern.description}
                            </p>

                            {/* Formulas */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Pill className="h-4 w-4 text-teal-600" />
                                <span className="text-sm font-medium text-gray-700">추천 처방</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {pattern.formulas.map((formula, i) => (
                                  <span
                                    key={i}
                                    className={cn(
                                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border',
                                      schoolColors[formula.school]
                                    )}
                                  >
                                    {schoolIcons[formula.school]}
                                    {formula.name}
                                    <span className="text-xs opacity-70">
                                      ({SCHOOL_INFO[formula.school].name})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cautions */}
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-900 mb-2">주의사항</h3>
                      <ul className="space-y-1">
                        {integrationData.cautions.map((caution, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                            <span className="text-amber-500 mt-1">•</span>
                            {caution}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Evidence & References */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <h3 className="font-bold text-gray-900">근거 문헌</h3>
                  </div>
                  <ul className="space-y-2">
                    {integrationData.references.map((ref, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <ExternalLink className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        {ref}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleNavigateToConsultation}
                    className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Activity className="h-5 w-5" />
                    AI 상담으로 이동
                  </button>
                  <button
                    onClick={handleSaveRecord}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="h-5 w-5" />
                    진료 기록 저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <Stethoscope className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ICD-10 코드를 선택해주세요
                </h3>
                <p className="text-gray-500 text-sm">
                  좌측에서 질환 코드를 선택하면<br />
                  한의학 변증 및 통합 진단 정보가 표시됩니다.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Info className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">통합의학 접근법</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                통합의학은 서양의학과 한의학의 장점을 결합하여 환자에게 최적의 치료를 제공합니다.
                ICD-10 코드를 기반으로 한의학적 변증을 연결하여, 근거 중심의 통합 진료를 지원합니다.
                각 변증별 근거 수준은 최신 연구 문헌을 참고하여 제시됩니다.
              </p>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', evidenceColors['A'])}>A</span>
                  <span className="text-xs text-gray-600">RCT, 메타분석</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', evidenceColors['B'])}>B</span>
                  <span className="text-xs text-gray-600">관찰연구, 사례</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', evidenceColors['C'])}>C</span>
                  <span className="text-xs text-gray-600">전문가 의견</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
