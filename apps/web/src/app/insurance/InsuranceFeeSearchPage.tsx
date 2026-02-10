import { useState, useCallback } from 'react'
import {
  Search,
  Copy,
  Check,
  Filter,
  DollarSign,
  Activity,
  FileText,
  Loader2,
  ExternalLink,
  BadgeCheck,
  BadgeX,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  searchKoreanMedicineFee,
  searchKoreanMedicineDisease,
  isInsuranceApiDemoMode,
  type DiseaseInfo,
} from '@/services/insurance-api'
import type { FeeSearchResult } from '@/types'

type TabType = 'fee' | 'disease'

const FEE_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'acupuncture', label: '침술' },
  { id: 'moxa', label: '뜸술' },
  { id: 'cupping', label: '부항' },
  { id: 'chuna', label: '추나' },
  { id: 'herbal', label: '한약' },
  { id: 'exam', label: '진찰' },
]

interface SearchError {
  message: string
  type: 'network' | 'api' | 'empty' | 'timeout'
}

export default function InsuranceFeeSearchPage() {
  const [activeTab, setActiveTab] = useState<TabType>('fee')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [error, setError] = useState<SearchError | null>(null)
  const [isDemoData, setIsDemoData] = useState(false)

  // 수가 검색 상태
  const [feeResults, setFeeResults] = useState<FeeSearchResult[]>([])
  const [feeTotalCount, setFeeTotalCount] = useState(0)
  const [feeCategory, setFeeCategory] = useState('all')

  // 상병코드 검색 상태
  const [diseaseResults, setDiseaseResults] = useState<DiseaseInfo[]>([])
  const [diseaseTotalCount, setDiseaseTotalCount] = useState(0)

  // API 키 미설정 여부 확인
  const isApiKeyMissing = isInsuranceApiDemoMode()

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError({ message: '검색어를 입력해주세요.', type: 'empty' })
      return
    }

    setIsLoading(true)
    setError(null)
    setIsDemoData(false)

    try {
      if (activeTab === 'fee') {
        const result = await searchKoreanMedicineFee(searchQuery)
        setFeeResults(result.items)
        setFeeTotalCount(result.totalCount)
        if (result.isDemo) setIsDemoData(true)

        if (result.items.length === 0) {
          setError({
            message: `"${searchQuery}"에 대한 수가 검색 결과가 없습니다. 다른 검색어를 시도해보세요.`,
            type: 'empty',
          })
        }
      } else {
        const result = await searchKoreanMedicineDisease(searchQuery)
        setDiseaseResults(result.items)
        setDiseaseTotalCount(result.totalCount)
        if (result.isDemo) setIsDemoData(true)

        if (result.items.length === 0) {
          setError({
            message: `"${searchQuery}"에 대한 상병 검색 결과가 없습니다. 다른 검색어를 시도해보세요.`,
            type: 'empty',
          })
        }
      }
    } catch (err) {
      console.error('검색 오류:', err)

      // 에러 타입 분류
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'

      if (errorMessage.includes('network') || errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setError({
          message: '네트워크 연결을 확인해주세요. 인터넷 연결이 불안정합니다.',
          type: 'network',
        })
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        setError({
          message: '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
          type: 'timeout',
        })
      } else {
        setError({
          message: '검색 중 오류가 발생했습니다. 건강보험심사평가원 API 상태를 확인 중입니다.',
          type: 'api',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR')
  }

  const formatDate = (date: string) => {
    if (!date || date.length !== 8) return date
    return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`
  }

  const getPayTypeIcon = (payType: string) => {
    switch (payType) {
      case 'covered':
        return <BadgeCheck className="h-4 w-4 text-green-500" />
      case 'uncovered':
        return <BadgeX className="h-4 w-4 text-red-500" />
      default:
        return <HelpCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getPayTypeLabel = (payType: string) => {
    switch (payType) {
      case 'covered':
        return '급여'
      case 'uncovered':
        return '비급여'
      default:
        return '미정'
    }
  }

  // 카테고리 필터링
  const filteredFeeResults = feeResults.filter((item) => {
    if (feeCategory === 'all') return true
    const name = item.name.toLowerCase()
    const classification = item.classificationName.toLowerCase()

    switch (feeCategory) {
      case 'acupuncture':
        return name.includes('침') || classification.includes('침')
      case 'moxa':
        return name.includes('뜸') || name.includes('구') || classification.includes('뜸')
      case 'cupping':
        return name.includes('부항') || classification.includes('부항')
      case 'chuna':
        return name.includes('추나') || classification.includes('추나')
      case 'herbal':
        return name.includes('한약') || name.includes('약침') || classification.includes('한약')
      case 'exam':
        return name.includes('진찰') || name.includes('검사') || classification.includes('진찰')
      default:
        return true
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-emerald-500" />
          한방 수가/상병 검색
        </h1>
        <p className="mt-1 text-gray-500">
          건강보험심사평가원 공공데이터를 활용한 실시간 검색
        </p>
      </div>

      {/* Demo Mode Warning Banner */}
      {(isApiKeyMissing || isDemoData) && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">샘플 데이터 모드</h3>
              <p className="text-sm text-amber-700">
                현재 공공데이터 API 키가 설정되지 않아 <strong>샘플 데이터</strong>를 표시하고 있습니다.
                실제 수가 정보와 다를 수 있으니 참고용으로만 활용해 주세요.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                정확한 수가 정보는{' '}
                <a
                  href="https://www.hira.or.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-800"
                >
                  건강보험심사평가원
                </a>
                에서 확인하시기 바랍니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5">
        <div className="flex">
          <button
            onClick={() => {
              setActiveTab('fee')
              setSearchQuery('')
              setFeeResults([])
              setDiseaseResults([])
              setError(null)
            }}
            className={cn(
              'flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'fee'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <DollarSign className="h-5 w-5" />
            한방 수가 검색
          </button>
          <button
            onClick={() => {
              setActiveTab('disease')
              setSearchQuery('')
              setFeeResults([])
              setDiseaseResults([])
              setError(null)
            }}
            className={cn(
              'flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'disease'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Activity className="h-5 w-5" />
            상병코드 검색
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeTab === 'fee'
                  ? '수가코드 또는 명칭으로 검색 (예: 침술, 추나, M0010)'
                  : '상병코드 또는 상병명으로 검색 (예: U200, 기허증)'
              }
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            검색
          </button>
        </div>

        {/* Fee Category Filter */}
        {activeTab === 'fee' && feeResults.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
            {FEE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFeeCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  feeCategory === cat.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            {activeTab === 'fee' ? (
              <>
                <span className="font-medium text-emerald-600">Tip:</span> 침술, 뜸술, 추나 등
                한방 진료 수가를 검색합니다. 코드(M0010)나 명칭으로 검색할 수 있습니다.
              </>
            ) : (
              <>
                <span className="font-medium text-emerald-600">Tip:</span> 한방 상병코드(U코드)를
                검색합니다. 기허증, 혈허증 등 증상명이나 U200 같은 코드로 검색하세요.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className={cn(
            'rounded-2xl border-2 p-6',
            error.type === 'network' && 'bg-orange-50 border-orange-200',
            error.type === 'api' && 'bg-red-50 border-red-200',
            error.type === 'empty' && 'bg-blue-50 border-blue-200',
            error.type === 'timeout' && 'bg-amber-50 border-amber-200'
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'p-3 rounded-xl',
                error.type === 'network' && 'bg-orange-100',
                error.type === 'api' && 'bg-red-100',
                error.type === 'empty' && 'bg-blue-100',
                error.type === 'timeout' && 'bg-amber-100'
              )}
            >
              {error.type === 'network' && <WifiOff className="h-6 w-6 text-orange-600" />}
              {error.type === 'api' && <AlertCircle className="h-6 w-6 text-red-600" />}
              {error.type === 'empty' && <Search className="h-6 w-6 text-blue-600" />}
              {error.type === 'timeout' && <AlertCircle className="h-6 w-6 text-amber-600" />}
            </div>
            <div className="flex-1">
              <h3
                className={cn(
                  'font-bold mb-1',
                  error.type === 'network' && 'text-orange-900',
                  error.type === 'api' && 'text-red-900',
                  error.type === 'empty' && 'text-blue-900',
                  error.type === 'timeout' && 'text-amber-900'
                )}
              >
                {error.type === 'network' && '네트워크 오류'}
                {error.type === 'api' && 'API 오류'}
                {error.type === 'empty' && '검색 결과 없음'}
                {error.type === 'timeout' && '시간 초과'}
              </h3>
              <p
                className={cn(
                  'text-sm',
                  error.type === 'network' && 'text-orange-700',
                  error.type === 'api' && 'text-red-700',
                  error.type === 'empty' && 'text-blue-700',
                  error.type === 'timeout' && 'text-amber-700'
                )}
              >
                {error.message}
              </p>

              {(error.type === 'network' || error.type === 'api' || error.type === 'timeout') && (
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className={cn(
                    'mt-4 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors',
                    error.type === 'network' && 'bg-orange-500 hover:bg-orange-600 text-white',
                    error.type === 'api' && 'bg-red-500 hover:bg-red-600 text-white',
                    error.type === 'timeout' && 'bg-amber-500 hover:bg-amber-600 text-white'
                  )}
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                  다시 시도
                </button>
              )}

              {error.type === 'empty' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-sm text-blue-600">추천 검색어:</span>
                  {activeTab === 'fee'
                    ? ['침술', '추나', '뜸', '부항'].map((term) => (
                        <button
                          key={term}
                          onClick={() => {
                            setSearchQuery(term)
                            setError(null)
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                        >
                          {term}
                        </button>
                      ))
                    : ['기허', '혈허', 'U200', '어혈'].map((term) => (
                        <button
                          key={term}
                          onClick={() => {
                            setSearchQuery(term)
                            setError(null)
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {(feeResults.length > 0 || diseaseResults.length > 0) && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Results Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              <span className="font-medium text-gray-900">검색 결과</span>
              <span className="text-sm text-gray-500">
                ({activeTab === 'fee' ? filteredFeeResults.length : diseaseResults.length}건
                {activeTab === 'fee' && feeCategory !== 'all' && ` / 전체 ${feeResults.length}건`})
              </span>
              {isDemoData && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  샘플 데이터
                </span>
              )}
            </div>
            <a
              href="https://www.hira.or.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1"
            >
              심평원 바로가기
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Fee Results Table */}
          {activeTab === 'fee' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                      수가코드
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                      수가명
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                      분류
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">
                      급여구분
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">
                      수가(원)
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">
                      적용일
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFeeResults.map((item, index) => (
                    <tr key={`${item.code}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-600">{item.code}</span>
                          <button
                            onClick={() => handleCopyCode(item.code)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="코드 복사"
                          >
                            {copiedCode === item.code ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.remark && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">{item.remark}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                            {item.classificationName || item.classificationNo}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getPayTypeIcon(item.payType)}
                          <span
                            className={cn(
                              'text-sm font-medium',
                              item.payType === 'covered' && 'text-green-600',
                              item.payType === 'uncovered' && 'text-red-600',
                              item.payType === 'unknown' && 'text-gray-500'
                            )}
                          >
                            {item.payTypeName || getPayTypeLabel(item.payType)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-gray-900">
                          {item.price ? `₩${formatPrice(item.price)}` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-500">
                          {formatDate(item.applyDate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Disease Results Table */}
          {activeTab === 'disease' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                      상병코드
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                      상병명
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                      영문명
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">
                      구분
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {diseaseResults.map((item, index) => (
                    <tr key={`${item.dissCd}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600">{item.dissCd}</span>
                          <button
                            onClick={() => handleCopyCode(item.dissCd)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="코드 복사"
                          >
                            {copiedCode === item.dissCd ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{item.dissNm}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">{item.dissEngNm || '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded',
                            item.mdTpCd === '2'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {item.mdTpNm || (item.mdTpCd === '2' ? '한방' : '의과')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {filteredFeeResults.length === 0 && activeTab === 'fee' && feeResults.length > 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">선택한 카테고리에 해당하는 결과가 없습니다</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {feeResults.length === 0 && diseaseResults.length === 0 && !isLoading && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {activeTab === 'fee' ? (
              <DollarSign className="h-8 w-8 text-emerald-600" />
            ) : (
              <Activity className="h-8 w-8 text-emerald-600" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {activeTab === 'fee' ? '한방 수가 검색' : '상병코드 검색'}
          </h3>
          <p className="text-gray-500 mb-6">
            {activeTab === 'fee'
              ? '수가코드나 명칭을 입력하여 한방 진료 수가를 검색하세요.'
              : '상병코드나 상병명을 입력하여 한방 상병을 검색하세요.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {activeTab === 'fee' ? (
              <>
                <button
                  onClick={() => {
                    setSearchQuery('침술')
                    handleSearch()
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  침술
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('추나')
                    handleSearch()
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  추나
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('뜸')
                    handleSearch()
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  뜸술
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('부항')
                    handleSearch()
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  부항
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setSearchQuery('기허')
                    handleSearch()
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  기허증
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('혈허')
                    handleSearch()
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  혈허증
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('U200')
                    handleSearch()
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  U200
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('어혈')
                    handleSearch()
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  어혈증
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <span className="text-sm text-gray-500">급여 수가</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {filteredFeeResults.filter((f) => f.payType === 'covered').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BadgeX className="h-5 w-5 text-red-500" />
            <span className="text-sm text-gray-500">비급여 수가</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {filteredFeeResults.filter((f) => f.payType === 'uncovered').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-gray-500">한방 상병</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {diseaseResults.filter((d) => d.mdTpCd === '2').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-500">전체 결과</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {activeTab === 'fee' ? feeTotalCount : diseaseTotalCount}
          </p>
        </div>
      </div>

      {/* Data Source Notice */}
      <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-500">
        <p>
          데이터 출처: 건강보험심사평가원 공공데이터포털 |
          수가정보는 변경될 수 있으며, 정확한 정보는 심평원에서 확인하세요.
        </p>
      </div>
    </div>
  )
}
