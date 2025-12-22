import { useState } from 'react'
import {
  FileText,
  Search,
  Copy,
  Check,
  Filter,
  ChevronRight,
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
    id: '4',
    code: 'K1002',
    name: '체침술 (6-10개)',
    category: '침술',
    subcategory: '체침',
    points: 70,
    price: 7000,
    description: '체침 6-10개 시술 시',
  },
  {
    id: '5',
    code: 'K1003',
    name: '체침술 (11개 이상)',
    category: '침술',
    subcategory: '체침',
    points: 90,
    price: 9000,
    description: '체침 11개 이상 시술 시',
  },
  {
    id: '6',
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
    id: '7',
    code: 'K2001',
    name: '뜸술 (직접구)',
    category: '구술',
    subcategory: '직접구',
    points: 40,
    price: 4000,
    description: '직접 뜸 시술',
  },
  {
    id: '8',
    code: 'K2002',
    name: '뜸술 (간접구)',
    category: '구술',
    subcategory: '간접구',
    points: 35,
    price: 3500,
    description: '간접 뜸 시술',
  },
  {
    id: '9',
    code: 'K3001',
    name: '부항술 (건식)',
    category: '부항',
    subcategory: '건식',
    points: 25,
    price: 2500,
    description: '건식 부항 시술',
  },
  {
    id: '10',
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
    id: '11',
    code: 'K4001',
    name: '추나요법 (단순)',
    category: '추나',
    subcategory: '단순추나',
    points: 100,
    price: 10000,
    description: '단순 추나 치료',
  },
  {
    id: '12',
    code: 'K4002',
    name: '추나요법 (복잡)',
    category: '추나',
    subcategory: '복잡추나',
    points: 150,
    price: 15000,
    description: '복잡 추나 치료',
    notes: '연간 20회 한도',
  },
  {
    id: '13',
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
    id: '14',
    code: 'K5002',
    name: '한약첩약료 (14일)',
    category: '한약',
    subcategory: '첩약',
    points: 0,
    price: 0,
    description: '한약 첩약 조제료 (14일분)',
    notes: '약재비 별도',
  },
]

const categories = ['전체', '진찰료', '침술', '구술', '부항', '추나', '한약']

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
