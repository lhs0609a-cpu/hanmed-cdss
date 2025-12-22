import { useState } from 'react'
import {
  Scale,
  Search,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Pill,
  Target,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Formula {
  id: string
  name: string
  hanja: string
  category: string
  source: string
  indication: string
  pattern: string
  keySymptoms: string[]
  herbs: { name: string; role: string; amount: string }[]
  contraindications: string[]
  characteristics: string[]
}

interface ComparisonPair {
  id: string
  formulas: [Formula, Formula]
  differences: {
    category: string
    items: { aspect: string; formula1: string; formula2: string; recommendation: string }[]
  }[]
  selectionGuide: {
    chooseFirst: string[]
    chooseSecond: string[]
  }
}

const formulas: Formula[] = [
  {
    id: 'sosihho',
    name: '소시호탕',
    hanja: '小柴胡湯',
    category: '화해제',
    source: '상한론',
    indication: '소양병, 한열왕래, 흉협고만, 구고인건, 목현',
    pattern: '소양증, 반표반리',
    keySymptoms: ['한열왕래', '흉협고만', '구고', '인건', '목현', '심번'],
    herbs: [
      { name: '시호', role: '군', amount: '12g' },
      { name: '황금', role: '신', amount: '9g' },
      { name: '반하', role: '좌', amount: '9g' },
      { name: '인삼', role: '좌', amount: '6g' },
      { name: '자감초', role: '사', amount: '3g' },
      { name: '생강', role: '사', amount: '6g' },
      { name: '대조', role: '사', amount: '4매' },
    ],
    contraindications: ['음허화왕', '간양상항', '실열증'],
    characteristics: ['시호 위주', '인삼 포함', '사하약 無'],
  },
  {
    id: 'daesihho',
    name: '대시호탕',
    hanja: '大柴胡湯',
    category: '화해제',
    source: '상한론',
    indication: '소양양명합병, 한열왕래, 흉협고만, 복만, 변비, 구토',
    pattern: '소양양명합병, 담열내결',
    keySymptoms: ['한열왕래', '흉협고만', '복만', '변비', '구토', '심하비경'],
    herbs: [
      { name: '시호', role: '군', amount: '12g' },
      { name: '황금', role: '신', amount: '9g' },
      { name: '작약', role: '신', amount: '9g' },
      { name: '반하', role: '좌', amount: '9g' },
      { name: '대황', role: '좌', amount: '6g' },
      { name: '지실', role: '좌', amount: '6g' },
      { name: '생강', role: '사', amount: '9g' },
      { name: '대조', role: '사', amount: '4매' },
    ],
    contraindications: ['허약체질', '비위허한', '임신'],
    characteristics: ['시호 위주', '대황 포함 (사하)', '인삼 無'],
  },
  {
    id: 'samultang',
    name: '사물탕',
    hanja: '四物湯',
    category: '보혈제',
    source: '태평혜민화제국방',
    indication: '혈허, 안면창백, 두훈, 심계, 월경부조',
    pattern: '혈허',
    keySymptoms: ['안면창백', '두훈', '심계', '월경부조', '손발저림'],
    herbs: [
      { name: '숙지황', role: '군', amount: '12g' },
      { name: '백작약', role: '신', amount: '9g' },
      { name: '당귀', role: '신', amount: '9g' },
      { name: '천궁', role: '좌', amount: '6g' },
    ],
    contraindications: ['비위허약', '식욕부진', '설사'],
    characteristics: ['보혈 위주', '4미 구성', '온성'],
  },
  {
    id: 'sagunjatang',
    name: '사군자탕',
    hanja: '四君子湯',
    category: '보기제',
    source: '태평혜민화제국방',
    indication: '비기허, 안면위황, 언어무력, 식욕부진, 대변당',
    pattern: '비기허',
    keySymptoms: ['피로', '식욕부진', '복부팽만', '대변당', '안면위황'],
    herbs: [
      { name: '인삼', role: '군', amount: '9g' },
      { name: '백출', role: '신', amount: '9g' },
      { name: '복령', role: '좌', amount: '9g' },
      { name: '자감초', role: '사', amount: '6g' },
    ],
    contraindications: ['실열증', '음허'],
    characteristics: ['보기 위주', '4미 구성', '평화'],
  },
  {
    id: 'yookmi',
    name: '육미지황환',
    hanja: '六味地黃丸',
    category: '보음제',
    source: '소아약증직결',
    indication: '신음허, 요슬산연, 두훈이명, 도한, 조열',
    pattern: '신음허',
    keySymptoms: ['요슬산연', '두훈이명', '도한', '조열', '구건'],
    herbs: [
      { name: '숙지황', role: '군', amount: '24g' },
      { name: '산수유', role: '신', amount: '12g' },
      { name: '산약', role: '신', amount: '12g' },
      { name: '택사', role: '좌', amount: '9g' },
      { name: '목단피', role: '좌', amount: '9g' },
      { name: '복령', role: '좌', amount: '9g' },
    ],
    contraindications: ['비위허한', '담습'],
    characteristics: ['삼보삼사', '자음 위주', '신을 보함'],
  },
  {
    id: 'palmi',
    name: '팔미지황환',
    hanja: '八味地黃丸',
    category: '보양제',
    source: '금궤요략',
    indication: '신양허, 요슬냉통, 하지무력, 소변불리, 야간빈뇨',
    pattern: '신양허',
    keySymptoms: ['요슬냉통', '하지무력', '야간빈뇨', '사지냉', '발기부전'],
    herbs: [
      { name: '숙지황', role: '군', amount: '24g' },
      { name: '산수유', role: '신', amount: '12g' },
      { name: '산약', role: '신', amount: '12g' },
      { name: '택사', role: '좌', amount: '9g' },
      { name: '목단피', role: '좌', amount: '9g' },
      { name: '복령', role: '좌', amount: '9g' },
      { name: '부자', role: '좌', amount: '3g' },
      { name: '육계', role: '좌', amount: '3g' },
    ],
    contraindications: ['음허화왕', '실열증'],
    characteristics: ['육미 + 부자, 육계', '온신양', '명문화 보충'],
  },
  {
    id: 'banhabaekchul',
    name: '반하백출천마탕',
    hanja: '半夏白朮天麻湯',
    category: '치풍제',
    source: '의학심오',
    indication: '풍담상요, 현훈두통, 흉민, 오심구토',
    pattern: '담음, 비허생담',
    keySymptoms: ['현훈', '두통', '오심', '구토', '흉민'],
    herbs: [
      { name: '반하', role: '군', amount: '9g' },
      { name: '천마', role: '군', amount: '6g' },
      { name: '백출', role: '신', amount: '9g' },
      { name: '복령', role: '좌', amount: '6g' },
      { name: '진피', role: '좌', amount: '6g' },
      { name: '감초', role: '사', amount: '3g' },
      { name: '생강', role: '사', amount: '3g' },
      { name: '대조', role: '사', amount: '2매' },
    ],
    contraindications: ['음허화왕', '간양화풍'],
    characteristics: ['화담식풍', '비위 중시', '담훈에 적합'],
  },
  {
    id: 'cheonmagouteng',
    name: '천마구등음',
    hanja: '天麻鉤藤飮',
    category: '치풍제',
    source: '잡병증치신의',
    indication: '간양상항, 두통현훈, 이명, 면홍, 조급',
    pattern: '간양상항, 간풍내동',
    keySymptoms: ['두통', '현훈', '이명', '면홍', '조급', '실면'],
    herbs: [
      { name: '천마', role: '군', amount: '9g' },
      { name: '구등', role: '군', amount: '12g' },
      { name: '석결명', role: '신', amount: '18g' },
      { name: '치자', role: '신', amount: '9g' },
      { name: '황금', role: '좌', amount: '9g' },
      { name: '우슬', role: '좌', amount: '12g' },
      { name: '두충', role: '좌', amount: '9g' },
      { name: '익모초', role: '좌', amount: '9g' },
      { name: '상기생', role: '좌', amount: '9g' },
      { name: '야교등', role: '사', amount: '9g' },
      { name: '복신', role: '사', amount: '9g' },
    ],
    contraindications: ['기혈허약', '양허'],
    characteristics: ['평간잠양', '청열', '보간신'],
  },
]

const comparisonPairs: ComparisonPair[] = [
  {
    id: 'sihho-compare',
    formulas: [formulas[0], formulas[1]], // 소시호탕 vs 대시호탕
    differences: [
      {
        category: '변증',
        items: [
          {
            aspect: '병기',
            formula1: '소양증 (반표반리)',
            formula2: '소양양명합병 (담열내결)',
            recommendation: '변비, 복만 유무가 핵심 감별점',
          },
          {
            aspect: '허실',
            formula1: '허증 경향 (인삼 포함)',
            formula2: '실증 경향 (대황 사하)',
            recommendation: '체력, 대변 상태로 판단',
          },
        ],
      },
      {
        category: '증상',
        items: [
          {
            aspect: '복부',
            formula1: '흉협고만 위주',
            formula2: '흉협고만 + 복만, 심하비경',
            recommendation: '복부 팽만, 압통 확인',
          },
          {
            aspect: '대변',
            formula1: '정상 또는 약간 무른 변',
            formula2: '변비, 대변 불통',
            recommendation: '대변 상태가 결정적',
          },
        ],
      },
      {
        category: '구성 약물',
        items: [
          {
            aspect: '핵심 차이',
            formula1: '인삼 有, 대황 無',
            formula2: '대황, 지실 有, 인삼 無',
            recommendation: '사하 필요 여부로 선택',
          },
        ],
      },
    ],
    selectionGuide: {
      chooseFirst: [
        '한열왕래만 있고 변비가 없을 때',
        '체력이 허약한 환자',
        '식욕부진, 피로감 동반 시',
        '대변이 정상이거나 무를 때',
      ],
      chooseSecond: [
        '변비가 동반될 때',
        '복부가 팽만하고 단단할 때',
        '체력이 충실한 환자',
        '구토, 심하비경이 심할 때',
      ],
    },
  },
  {
    id: 'yookpal-compare',
    formulas: [formulas[4], formulas[5]], // 육미지황환 vs 팔미지황환
    differences: [
      {
        category: '변증',
        items: [
          {
            aspect: '음양',
            formula1: '신음허 (滋陰)',
            formula2: '신양허 (溫陽)',
            recommendation: '열증/한증 여부로 구분',
          },
          {
            aspect: '허열',
            formula1: '조열, 도한, 오심번열',
            formula2: '사지냉, 요슬냉통',
            recommendation: '열감/냉감이 핵심',
          },
        ],
      },
      {
        category: '증상',
        items: [
          {
            aspect: '체온',
            formula1: '몸에 열감, 손발바닥 열',
            formula2: '몸이 차고 추위를 탐',
            recommendation: '오심번열 vs 사지냉',
          },
          {
            aspect: '소변',
            formula1: '소변 황적, 양 적음',
            formula2: '야간빈뇨, 소변청장',
            recommendation: '소변 색과 빈도 확인',
          },
        ],
      },
      {
        category: '구성 약물',
        items: [
          {
            aspect: '핵심 차이',
            formula1: '6미 구성 (자음)',
            formula2: '육미 + 부자, 육계 (온양)',
            recommendation: '온열약 포함 여부',
          },
        ],
      },
    ],
    selectionGuide: {
      chooseFirst: [
        '손발바닥에 열감이 있을 때',
        '도한(식은땀)이 있을 때',
        '입이 마르고 갈증이 있을 때',
        '소변이 노랗고 양이 적을 때',
      ],
      chooseSecond: [
        '손발이 차고 추위를 탈 때',
        '야간에 소변을 자주 볼 때',
        '허리와 무릎이 시리고 아플 때',
        '발기부전, 성기능 저하 시',
      ],
    },
  },
  {
    id: 'hyunhun-compare',
    formulas: [formulas[6], formulas[7]], // 반하백출천마탕 vs 천마구등음
    differences: [
      {
        category: '변증',
        items: [
          {
            aspect: '병기',
            formula1: '담음 (痰飮), 비허생담',
            formula2: '간양상항, 간풍내동',
            recommendation: '담 vs 간양의 차이',
          },
          {
            aspect: '성질',
            formula1: '허증 + 담',
            formula2: '실증 + 양항',
            recommendation: '허실 구분이 중요',
          },
        ],
      },
      {
        category: '증상',
        items: [
          {
            aspect: '현훈 특징',
            formula1: '머리가 무겁고 몽롱함, 오심 동반',
            formula2: '머리가 팽팽하고 조급, 면홍 동반',
            recommendation: '무거움 vs 팽창감',
          },
          {
            aspect: '동반 증상',
            formula1: '오심, 구토, 흉민, 식욕부진',
            formula2: '이명, 면홍, 조급, 실면',
            recommendation: '소화기 vs 간화 증상',
          },
        ],
      },
      {
        category: '구성 약물',
        items: [
          {
            aspect: '핵심 차이',
            formula1: '반하, 백출 위주 (화담건비)',
            formula2: '구등, 석결명 위주 (평간잠양)',
            recommendation: '화담 vs 평간 치법',
          },
        ],
      },
    ],
    selectionGuide: {
      chooseFirst: [
        '현훈과 함께 오심, 구토가 있을 때',
        '머리가 무겁고 몽롱한 느낌',
        '비위가 약하고 소화불량',
        '담이 많고 목에 가래 느낌',
      ],
      chooseSecond: [
        '현훈과 함께 면홍, 이명이 있을 때',
        '머리가 팽팽하고 터질 것 같은 느낌',
        '화를 잘 내고 조급함',
        '혈압이 높은 경향',
      ],
    },
  },
]

export default function FormulaComparePage() {
  const [selectedPair, setSelectedPair] = useState<ComparisonPair | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    )
  }

  const filteredFormulas = formulas.filter(
    (f) =>
      f.name.includes(searchQuery) ||
      f.hanja.includes(searchQuery) ||
      f.indication.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Scale className="h-7 w-7 text-indigo-500" />
          처방 비교 가이드
        </h1>
        <p className="mt-1 text-gray-500">
          유사 처방의 차이점을 비교하고 최적의 처방을 선택하세요
        </p>
      </div>

      {selectedPair ? (
        // Comparison View
        <div className="space-y-6">
          <button
            onClick={() => setSelectedPair(null)}
            className="text-gray-600 hover:text-gray-900"
          >
            ← 목록으로
          </button>

          {/* Comparison Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold">{selectedPair.formulas[0].name}</h2>
                <p className="text-indigo-200">{selectedPair.formulas[0].hanja}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <ArrowLeftRight className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">{selectedPair.formulas[1].name}</h2>
                <p className="text-indigo-200">{selectedPair.formulas[1].hanja}</p>
              </div>
            </div>
          </div>

          {/* Quick Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPair.formulas.map((formula, index) => (
              <div
                key={formula.id}
                className={cn(
                  'bg-white rounded-2xl shadow-sm border p-6',
                  index === 0 ? 'border-indigo-200' : 'border-purple-200'
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Pill className={index === 0 ? 'text-indigo-500' : 'text-purple-500'} />
                  <h3 className="font-bold text-gray-900">{formula.name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-500">변증:</span>{' '}
                    <span className="text-gray-900">{formula.pattern}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">주치:</span>{' '}
                    <span className="text-gray-900">{formula.indication}</span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formula.keySymptoms.slice(0, 4).map((symptom) => (
                      <span
                        key={symptom}
                        className={cn(
                          'px-2 py-0.5 rounded text-xs',
                          index === 0
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-purple-100 text-purple-700'
                        )}
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Comparison */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">상세 비교</h3>
            </div>
            {selectedPair.differences.map((diff, diffIndex) => (
              <div key={diff.category} className={diffIndex > 0 ? 'border-t border-gray-100' : ''}>
                <button
                  onClick={() => toggleSection(diff.category)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="font-semibold text-gray-900">{diff.category}</span>
                  {expandedSections.includes(diff.category) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {expandedSections.includes(diff.category) && (
                  <div className="px-4 pb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="text-left py-2 w-24">항목</th>
                          <th className="text-left py-2 text-indigo-600">
                            {selectedPair.formulas[0].name}
                          </th>
                          <th className="text-left py-2 text-purple-600">
                            {selectedPair.formulas[1].name}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {diff.items.map((item, itemIndex) => (
                          <tr key={itemIndex} className="border-t border-gray-100">
                            <td className="py-3 text-sm font-medium text-gray-600">
                              {item.aspect}
                            </td>
                            <td className="py-3 text-sm text-gray-900">{item.formula1}</td>
                            <td className="py-3 text-sm text-gray-900">{item.formula2}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                      <p className="text-sm text-amber-800 flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {diff.items[0].recommendation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Selection Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-indigo-900">
                  {selectedPair.formulas[0].name} 선택
                </h3>
              </div>
              <ul className="space-y-2">
                {selectedPair.selectionGuide.chooseFirst.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-indigo-800">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-purple-50 rounded-2xl border border-purple-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-purple-600" />
                <h3 className="font-bold text-purple-900">
                  {selectedPair.formulas[1].name} 선택
                </h3>
              </div>
              <ul className="space-y-2">
                {selectedPair.selectionGuide.chooseSecond.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-purple-800">
                    <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Herb Comparison */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">구성 약물 비교</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedPair.formulas.map((formula, index) => (
                <div key={formula.id}>
                  <p className={cn(
                    'text-sm font-semibold mb-3',
                    index === 0 ? 'text-indigo-600' : 'text-purple-600'
                  )}>
                    {formula.name}
                  </p>
                  <div className="space-y-2">
                    {formula.herbs.map((herb) => {
                      const otherFormula = selectedPair.formulas[1 - index]
                      const isUnique = !otherFormula.herbs.some((h) => h.name === herb.name)
                      return (
                        <div
                          key={herb.name}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg text-sm',
                            isUnique
                              ? index === 0
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-purple-100 text-purple-900'
                              : 'bg-gray-50 text-gray-700'
                          )}
                        >
                          <span>
                            {herb.name}
                            {isUnique && (
                              <span className="ml-1 text-xs opacity-75">(고유)</span>
                            )}
                          </span>
                          <span className="text-gray-500">
                            {herb.role} · {herb.amount}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contraindications */}
          <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="font-bold text-red-900">금기 사항</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedPair.formulas.map((formula) => (
                <div key={formula.id}>
                  <p className="text-sm font-semibold text-red-800 mb-2">{formula.name}</p>
                  <ul className="space-y-1">
                    {formula.contraindications.map((contra, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-red-700">
                        <XCircle className="h-3 w-3" />
                        {contra}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // List View
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="처방명, 한자, 증상으로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Pre-made Comparisons */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              자주 비교하는 처방
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparisonPairs.map((pair) => (
                <button
                  key={pair.id}
                  onClick={() => {
                    setSelectedPair(pair)
                    setExpandedSections(pair.differences.map((d) => d.category))
                  }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-lg hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                        {pair.formulas[0].name}
                      </span>
                      <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        {pair.formulas[1].name}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {pair.differences[0].items[0].recommendation}
                  </p>
                  <p className="text-sm text-indigo-600 group-hover:text-indigo-700 font-medium">
                    비교하기 →
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* All Formulas */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">전체 처방 목록</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFormulas.map((formula) => (
                <div
                  key={formula.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">{formula.name}</h4>
                      <p className="text-sm text-gray-500">{formula.hanja}</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {formula.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{formula.indication}</p>
                  <div className="flex flex-wrap gap-1">
                    {formula.keySymptoms.slice(0, 3).map((symptom) => (
                      <span
                        key={symptom}
                        className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
