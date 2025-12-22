import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  BookOpen,
  X,
  User,
  Pill,
  Calendar,
  ChevronRight,
  FileText,
  TrendingUp,
  Activity,
  Brain,
} from 'lucide-react'

// 더미 치험례 데이터 (상세 정보 포함)
interface CaseRecord {
  id: string
  chiefComplaint: string
  symptoms: string
  constitution: string
  formulaName: string
  outcome: '완치' | '호전' | '무효'
  year: number
  // 상세 정보
  patientInfo: {
    age: number
    gender: 'M' | 'F'
    occupation: string
  }
  diagnosis: {
    pattern: string // 변증
    explanation: string
  }
  treatment: {
    formula: string
    herbs: Array<{ name: string; amount: string }>
    modifications: string
    duration: string
    frequency: string
  }
  progress: Array<{
    week: number
    description: string
    improvement: number // 0-100
  }>
  notes: string
  references: string[]
}

const dummyCases: CaseRecord[] = [
  {
    id: 'LEE-1995-0001',
    chiefComplaint: '소화불량, 복부 냉증',
    symptoms: '식욕부진, 복부팽만, 수족냉증, 설사',
    constitution: '소음인',
    formulaName: '이중탕',
    outcome: '호전',
    year: 1995,
    patientInfo: {
      age: 45,
      gender: 'F',
      occupation: '주부',
    },
    diagnosis: {
      pattern: '비위허한증(脾胃虛寒證)',
      explanation:
        '환자는 평소 소화기능이 약하고 찬 음식을 먹으면 복통과 설사가 심해지는 증상을 호소했습니다. 맥은 침세(沈細)하고 설질은 담백하며, 복진상 복부가 차가웠습니다. 이는 비위의 양기가 부족하여 발생한 허한증으로 판단되었습니다.',
    },
    treatment: {
      formula: '이중탕(理中湯)',
      herbs: [
        { name: '인삼', amount: '6g' },
        { name: '백출', amount: '9g' },
        { name: '건강', amount: '6g' },
        { name: '감초', amount: '3g' },
      ],
      modifications: '복통이 심할 때 백작약 6g 가미',
      duration: '6주',
      frequency: '1일 2회',
    },
    progress: [
      { week: 1, description: '복부 냉감 약간 감소', improvement: 20 },
      { week: 2, description: '설사 횟수 감소, 식욕 호전', improvement: 40 },
      { week: 4, description: '소화불량 증상 대폭 개선', improvement: 70 },
      { week: 6, description: '대부분의 증상 소실, 유지 치료로 전환', improvement: 85 },
    ],
    notes:
      '환자는 치료 후 일상생활에 지장이 없을 정도로 호전되었습니다. 계절 변화 시 증상 재발 방지를 위해 3개월간 유지 치료를 진행했습니다.',
    references: ['상한론', '동의보감 내경편'],
  },
  {
    id: 'LEE-1997-0342',
    chiefComplaint: '두통, 어지러움',
    symptoms: '편두통, 현훈, 이명, 구역감',
    constitution: '소양인',
    formulaName: '반하백출천마탕',
    outcome: '완치',
    year: 1997,
    patientInfo: {
      age: 38,
      gender: 'M',
      occupation: '회사원',
    },
    diagnosis: {
      pattern: '담음상역(痰飮上逆)',
      explanation:
        '환자는 평소 과식과 음주 습관이 있으며, 최근 스트레스가 심해지면서 두통과 어지러움이 발생했습니다. 혀에 백태가 두껍고 맥이 활삭(滑數)하여 담음이 상역한 것으로 진단했습니다.',
    },
    treatment: {
      formula: '반하백출천마탕(半夏白朮天麻湯)',
      herbs: [
        { name: '반하', amount: '9g' },
        { name: '백출', amount: '9g' },
        { name: '천마', amount: '6g' },
        { name: '진피', amount: '6g' },
        { name: '복령', amount: '9g' },
        { name: '감초', amount: '3g' },
        { name: '생강', amount: '3g' },
        { name: '대조', amount: '2매' },
      ],
      modifications: '두통이 심할 때 천궁 6g, 백지 6g 가미',
      duration: '4주',
      frequency: '1일 3회',
    },
    progress: [
      { week: 1, description: '구역감 감소, 어지러움 약간 호전', improvement: 30 },
      { week: 2, description: '두통 빈도 감소, 이명 호전', improvement: 55 },
      { week: 3, description: '대부분의 증상 소실', improvement: 85 },
      { week: 4, description: '증상 완전 소실, 치료 종결', improvement: 100 },
    ],
    notes:
      '환자에게 식이 조절(기름진 음식, 음주 자제)과 스트레스 관리의 중요성을 교육했습니다. 재발 방지를 위한 생활 수칙을 안내했습니다.',
    references: ['의학입문', '동의보감'],
  },
  {
    id: 'LEE-2001-0128',
    chiefComplaint: '만성 피로, 기력 저하',
    symptoms: '권태감, 식욕부진, 자한, 숨참',
    constitution: '태음인',
    formulaName: '보중익기탕',
    outcome: '호전',
    year: 2001,
    patientInfo: {
      age: 52,
      gender: 'F',
      occupation: '교사',
    },
    diagnosis: {
      pattern: '비기허약(脾氣虛弱), 중기하함(中氣下陷)',
      explanation:
        '환자는 장기간의 과로와 불규칙한 식습관으로 인해 기력이 저하되었습니다. 조금만 움직여도 숨이 차고 땀이 나며, 오후가 되면 더욱 피로해지는 양상을 보였습니다. 맥은 허연(虛軟)하고 설질은 담백했습니다.',
    },
    treatment: {
      formula: '보중익기탕(補中益氣湯)',
      herbs: [
        { name: '황기', amount: '12g' },
        { name: '인삼', amount: '6g' },
        { name: '백출', amount: '9g' },
        { name: '감초', amount: '6g' },
        { name: '당귀', amount: '6g' },
        { name: '진피', amount: '6g' },
        { name: '승마', amount: '3g' },
        { name: '시호', amount: '3g' },
      ],
      modifications: '자한이 심할 때 오미자 6g 가미',
      duration: '8주',
      frequency: '1일 2회',
    },
    progress: [
      { week: 2, description: '식욕 약간 호전', improvement: 15 },
      { week: 4, description: '피로감 감소, 자한 호전', improvement: 40 },
      { week: 6, description: '일상 활동 가능, 숨참 감소', improvement: 65 },
      { week: 8, description: '대부분의 증상 호전, 유지 치료', improvement: 80 },
    ],
    notes:
      '환자의 생활 습관 개선(충분한 휴식, 규칙적인 식사)과 함께 치료를 진행했습니다. 완전한 회복을 위해 3개월간 유지 치료를 권장했습니다.',
    references: ['비위론(脾胃論)', '동의보감'],
  },
  {
    id: 'LEE-2005-0456',
    chiefComplaint: '불면, 심계',
    symptoms: '입면장애, 가슴 두근거림, 불안, 다몽',
    constitution: '소음인',
    formulaName: '귀비탕',
    outcome: '완치',
    year: 2005,
    patientInfo: {
      age: 42,
      gender: 'F',
      occupation: '사업가',
    },
    diagnosis: {
      pattern: '심비양허(心脾兩虛)',
      explanation:
        '환자는 사업상 스트레스와 과로로 인해 불면과 심계 증상이 발생했습니다. 많이 생각하면 가슴이 두근거리고, 잠이 들어도 꿈이 많아 개운하지 않았습니다. 맥은 세약(細弱)하고 설질은 담홍했습니다.',
    },
    treatment: {
      formula: '귀비탕(歸脾湯)',
      herbs: [
        { name: '인삼', amount: '6g' },
        { name: '황기', amount: '9g' },
        { name: '백출', amount: '9g' },
        { name: '복신', amount: '9g' },
        { name: '산조인', amount: '12g' },
        { name: '용안육', amount: '9g' },
        { name: '당귀', amount: '6g' },
        { name: '원지', amount: '6g' },
        { name: '목향', amount: '3g' },
        { name: '감초', amount: '3g' },
      ],
      modifications: '심계가 심할 때 자석 15g(선전) 가미',
      duration: '6주',
      frequency: '1일 2회 (취침 전 복용 권장)',
    },
    progress: [
      { week: 1, description: '심계 약간 감소', improvement: 25 },
      { week: 2, description: '입면 시간 단축, 불안 감소', improvement: 45 },
      { week: 4, description: '수면의 질 호전, 꿈 감소', improvement: 75 },
      { week: 6, description: '증상 거의 소실, 치료 종결', improvement: 95 },
    ],
    notes:
      '환자에게 취침 전 스마트폰 사용 자제, 일정한 취침 시간 유지, 카페인 섭취 제한 등의 수면 위생 교육을 실시했습니다.',
    references: ['제생방(濟生方)', '동의보감 신형편'],
  },
]

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConstitution, setSelectedConstitution] = useState('')
  const [selectedOutcome, setSelectedOutcome] = useState('')

  // 상세 모달
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const filteredCases = dummyCases.filter((c) => {
    const matchesQuery =
      !searchQuery ||
      c.chiefComplaint.includes(searchQuery) ||
      c.symptoms.includes(searchQuery) ||
      c.formulaName.includes(searchQuery) ||
      c.diagnosis.pattern.includes(searchQuery)
    const matchesConstitution = !selectedConstitution || c.constitution === selectedConstitution
    const matchesOutcome = !selectedOutcome || c.outcome === selectedOutcome
    return matchesQuery && matchesConstitution && matchesOutcome
  })

  const openDetailModal = (caseItem: CaseRecord) => {
    setSelectedCase(caseItem)
    setShowDetailModal(true)
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case '완치':
        return 'bg-green-100 text-green-700'
      case '호전':
        return 'bg-yellow-100 text-yellow-700'
      case '무효':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-amber-500" />
          치험례 검색
        </h1>
        <p className="mt-1 text-gray-600">이종대 선생님의 6,000건 치험례 데이터를 검색합니다.</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="증상, 처방명, 변증으로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
          <select
            value={selectedConstitution}
            onChange={(e) => setSelectedConstitution(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          >
            <option value="">전체 체질</option>
            <option value="태양인">태양인</option>
            <option value="태음인">태음인</option>
            <option value="소양인">소양인</option>
            <option value="소음인">소음인</option>
          </select>
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          >
            <option value="">전체 결과</option>
            <option value="완치">완치</option>
            <option value="호전">호전</option>
            <option value="무효">무효</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">검색 결과</p>
          <p className="text-2xl font-bold text-gray-900">{filteredCases.length}건</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">완치</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredCases.filter((c) => c.outcome === '완치').length}건
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">호전</p>
          <p className="text-2xl font-bold text-yellow-600">
            {filteredCases.filter((c) => c.outcome === '호전').length}건
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">전체 DB</p>
          <p className="text-2xl font-bold text-amber-600">6,000건</p>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filteredCases.map((caseItem) => (
          <div
            key={caseItem.id}
            onClick={() => openDetailModal(caseItem)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                    {caseItem.chiefComplaint}
                  </h3>
                  <p className="text-sm text-gray-500">케이스 ID: {caseItem.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">
                  {caseItem.constitution}
                </span>
                <span className={`text-sm px-2 py-1 rounded-lg font-medium ${getOutcomeColor(caseItem.outcome)}`}>
                  {caseItem.outcome}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-2">
                <Activity className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-gray-500 block">증상</span>
                  <span className="text-sm text-gray-700">{caseItem.symptoms}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Pill className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-gray-500 block">처방</span>
                  <span className="text-sm text-amber-600 font-medium">{caseItem.formulaName}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-gray-500 block">기록 연도</span>
                  <span className="text-sm text-gray-700">{caseItem.year}년</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                <Brain className="h-4 w-4 inline mr-1" />
                {caseItem.diagnosis.pattern}
              </span>
              <span className="text-sm text-amber-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                상세 보기 <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}

        {filteredCases.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">검색 결과가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">다른 검색어로 시도해보세요</p>
          </div>
        )}
      </div>

      {/* 상세 정보 모달 */}
      {showDetailModal && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-white/20 rounded">{selectedCase.id}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        selectedCase.outcome === '완치'
                          ? 'bg-green-400 text-green-900'
                          : selectedCase.outcome === '호전'
                            ? 'bg-yellow-400 text-yellow-900'
                            : 'bg-red-400 text-red-900'
                      }`}
                    >
                      {selectedCase.outcome}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">{selectedCase.chiefComplaint}</h2>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
              {/* 환자 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    환자 정보
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">나이/성별</span>
                      <span className="font-medium">
                        {selectedCase.patientInfo.age}세 / {selectedCase.patientInfo.gender === 'F' ? '여' : '남'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">직업</span>
                      <span className="font-medium">{selectedCase.patientInfo.occupation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">체질</span>
                      <span className="font-medium text-purple-600">{selectedCase.constitution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">기록 연도</span>
                      <span className="font-medium">{selectedCase.year}년</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-red-500" />
                    주요 증상
                  </h3>
                  <div className="bg-red-50 p-4 rounded-xl">
                    <p className="text-gray-700 mb-2 font-medium">{selectedCase.chiefComplaint}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCase.symptoms.split(', ').map((symptom, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-white rounded-full border border-red-200">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 변증 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  변증 (診斷)
                </h3>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-purple-700 font-bold mb-2">{selectedCase.diagnosis.pattern}</p>
                  <p className="text-gray-700 leading-relaxed">{selectedCase.diagnosis.explanation}</p>
                </div>
              </div>

              {/* 처방 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Pill className="h-5 w-5 text-teal-500" />
                  처방 및 치료
                </h3>
                <div className="bg-teal-50 p-4 rounded-xl space-y-4">
                  <div>
                    <p className="text-teal-700 font-bold text-lg mb-2">{selectedCase.treatment.formula}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedCase.treatment.herbs.map((herb, i) => (
                        <span
                          key={i}
                          className="text-sm px-3 py-1.5 bg-white rounded-lg border border-teal-200 font-medium"
                        >
                          {herb.name} {herb.amount}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">가감:</span> {selectedCase.treatment.modifications}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-teal-200">
                    <div>
                      <span className="text-xs text-gray-500 block">치료 기간</span>
                      <span className="font-medium">{selectedCase.treatment.duration}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">복용 빈도</span>
                      <span className="font-medium">{selectedCase.treatment.frequency}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 치료 경과 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  치료 경과
                </h3>
                <div className="bg-emerald-50 p-4 rounded-xl">
                  <div className="space-y-4">
                    {selectedCase.progress.map((p, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-16">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-200 px-2 py-1 rounded">
                            {p.week}주차
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-700">{p.description}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  p.improvement >= 80
                                    ? 'bg-emerald-500'
                                    : p.improvement >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-orange-500'
                                }`}
                                style={{ width: `${p.improvement}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-600 w-12">{p.improvement}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 비고 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-500" />
                  비고 및 참고문헌
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <p className="text-gray-700 leading-relaxed">{selectedCase.notes}</p>
                  <div className="pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500 block mb-2">참고문헌</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedCase.references.map((ref, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-white rounded border border-gray-200">
                          {ref}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                닫기
              </button>
              <Link
                to={`/consultation?formula=${selectedCase.formulaName}`}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all font-medium text-center"
              >
                이 처방으로 진료 시작
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
