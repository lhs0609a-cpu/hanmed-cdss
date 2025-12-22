import { useState } from 'react'
import {
  Search,
  MapPin,
  ChevronRight,
  Filter,
  Zap,
  Target,
  Info,
  Ruler,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Acupoint {
  id: string
  code: string
  name: string
  hanja: string
  pinyin: string
  meridian: string
  meridianCode: string
  location: string
  depth: string
  angle: string
  indications: string[]
  techniques: string[]
  cautions?: string
  relatedPoints?: string[]
}

const meridians = [
  { code: 'LU', name: '수태음폐경', color: 'bg-gray-500' },
  { code: 'LI', name: '수양명대장경', color: 'bg-yellow-500' },
  { code: 'ST', name: '족양명위경', color: 'bg-yellow-600' },
  { code: 'SP', name: '족태음비경', color: 'bg-yellow-700' },
  { code: 'HT', name: '수소음심경', color: 'bg-red-500' },
  { code: 'SI', name: '수태양소장경', color: 'bg-red-600' },
  { code: 'BL', name: '족태양방광경', color: 'bg-blue-500' },
  { code: 'KI', name: '족소음신경', color: 'bg-blue-700' },
  { code: 'PC', name: '수궐음심포경', color: 'bg-purple-500' },
  { code: 'TE', name: '수소양삼초경', color: 'bg-purple-600' },
  { code: 'GB', name: '족소양담경', color: 'bg-green-500' },
  { code: 'LR', name: '족궐음간경', color: 'bg-green-700' },
  { code: 'GV', name: '독맥', color: 'bg-indigo-500' },
  { code: 'CV', name: '임맥', color: 'bg-pink-500' },
]

const bodyParts = [
  '머리/얼굴', '목/어깨', '가슴/등', '복부', '허리/엉덩이', '팔/손', '다리/발'
]

const symptomCategories = [
  '두통', '소화불량', '불면', '요통', '견비통', '월경통', '피로', '감기'
]

const demoAcupoints: Acupoint[] = [
  {
    id: '1',
    code: 'LI4',
    name: '합곡',
    hanja: '合谷',
    pinyin: 'Hegu',
    meridian: '수양명대장경',
    meridianCode: 'LI',
    location: '수배부, 제1·2중수골 사이, 제2중수골 중점의 요측',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['두통', '치통', '인후종통', '발열', '무한', '다한', '경폐', '체통', '구안와사', '반신불수'],
    techniques: ['보법', '사법', '온침', '뜸'],
    cautions: '임신부 금침',
    relatedPoints: ['곡지(LI11)', '열결(LU7)', '태충(LR3)'],
  },
  {
    id: '2',
    code: 'ST36',
    name: '족삼리',
    hanja: '足三里',
    pinyin: 'Zusanli',
    meridian: '족양명위경',
    meridianCode: 'ST',
    location: '슬개골 아래 3촌, 경골 외측 1횡지',
    depth: '1~2촌',
    angle: '직자',
    indications: ['위통', '구토', '복창', '설사', '변비', '소화불량', '하지마비', '각기', '허로', '수종'],
    techniques: ['보법', '사법', '온침', '뜸'],
    relatedPoints: ['중완(CV12)', '내관(PC6)', '합곡(LI4)'],
  },
  {
    id: '3',
    code: 'PC6',
    name: '내관',
    hanja: '內關',
    pinyin: 'Neiguan',
    meridian: '수궐음심포경',
    meridianCode: 'PC',
    location: '전완 전면, 완횡문 상 2촌, 장장근건과 요측수근굴근건 사이',
    depth: '0.5~1촌',
    angle: '직자',
    indications: ['심통', '심계', '흉민', '구토', '위통', '불면', '전간', '울증', '눈병'],
    techniques: ['보법', '사법', '온침'],
    relatedPoints: ['족삼리(ST36)', '중완(CV12)', '신문(HT7)'],
  },
  {
    id: '4',
    code: 'LR3',
    name: '태충',
    hanja: '太衝',
    pinyin: 'Taichong',
    meridian: '족궐음간경',
    meridianCode: 'LR',
    location: '족배부, 제1·2중족골 접합부 앞 함몰처',
    depth: '0.5~1촌',
    angle: '직자 또는 사자',
    indications: ['두통', '현훈', '목적종통', '협통', '월경불조', '붕루', '소변불리', '전간', '소아경풍'],
    techniques: ['보법', '사법'],
    relatedPoints: ['합곡(LI4)', '백회(GV20)', '풍지(GB20)'],
  },
  {
    id: '5',
    code: 'GV20',
    name: '백회',
    hanja: '百會',
    pinyin: 'Baihui',
    meridian: '독맥',
    meridianCode: 'GV',
    location: '정수리, 전정중선 상, 전발제에서 5촌',
    depth: '0.5~1촌',
    angle: '평자(후방향)',
    indications: ['두통', '현훈', '중풍', '불면', '건망', '탈항', '자궁탈수', '이명'],
    techniques: ['보법', '사법', '뜸'],
    relatedPoints: ['풍지(GB20)', '태양(EX-HN5)', '인당(EX-HN3)'],
  },
  {
    id: '6',
    code: 'SP6',
    name: '삼음교',
    hanja: '三陰交',
    pinyin: 'Sanyinjiao',
    meridian: '족태음비경',
    meridianCode: 'SP',
    location: '경골 내측면, 내과첨 상 3촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['장명', '복창', '설사', '월경불조', '붕루', '대하', '음정', '유정', '소변불리', '불면'],
    techniques: ['보법', '사법', '뜸'],
    cautions: '임신부 금침',
    relatedPoints: ['족삼리(ST36)', '혈해(SP10)', '관원(CV4)'],
  },
  {
    id: '7',
    code: 'GB20',
    name: '풍지',
    hanja: '風池',
    pinyin: 'Fengchi',
    meridian: '족소양담경',
    meridianCode: 'GB',
    location: '후두부, 유돌 아래, 승모근과 흉쇄유돌근 사이 함요처',
    depth: '0.8~1.2촌',
    angle: '코끝 방향 사자',
    indications: ['두통', '현훈', '경항강통', '목적종통', '비색', '비연', '이명', '중풍', '감모'],
    techniques: ['사법', '평보평사'],
    cautions: '심자 금기',
    relatedPoints: ['백회(GV20)', '합곡(LI4)', '태양(EX-HN5)'],
  },
  {
    id: '8',
    code: 'CV4',
    name: '관원',
    hanja: '關元',
    pinyin: 'Guanyuan',
    meridian: '임맥',
    meridianCode: 'CV',
    location: '복부, 전정중선 상, 배꼽 아래 3촌',
    depth: '1~1.5촌',
    angle: '직자',
    indications: ['유정', '양위', '월경불조', '붕루', '대하', '요통', '설사', '탈항', '허로'],
    techniques: ['보법', '뜸'],
    relatedPoints: ['기해(CV6)', '신궐(CV8)', '삼음교(SP6)'],
  },
]

export default function AcupointsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMeridian, setSelectedMeridian] = useState<string | null>(null)
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null)
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<Acupoint | null>(null)

  const filteredPoints = demoAcupoints.filter((point) => {
    const matchesSearch =
      !searchQuery ||
      point.name.includes(searchQuery) ||
      point.hanja.includes(searchQuery) ||
      point.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      point.indications.some((ind) => ind.includes(searchQuery))

    const matchesMeridian = !selectedMeridian || point.meridianCode === selectedMeridian

    const matchesSymptom =
      !selectedSymptom || point.indications.some((ind) => ind.includes(selectedSymptom))

    return matchesSearch && matchesMeridian && matchesSymptom
  })

  const getMeridianColor = (code: string) => {
    return meridians.find((m) => m.code === code)?.color || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="h-7 w-7 text-rose-500" />
          경혈 검색
        </h1>
        <p className="mt-1 text-gray-500">
          경락별, 부위별, 증상별로 경혈을 검색하세요
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="혈명, 코드, 주치로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Meridian Filter */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">경락:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedMeridian(null)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                !selectedMeridian
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            {meridians.map((meridian) => (
              <button
                key={meridian.code}
                onClick={() => setSelectedMeridian(meridian.code)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
                  selectedMeridian === meridian.code
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', meridian.color)} />
                {meridian.code}
              </button>
            ))}
          </div>
        </div>

        {/* Symptom Filter */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">주치:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSymptom(null)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                !selectedSymptom
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            {symptomCategories.map((symptom) => (
              <button
                key={symptom}
                onClick={() => setSelectedSymptom(symptom)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  selectedSymptom === symptom
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Points List */}
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {filteredPoints.length}개의 경혈
          </p>
          {filteredPoints.map((point) => (
            <button
              key={point.id}
              onClick={() => setSelectedPoint(point)}
              className={cn(
                'w-full text-left bg-white rounded-xl shadow-sm border p-4 transition-all hover:shadow-md',
                selectedPoint?.id === point.id
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-gray-100 hover:border-rose-200'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn('w-3 h-3 rounded-full', getMeridianColor(point.meridianCode))} />
                  <span className="font-bold text-gray-900">{point.name}</span>
                  <span className="text-gray-500">{point.hanja}</span>
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                  {point.code}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{point.meridian}</p>
              <div className="flex flex-wrap gap-1">
                {point.indications.slice(0, 4).map((ind, i) => (
                  <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs rounded">
                    {ind}
                  </span>
                ))}
                {point.indications.length > 4 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                    +{point.indications.length - 4}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Point Detail */}
        <div className="lg:sticky lg:top-4 h-fit">
          {selectedPoint ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('w-4 h-4 rounded-full', getMeridianColor(selectedPoint.meridianCode))} />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedPoint.name}
                    </h2>
                    <span className="text-xl text-gray-500">{selectedPoint.hanja}</span>
                  </div>
                  <p className="text-gray-500">{selectedPoint.pinyin}</p>
                </div>
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-mono rounded-lg">
                  {selectedPoint.code}
                </span>
              </div>

              {/* Meridian */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">소속 경락</p>
                <p className="font-medium text-gray-900">{selectedPoint.meridian}</p>
              </div>

              {/* Location */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <p className="font-medium text-blue-900">취혈 위치</p>
                </div>
                <p className="text-blue-700">{selectedPoint.location}</p>
              </div>

              {/* Needling */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Ruler className="h-5 w-5 text-purple-500" />
                    <p className="font-medium text-purple-900">자침 깊이</p>
                  </div>
                  <p className="text-purple-700">{selectedPoint.depth}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-xl">
                  <p className="font-medium text-indigo-900 mb-2">자침 각도</p>
                  <p className="text-indigo-700">{selectedPoint.angle}</p>
                </div>
              </div>

              {/* Indications */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <p className="font-medium text-gray-900">주치</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPoint.indications.map((ind, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm rounded-lg"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              {/* Techniques */}
              <div>
                <p className="font-medium text-gray-900 mb-3">시술 방법</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPoint.techniques.map((tech, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm rounded-lg"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Cautions */}
              {selectedPoint.cautions && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-red-500" />
                    <p className="font-medium text-red-900">주의사항</p>
                  </div>
                  <p className="text-red-700">{selectedPoint.cautions}</p>
                </div>
              )}

              {/* Related Points */}
              {selectedPoint.relatedPoints && (
                <div>
                  <p className="font-medium text-gray-900 mb-3">배혈 (관련 혈위)</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPoint.relatedPoints.map((rp, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg"
                      >
                        {rp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">경혈을 선택하면 상세 정보가 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
