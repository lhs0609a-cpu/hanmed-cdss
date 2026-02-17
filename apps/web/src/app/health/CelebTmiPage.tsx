/**
 * 체질 TMI 메인 목록 페이지
 * 셀럽/캐릭터 체질 분석 카드 그리드 + 트렌딩 캐러셀 + 커뮤니티
 * 10K+ entries: virtual scroll + debounced search + precomputed constitution
 */
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Sparkles, Heart, ArrowRight, X, TrendingUp, MessageCircle, Users, Flame } from 'lucide-react'
import {
  getAllCelebrities,
  searchCelebrities,
  CATEGORY_INFO,
  getCategories,
  getTotalCount,
  getCategoryCounts,
  type CelebCategory,
  type Celebrity,
} from '@/data/celebrities'
import { CONSTITUTIONS } from '@/data/constitutions'
import { CODE_TO_TYPE } from '@/data/celebs/types'

/** 경량 가상 스크롤 훅 - @tanstack/react-virtual 대체 */
interface VirtualItem {
  index: number
  start: number
  size: number
  key: number
}

function useSimpleVirtualizer(opts: {
  count: number
  getScrollElement: () => HTMLElement | null
  estimateSize: () => number
  overscan: number
}) {
  const { count, getScrollElement, estimateSize, overscan } = opts
  const rowHeight = estimateSize()
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(800)

  useEffect(() => {
    const el = getScrollElement()
    if (!el) return
    setContainerHeight(el.clientHeight)
    const onScroll = () => setScrollTop(el.scrollTop)
    const onResize = () => setContainerHeight(el.clientHeight)
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [getScrollElement])

  const getTotalSize = useCallback(() => count * rowHeight, [count, rowHeight])

  const getVirtualItems = useCallback((): VirtualItem[] => {
    const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const endIdx = Math.min(count - 1, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan)
    const items: VirtualItem[] = []
    for (let i = startIdx; i <= endIdx; i++) {
      items.push({ index: i, start: i * rowHeight, size: rowHeight, key: i })
    }
    return items
  }, [scrollTop, containerHeight, count, rowHeight, overscan])

  return { getTotalSize, getVirtualItems }
}

/** 체질별 커뮤니티 토픽 */
const communityTopics = [
  { constitution: 'taeeum' as const, topic: '태음인 모여라! 우리끼리 맛집 공유', members: 1247, emoji: '⛰️', comments: 89 },
  { constitution: 'soyang' as const, topic: '소양인의 다이어트 일지 챌린지', members: 892, emoji: '⚡', comments: 56 },
  { constitution: 'soeum' as const, topic: '소음인 따뜻한 겨울나기 꿀팁', members: 634, emoji: '🌊', comments: 42 },
  { constitution: 'taeyang' as const, topic: '태양인 리더들의 스트레스 관리법', members: 321, emoji: '🌞', comments: 28 },
  { constitution: 'taeeum' as const, topic: '태음인이 추천하는 보양식 레시피', members: 983, emoji: '🍲', comments: 67 },
  { constitution: 'soyang' as const, topic: '소양인 여름 건강 관리 필수템', members: 745, emoji: '🧊', comments: 51 },
]

const COLS_BY_BREAKPOINT = { sm: 2, md: 3, lg: 4, xl: 6 }

/** 디바운스 훅 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** 트렌딩 셀럽 (매일 바뀌는 효과) */
function useTrendingCelebs(count: number) {
  return useMemo(() => {
    const all = getAllCelebrities()
    const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
    const shuffled = [...all].sort((a, b) => {
      const ha = ((daySeed * 31 + a.id.charCodeAt(0)) * 37) % 1000
      const hb = ((daySeed * 31 + b.id.charCodeAt(0)) * 37) % 1000
      return ha - hb
    })
    return shuffled.slice(0, count).map(celeb => {
      const constitution = CONSTITUTIONS[CODE_TO_TYPE[celeb.constitution]]
      return { celeb, constitution }
    })
  }, [count])
}

/** 컬럼 수 계산 */
function useColumns(): number {
  const [cols, setCols] = useState(2)
  useEffect(() => {
    function update() {
      const w = window.innerWidth
      if (w >= 1280) setCols(COLS_BY_BREAKPOINT.xl)
      else if (w >= 1024) setCols(COLS_BY_BREAKPOINT.lg)
      else if (w >= 768) setCols(COLS_BY_BREAKPOINT.md)
      else setCols(COLS_BY_BREAKPOINT.sm)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return cols
}

export default function CelebTmiPage() {
  const [selectedCategory, setSelectedCategory] = useState<CelebCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebouncedValue(searchQuery, 300)
  const parentRef = useRef<HTMLDivElement>(null)
  const cols = useColumns()

  const allCelebs = useMemo(() => getAllCelebrities(), [])
  const categoryCounts = useMemo(() => getCategoryCounts(), [])
  const trendingCelebs = useTrendingCelebs(30)

  const filteredCelebs = useMemo(() => {
    let result: Celebrity[]
    if (debouncedQuery.trim()) {
      result = searchCelebrities(debouncedQuery)
    } else {
      result = allCelebs
    }
    if (selectedCategory !== 'all') {
      result = result.filter(c => c.category === selectedCategory)
    }
    return result
  }, [allCelebs, selectedCategory, debouncedQuery])

  // Virtual grid: rows = ceil(items / cols)
  const rowCount = Math.ceil(filteredCelebs.length / cols)

  const virtualizer = useSimpleVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 160,
    overscan: 5,
  })

  const trendingDoubled = useMemo(
    () => [...trendingCelebs, ...trendingCelebs],
    [trendingCelebs]
  )

  const handleCategoryChange = useCallback((cat: CelebCategory | 'all') => {
    setSelectedCategory(cat)
    parentRef.current?.scrollTo({ top: 0 })
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full mb-3">
            {getTotalCount().toLocaleString()}명의 셀럽 분석 완료
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
            체질 TMI ✨
          </h1>
          <p className="text-lg text-gray-500 mb-2">
            내 최애는 무슨 체질? 사주로 알아보는 셀럽 체질 분석
          </p>
          <p className="text-sm text-gray-400">
            셀럽의 생년월일로 사주를 분석하고, 오행 밸런스에서 사상체질을 추론해요
          </p>
        </motion.div>

        {/* CTA */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link
            to="/health/tmi/my-type"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-400 text-white font-bold rounded-full shadow-lg shadow-orange-200 hover:shadow-xl transition-all"
          >
            <Sparkles className="w-5 h-5" />
            내 체질 진단하기
          </Link>
          <Link
            to="/health/tmi/compare"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-500 border-2 border-orange-200 font-bold rounded-full hover:bg-orange-50 transition-all"
          >
            <Heart className="w-5 h-5" />
            궁합 비교하기
          </Link>
        </div>
      </section>

      {/* Trending Carousel */}
      <section className="mb-10 -mx-4">
        <div className="flex items-center gap-2 px-4 mb-3">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-gray-800">오늘의 HOT 셀럽</h2>
          <span className="text-xs text-gray-400 ml-auto">매일 업데이트</span>
        </div>
        <div className="overflow-hidden">
          <div className="flex gap-3 animate-scroll-left" style={{ width: 'max-content' }}>
            {trendingDoubled.map(({ celeb, constitution }, idx) => (
              <Link
                key={`${celeb.id}-${idx}`}
                to={`/health/tmi/${celeb.id}`}
                className="flex-shrink-0 w-28 bg-white rounded-2xl p-3 border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all text-center"
              >
                <div
                  className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg mb-1"
                  style={{ backgroundColor: constitution.bgColor }}
                >
                  {celeb.emoji}
                </div>
                <p className="text-xs font-bold text-gray-800 truncate">{celeb.name}</p>
                <span
                  className="inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${constitution.gradientFrom}, ${constitution.gradientTo})` }}
                >
                  {constitution.emoji} {constitution.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="relative max-w-md mx-auto mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="셀럽, 캐릭터, 그룹 이름 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3 rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        <button
          onClick={() => handleCategoryChange('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          전체 ({allCelebs.length.toLocaleString()})
        </button>
        {getCategories().map(cat => {
          const info = CATEGORY_INFO[cat]
          const count = categoryCounts[cat] || 0
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {info.emoji} {info.label} ({count.toLocaleString()})
            </button>
          )
        })}
      </div>

      {/* Results count */}
      {debouncedQuery && (
        <p className="text-sm text-gray-500 mb-4">
          &quot;{debouncedQuery}&quot; 검색 결과: {filteredCelebs.length.toLocaleString()}명
        </p>
      )}

      {/* Virtual Grid */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(rowCount * 160, 800), contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map(virtualRow => {
            const startIdx = virtualRow.index * cols
            const rowItems = filteredCelebs.slice(startIdx, startIdx + cols)
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap: '0.75rem',
                }}
              >
                {rowItems.map(celeb => (
                  <CelebCard key={celeb.id} celeb={celeb} />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty state */}
      {filteredCelebs.length === 0 && (
        <div className="text-center py-16">
          <span className="text-4xl mb-3 block">🔍</span>
          <p className="text-gray-500">검색 결과가 없어요</p>
          <p className="text-sm text-gray-400 mt-1">다른 이름이나 그룹으로 검색해보세요</p>
        </div>
      )}

      {/* Community Topics */}
      <section className="mt-12 mb-12">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-gray-800">체질별 커뮤니티</h2>
          <Link to="/health/community" className="text-xs text-orange-500 font-medium ml-auto hover:underline">
            전체보기 <ArrowRight className="w-3 h-3 inline" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {communityTopics.map((item, idx) => {
            const cInfo = CONSTITUTIONS[item.constitution]
            return (
              <Link
                key={idx}
                to="/health/community"
                className="flex items-start gap-3 bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all group"
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ backgroundColor: cInfo.bgColor }}
                >
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate group-hover:text-orange-600 transition-colors">
                    {item.topic}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Users className="w-3 h-3" /> {item.members.toLocaleString()}명
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <MessageCircle className="w-3 h-3" /> {item.comments}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white ml-auto"
                      style={{ background: `linear-gradient(135deg, ${cInfo.gradientFrom}, ${cInfo.gradientTo})` }}
                    >
                      {cInfo.name}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Stats banner */}
      <section className="mb-12">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-black text-orange-500">{getTotalCount().toLocaleString()}+</p>
              <p className="text-xs text-gray-500 mt-1">분석된 셀럽</p>
            </div>
            <div>
              <p className="text-2xl font-black text-rose-500">4</p>
              <p className="text-xs text-gray-500 mt-1">사상체질</p>
            </div>
            <div>
              <p className="text-2xl font-black text-purple-500">{getCategories().length}</p>
              <p className="text-xs text-gray-500 mt-1">카테고리</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-500">
                <TrendingUp className="w-6 h-6 inline mr-1" />매일
              </p>
              <p className="text-xs text-gray-500 mt-1">업데이트</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mb-8 text-center">
        <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            나도 어떤 체질인지 궁금하다면?
          </h2>
          <p className="text-gray-500 mb-6">
            생년월일만 입력하면 내 사주와 체질을 무료로 분석해드려요
          </p>
          <Link
            to="/health/tmi/my-type"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-rose-400 text-white font-bold rounded-full shadow-lg shadow-orange-200 hover:shadow-xl transition-all text-lg"
          >
            <Sparkles className="w-5 h-5" />
            내 체질 무료 진단 받기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}

/** 셀럽 카드 - constitution from precomputed index */
function CelebCard({ celeb }: { celeb: Celebrity }) {
  const constitution = CONSTITUTIONS[CODE_TO_TYPE[celeb.constitution]]

  return (
    <Link
      to={`/health/tmi/${celeb.id}`}
      className="block bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-lg hover:border-orange-200 hover:-translate-y-1 transition-all group"
    >
      <div
        className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl mb-2"
        style={{ backgroundColor: constitution.bgColor }}
      >
        {celeb.emoji}
      </div>
      <h3 className="text-sm font-bold text-gray-800 text-center truncate">{celeb.name}</h3>
      {celeb.group && (
        <p className="text-[10px] text-gray-400 text-center truncate">{celeb.group}</p>
      )}
      <div className="mt-2 flex justify-center">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${constitution.gradientFrom}, ${constitution.gradientTo})` }}
        >
          {constitution.emoji} {constitution.name}
        </span>
      </div>
      <div className="flex justify-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-3 h-3 text-orange-400" />
      </div>
    </Link>
  )
}
