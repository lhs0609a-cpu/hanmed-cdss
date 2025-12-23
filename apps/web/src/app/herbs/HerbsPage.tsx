import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Leaf,
  ChevronRight,
  Loader2,
  Filter,
  Beaker,
} from 'lucide-react'
import api from '@/services/api'
import { logError } from '@/lib/errors'

interface QueryParams {
  page: number
  limit: number
  category?: string
  nature?: string
  q?: string
}

interface Herb {
  id: string
  standardName: string
  hanjaName: string
  category: string
  properties: {
    nature?: string
    flavor?: string
  }
  meridianTropism: string[]
  efficacy: string
  activeCompounds?: Array<{ name: string }>
}

interface HerbsResponse {
  data: Herb[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const categories = [
  '전체',
  '보기약',
  '보혈약',
  '보음약',
  '보양약',
  '청열약',
  '해표약',
  '이기약',
  '활혈약',
  '화담약',
]

const natures = ['전체', '한', '량', '평', '온', '열']

export default function HerbsPage() {
  const [herbs, setHerbs] = useState<Herb[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedNature, setSelectedNature] = useState('전체')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchHerbs()
  }, [page, selectedCategory, selectedNature])

  const fetchHerbs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: QueryParams = { page, limit: 12 }
      if (selectedCategory !== '전체') {
        params.category = selectedCategory
      }
      if (selectedNature !== '전체') {
        params.nature = selectedNature
      }
      const response = await api.get<HerbsResponse>('/herbs', { params })
      setHerbs(response.data.data)
      setTotalPages(response.data.meta.totalPages)
    } catch (error) {
      logError(error, 'HerbsPage')
      setHerbs(getDemoHerbs())
      setTotalPages(3)
    } finally {
      setIsLoading(false)
    }
  }, [page, selectedCategory, selectedNature])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchHerbs()
      return
    }

    setIsLoading(true)
    try {
      const response = await api.get<HerbsResponse>('/herbs/search', {
        params: { q: searchQuery, page: 1, limit: 12 },
      })
      setHerbs(response.data.data)
      setTotalPages(response.data.meta.totalPages)
      setPage(1)
    } catch (error) {
      const filtered = getDemoHerbs().filter(
        (h) =>
          h.standardName.includes(searchQuery) ||
          h.hanjaName.includes(searchQuery) ||
          h.efficacy.includes(searchQuery)
      )
      setHerbs(filtered)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Leaf className="h-7 w-7 text-teal-500" />
          약재 검색
        </h1>
        <p className="mt-1 text-gray-500">
          한약재의 성분과 효능을 확인하세요
        </p>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="약재명, 효능으로 검색..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-medium"
            >
              검색
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-500 flex-shrink-0">분류:</span>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Nature Filter */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-sm text-gray-500 flex-shrink-0 ml-6">성질:</span>
          {natures.map((nature) => (
            <button
              key={nature}
              onClick={() => {
                setSelectedNature(nature)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedNature === nature
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {nature}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : herbs.length === 0 ? (
        <div className="text-center py-20">
          <Leaf className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">검색 결과가 없습니다</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {herbs.map((herb) => (
              <Link
                key={herb.id}
                to={`/herbs/${herb.id}`}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-teal-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-teal-500" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                        {herb.standardName}
                      </h3>
                      <p className="text-sm text-gray-500">{herb.hanjaName}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-teal-50 text-teal-600 text-xs font-medium rounded-lg">
                    {herb.category}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {herb.properties?.nature && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-md">
                      {herb.properties.nature}
                    </span>
                  )}
                  {herb.properties?.flavor && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md">
                      {herb.properties.flavor}
                    </span>
                  )}
                  {herb.meridianTropism?.slice(0, 3).map((m, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {herb.efficacy}
                </p>

                {herb.activeCompounds && herb.activeCompounds.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Beaker className="h-3.5 w-3.5" />
                    <span>
                      {herb.activeCompounds
                        .slice(0, 3)
                        .map((c) => c.name)
                        .join(', ')}
                      {herb.activeCompounds.length > 3 && ` 외 ${herb.activeCompounds.length - 3}개`}
                    </span>
                  </div>
                )}

                <div className="mt-4 flex items-center text-sm font-medium text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  상세 보기
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getDemoHerbs(): Herb[] {
  return [
    // ===== 보기약 (補氣藥) =====
    {
      id: '1',
      standardName: '인삼',
      hanjaName: '人蔘',
      category: '보기약',
      properties: { nature: '온', flavor: '감, 미고' },
      meridianTropism: ['비', '폐', '심'],
      efficacy: '대보원기, 복맥고탈, 보비익폐, 생진안신',
      activeCompounds: [{ name: 'Ginsenoside Rb1' }, { name: 'Ginsenoside Rg1' }, { name: 'Panaxadiol' }],
    },
    {
      id: '2',
      standardName: '황기',
      hanjaName: '黃芪',
      category: '보기약',
      properties: { nature: '온', flavor: '감' },
      meridianTropism: ['비', '폐'],
      efficacy: '보기승양, 고표지한, 이수소종, 탁창생기',
      activeCompounds: [{ name: 'Astragaloside IV' }, { name: 'Formononetin' }],
    },
    {
      id: '3',
      standardName: '백출',
      hanjaName: '白朮',
      category: '보기약',
      properties: { nature: '온', flavor: '고, 감' },
      meridianTropism: ['비', '위'],
      efficacy: '건비익기, 조습이수, 고표지한, 안태',
      activeCompounds: [{ name: 'Atractylenolide I' }, { name: 'Atractylenolide III' }],
    },
    {
      id: '4',
      standardName: '당삼',
      hanjaName: '黨蔘',
      category: '보기약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['비', '폐'],
      efficacy: '보중익기, 건비익폐, 생진양혈',
      activeCompounds: [{ name: 'Lobetyolin' }, { name: 'Tangshenoside' }],
    },
    {
      id: '5',
      standardName: '태자삼',
      hanjaName: '太子蔘',
      category: '보기약',
      properties: { nature: '평', flavor: '감, 미고' },
      meridianTropism: ['비', '폐'],
      efficacy: '익기건비, 생진윤폐',
      activeCompounds: [{ name: 'Pseudostellarin A' }],
    },
    {
      id: '6',
      standardName: '서양삼',
      hanjaName: '西洋蔘',
      category: '보기약',
      properties: { nature: '량', flavor: '감, 미고' },
      meridianTropism: ['심', '폐', '신'],
      efficacy: '보기양음, 청화생진',
      activeCompounds: [{ name: 'Ginsenoside Rb1' }, { name: 'Pseudoginsenoside F11' }],
    },
    {
      id: '7',
      standardName: '산약',
      hanjaName: '山藥',
      category: '보기약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['비', '폐', '신'],
      efficacy: '보비양위, 생진익폐, 보신삽정',
      activeCompounds: [{ name: 'Diosgenin' }, { name: 'Allantoin' }],
    },
    {
      id: '8',
      standardName: '감초',
      hanjaName: '甘草',
      category: '보기약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['심', '폐', '비', '위'],
      efficacy: '보비익기, 청열해독, 거담지해, 완급지통, 조화제약',
      activeCompounds: [{ name: 'Glycyrrhizin' }, { name: 'Liquiritin' }, { name: 'Glabridin' }],
    },
    {
      id: '9',
      standardName: '대조',
      hanjaName: '大棗',
      category: '보기약',
      properties: { nature: '온', flavor: '감' },
      meridianTropism: ['비', '위'],
      efficacy: '보중익기, 양혈안신, 완화약성',
      activeCompounds: [{ name: 'Zizyphus saponin' }, { name: 'Betulic acid' }],
    },
    {
      id: '10',
      standardName: '영지',
      hanjaName: '靈芝',
      category: '보기약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['심', '폐', '간', '신'],
      efficacy: '보기안신, 지해평천, 보간해독',
      activeCompounds: [{ name: 'Ganoderic acid' }, { name: 'β-Glucan' }],
    },
    {
      id: '11',
      standardName: '백편두',
      hanjaName: '白扁豆',
      category: '보기약',
      properties: { nature: '온', flavor: '감' },
      meridianTropism: ['비', '위'],
      efficacy: '건비화습, 소서해독',
      activeCompounds: [{ name: 'Phaseolin' }],
    },

    // ===== 보혈약 (補血藥) =====
    {
      id: '12',
      standardName: '당귀',
      hanjaName: '當歸',
      category: '보혈약',
      properties: { nature: '온', flavor: '감, 신' },
      meridianTropism: ['심', '간', '비'],
      efficacy: '보혈활혈, 조경지통, 윤장통변',
      activeCompounds: [{ name: 'Decursin' }, { name: 'Ferulic acid' }, { name: 'Ligustilide' }],
    },
    {
      id: '13',
      standardName: '숙지황',
      hanjaName: '熟地黃',
      category: '보혈약',
      properties: { nature: '온', flavor: '감' },
      meridianTropism: ['간', '신'],
      efficacy: '보혈자음, 익정전수',
      activeCompounds: [{ name: 'Catalpol' }, { name: 'Rehmannioside' }],
    },
    {
      id: '14',
      standardName: '백작약',
      hanjaName: '白芍藥',
      category: '보혈약',
      properties: { nature: '량', flavor: '고, 산' },
      meridianTropism: ['간', '비'],
      efficacy: '양혈렴음, 유간지통, 평억간양',
      activeCompounds: [{ name: 'Paeoniflorin' }, { name: 'Albiflorin' }],
    },
    {
      id: '15',
      standardName: '하수오',
      hanjaName: '何首烏',
      category: '보혈약',
      properties: { nature: '온', flavor: '고, 감, 삽' },
      meridianTropism: ['간', '신'],
      efficacy: '보간신, 익정혈, 오수발, 강근골, 해독, 윤장통변',
      activeCompounds: [{ name: 'Stilbene glycoside' }, { name: 'Emodin' }],
    },
    {
      id: '16',
      standardName: '아교',
      hanjaName: '阿膠',
      category: '보혈약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['폐', '간', '신'],
      efficacy: '보혈, 자음, 윤폐, 지혈',
      activeCompounds: [{ name: 'Collagen' }, { name: 'Glycine' }],
    },
    {
      id: '17',
      standardName: '용안육',
      hanjaName: '龍眼肉',
      category: '보혈약',
      properties: { nature: '온', flavor: '감' },
      meridianTropism: ['심', '비'],
      efficacy: '보익심비, 양혈안신',
      activeCompounds: [{ name: 'Adenosine' }],
    },

    // ===== 보음약 (補陰藥) =====
    {
      id: '18',
      standardName: '맥문동',
      hanjaName: '麥門冬',
      category: '보음약',
      properties: { nature: '량', flavor: '감, 미고' },
      meridianTropism: ['심', '폐', '위'],
      efficacy: '양음윤폐, 익위생진, 청심제번',
      activeCompounds: [{ name: 'Ophiopogonin' }, { name: 'β-Sitosterol' }],
    },
    {
      id: '19',
      standardName: '천문동',
      hanjaName: '天門冬',
      category: '보음약',
      properties: { nature: '한', flavor: '감, 고' },
      meridianTropism: ['폐', '신'],
      efficacy: '양음윤조, 청폐생진',
      activeCompounds: [{ name: 'Asparagine' }, { name: 'β-Sitosterol' }],
    },
    {
      id: '20',
      standardName: '옥죽',
      hanjaName: '玉竹',
      category: '보음약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['폐', '위'],
      efficacy: '양음윤조, 생진지갈',
      activeCompounds: [{ name: 'Polygonatum polysaccharide' }],
    },
    {
      id: '21',
      standardName: '황정',
      hanjaName: '黃精',
      category: '보음약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['비', '폐', '신'],
      efficacy: '보기양음, 건비, 윤폐, 익신',
      activeCompounds: [{ name: 'Polygonatum polysaccharide' }],
    },
    {
      id: '22',
      standardName: '석곡',
      hanjaName: '石斛',
      category: '보음약',
      properties: { nature: '량', flavor: '감' },
      meridianTropism: ['위', '신'],
      efficacy: '익위생진, 자음청열',
      activeCompounds: [{ name: 'Dendrobine' }, { name: 'Dendrobium polysaccharide' }],
    },
    {
      id: '23',
      standardName: '구기자',
      hanjaName: '枸杞子',
      category: '보음약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['간', '신'],
      efficacy: '자보간신, 익정명목',
      activeCompounds: [{ name: 'Betaine' }, { name: 'Zeaxanthin' }, { name: 'Lycium barbarum polysaccharide' }],
    },
    {
      id: '24',
      standardName: '여정자',
      hanjaName: '女貞子',
      category: '보음약',
      properties: { nature: '량', flavor: '감, 고' },
      meridianTropism: ['간', '신'],
      efficacy: '자보간신, 오수명목',
      activeCompounds: [{ name: 'Oleanolic acid' }, { name: 'Ursolic acid' }],
    },
    {
      id: '25',
      standardName: '사삼',
      hanjaName: '沙蔘',
      category: '보음약',
      properties: { nature: '량', flavor: '감' },
      meridianTropism: ['폐', '위'],
      efficacy: '양음청폐, 익위생진',
      activeCompounds: [{ name: 'Adenophora saponin' }],
    },
    {
      id: '26',
      standardName: '백합',
      hanjaName: '百合',
      category: '보음약',
      properties: { nature: '량', flavor: '감' },
      meridianTropism: ['심', '폐'],
      efficacy: '양음윤폐, 청심안신',
      activeCompounds: [{ name: 'Colchicine' }],
    },
    {
      id: '27',
      standardName: '귀판',
      hanjaName: '龜板',
      category: '보음약',
      properties: { nature: '한', flavor: '함, 감' },
      meridianTropism: ['간', '신', '심'],
      efficacy: '자음잠양, 익신강골, 양혈보심, 고경지대',
      activeCompounds: [{ name: 'Collagen' }, { name: 'Keratin' }],
    },
    {
      id: '28',
      standardName: '별갑',
      hanjaName: '鼈甲',
      category: '보음약',
      properties: { nature: '한', flavor: '함' },
      meridianTropism: ['간', '신'],
      efficacy: '자음잠양, 연견산결, 퇴열제증',
      activeCompounds: [{ name: 'Collagen' }, { name: 'Keratin' }],
    },

    // ===== 보양약 (補陽藥) =====
    {
      id: '29',
      standardName: '녹용',
      hanjaName: '鹿茸',
      category: '보양약',
      properties: { nature: '온', flavor: '감, 함' },
      meridianTropism: ['간', '신'],
      efficacy: '보신양, 익정혈, 강근골, 조충임, 탁창양',
      activeCompounds: [{ name: 'Pantocrine' }, { name: 'Uronic acid' }],
    },
    {
      id: '30',
      standardName: '육종용',
      hanjaName: '肉蓯蓉',
      category: '보양약',
      properties: { nature: '온', flavor: '감, 함' },
      meridianTropism: ['신', '대장'],
      efficacy: '보신양, 익정혈, 윤장통변',
      activeCompounds: [{ name: 'Echinacoside' }, { name: 'Acteoside' }],
    },
    {
      id: '31',
      standardName: '파극천',
      hanjaName: '巴戟天',
      category: '보양약',
      properties: { nature: '온', flavor: '감, 신' },
      meridianTropism: ['신', '간'],
      efficacy: '보신양, 강근골, 거풍습',
      activeCompounds: [{ name: 'Morindae officinalis polysaccharide' }],
    },
    {
      id: '32',
      standardName: '음양곽',
      hanjaName: '淫羊藿',
      category: '보양약',
      properties: { nature: '온', flavor: '신, 감' },
      meridianTropism: ['간', '신'],
      efficacy: '보신양, 강근골, 거풍습',
      activeCompounds: [{ name: 'Icariin' }, { name: 'Epimedin' }],
    },
    {
      id: '33',
      standardName: '두충',
      hanjaName: '杜仲',
      category: '보양약',
      properties: { nature: '온', flavor: '감' },
      meridianTropism: ['간', '신'],
      efficacy: '보간신, 강근골, 안태',
      activeCompounds: [{ name: 'Geniposidic acid' }, { name: 'Pinoresinol diglucoside' }],
    },
    {
      id: '34',
      standardName: '속단',
      hanjaName: '續斷',
      category: '보양약',
      properties: { nature: '온', flavor: '고, 신' },
      meridianTropism: ['간', '신'],
      efficacy: '보간신, 강근골, 속절맥, 안태, 지붕',
      activeCompounds: [{ name: 'Asperosaponin' }],
    },
    {
      id: '35',
      standardName: '보골지',
      hanjaName: '補骨脂',
      category: '보양약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['신', '비'],
      efficacy: '보신장양, 고정축뇨, 온비지사, 납기평천',
      activeCompounds: [{ name: 'Psoralen' }, { name: 'Isopsoralen' }],
    },
    {
      id: '36',
      standardName: '익지인',
      hanjaName: '益智仁',
      category: '보양약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['비', '신'],
      efficacy: '온비지사섭침, 온신고정축뇨',
      activeCompounds: [{ name: 'Nootkatone' }],
    },
    {
      id: '37',
      standardName: '토사자',
      hanjaName: '菟絲子',
      category: '보양약',
      properties: { nature: '평', flavor: '감, 신' },
      meridianTropism: ['간', '신', '비'],
      efficacy: '자보간신, 고정축뇨, 안태, 명목, 지사',
      activeCompounds: [{ name: 'Cuscutoside' }],
    },
    {
      id: '38',
      standardName: '동충하초',
      hanjaName: '冬蟲夏草',
      category: '보양약',
      properties: { nature: '온', flavor: '감' },
      meridianTropism: ['폐', '신'],
      efficacy: '보폐익신, 지혈화담',
      activeCompounds: [{ name: 'Cordycepin' }, { name: 'Cordyceps polysaccharide' }],
    },
    {
      id: '39',
      standardName: '호도육',
      hanjaName: '胡桃肉',
      category: '보양약',
      properties: { nature: '온', flavor: '감' },
      meridianTropism: ['신', '폐', '대장'],
      efficacy: '보신양, 온폐정천, 윤장통변',
      activeCompounds: [{ name: 'Juglone' }],
    },
    {
      id: '40',
      standardName: '자하거',
      hanjaName: '紫河車',
      category: '보양약',
      properties: { nature: '온', flavor: '감, 함' },
      meridianTropism: ['폐', '간', '신'],
      efficacy: '온신보정, 익기양혈',
      activeCompounds: [{ name: 'Placental protein' }],
    },

    // ===== 청열약 (清熱藥) =====
    {
      id: '41',
      standardName: '황련',
      hanjaName: '黃連',
      category: '청열약',
      properties: { nature: '한', flavor: '고' },
      meridianTropism: ['심', '비', '위', '간', '담', '대장'],
      efficacy: '청열조습, 사화해독',
      activeCompounds: [{ name: 'Berberine' }, { name: 'Coptisine' }, { name: 'Palmatine' }],
    },
    {
      id: '42',
      standardName: '황금',
      hanjaName: '黃芩',
      category: '청열약',
      properties: { nature: '한', flavor: '고' },
      meridianTropism: ['폐', '담', '비', '대장', '소장'],
      efficacy: '청열조습, 사화해독, 지혈, 안태',
      activeCompounds: [{ name: 'Baicalin' }, { name: 'Baicalein' }, { name: 'Wogonin' }],
    },
    {
      id: '43',
      standardName: '황백',
      hanjaName: '黃柏',
      category: '청열약',
      properties: { nature: '한', flavor: '고' },
      meridianTropism: ['신', '방광', '대장'],
      efficacy: '청열조습, 사화해독, 퇴허열',
      activeCompounds: [{ name: 'Berberine' }, { name: 'Phellodendrine' }],
    },
    {
      id: '44',
      standardName: '치자',
      hanjaName: '梔子',
      category: '청열약',
      properties: { nature: '한', flavor: '고' },
      meridianTropism: ['심', '폐', '삼초'],
      efficacy: '사화제번, 청열이습, 양혈해독, 소종지통',
      activeCompounds: [{ name: 'Geniposide' }, { name: 'Crocetin' }],
    },
    {
      id: '45',
      standardName: '용담초',
      hanjaName: '龍膽草',
      category: '청열약',
      properties: { nature: '한', flavor: '고' },
      meridianTropism: ['간', '담'],
      efficacy: '청열조습, 사간담화',
      activeCompounds: [{ name: 'Gentiopicroside' }],
    },
    {
      id: '46',
      standardName: '고삼',
      hanjaName: '苦蔘',
      category: '청열약',
      properties: { nature: '한', flavor: '고' },
      meridianTropism: ['심', '간', '위', '대장', '방광'],
      efficacy: '청열조습, 거풍살충, 이뇨',
      activeCompounds: [{ name: 'Matrine' }, { name: 'Oxymatrine' }],
    },
    {
      id: '47',
      standardName: '지모',
      hanjaName: '知母',
      category: '청열약',
      properties: { nature: '한', flavor: '고, 감' },
      meridianTropism: ['폐', '위', '신'],
      efficacy: '청열사화, 자음윤조',
      activeCompounds: [{ name: 'Timosaponin' }, { name: 'Mangiferin' }],
    },
    {
      id: '48',
      standardName: '석고',
      hanjaName: '石膏',
      category: '청열약',
      properties: { nature: '한', flavor: '신, 감' },
      meridianTropism: ['폐', '위'],
      efficacy: '청열사화, 제번지갈',
      activeCompounds: [{ name: 'Calcium sulfate' }],
    },
    {
      id: '49',
      standardName: '천화분',
      hanjaName: '天花粉',
      category: '청열약',
      properties: { nature: '한', flavor: '감, 고, 산' },
      meridianTropism: ['폐', '위'],
      efficacy: '청열생진, 소종배농',
      activeCompounds: [{ name: 'Trichosanthin' }],
    },
    {
      id: '50',
      standardName: '금은화',
      hanjaName: '金銀花',
      category: '청열약',
      properties: { nature: '한', flavor: '감' },
      meridianTropism: ['폐', '심', '위'],
      efficacy: '청열해독, 소산풍열',
      activeCompounds: [{ name: 'Chlorogenic acid' }, { name: 'Luteolin' }],
    },
    {
      id: '51',
      standardName: '연교',
      hanjaName: '連翹',
      category: '청열약',
      properties: { nature: '량', flavor: '고' },
      meridianTropism: ['폐', '심', '소장'],
      efficacy: '청열해독, 소종산결, 소산풍열',
      activeCompounds: [{ name: 'Forsythin' }, { name: 'Forsythiaside' }],
    },
    {
      id: '52',
      standardName: '포공영',
      hanjaName: '蒲公英',
      category: '청열약',
      properties: { nature: '한', flavor: '고, 감' },
      meridianTropism: ['간', '위'],
      efficacy: '청열해독, 소종산결, 이습통림',
      activeCompounds: [{ name: 'Taraxasterol' }],
    },
    {
      id: '53',
      standardName: '자화지정',
      hanjaName: '紫花地丁',
      category: '청열약',
      properties: { nature: '한', flavor: '고, 신' },
      meridianTropism: ['심', '간'],
      efficacy: '청열해독, 양혈소종',
      activeCompounds: [{ name: 'Violanthin' }],
    },
    {
      id: '54',
      standardName: '판람근',
      hanjaName: '板藍根',
      category: '청열약',
      properties: { nature: '한', flavor: '고' },
      meridianTropism: ['심', '위'],
      efficacy: '청열해독, 양혈이인',
      activeCompounds: [{ name: 'Indirubin' }, { name: 'Indigo' }],
    },
    {
      id: '55',
      standardName: '생지황',
      hanjaName: '生地黃',
      category: '청열약',
      properties: { nature: '한', flavor: '감, 고' },
      meridianTropism: ['심', '간', '신'],
      efficacy: '청열양혈, 양음생진',
      activeCompounds: [{ name: 'Catalpol' }, { name: 'Rehmannioside' }],
    },
    {
      id: '56',
      standardName: '현삼',
      hanjaName: '玄蔘',
      category: '청열약',
      properties: { nature: '한', flavor: '감, 고, 함' },
      meridianTropism: ['폐', '위', '신'],
      efficacy: '청열양혈, 자음해독, 해독산결',
      activeCompounds: [{ name: 'Harpagoside' }, { name: 'Scrophularin' }],
    },
    {
      id: '57',
      standardName: '목단피',
      hanjaName: '牧丹皮',
      category: '청열약',
      properties: { nature: '량', flavor: '고, 신' },
      meridianTropism: ['심', '간', '신'],
      efficacy: '청열양혈, 활혈화어',
      activeCompounds: [{ name: 'Paeonol' }, { name: 'Paeonoside' }],
    },
    {
      id: '58',
      standardName: '적작약',
      hanjaName: '赤芍藥',
      category: '청열약',
      properties: { nature: '량', flavor: '고' },
      meridianTropism: ['간'],
      efficacy: '청열양혈, 산어지통',
      activeCompounds: [{ name: 'Paeoniflorin' }],
    },
    {
      id: '59',
      standardName: '청호',
      hanjaName: '靑蒿',
      category: '청열약',
      properties: { nature: '한', flavor: '고, 신' },
      meridianTropism: ['간', '담'],
      efficacy: '퇴허열, 양혈해서, 제증절학',
      activeCompounds: [{ name: 'Artemisinin' }, { name: 'Artemisin' }],
    },
    {
      id: '60',
      standardName: '지골피',
      hanjaName: '地骨皮',
      category: '청열약',
      properties: { nature: '한', flavor: '감' },
      meridianTropism: ['폐', '간', '신'],
      efficacy: '양음퇴증, 청폐강화',
      activeCompounds: [{ name: 'Betaine' }, { name: 'Lycium barbarum polysaccharide' }],
    },

    // ===== 해표약 (解表藥) =====
    {
      id: '61',
      standardName: '마황',
      hanjaName: '麻黃',
      category: '해표약',
      properties: { nature: '온', flavor: '신, 미고' },
      meridianTropism: ['폐', '방광'],
      efficacy: '발한해표, 선폐평천, 이수소종',
      activeCompounds: [{ name: 'Ephedrine' }, { name: 'Pseudoephedrine' }],
    },
    {
      id: '62',
      standardName: '계지',
      hanjaName: '桂枝',
      category: '해표약',
      properties: { nature: '온', flavor: '신, 감' },
      meridianTropism: ['심', '폐', '방광'],
      efficacy: '발한해표, 온통경맥, 조양화기',
      activeCompounds: [{ name: 'Cinnamaldehyde' }, { name: 'Cinnamic acid' }],
    },
    {
      id: '63',
      standardName: '자소엽',
      hanjaName: '紫蘇葉',
      category: '해표약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['폐', '비'],
      efficacy: '발표산한, 행기화중, 해어독',
      activeCompounds: [{ name: 'Perillaldehyde' }, { name: 'Rosmarinic acid' }],
    },
    {
      id: '64',
      standardName: '생강',
      hanjaName: '生薑',
      category: '해표약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['폐', '비', '위'],
      efficacy: '발한해표, 온중지구, 화담지해',
      activeCompounds: [{ name: 'Gingerol' }, { name: 'Shogaol' }, { name: 'Zingerone' }],
    },
    {
      id: '65',
      standardName: '방풍',
      hanjaName: '防風',
      category: '해표약',
      properties: { nature: '온', flavor: '신, 감' },
      meridianTropism: ['방광', '간', '비'],
      efficacy: '거풍해표, 승습지통, 지경',
      activeCompounds: [{ name: 'Cimicifugin' }, { name: 'Prim-O-glucosylcimicifugin' }],
    },
    {
      id: '66',
      standardName: '형개',
      hanjaName: '荊芥',
      category: '해표약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['폐', '간'],
      efficacy: '거풍해표, 투진지양, 소창, 지혈',
      activeCompounds: [{ name: 'Menthone' }, { name: 'Pulegone' }],
    },
    {
      id: '67',
      standardName: '갈근',
      hanjaName: '葛根',
      category: '해표약',
      properties: { nature: '량', flavor: '감, 신' },
      meridianTropism: ['비', '위'],
      efficacy: '해기퇴열, 생진지갈, 투진, 승양지사',
      activeCompounds: [{ name: 'Puerarin' }, { name: 'Daidzein' }, { name: 'Daidzin' }],
    },
    {
      id: '68',
      standardName: '승마',
      hanjaName: '升麻',
      category: '해표약',
      properties: { nature: '량', flavor: '신, 미감' },
      meridianTropism: ['폐', '비', '위', '대장'],
      efficacy: '발표투진, 청열해독, 승거양기',
      activeCompounds: [{ name: 'Cimicifugoside' }],
    },
    {
      id: '69',
      standardName: '시호',
      hanjaName: '柴胡',
      category: '해표약',
      properties: { nature: '량', flavor: '고, 신' },
      meridianTropism: ['간', '담'],
      efficacy: '화해표리, 소간해울, 승거양기',
      activeCompounds: [{ name: 'Saikosaponin' }],
    },
    {
      id: '70',
      standardName: '박하',
      hanjaName: '薄荷',
      category: '해표약',
      properties: { nature: '량', flavor: '신' },
      meridianTropism: ['폐', '간'],
      efficacy: '소산풍열, 청리두목, 이인, 투진, 소간행기',
      activeCompounds: [{ name: 'Menthol' }, { name: 'Menthone' }],
    },
    {
      id: '71',
      standardName: '상엽',
      hanjaName: '桑葉',
      category: '해표약',
      properties: { nature: '한', flavor: '고, 감' },
      meridianTropism: ['폐', '간'],
      efficacy: '소산풍열, 청폐윤조, 청간명목',
      activeCompounds: [{ name: 'Rutin' }, { name: 'Quercetin' }],
    },
    {
      id: '72',
      standardName: '국화',
      hanjaName: '菊花',
      category: '해표약',
      properties: { nature: '량', flavor: '신, 감, 고' },
      meridianTropism: ['폐', '간'],
      efficacy: '소산풍열, 평간명목, 청열해독',
      activeCompounds: [{ name: 'Chrysanthemin' }, { name: 'Apigenin' }],
    },
    {
      id: '73',
      standardName: '우방자',
      hanjaName: '牛蒡子',
      category: '해표약',
      properties: { nature: '한', flavor: '신, 고' },
      meridianTropism: ['폐', '위'],
      efficacy: '소산풍열, 선폐투진, 이인소종, 해독',
      activeCompounds: [{ name: 'Arctiin' }, { name: 'Arctigenin' }],
    },
    {
      id: '74',
      standardName: '선퇴',
      hanjaName: '蟬蛻',
      category: '해표약',
      properties: { nature: '한', flavor: '감' },
      meridianTropism: ['폐', '간'],
      efficacy: '소산풍열, 이인개음, 투진지양, 명목퇴예, 식풍지경',
      activeCompounds: [{ name: 'Chitin' }],
    },
    {
      id: '75',
      standardName: '강활',
      hanjaName: '羌活',
      category: '해표약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['방광', '신'],
      efficacy: '해표산한, 거풍승습, 지통',
      activeCompounds: [{ name: 'Notopterol' }, { name: 'Isoimperatorin' }],
    },
    {
      id: '76',
      standardName: '고본',
      hanjaName: '藁本',
      category: '해표약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['방광'],
      efficacy: '거풍산한, 승습지통',
      activeCompounds: [{ name: 'Ligustilide' }],
    },
    {
      id: '77',
      standardName: '백지',
      hanjaName: '白芷',
      category: '해표약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['폐', '위', '대장'],
      efficacy: '해표산풍, 통규지통, 소종배농, 조습지대',
      activeCompounds: [{ name: 'Imperatorin' }, { name: 'Byakangelicin' }],
    },
    {
      id: '78',
      standardName: '세신',
      hanjaName: '細辛',
      category: '해표약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['심', '폐', '신'],
      efficacy: '해표산한, 거풍지통, 통규, 온폐화음',
      activeCompounds: [{ name: 'Asaricin' }, { name: 'Methyleugenol' }],
    },
    {
      id: '79',
      standardName: '총백',
      hanjaName: '蔥白',
      category: '해표약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['폐', '위'],
      efficacy: '발한해표, 통양산결',
      activeCompounds: [{ name: 'Allicin' }],
    },

    // ===== 이기약 (理氣藥) =====
    {
      id: '80',
      standardName: '진피',
      hanjaName: '陳皮',
      category: '이기약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['폐', '비'],
      efficacy: '리기건비, 조습화담',
      activeCompounds: [{ name: 'Hesperidin' }, { name: 'Nobiletin' }],
    },
    {
      id: '81',
      standardName: '청피',
      hanjaName: '靑皮',
      category: '이기약',
      properties: { nature: '온', flavor: '고, 신' },
      meridianTropism: ['간', '담', '위'],
      efficacy: '소간파기, 소적화체',
      activeCompounds: [{ name: 'Hesperidin' }],
    },
    {
      id: '82',
      standardName: '지실',
      hanjaName: '枳實',
      category: '이기약',
      properties: { nature: '량', flavor: '고, 신' },
      meridianTropism: ['비', '위'],
      efficacy: '파기소적, 화담제비',
      activeCompounds: [{ name: 'Naringin' }, { name: 'Synephrine' }],
    },
    {
      id: '83',
      standardName: '지각',
      hanjaName: '枳殼',
      category: '이기약',
      properties: { nature: '량', flavor: '고, 신' },
      meridianTropism: ['비', '위'],
      efficacy: '리기관중, 행체소비',
      activeCompounds: [{ name: 'Naringin' }, { name: 'Hesperidin' }],
    },
    {
      id: '84',
      standardName: '향부자',
      hanjaName: '香附子',
      category: '이기약',
      properties: { nature: '평', flavor: '신, 미고, 미감' },
      meridianTropism: ['간', '비', '삼초'],
      efficacy: '소간리기, 조경지통',
      activeCompounds: [{ name: 'α-Cyperone' }],
    },
    {
      id: '85',
      standardName: '목향',
      hanjaName: '木香',
      category: '이기약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['비', '위', '대장', '삼초', '담'],
      efficacy: '행기지통, 건비소식',
      activeCompounds: [{ name: 'Costunolide' }, { name: 'Dehydrocostus lactone' }],
    },
    {
      id: '86',
      standardName: '오약',
      hanjaName: '烏藥',
      category: '이기약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['폐', '비', '신', '방광'],
      efficacy: '순기지통, 온신산한',
      activeCompounds: [{ name: 'Linderane' }],
    },
    {
      id: '87',
      standardName: '침향',
      hanjaName: '沈香',
      category: '이기약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['비', '위', '신'],
      efficacy: '행기지통, 온중지구, 납기평천',
      activeCompounds: [{ name: 'Agarospirol' }],
    },
    {
      id: '88',
      standardName: '후박',
      hanjaName: '厚朴',
      category: '이기약',
      properties: { nature: '온', flavor: '고, 신' },
      meridianTropism: ['비', '위', '폐', '대장'],
      efficacy: '행기조습, 강역평천',
      activeCompounds: [{ name: 'Magnolol' }, { name: 'Honokiol' }],
    },
    {
      id: '89',
      standardName: '불수',
      hanjaName: '佛手',
      category: '이기약',
      properties: { nature: '온', flavor: '신, 고, 산' },
      meridianTropism: ['간', '비', '폐'],
      efficacy: '소간리기, 화위지통',
      activeCompounds: [{ name: 'Limonene' }],
    },
    {
      id: '90',
      standardName: '사인',
      hanjaName: '砂仁',
      category: '이기약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['비', '위', '신'],
      efficacy: '화습행기, 온중지사, 안태',
      activeCompounds: [{ name: 'Bornyl acetate' }],
    },

    // ===== 활혈약 (活血藥) =====
    {
      id: '91',
      standardName: '천궁',
      hanjaName: '川芎',
      category: '활혈약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['간', '담', '심포'],
      efficacy: '활혈행기, 거풍지통',
      activeCompounds: [{ name: 'Ligustilide' }, { name: 'Ferulic acid' }],
    },
    {
      id: '92',
      standardName: '도인',
      hanjaName: '桃仁',
      category: '활혈약',
      properties: { nature: '평', flavor: '고, 감' },
      meridianTropism: ['심', '간', '대장'],
      efficacy: '활혈거어, 윤장통변, 지해평천',
      activeCompounds: [{ name: 'Amygdalin' }, { name: 'Prunasin' }],
    },
    {
      id: '93',
      standardName: '홍화',
      hanjaName: '紅花',
      category: '활혈약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['심', '간'],
      efficacy: '활혈통경, 거어지통',
      activeCompounds: [{ name: 'Carthamin' }, { name: 'Safflower yellow' }],
    },
    {
      id: '94',
      standardName: '단삼',
      hanjaName: '丹蔘',
      category: '활혈약',
      properties: { nature: '량', flavor: '고' },
      meridianTropism: ['심', '심포', '간'],
      efficacy: '활혈거어, 통경지통, 청심제번, 양혈소옹',
      activeCompounds: [{ name: 'Tanshinone IIA' }, { name: 'Salvianolic acid B' }],
    },
    {
      id: '95',
      standardName: '익모초',
      hanjaName: '益母草',
      category: '활혈약',
      properties: { nature: '량', flavor: '신, 고' },
      meridianTropism: ['심', '간', '방광'],
      efficacy: '활혈조경, 이수소종, 청열해독',
      activeCompounds: [{ name: 'Leonurine' }, { name: 'Stachydrine' }],
    },
    {
      id: '96',
      standardName: '우슬',
      hanjaName: '牛膝',
      category: '활혈약',
      properties: { nature: '평', flavor: '고, 산' },
      meridianTropism: ['간', '신'],
      efficacy: '활혈거어, 보간신, 강근골, 이수통림, 인화(혈)하행',
      activeCompounds: [{ name: 'Ecdysterone' }, { name: 'Achyranthes saponin' }],
    },
    {
      id: '97',
      standardName: '삼릉',
      hanjaName: '三稜',
      category: '활혈약',
      properties: { nature: '평', flavor: '고, 신' },
      meridianTropism: ['간', '비'],
      efficacy: '파혈행기, 소적지통',
      activeCompounds: [{ name: 'Sparganium stoloníferum polysaccharide' }],
    },
    {
      id: '98',
      standardName: '아출',
      hanjaName: '莪朮',
      category: '활혈약',
      properties: { nature: '온', flavor: '고, 신' },
      meridianTropism: ['간', '비'],
      efficacy: '행기파혈, 소적지통',
      activeCompounds: [{ name: 'Curcumol' }, { name: 'Curdione' }],
    },
    {
      id: '99',
      standardName: '유향',
      hanjaName: '乳香',
      category: '활혈약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['심', '간', '비'],
      efficacy: '활혈지통, 소종생기',
      activeCompounds: [{ name: 'Boswellic acid' }],
    },
    {
      id: '100',
      standardName: '몰약',
      hanjaName: '沒藥',
      category: '활혈약',
      properties: { nature: '평', flavor: '고' },
      meridianTropism: ['심', '간', '비'],
      efficacy: '산어지통, 소종생기',
      activeCompounds: [{ name: 'Commiphoric acid' }],
    },
    {
      id: '101',
      standardName: '혈갈',
      hanjaName: '血竭',
      category: '활혈약',
      properties: { nature: '평', flavor: '감, 함' },
      meridianTropism: ['심', '간'],
      efficacy: '활혈정통, 화어지혈, 생기렴창',
      activeCompounds: [{ name: 'Dracorhodin' }],
    },
    {
      id: '102',
      standardName: '계혈등',
      hanjaName: '鷄血藤',
      category: '활혈약',
      properties: { nature: '온', flavor: '고, 감' },
      meridianTropism: ['간', '신'],
      efficacy: '활혈보혈, 조경통락',
      activeCompounds: [{ name: 'Catechin' }],
    },
    {
      id: '103',
      standardName: '현호색',
      hanjaName: '玄胡索',
      category: '활혈약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['심', '간', '비'],
      efficacy: '활혈, 행기, 지통',
      activeCompounds: [{ name: 'Tetrahydropalmatine' }, { name: 'Corydaline' }],
    },
    {
      id: '104',
      standardName: '울금',
      hanjaName: '鬱金',
      category: '활혈약',
      properties: { nature: '한', flavor: '신, 고' },
      meridianTropism: ['심', '폐', '간'],
      efficacy: '활혈지통, 행기해울, 청심양혈, 이담퇴황',
      activeCompounds: [{ name: 'Curcumin' }],
    },
    {
      id: '105',
      standardName: '강황',
      hanjaName: '薑黃',
      category: '활혈약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['비', '간'],
      efficacy: '파혈행기, 통경지통',
      activeCompounds: [{ name: 'Curcumin' }, { name: 'Turmerone' }],
    },

    // ===== 화담약 (化痰藥) =====
    {
      id: '106',
      standardName: '반하',
      hanjaName: '半夏',
      category: '화담약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['비', '위', '폐'],
      efficacy: '조습화담, 강역지구, 소비산결',
      activeCompounds: [{ name: 'Pinellia ternata polysaccharide' }],
    },
    {
      id: '107',
      standardName: '천남성',
      hanjaName: '天南星',
      category: '화담약',
      properties: { nature: '온', flavor: '고, 신' },
      meridianTropism: ['폐', '간', '비'],
      efficacy: '조습화담, 거풍지경, 산결소종',
      activeCompounds: [{ name: 'Arisaema heterophyllum polysaccharide' }],
    },
    {
      id: '108',
      standardName: '백개자',
      hanjaName: '白芥子',
      category: '화담약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['폐'],
      efficacy: '온폐화담, 이기산결, 통락지통',
      activeCompounds: [{ name: 'Sinigrin' }],
    },
    {
      id: '109',
      standardName: '소자',
      hanjaName: '蘇子',
      category: '화담약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['폐'],
      efficacy: '강기화담, 지해평천, 윤장통변',
      activeCompounds: [{ name: 'Perillaldehyde' }],
    },
    {
      id: '110',
      standardName: '행인',
      hanjaName: '杏仁',
      category: '화담약',
      properties: { nature: '온', flavor: '고' },
      meridianTropism: ['폐', '대장'],
      efficacy: '강기지해, 평천, 윤장통변',
      activeCompounds: [{ name: 'Amygdalin' }, { name: 'Prunasin' }],
    },
    {
      id: '111',
      standardName: '전호',
      hanjaName: '前胡',
      category: '화담약',
      properties: { nature: '량', flavor: '고, 신' },
      meridianTropism: ['폐'],
      efficacy: '강기화담, 소산풍열',
      activeCompounds: [{ name: 'Praeruptorin' }],
    },
    {
      id: '112',
      standardName: '과루인',
      hanjaName: '瓜蔞仁',
      category: '화담약',
      properties: { nature: '한', flavor: '감' },
      meridianTropism: ['폐', '위', '대장'],
      efficacy: '청폐화담, 활장통변',
      activeCompounds: [{ name: 'Trichosanthin' }],
    },
    {
      id: '113',
      standardName: '패모',
      hanjaName: '貝母',
      category: '화담약',
      properties: { nature: '한', flavor: '고, 감' },
      meridianTropism: ['폐', '심'],
      efficacy: '청열화담, 산결, 윤폐지해',
      activeCompounds: [{ name: 'Fritillarin' }, { name: 'Peimine' }],
    },
    {
      id: '114',
      standardName: '죽여',
      hanjaName: '竹茹',
      category: '화담약',
      properties: { nature: '량', flavor: '감' },
      meridianTropism: ['폐', '위'],
      efficacy: '청화열담, 제번지구',
      activeCompounds: [{ name: 'Bamboo polysaccharide' }],
    },
    {
      id: '115',
      standardName: '비파엽',
      hanjaName: '枇杷葉',
      category: '화담약',
      properties: { nature: '량', flavor: '고' },
      meridianTropism: ['폐', '위'],
      efficacy: '청폐지해, 강역지구',
      activeCompounds: [{ name: 'Ursolic acid' }, { name: 'Amygdalin' }],
    },
    {
      id: '116',
      standardName: '길경',
      hanjaName: '桔梗',
      category: '화담약',
      properties: { nature: '평', flavor: '고, 신' },
      meridianTropism: ['폐'],
      efficacy: '선폐화담, 이인, 배농',
      activeCompounds: [{ name: 'Platycodin' }, { name: 'Platycodigenin' }],
    },
    {
      id: '117',
      standardName: '상백피',
      hanjaName: '桑白皮',
      category: '화담약',
      properties: { nature: '한', flavor: '감' },
      meridianTropism: ['폐'],
      efficacy: '사폐평천, 이수소종',
      activeCompounds: [{ name: 'Morusin' }, { name: 'Mulberroside A' }],
    },

    // ===== 거습약/이수약 =====
    {
      id: '118',
      standardName: '복령',
      hanjaName: '茯苓',
      category: '거습약',
      properties: { nature: '평', flavor: '감, 담' },
      meridianTropism: ['심', '폐', '비', '신'],
      efficacy: '이수삼습, 건비화담, 영심안신',
      activeCompounds: [{ name: 'Pachymic acid' }, { name: 'Poria polysaccharide' }],
    },
    {
      id: '119',
      standardName: '저령',
      hanjaName: '豬苓',
      category: '거습약',
      properties: { nature: '평', flavor: '감, 담' },
      meridianTropism: ['신', '방광'],
      efficacy: '이수삼습',
      activeCompounds: [{ name: 'Polyporusterone' }],
    },
    {
      id: '120',
      standardName: '의이인',
      hanjaName: '薏苡仁',
      category: '거습약',
      properties: { nature: '량', flavor: '감, 담' },
      meridianTropism: ['비', '위', '폐'],
      efficacy: '이수삼습, 건비지사, 청열배농, 제비서근',
      activeCompounds: [{ name: 'Coixenolide' }, { name: 'Coixol' }],
    },
    {
      id: '121',
      standardName: '택사',
      hanjaName: '澤瀉',
      category: '거습약',
      properties: { nature: '한', flavor: '감' },
      meridianTropism: ['신', '방광'],
      efficacy: '이수삼습, 설열통림',
      activeCompounds: [{ name: 'Alisol A' }, { name: 'Alisol B' }],
    },
    {
      id: '122',
      standardName: '차전자',
      hanjaName: '車前子',
      category: '거습약',
      properties: { nature: '한', flavor: '감' },
      meridianTropism: ['간', '신', '폐', '소장'],
      efficacy: '이뇨통림, 삼습지사, 명목, 거담',
      activeCompounds: [{ name: 'Aucubin' }, { name: 'Plantago polysaccharide' }],
    },
    {
      id: '123',
      standardName: '활석',
      hanjaName: '滑石',
      category: '거습약',
      properties: { nature: '한', flavor: '감, 담' },
      meridianTropism: ['방광', '폐', '위'],
      efficacy: '이뇨통림, 청열해서, 수렴창양',
      activeCompounds: [{ name: 'Magnesium silicate' }],
    },
    {
      id: '124',
      standardName: '창출',
      hanjaName: '蒼朮',
      category: '거습약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['비', '위'],
      efficacy: '조습건비, 거풍산한, 명목',
      activeCompounds: [{ name: 'Atractylone' }, { name: 'β-Eudesmol' }],
    },
    {
      id: '125',
      standardName: '곽향',
      hanjaName: '藿香',
      category: '거습약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['비', '위', '폐'],
      efficacy: '화습지구, 해서발표',
      activeCompounds: [{ name: 'Patchouli alcohol' }],
    },
    {
      id: '126',
      standardName: '패란',
      hanjaName: '佩蘭',
      category: '거습약',
      properties: { nature: '평', flavor: '신' },
      meridianTropism: ['비', '위', '폐'],
      efficacy: '화습, 해서',
      activeCompounds: [{ name: 'Eupatorin' }],
    },
    {
      id: '127',
      standardName: '백두구',
      hanjaName: '白豆蔲',
      category: '거습약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['폐', '비', '위'],
      efficacy: '화습행기, 온중지구',
      activeCompounds: [{ name: 'Bornyl acetate' }],
    },

    // ===== 수삽약/지혈약 =====
    {
      id: '128',
      standardName: '산수유',
      hanjaName: '山茱萸',
      category: '수삽약',
      properties: { nature: '온', flavor: '산' },
      meridianTropism: ['간', '신'],
      efficacy: '보익간신, 삽정고탈',
      activeCompounds: [{ name: 'Cornin' }, { name: 'Loganin' }],
    },
    {
      id: '129',
      standardName: '오매',
      hanjaName: '烏梅',
      category: '수삽약',
      properties: { nature: '평', flavor: '산' },
      meridianTropism: ['간', '비', '폐', '대장'],
      efficacy: '렴폐지해, 삽장지사, 안회거구, 생진지갈',
      activeCompounds: [{ name: 'Citric acid' }, { name: 'Malic acid' }],
    },
    {
      id: '130',
      standardName: '오미자',
      hanjaName: '五味子',
      category: '수삽약',
      properties: { nature: '온', flavor: '산' },
      meridianTropism: ['폐', '신', '심'],
      efficacy: '수렴고삽, 익기생진, 보신영심',
      activeCompounds: [{ name: 'Schisandrin' }, { name: 'Gomisin' }],
    },
    {
      id: '131',
      standardName: '용골',
      hanjaName: '龍骨',
      category: '수삽약',
      properties: { nature: '평', flavor: '감, 삽' },
      meridianTropism: ['심', '간', '신'],
      efficacy: '진정안신, 평간잠양, 수렴고삽',
      activeCompounds: [{ name: 'Calcium carbonate' }],
    },
    {
      id: '132',
      standardName: '모려',
      hanjaName: '牡蠣',
      category: '수삽약',
      properties: { nature: '량', flavor: '함, 삽' },
      meridianTropism: ['간', '담', '신'],
      efficacy: '평간잠양, 연견산결, 수렴고삽',
      activeCompounds: [{ name: 'Calcium carbonate' }, { name: 'Calcium phosphate' }],
    },
    {
      id: '133',
      standardName: '연자육',
      hanjaName: '蓮子肉',
      category: '수삽약',
      properties: { nature: '평', flavor: '감, 삽' },
      meridianTropism: ['비', '신', '심'],
      efficacy: '보비지사, 익신삽정, 양심안신',
      activeCompounds: [{ name: 'Lotusine' }],
    },
    {
      id: '134',
      standardName: '금앵자',
      hanjaName: '金櫻子',
      category: '수삽약',
      properties: { nature: '평', flavor: '산, 삽' },
      meridianTropism: ['신', '방광', '대장'],
      efficacy: '삽정축뇨, 삽장지사',
      activeCompounds: [{ name: 'Ursolic acid' }],
    },

    // ===== 안신약 (安神藥) =====
    {
      id: '135',
      standardName: '산조인',
      hanjaName: '酸棗仁',
      category: '안신약',
      properties: { nature: '평', flavor: '감, 산' },
      meridianTropism: ['심', '비', '간', '담'],
      efficacy: '보심비, 안심신, 렴한생진',
      activeCompounds: [{ name: 'Jujuboside A' }, { name: 'Spinosin' }],
    },
    {
      id: '136',
      standardName: '원지',
      hanjaName: '遠志',
      category: '안신약',
      properties: { nature: '온', flavor: '고, 신' },
      meridianTropism: ['심', '폐', '신'],
      efficacy: '안신익지, 거담개규, 소산옹종',
      activeCompounds: [{ name: 'Tenuifolin' }, { name: 'Onjisaponin' }],
    },
    {
      id: '137',
      standardName: '백자인',
      hanjaName: '柏子仁',
      category: '안신약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['심', '신', '대장'],
      efficacy: '양심안신, 윤장통변',
      activeCompounds: [{ name: 'Fatty oil' }],
    },
    {
      id: '138',
      standardName: '합환피',
      hanjaName: '合歡皮',
      category: '안신약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['심', '간'],
      efficacy: '해울안신, 활혈소종',
      activeCompounds: [{ name: 'Albizzia saponin' }],
    },
    {
      id: '139',
      standardName: '야교등',
      hanjaName: '夜交藤',
      category: '안신약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['심', '간'],
      efficacy: '양혈안신, 거풍통락',
      activeCompounds: [{ name: 'Stilbene glycoside' }],
    },
    {
      id: '140',
      standardName: '주사',
      hanjaName: '朱砂',
      category: '안신약',
      properties: { nature: '량', flavor: '감' },
      meridianTropism: ['심'],
      efficacy: '진심안신, 청열해독',
      activeCompounds: [{ name: 'Mercuric sulfide' }],
    },

    // ===== 평간식풍약 =====
    {
      id: '141',
      standardName: '천마',
      hanjaName: '天麻',
      category: '평간식풍약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['간'],
      efficacy: '식풍지경, 평억간양, 거풍통락',
      activeCompounds: [{ name: 'Gastrodin' }, { name: 'Gastrodigenin' }],
    },
    {
      id: '142',
      standardName: '구등',
      hanjaName: '鉤藤',
      category: '평간식풍약',
      properties: { nature: '량', flavor: '감' },
      meridianTropism: ['간', '심포'],
      efficacy: '식풍지경, 청열평간',
      activeCompounds: [{ name: 'Rhynchophylline' }, { name: 'Isorhynchophylline' }],
    },
    {
      id: '143',
      standardName: '지룡',
      hanjaName: '地龍',
      category: '평간식풍약',
      properties: { nature: '한', flavor: '함' },
      meridianTropism: ['간', '비', '방광'],
      efficacy: '청열식풍, 통락, 평천, 이뇨',
      activeCompounds: [{ name: 'Lumbritin' }, { name: 'Hypoxanthine' }],
    },
    {
      id: '144',
      standardName: '백강잠',
      hanjaName: '白殭蠶',
      category: '평간식풍약',
      properties: { nature: '평', flavor: '함, 신' },
      meridianTropism: ['간', '폐', '위'],
      efficacy: '식풍지경, 거풍지통, 화담산결',
      activeCompounds: [{ name: 'Beauvericin' }],
    },
    {
      id: '145',
      standardName: '전갈',
      hanjaName: '全蠍',
      category: '평간식풍약',
      properties: { nature: '평', flavor: '신' },
      meridianTropism: ['간'],
      efficacy: '식풍지경, 통락지통, 공독산결',
      activeCompounds: [{ name: 'Scorpion venom' }],
    },
    {
      id: '146',
      standardName: '오공',
      hanjaName: '蜈蚣',
      category: '평간식풍약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['간'],
      efficacy: '식풍지경, 공독산결, 통락지통',
      activeCompounds: [{ name: 'Scolopendra venom' }],
    },
    {
      id: '147',
      standardName: '석결명',
      hanjaName: '石決明',
      category: '평간식풍약',
      properties: { nature: '한', flavor: '함' },
      meridianTropism: ['간'],
      efficacy: '평간잠양, 청간명목',
      activeCompounds: [{ name: 'Calcium carbonate' }],
    },

    // ===== 개규약 =====
    {
      id: '148',
      standardName: '사향',
      hanjaName: '麝香',
      category: '개규약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['심', '비'],
      efficacy: '개규성신, 활혈통경, 소종지통',
      activeCompounds: [{ name: 'Muscone' }],
    },
    {
      id: '149',
      standardName: '빙편',
      hanjaName: '冰片',
      category: '개규약',
      properties: { nature: '량', flavor: '신, 고' },
      meridianTropism: ['심', '비', '폐'],
      efficacy: '개규성신, 청열지통',
      activeCompounds: [{ name: 'Borneol' }, { name: 'Isoborneol' }],
    },
    {
      id: '150',
      standardName: '석창포',
      hanjaName: '石菖蒲',
      category: '개규약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['심', '위'],
      efficacy: '개규녕신, 화습화위',
      activeCompounds: [{ name: 'β-Asarone' }, { name: 'α-Asarone' }],
    },

    // ===== 소식약 =====
    {
      id: '151',
      standardName: '산사',
      hanjaName: '山楂',
      category: '소식약',
      properties: { nature: '온', flavor: '산, 감' },
      meridianTropism: ['비', '위', '간'],
      efficacy: '소식화적, 행기산어',
      activeCompounds: [{ name: 'Vitexin' }, { name: 'Hyperoside' }],
    },
    {
      id: '152',
      standardName: '신곡',
      hanjaName: '神麯',
      category: '소식약',
      properties: { nature: '온', flavor: '감, 신' },
      meridianTropism: ['비', '위'],
      efficacy: '소식화적, 건비화위',
      activeCompounds: [{ name: 'Amylase' }, { name: 'Lipase' }],
    },
    {
      id: '153',
      standardName: '맥아',
      hanjaName: '麥芽',
      category: '소식약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['비', '위', '간'],
      efficacy: '소식건위, 회유소창',
      activeCompounds: [{ name: 'Amylase' }, { name: 'Maltose' }],
    },
    {
      id: '154',
      standardName: '계내금',
      hanjaName: '鷄內金',
      category: '소식약',
      properties: { nature: '평', flavor: '감' },
      meridianTropism: ['비', '위', '소장', '방광'],
      efficacy: '건비소식, 삽정지유, 화석통림',
      activeCompounds: [{ name: 'Ventriculin' }],
    },
    {
      id: '155',
      standardName: '나복자',
      hanjaName: '萊菔子',
      category: '소식약',
      properties: { nature: '평', flavor: '신, 감' },
      meridianTropism: ['비', '위', '폐'],
      efficacy: '소식화적, 행기화담',
      activeCompounds: [{ name: 'Erucic acid' }],
    },

    // ===== 구충약 =====
    {
      id: '156',
      standardName: '사군자',
      hanjaName: '使君子',
      category: '구충약',
      properties: { nature: '온', flavor: '감' },
      meridianTropism: ['비', '위'],
      efficacy: '살충소적',
      activeCompounds: [{ name: 'Quisqualic acid' }],
    },
    {
      id: '157',
      standardName: '빈랑',
      hanjaName: '檳榔',
      category: '구충약',
      properties: { nature: '온', flavor: '고, 신' },
      meridianTropism: ['위', '대장'],
      efficacy: '살충, 소적, 행기, 이수',
      activeCompounds: [{ name: 'Arecoline' }, { name: 'Arecaidine' }],
    },
    {
      id: '158',
      standardName: '고련피',
      hanjaName: '苦楝皮',
      category: '구충약',
      properties: { nature: '한', flavor: '고' },
      meridianTropism: ['간', '비', '위'],
      efficacy: '살충, 료선',
      activeCompounds: [{ name: 'Toosendanin' }],
    },

    // ===== 온리약 =====
    {
      id: '159',
      standardName: '부자',
      hanjaName: '附子',
      category: '온리약',
      properties: { nature: '열', flavor: '신, 감' },
      meridianTropism: ['심', '신', '비'],
      efficacy: '회양구역, 보화조양, 산한지통',
      activeCompounds: [{ name: 'Aconitine' }, { name: 'Mesaconitine' }],
    },
    {
      id: '160',
      standardName: '건강',
      hanjaName: '乾薑',
      category: '온리약',
      properties: { nature: '열', flavor: '신' },
      meridianTropism: ['비', '위', '심', '폐'],
      efficacy: '온중산한, 회양통맥, 온폐화음',
      activeCompounds: [{ name: 'Gingerol' }, { name: 'Shogaol' }],
    },
    {
      id: '161',
      standardName: '육계',
      hanjaName: '肉桂',
      category: '온리약',
      properties: { nature: '열', flavor: '신, 감' },
      meridianTropism: ['신', '비', '심', '간'],
      efficacy: '보화조양, 산한지통, 온통경맥',
      activeCompounds: [{ name: 'Cinnamaldehyde' }, { name: 'Cinnamic acid' }],
    },
    {
      id: '162',
      standardName: '오수유',
      hanjaName: '吳茱萸',
      category: '온리약',
      properties: { nature: '열', flavor: '신, 고' },
      meridianTropism: ['간', '비', '위', '신'],
      efficacy: '산한지통, 강역지구, 조습지사',
      activeCompounds: [{ name: 'Evodiamine' }, { name: 'Rutaecarpine' }],
    },
    {
      id: '163',
      standardName: '정향',
      hanjaName: '丁香',
      category: '온리약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['비', '위', '폐', '신'],
      efficacy: '온중강역, 산한지통, 온신조양',
      activeCompounds: [{ name: 'Eugenol' }],
    },
    {
      id: '164',
      standardName: '소회향',
      hanjaName: '小茴香',
      category: '온리약',
      properties: { nature: '온', flavor: '신' },
      meridianTropism: ['간', '신', '비', '위'],
      efficacy: '산한지통, 리기화중',
      activeCompounds: [{ name: 'Anethole' }],
    },
    {
      id: '165',
      standardName: '고량강',
      hanjaName: '高良薑',
      category: '온리약',
      properties: { nature: '열', flavor: '신' },
      meridianTropism: ['비', '위'],
      efficacy: '온위산한, 소식지통',
      activeCompounds: [{ name: 'Galangin' }],
    },

    // ===== 외용약/기타 =====
    {
      id: '166',
      standardName: '웅황',
      hanjaName: '雄黃',
      category: '외용약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['심', '간', '위'],
      efficacy: '해독, 살충',
      activeCompounds: [{ name: 'Arsenic sulfide' }],
    },
    {
      id: '167',
      standardName: '유황',
      hanjaName: '硫黃',
      category: '외용약',
      properties: { nature: '온', flavor: '산' },
      meridianTropism: ['신', '대장'],
      efficacy: '외용해독살충요양, 내복보화조양통변',
      activeCompounds: [{ name: 'Sulfur' }],
    },
    {
      id: '168',
      standardName: '명반',
      hanjaName: '明礬',
      category: '외용약',
      properties: { nature: '한', flavor: '산' },
      meridianTropism: ['폐', '비', '간', '대장'],
      efficacy: '외용해독살충조습지양, 내복지혈지사청열거담',
      activeCompounds: [{ name: 'Potassium aluminum sulfate' }],
    },
    {
      id: '169',
      standardName: '붕사',
      hanjaName: '硼砂',
      category: '외용약',
      properties: { nature: '량', flavor: '감, 함' },
      meridianTropism: ['폐', '위'],
      efficacy: '외용청열해독, 내복청폐화담',
      activeCompounds: [{ name: 'Sodium borate' }],
    },
    {
      id: '170',
      standardName: '사상자',
      hanjaName: '蛇床子',
      category: '외용약',
      properties: { nature: '온', flavor: '신, 고' },
      meridianTropism: ['신'],
      efficacy: '온신장양, 조습살충, 거풍지양',
      activeCompounds: [{ name: 'Osthole' }, { name: 'Cnidiadin' }],
    },
  ]
}
