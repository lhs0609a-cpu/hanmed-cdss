import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MedicineSchool, SCHOOL_INFO } from '@/types'
import {
  Search,
  Scale,
  Scroll,
  Book,
  Users,
  Eye,
  ArrowRight,
  Info,
  Pill,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// 증상별 학파 비교 데이터
interface SchoolApproach {
  school: MedicineSchool
  diagnosis: string
  principle: string
  formulas: { name: string; description: string }[]
  keyPoints: string[]
}

interface SymptomComparison {
  symptom: string
  hanja: string
  description: string
  approaches: SchoolApproach[]
}

const COMPARISON_DATA: SymptomComparison[] = [
  {
    symptom: '두통',
    hanja: '頭痛',
    description: '머리의 통증을 주소로 하는 증상',
    approaches: [
      {
        school: 'classical',
        diagnosis: '6경변증으로 분류 - 태양병두통, 소양병두통, 양명병두통 등',
        principle: '표증 해소 및 경락 소통',
        formulas: [
          { name: '계지탕', description: '태양중풍두통, 오한발열' },
          { name: '갈근탕', description: '태양병두통, 항강' },
          { name: '소시호탕', description: '소양병두통, 왕래한열' },
        ],
        keyPoints: ['6경 병위 파악', '표리한열 구분', '병사의 성질 중시'],
      },
      {
        school: 'later',
        diagnosis: '장부변증 - 간양두통, 담탁두통, 기허두통, 어혈두통 등',
        principle: '장부 기능 조절 및 병리산물 제거',
        formulas: [
          { name: '천마구등음', description: '간양상항두통' },
          { name: '반하백출천마탕', description: '담탁두통, 현훈' },
          { name: '보중익기탕', description: '기허두통, 피로시 악화' },
          { name: '통규활혈탕', description: '어혈두통, 자통' },
        ],
        keyPoints: ['장부 기능 중시', '병리산물 변증', '보법 활용'],
      },
      {
        school: 'sasang',
        diagnosis: '체질별 분류 - 태음인두통, 소음인두통, 소양인두통, 태양인두통',
        principle: '체질에 따른 장부 허실 조절',
        formulas: [
          { name: '태음조위탕', description: '태음인 두통, 소화불량 동반' },
          { name: '곽향정기산', description: '소음인 두통, 기허' },
          { name: '형방지황탕', description: '소양인 두통, 음허' },
        ],
        keyPoints: ['선천적 체질 중시', '장부 대소 편차', '체질별 약물 선택'],
      },
      {
        school: 'hyungsang',
        diagnosis: '체형과 외형 관찰을 통한 분류',
        principle: '외형적 특징에 따른 병기 파악',
        formulas: [
          { name: '체형별 가감', description: '두부 형태, 체격에 따른 처방 변화' },
        ],
        keyPoints: ['외형 관찰 중시', '체형별 특성 파악', '형상에 따른 처방'],
      },
    ],
  },
  {
    symptom: '불면',
    hanja: '不眠',
    description: '잠들기 어렵거나 수면을 유지하기 어려운 증상',
    approaches: [
      {
        school: 'classical',
        diagnosis: '상한론 - 번조, 심하비경, 허번 등의 변증',
        principle: '심열 제거, 음양 조화',
        formulas: [
          { name: '황련아교탕', description: '심화항성, 번조불면' },
          { name: '지황탕', description: '음허불면' },
          { name: '소시호탕', description: '소양병 불면' },
        ],
        keyPoints: ['6경 병위', '허실 구분', '한열 변증'],
      },
      {
        school: 'later',
        diagnosis: '장부변증 - 심비양허, 심신불교, 간화요성, 담열요심',
        principle: '장부 조절, 안신',
        formulas: [
          { name: '귀비탕', description: '심비양허, 과로, 스트레스' },
          { name: '천왕보심단', description: '심신불교, 음허화왕' },
          { name: '용담사간탕', description: '간화요성, 짜증' },
          { name: '온담탕', description: '담열요심, 불안' },
        ],
        keyPoints: ['장부 기능', '정신 증상', '보법과 사법 구분'],
      },
      {
        school: 'sasang',
        diagnosis: '체질별 불면 - 각 체질의 허실에 따른 분류',
        principle: '체질별 장부 조절',
        formulas: [
          { name: '태음인청폐사간탕', description: '태음인 불면' },
          { name: '소음인보중익기탕', description: '소음인 기허 불면' },
          { name: '소양인육미지황탕', description: '소양인 음허 불면' },
        ],
        keyPoints: ['체질 진단 우선', '체질별 처방'],
      },
      {
        school: 'hyungsang',
        diagnosis: '체형, 안면 특징에 따른 분류',
        principle: '외형에서 내면의 병기 추론',
        formulas: [
          { name: '형상별 가감', description: '체형과 외형에 따른 처방 조절' },
        ],
        keyPoints: ['형상 관찰', '외형과 내면 연결'],
      },
    ],
  },
  {
    symptom: '소화불량',
    hanja: '消化不良',
    description: '비위 기능 저하로 인한 소화 장애',
    approaches: [
      {
        school: 'classical',
        diagnosis: '태음병 비위 손상, 양명병 위열',
        principle: '비위 기능 회복, 한열 조절',
        formulas: [
          { name: '이중탕', description: '태음병 비위허한' },
          { name: '사역탕', description: '소음병 비양허' },
          { name: '백호탕', description: '양명병 위열' },
        ],
        keyPoints: ['6경 병위 파악', '한열 허실 구분'],
      },
      {
        school: 'later',
        diagnosis: '비기허, 비위습열, 간위불화, 식적',
        principle: '건비, 화습, 소간, 소식',
        formulas: [
          { name: '육군자탕', description: '비기허, 만성 소화불량' },
          { name: '평위산', description: '습체비위' },
          { name: '시호소간산', description: '간위불화, 스트레스성' },
          { name: '보제환', description: '식적, 과식 후' },
        ],
        keyPoints: ['장부 변증', '병리산물 구분', '기능 조절'],
      },
      {
        school: 'sasang',
        diagnosis: '체질별 비위 특성 - 태음인 간대비소, 소음인 비대신소',
        principle: '체질 특성에 맞는 비위 조절',
        formulas: [
          { name: '태음조위탕', description: '태음인 소화불량' },
          { name: '소음인향사양위탕', description: '소음인 소화불량' },
          { name: '소양인양격산화탕', description: '소양인 위열' },
        ],
        keyPoints: ['체질별 장부 대소', '체질 맞춤 처방'],
      },
      {
        school: 'hyungsang',
        diagnosis: '복부 형태, 체격에 따른 분류',
        principle: '외형에서 비위 상태 추론',
        formulas: [
          { name: '체형별 처방', description: '복부 팽만, 체격에 따른 가감' },
        ],
        keyPoints: ['복부 형태 관찰', '체격과 비위 연결'],
      },
    ],
  },
  {
    symptom: '피로',
    hanja: '疲勞',
    description: '기력이 저하되고 무기력한 상태',
    approaches: [
      {
        school: 'classical',
        diagnosis: '소음병, 궐음병의 허증',
        principle: '온양, 보기',
        formulas: [
          { name: '사역탕', description: '소음병 양허' },
          { name: '진무탕', description: '양허수범' },
          { name: '당귀사역탕', description: '혈허한증' },
        ],
        keyPoints: ['6경 병위', '양기 상태', '허실 판단'],
      },
      {
        school: 'later',
        diagnosis: '기허, 혈허, 기혈양허, 양허, 음허',
        principle: '보기, 보혈, 온양, 자음',
        formulas: [
          { name: '보중익기탕', description: '기허, 중기하함' },
          { name: '사물탕', description: '혈허' },
          { name: '팔진탕', description: '기혈양허' },
          { name: '녹용대보탕', description: '원기 허손, 허로' },
        ],
        keyPoints: ['기혈음양 변증', '장부 기능', '보법 활용'],
      },
      {
        school: 'sasang',
        diagnosis: '체질별 허로 - 각 체질의 허증 특성',
        principle: '체질에 맞는 보법',
        formulas: [
          { name: '태음인청심연자탕', description: '태음인 피로' },
          { name: '소음인보중익기탕', description: '소음인 기허 피로' },
          { name: '소양인지황백호탕', description: '소양인 음허 피로' },
        ],
        keyPoints: ['체질별 허증 특성', '맞춤형 보법'],
      },
      {
        school: 'hyungsang',
        diagnosis: '체형, 안색, 음성 등 외형적 특징으로 허로 판단',
        principle: '형상에 따른 처방',
        formulas: [
          { name: '형상 진단', description: '외형 관찰을 통한 처방 결정' },
        ],
        keyPoints: ['형상 관찰 중시', '외형과 내면 연결'],
      },
    ],
  },
]

const schoolIcons: Record<MedicineSchool, React.ReactNode> = {
  classical: <Scroll className="w-5 h-5" />,
  later: <Book className="w-5 h-5" />,
  sasang: <Users className="w-5 h-5" />,
  hyungsang: <Eye className="w-5 h-5" />,
}

const schoolColors: Record<MedicineSchool, { bg: string; border: string; text: string }> = {
  classical: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800' },
  later: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800' },
  sasang: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-800' },
  hyungsang: { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-800' },
}

export default function SchoolComparisonPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>('두통')
  const [expandedSchools, setExpandedSchools] = useState<Set<MedicineSchool>>(
    new Set(['classical', 'later', 'sasang', 'hyungsang'])
  )

  // 검색 필터링
  const filteredSymptoms = COMPARISON_DATA.filter(
    (item) =>
      item.symptom.includes(searchQuery) ||
      item.hanja.includes(searchQuery) ||
      item.description.includes(searchQuery)
  )

  const selectedData = COMPARISON_DATA.find((item) => item.symptom === selectedSymptom)

  const toggleSchool = (school: MedicineSchool) => {
    const newExpanded = new Set(expandedSchools)
    if (newExpanded.has(school)) {
      newExpanded.delete(school)
    } else {
      newExpanded.add(school)
    }
    setExpandedSchools(newExpanded)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Scale className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">학파별 비교</h1>
              <p className="text-sm text-gray-500">동일 증상에 대한 각 학파의 접근법 비교</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="증상 검색 (예: 두통, 불면, 소화불량...)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Symptom List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-32">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">증상 목록</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredSymptoms.map((item) => (
                  <button
                    key={item.symptom}
                    onClick={() => setSelectedSymptom(item.symptom)}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                      selectedSymptom === item.symptom && 'bg-purple-50'
                    )}
                  >
                    <div className="font-medium text-gray-900">
                      {item.symptom}
                      <span className="ml-2 text-gray-400 text-sm">{item.hanja}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comparison Grid */}
          <div className="lg:col-span-3">
            {selectedData ? (
              <div className="space-y-4">
                {/* Selected Symptom Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Info className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {selectedData.symptom} <span className="text-gray-400">{selectedData.hanja}</span>
                      </h2>
                      <p className="text-sm text-gray-600">{selectedData.description}</p>
                    </div>
                  </div>
                </div>

                {/* School Approaches */}
                <div className="space-y-4">
                  {selectedData.approaches.map((approach) => (
                    <div
                      key={approach.school}
                      className={cn(
                        'rounded-xl border-2 overflow-hidden',
                        schoolColors[approach.school].bg,
                        schoolColors[approach.school].border
                      )}
                    >
                      {/* School Header */}
                      <button
                        onClick={() => toggleSchool(approach.school)}
                        className="w-full px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-lg bg-white', schoolColors[approach.school].text)}>
                            {schoolIcons[approach.school]}
                          </div>
                          <div className="text-left">
                            <h3 className={cn('font-bold', schoolColors[approach.school].text)}>
                              {SCHOOL_INFO[approach.school].name}
                            </h3>
                            <p className="text-xs text-gray-600">{SCHOOL_INFO[approach.school].hanja}</p>
                          </div>
                        </div>
                        {expandedSchools.has(approach.school) ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {/* School Content */}
                      {expandedSchools.has(approach.school) && (
                        <div className="px-4 pb-4 space-y-4">
                          {/* Diagnosis */}
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-500 mb-1">변증 방법</div>
                            <p className="text-sm text-gray-800">{approach.diagnosis}</p>
                          </div>

                          {/* Principle */}
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-500 mb-1">치료 원칙</div>
                            <p className="text-sm text-gray-800">{approach.principle}</p>
                          </div>

                          {/* Formulas */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Pill className={cn('h-4 w-4', schoolColors[approach.school].text)} />
                              <span className="text-sm font-medium text-gray-700">대표 처방</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {approach.formulas.map((formula, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white rounded-lg p-3 border border-gray-200"
                                >
                                  <div className={cn('font-medium text-sm', schoolColors[approach.school].text)}>
                                    {formula.name}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">{formula.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Key Points */}
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-500 mb-2">핵심 포인트</div>
                            <div className="flex flex-wrap gap-2">
                              {approach.keyPoints.map((point, idx) => (
                                <span
                                  key={idx}
                                  className={cn(
                                    'px-2 py-1 rounded-full text-xs font-medium',
                                    schoolColors[approach.school].bg,
                                    schoolColors[approach.school].text
                                  )}
                                >
                                  {point}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Comparison Summary */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-purple-600" />
                    학파별 접근 비교 요약
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 font-medium text-gray-600">학파</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">핵심 관점</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">대표 처방</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedData.approaches.map((approach) => (
                          <tr key={approach.school} className="border-b border-gray-100">
                            <td className="py-2 px-3">
                              <span className={cn('font-medium', schoolColors[approach.school].text)}>
                                {SCHOOL_INFO[approach.school].name}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-700">
                              {approach.keyPoints[0]}
                            </td>
                            <td className="py-2 px-3 text-gray-700">
                              {approach.formulas[0]?.name || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">좌측에서 증상을 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* School Info Cards */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">학파별 특징</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(SCHOOL_INFO) as MedicineSchool[]).map((school) => (
              <div
                key={school}
                className={cn(
                  'rounded-xl border-2 p-4',
                  schoolColors[school].bg,
                  schoolColors[school].border
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('p-1.5 rounded-lg bg-white', schoolColors[school].text)}>
                    {schoolIcons[school]}
                  </div>
                  <div>
                    <h3 className={cn('font-bold', schoolColors[school].text)}>
                      {SCHOOL_INFO[school].name}
                    </h3>
                    <span className="text-xs text-gray-500">{SCHOOL_INFO[school].hanja}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">{SCHOOL_INFO[school].period}</p>
                <p className="text-sm text-gray-700 line-clamp-3">{SCHOOL_INFO[school].philosophy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
