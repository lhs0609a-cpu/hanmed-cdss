import { useState } from 'react'
import {
  FileText,
  Search,
  Copy,
  Check,
  Filter,
  Info,
  DollarSign,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsuranceCode {
  id: string
  code: string
  name: string
  category: string
  subcategory: string
  points: number
  price: number
  description: string
  notes?: string
  relatedCodes?: string[]
}

const insuranceCodes: InsuranceCode[] = [
  // ===== 진찰료 =====
  {
    id: '1',
    code: 'K0001',
    name: '한방 초진진찰료',
    category: '진찰료',
    subcategory: '초진',
    points: 120,
    price: 12000,
    description: '한의원에서 처음 진료받는 환자에 대한 진찰료',
    notes: '동일 상병에 대해 30일 이내 재진 시 재진료 적용',
  },
  {
    id: '2',
    code: 'K0002',
    name: '한방 재진진찰료',
    category: '진찰료',
    subcategory: '재진',
    points: 80,
    price: 8000,
    description: '한의원에서 재진료 시 진찰료',
  },
  {
    id: '3',
    code: 'K0003',
    name: '한방 야간 진찰료 가산',
    category: '진찰료',
    subcategory: '가산',
    points: 30,
    price: 3000,
    description: '야간(18시-22시) 진료 시 가산',
    notes: '초진/재진진찰료에 가산',
  },
  {
    id: '4',
    code: 'K0004',
    name: '한방 심야 진찰료 가산',
    category: '진찰료',
    subcategory: '가산',
    points: 50,
    price: 5000,
    description: '심야(22시-06시) 진료 시 가산',
    notes: '초진/재진진찰료에 가산',
  },
  {
    id: '5',
    code: 'K0005',
    name: '한방 공휴일 진찰료 가산',
    category: '진찰료',
    subcategory: '가산',
    points: 40,
    price: 4000,
    description: '공휴일 진료 시 가산',
  },
  {
    id: '6',
    code: 'K0006',
    name: '한방 전화상담료',
    category: '진찰료',
    subcategory: '상담',
    points: 20,
    price: 2000,
    description: '등록환자 전화상담료',
    notes: '1일 1회 한정',
  },

  // ===== 침술 - 체침 =====
  {
    id: '10',
    code: 'K1001',
    name: '체침술 (1-5개)',
    category: '침술',
    subcategory: '체침',
    points: 50,
    price: 5000,
    description: '체침 1-5개 시술 시',
    relatedCodes: ['K1002', 'K1003'],
  },
  {
    id: '11',
    code: 'K1002',
    name: '체침술 (6-10개)',
    category: '침술',
    subcategory: '체침',
    points: 70,
    price: 7000,
    description: '체침 6-10개 시술 시',
  },
  {
    id: '12',
    code: 'K1003',
    name: '체침술 (11개 이상)',
    category: '침술',
    subcategory: '체침',
    points: 90,
    price: 9000,
    description: '체침 11개 이상 시술 시',
  },

  // ===== 침술 - 전침 =====
  {
    id: '13',
    code: 'K1101',
    name: '전침술',
    category: '침술',
    subcategory: '전침',
    points: 30,
    price: 3000,
    description: '전기침 시술료 (체침에 추가)',
    notes: '체침술과 동시 산정',
  },
  {
    id: '14',
    code: 'K1102',
    name: '전침술 (저주파)',
    category: '침술',
    subcategory: '전침',
    points: 35,
    price: 3500,
    description: '저주파 전침 시술',
  },
  {
    id: '15',
    code: 'K1103',
    name: '전침술 (중주파)',
    category: '침술',
    subcategory: '전침',
    points: 40,
    price: 4000,
    description: '중주파 전침 시술',
  },

  // ===== 침술 - 특수침 =====
  {
    id: '16',
    code: 'K1201',
    name: '이침술',
    category: '침술',
    subcategory: '특수침',
    points: 35,
    price: 3500,
    description: '이침(귀침) 시술',
    notes: '피내침, 압봉 포함',
  },
  {
    id: '17',
    code: 'K1202',
    name: '두침술',
    category: '침술',
    subcategory: '특수침',
    points: 45,
    price: 4500,
    description: '두피침 시술',
  },
  {
    id: '18',
    code: 'K1203',
    name: '수지침술',
    category: '침술',
    subcategory: '특수침',
    points: 30,
    price: 3000,
    description: '수지침 시술',
  },
  {
    id: '19',
    code: 'K1204',
    name: '화침술',
    category: '침술',
    subcategory: '특수침',
    points: 60,
    price: 6000,
    description: '화침(火針) 시술',
    notes: '멸균 처리 필수',
  },
  {
    id: '20',
    code: 'K1205',
    name: '약침술 (경혈)',
    category: '침술',
    subcategory: '약침',
    points: 80,
    price: 8000,
    description: '약침 시술 (1부위)',
    notes: '약침액 비용 별도',
  },
  {
    id: '21',
    code: 'K1206',
    name: '약침술 (봉독)',
    category: '침술',
    subcategory: '약침',
    points: 100,
    price: 10000,
    description: '봉독약침 시술',
    notes: '알레르기 테스트 필수',
  },
  {
    id: '22',
    code: 'K1207',
    name: '자락술',
    category: '침술',
    subcategory: '특수침',
    points: 55,
    price: 5500,
    description: '자락(瀉絡) 시술',
  },
  {
    id: '23',
    code: 'K1208',
    name: '피내침술',
    category: '침술',
    subcategory: '특수침',
    points: 25,
    price: 2500,
    description: '피내침(피하침) 시술',
  },
  {
    id: '24',
    code: 'K1209',
    name: '침도술',
    category: '침술',
    subcategory: '특수침',
    points: 120,
    price: 12000,
    description: '침도(소침도) 시술',
    notes: '특수재료 포함',
  },
  {
    id: '25',
    code: 'K1210',
    name: '매선술',
    category: '침술',
    subcategory: '특수침',
    points: 150,
    price: 15000,
    description: '매선(埋線) 시술 (1부위)',
    notes: 'PDO 실 비용 포함',
  },

  // ===== 구술 =====
  {
    id: '30',
    code: 'K2001',
    name: '뜸술 (직접구)',
    category: '구술',
    subcategory: '직접구',
    points: 40,
    price: 4000,
    description: '직접 뜸 시술',
  },
  {
    id: '31',
    code: 'K2002',
    name: '뜸술 (간접구)',
    category: '구술',
    subcategory: '간접구',
    points: 35,
    price: 3500,
    description: '간접 뜸 시술',
  },
  {
    id: '32',
    code: 'K2003',
    name: '뜸술 (격물구)',
    category: '구술',
    subcategory: '간접구',
    points: 45,
    price: 4500,
    description: '생강, 마늘 등 격물구 시술',
  },
  {
    id: '33',
    code: 'K2004',
    name: '전자뜸술',
    category: '구술',
    subcategory: '전자구',
    points: 30,
    price: 3000,
    description: '전자뜸 시술',
  },
  {
    id: '34',
    code: 'K2005',
    name: '온침술',
    category: '구술',
    subcategory: '온침',
    points: 50,
    price: 5000,
    description: '체침과 뜸 병용 시술',
    notes: '체침술과 동시 산정',
  },

  // ===== 부항 =====
  {
    id: '40',
    code: 'K3001',
    name: '부항술 (건식)',
    category: '부항',
    subcategory: '건식',
    points: 25,
    price: 2500,
    description: '건식 부항 시술',
  },
  {
    id: '41',
    code: 'K3002',
    name: '부항술 (습식)',
    category: '부항',
    subcategory: '습식',
    points: 40,
    price: 4000,
    description: '습식 부항 시술 (사혈 포함)',
    notes: '의료폐기물 처리 규정 준수',
  },
  {
    id: '42',
    code: 'K3003',
    name: '부항술 (유관법)',
    category: '부항',
    subcategory: '특수부항',
    points: 35,
    price: 3500,
    description: '유관법 부항 시술',
  },
  {
    id: '43',
    code: 'K3004',
    name: '부항술 (섬관법)',
    category: '부항',
    subcategory: '특수부항',
    points: 30,
    price: 3000,
    description: '섬관법(번쩍부항) 시술',
  },

  // ===== 추나 =====
  {
    id: '50',
    code: 'K4001',
    name: '추나요법 (단순)',
    category: '추나',
    subcategory: '단순추나',
    points: 100,
    price: 10000,
    description: '단순 추나 치료 (1부위)',
  },
  {
    id: '51',
    code: 'K4002',
    name: '추나요법 (복잡)',
    category: '추나',
    subcategory: '복잡추나',
    points: 150,
    price: 15000,
    description: '복잡 추나 치료',
    notes: '연간 20회 한도 (급여)',
  },
  {
    id: '52',
    code: 'K4003',
    name: '추나요법 (특수)',
    category: '추나',
    subcategory: '특수추나',
    points: 200,
    price: 20000,
    description: '특수 추나 치료',
    notes: '경추/요추 특수 교정',
  },
  {
    id: '53',
    code: 'K4011',
    name: '경추 추나요법',
    category: '추나',
    subcategory: '부위별',
    points: 120,
    price: 12000,
    description: '경추부 추나 치료',
  },
  {
    id: '54',
    code: 'K4012',
    name: '흉추 추나요법',
    category: '추나',
    subcategory: '부위별',
    points: 130,
    price: 13000,
    description: '흉추부 추나 치료',
  },
  {
    id: '55',
    code: 'K4013',
    name: '요추 추나요법',
    category: '추나',
    subcategory: '부위별',
    points: 140,
    price: 14000,
    description: '요추부 추나 치료',
  },
  {
    id: '56',
    code: 'K4014',
    name: '골반 추나요법',
    category: '추나',
    subcategory: '부위별',
    points: 150,
    price: 15000,
    description: '골반부 추나 치료',
  },
  {
    id: '57',
    code: 'K4021',
    name: '추나요법 (연부조직)',
    category: '추나',
    subcategory: '기법별',
    points: 80,
    price: 8000,
    description: '연부조직 추나 기법',
  },
  {
    id: '58',
    code: 'K4022',
    name: '추나요법 (관절가동)',
    category: '추나',
    subcategory: '기법별',
    points: 110,
    price: 11000,
    description: '관절가동 추나 기법',
  },
  {
    id: '59',
    code: 'K4023',
    name: '추나요법 (고속저폭)',
    category: '추나',
    subcategory: '기법별',
    points: 160,
    price: 16000,
    description: '고속저폭(HVLA) 추나 기법',
    notes: '전문의 시술 권장',
  },

  // ===== 한약 =====
  {
    id: '60',
    code: 'K5001',
    name: '한약첩약료 (7일)',
    category: '한약',
    subcategory: '첩약',
    points: 0,
    price: 0,
    description: '한약 첩약 조제료 (7일분)',
    notes: '약재비 별도',
  },
  {
    id: '61',
    code: 'K5002',
    name: '한약첩약료 (14일)',
    category: '한약',
    subcategory: '첩약',
    points: 0,
    price: 0,
    description: '한약 첩약 조제료 (14일분)',
    notes: '약재비 별도',
  },
  {
    id: '62',
    code: 'K5003',
    name: '한약첩약료 (21일)',
    category: '한약',
    subcategory: '첩약',
    points: 0,
    price: 0,
    description: '한약 첩약 조제료 (21일분)',
    notes: '약재비 별도',
  },
  {
    id: '63',
    code: 'K5004',
    name: '한약첩약료 (30일)',
    category: '한약',
    subcategory: '첩약',
    points: 0,
    price: 0,
    description: '한약 첩약 조제료 (30일분)',
    notes: '약재비 별도, 장기처방',
  },
  {
    id: '64',
    code: 'K5101',
    name: '한약제제 (연조엑스)',
    category: '한약',
    subcategory: '제제',
    points: 0,
    price: 0,
    description: '연조엑스제 처방',
    notes: '보험급여 품목 확인',
  },
  {
    id: '65',
    code: 'K5102',
    name: '한약제제 (과립제)',
    category: '한약',
    subcategory: '제제',
    points: 0,
    price: 0,
    description: '과립제 처방',
    notes: '보험급여 품목 확인',
  },
  {
    id: '66',
    code: 'K5103',
    name: '한약제제 (환제)',
    category: '한약',
    subcategory: '제제',
    points: 0,
    price: 0,
    description: '환제 처방',
  },
  {
    id: '67',
    code: 'K5104',
    name: '한약제제 (액제)',
    category: '한약',
    subcategory: '제제',
    points: 0,
    price: 0,
    description: '액제 처방',
  },

  // ===== 물리치료 =====
  {
    id: '70',
    code: 'K6001',
    name: '한방물리요법 (온열)',
    category: '물리치료',
    subcategory: '온열',
    points: 20,
    price: 2000,
    description: 'IR, 온습포 등 온열치료',
  },
  {
    id: '71',
    code: 'K6002',
    name: '한방물리요법 (경피전기신경자극)',
    category: '물리치료',
    subcategory: '전기',
    points: 25,
    price: 2500,
    description: 'TENS 등 전기자극치료',
  },
  {
    id: '72',
    code: 'K6003',
    name: '한방물리요법 (초음파)',
    category: '물리치료',
    subcategory: '초음파',
    points: 30,
    price: 3000,
    description: '초음파치료',
  },
  {
    id: '73',
    code: 'K6004',
    name: '한방물리요법 (간섭파)',
    category: '물리치료',
    subcategory: '전기',
    points: 25,
    price: 2500,
    description: 'ICT 간섭파 치료',
  },
  {
    id: '74',
    code: 'K6005',
    name: '한방물리요법 (레이저)',
    category: '물리치료',
    subcategory: '광선',
    points: 35,
    price: 3500,
    description: '레이저치료',
  },
  {
    id: '75',
    code: 'K6006',
    name: '한방물리요법 (파라핀)',
    category: '물리치료',
    subcategory: '온열',
    points: 15,
    price: 1500,
    description: '파라핀욕 치료',
  },
  {
    id: '76',
    code: 'K6007',
    name: '한방물리요법 (견인)',
    category: '물리치료',
    subcategory: '도수',
    points: 30,
    price: 3000,
    description: '견인(Traction)치료',
  },

  // ===== 검사 =====
  {
    id: '80',
    code: 'K7001',
    name: '맥진기 검사',
    category: '검사',
    subcategory: '한방검사',
    points: 50,
    price: 5000,
    description: '맥파 분석 검사',
  },
  {
    id: '81',
    code: 'K7002',
    name: '설진기 검사',
    category: '검사',
    subcategory: '한방검사',
    points: 40,
    price: 4000,
    description: '설진 영상 분석 검사',
  },
  {
    id: '82',
    code: 'K7003',
    name: '체성분 분석',
    category: '검사',
    subcategory: '기기검사',
    points: 30,
    price: 3000,
    description: '체성분 분석 검사',
  },
  {
    id: '83',
    code: 'K7004',
    name: '경락기능 검사',
    category: '검사',
    subcategory: '한방검사',
    points: 60,
    price: 6000,
    description: '경락 기능 검사',
  },
  {
    id: '84',
    code: 'K7005',
    name: '적외선체열검사',
    category: '검사',
    subcategory: '기기검사',
    points: 100,
    price: 10000,
    description: 'DITI 적외선체열검사',
  },
  {
    id: '85',
    code: 'K7006',
    name: '심박변이도 검사',
    category: '검사',
    subcategory: '기기검사',
    points: 45,
    price: 4500,
    description: 'HRV 심박변이도 검사',
  },
  {
    id: '86',
    code: 'K7007',
    name: '사상체질 검사',
    category: '검사',
    subcategory: '한방검사',
    points: 80,
    price: 8000,
    description: '사상체질 진단 검사',
  },

  // ===== 처치 =====
  {
    id: '90',
    code: 'K8001',
    name: '테이핑 요법',
    category: '처치',
    subcategory: '부착',
    points: 20,
    price: 2000,
    description: '테이핑 시술 (1부위)',
  },
  {
    id: '91',
    code: 'K8002',
    name: '첩부 요법',
    category: '처치',
    subcategory: '부착',
    points: 25,
    price: 2500,
    description: '한방파스 첩부 요법',
  },
  {
    id: '92',
    code: 'K8003',
    name: '한방 드레싱',
    category: '처치',
    subcategory: '외용',
    points: 30,
    price: 3000,
    description: '한방 외용제 드레싱',
  },
  {
    id: '93',
    code: 'K8004',
    name: '훈증 치료',
    category: '처치',
    subcategory: '훈증',
    points: 35,
    price: 3500,
    description: '한방 훈증 치료',
  },
  {
    id: '94',
    code: 'K8005',
    name: '좌훈 치료',
    category: '처치',
    subcategory: '훈증',
    points: 40,
    price: 4000,
    description: '좌훈(좌욕) 치료',
  },
  {
    id: '95',
    code: 'K8006',
    name: '약찜질 치료',
    category: '처치',
    subcategory: '온열',
    points: 35,
    price: 3500,
    description: '한방 약찜질 치료',
  },
]

const categories = ['전체', '진찰료', '침술', '구술', '부항', '추나', '한약', '물리치료', '검사', '처치']

export default function InsuranceCodePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedCode, setSelectedCode] = useState<InsuranceCode | null>(null)

  const filteredCodes = insuranceCodes.filter((code) => {
    const matchesSearch =
      !searchQuery ||
      code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.name.includes(searchQuery) ||
      code.description.includes(searchQuery)

    const matchesCategory =
      selectedCategory === '전체' || code.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-7 w-7 text-green-500" />
          보험 청구 코드
        </h1>
        <p className="mt-1 text-gray-500">
          한방 보험 청구 코드를 검색하고 확인하세요
        </p>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="코드, 명칭으로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                selectedCategory === category
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Code List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                  코드
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                  명칭
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                  분류
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">
                  점수
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">
                  수가
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">

                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCodes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-green-600">{code.code}</span>
                      <button
                        onClick={() => handleCopyCode(code.code)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="코드 복사"
                      >
                        {copiedCode === code.code ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{code.name}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {code.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        {code.category}
                      </span>
                      <span className="text-xs text-gray-500">{code.subcategory}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-900">{code.points}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-900">
                      {code.price > 0 ? `₩${formatPrice(code.price)}` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedCode(code)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Info className="h-5 w-5 text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCodes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">검색 결과가 없습니다</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-500">전체 코드</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{insuranceCodes.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-500">침술 코드</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {insuranceCodes.filter((c) => c.category === '침술').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-gray-500">추나 코드</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {insuranceCodes.filter((c) => c.category === '추나').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-gray-500">한약 코드</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {insuranceCodes.filter((c) => c.category === '한약').length}
          </p>
        </div>
      </div>

      {/* Code Detail Modal */}
      {selectedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="font-mono text-2xl font-bold text-green-600">
                  {selectedCode.code}
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-2">
                  {selectedCode.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCode(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
                  {selectedCode.category}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
                  {selectedCode.subcategory}
                </span>
              </div>

              <p className="text-gray-700">{selectedCode.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">점수</p>
                  <p className="text-xl font-bold text-gray-900">{selectedCode.points}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">수가</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCode.price > 0 ? `₩${formatPrice(selectedCode.price)}` : '-'}
                  </p>
                </div>
              </div>

              {selectedCode.notes && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-800">
                    <Info className="inline h-4 w-4 mr-1" />
                    {selectedCode.notes}
                  </p>
                </div>
              )}

              {selectedCode.relatedCodes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">관련 코드</p>
                  <div className="flex gap-2">
                    {selectedCode.relatedCodes.map((code, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-sm font-mono rounded"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleCopyCode(selectedCode.code)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="h-5 w-5" />
                코드 복사
              </button>
              <button
                onClick={() => setSelectedCode(null)}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
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
