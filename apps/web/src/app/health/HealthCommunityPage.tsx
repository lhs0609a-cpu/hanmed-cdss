/**
 * 건강 커뮤니티 페이지
 * 체질별 토픽 + 게시글 목록 + 탭 필터 + 인기 토픽
 */
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageSquare,
  ThumbsUp,
  Eye,
  PenSquare,
  TrendingUp,
  Search,
  ChevronRight,
  Users,
  Flame,
  ArrowLeft,
} from 'lucide-react'
import { CONSTITUTIONS } from '@/data/constitutions'
import type { ConstitutionType } from '@/lib/saju'

// ─── 탭 정의 ────────────────────────────────
type TabId = 'all' | 'tmi' | 'check' | 'qna' | 'review'

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'all',    label: '전체',     emoji: '📋' },
  { id: 'tmi',    label: '체질TMI',  emoji: '✨' },
  { id: 'check',  label: '건강체크', emoji: '🩺' },
  { id: 'qna',    label: 'Q&A',      emoji: '💬' },
  { id: 'review', label: '후기',     emoji: '📝' },
]

// ─── 더미 게시글 데이터 ──────────────────────
interface Post {
  id: number
  tab: TabId
  title: string
  author: string
  constitution?: ConstitutionType
  comments: number
  views: number
  likes: number
  timeAgo: string
  tags: string[]
}

const DUMMY_POSTS: Post[] = [
  { id: 1,  tab: 'tmi',    title: '나 태음인인데 정국이랑 같은 체질이래!! 🎉', author: '체질덕후', constitution: 'taeeum', comments: 127, views: 4892, likes: 342, timeAgo: '2시간 전', tags: ['태음인', 'BTS'] },
  { id: 2,  tab: 'tmi',    title: '소양인끼리 모여라~ 같은 체질 셀럽 누가 있어?', author: '소양소양', constitution: 'soyang', comments: 89, views: 3241, likes: 198, timeAgo: '3시간 전', tags: ['소양인', '셀럽'] },
  { id: 3,  tab: 'check',  title: '눈떨림 체크 해봤는데 혈허래요... 대추차 효과 있으신 분?', author: '건강러버', comments: 34, views: 892, likes: 67, timeAgo: '4시간 전', tags: ['눈떨림', '혈허'] },
  { id: 4,  tab: 'review', title: '소음인 음식 추천받고 2주 실천 후기', author: '따끈한차', constitution: 'soeum', comments: 67, views: 1543, likes: 189, timeAgo: '5시간 전', tags: ['소음인', '음식', '후기'] },
  { id: 5,  tab: 'qna',    title: '식후졸림이 비위기허라니... 직장인 분들 어떻게 관리하세요?', author: '오후졸림', comments: 89, views: 2341, likes: 156, timeAgo: '6시간 전', tags: ['식후졸림', '비위기허'] },
  { id: 6,  tab: 'tmi',    title: '손흥민이 태양인이라 진짜 리더 기질이구나...', author: '축구팬', constitution: 'taeyang', comments: 45, views: 1876, likes: 234, timeAgo: '7시간 전', tags: ['태양인', '손흥민'] },
  { id: 7,  tab: 'qna',    title: '한의원 갈 때 체질 진단 받으면 보험 되나요?', author: '궁금이', comments: 23, views: 987, likes: 45, timeAgo: '8시간 전', tags: ['한의원', '보험', '체질진단'] },
  { id: 8,  tab: 'check',  title: '수면 체크 결과 공유합니다 (간양상항)', author: '불면증러', comments: 56, views: 1432, likes: 98, timeAgo: '9시간 전', tags: ['수면', '간양상항'] },
  { id: 9,  tab: 'review', title: '태음인 다이어트 한 달 후기 (5kg 감량)', author: '태음이의도전', constitution: 'taeeum', comments: 134, views: 5678, likes: 567, timeAgo: '10시간 전', tags: ['태음인', '다이어트', '후기'] },
  { id: 10, tab: 'tmi',    title: 'IU랑 나랑 같은 체질이라 음식 취향도 비슷한 듯', author: '아이유팬', constitution: 'soeum', comments: 78, views: 2345, likes: 321, timeAgo: '11시간 전', tags: ['소음인', 'IU'] },
  { id: 11, tab: 'qna',    title: '소양인인데 매운 거 좋아하면 안 되나요?', author: '맵부심', constitution: 'soyang', comments: 42, views: 1234, likes: 87, timeAgo: '12시간 전', tags: ['소양인', '매운음식'] },
  { id: 12, tab: 'check',  title: '두통 체크 해봤는데 풍한두통이래요 어떻게 해야 하나요', author: '두통괴롭', comments: 31, views: 876, likes: 54, timeAgo: '13시간 전', tags: ['두통', '풍한두통'] },
  { id: 13, tab: 'review', title: '소양인 운동 루틴 3개월 후기 (수영 + 요가)', author: '운동맨', constitution: 'soyang', comments: 45, views: 1567, likes: 198, timeAgo: '14시간 전', tags: ['소양인', '운동', '후기'] },
  { id: 14, tab: 'tmi',    title: '블랙핑크 제니가 태음인이라니... 의외다', author: '핑크러버', constitution: 'taeeum', comments: 93, views: 3456, likes: 278, timeAgo: '15시간 전', tags: ['태음인', '블랙핑크'] },
  { id: 15, tab: 'qna',    title: '체질별로 커피 마셔도 되는 양이 다른가요?', author: '커피중독', comments: 67, views: 2890, likes: 145, timeAgo: '16시간 전', tags: ['커피', '체질별'] },
]

// ─── 인기 토픽 ───────────────────────────────
const POPULAR_TOPICS = [
  { constitution: 'taeeum' as ConstitutionType, topic: '태음인 모여라! 우리끼리 맛집 공유', members: 1247, posts: 89 },
  { constitution: 'soyang' as ConstitutionType, topic: '소양인 다이어트 챌린지', members: 892, posts: 56 },
  { constitution: 'soeum' as ConstitutionType, topic: '소음인 따뜻한 겨울나기 꿀팁', members: 634, posts: 42 },
  { constitution: 'taeyang' as ConstitutionType, topic: '태양인 리더들의 스트레스 관리', members: 321, posts: 28 },
  { constitution: 'taeeum' as ConstitutionType, topic: '태음인 보양식 레시피 모음', members: 983, posts: 67 },
  { constitution: 'soyang' as ConstitutionType, topic: '소양인 여름 건강 관리', members: 745, posts: 51 },
]

// ─── 체질 필터 ───────────────────────────────
type ConstitutionFilter = 'all' | ConstitutionType

export default function HealthCommunityPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [constitutionFilter, setConstitutionFilter] = useState<ConstitutionFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = useMemo(() => {
    let result = DUMMY_POSTS
    if (activeTab !== 'all') {
      result = result.filter(p => p.tab === activeTab)
    }
    if (constitutionFilter !== 'all') {
      result = result.filter(p => p.constitution === constitutionFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [activeTab, constitutionFilter, searchQuery])

  const constitutionTypes: { key: ConstitutionFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'taeyang', label: `${CONSTITUTIONS.taeyang.emoji} 태양인` },
    { key: 'taeeum', label: `${CONSTITUTIONS.taeeum.emoji} 태음인` },
    { key: 'soyang', label: `${CONSTITUTIONS.soyang.emoji} 소양인` },
    { key: 'soeum', label: `${CONSTITUTIONS.soeum.emoji} 소음인` },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/health" className="text-gray-400 hover:text-orange-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900">건강 커뮤니티</h1>
          <p className="text-sm text-gray-500">체질TMI 결과로 대화하고, 건강 경험을 나눠요</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {/* Search + Constitution Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="게시글 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {constitutionTypes.map(ct => (
                <button
                  key={ct.key}
                  onClick={() => setConstitutionFilter(ct.key)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    constitutionFilter === ct.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-2.5">
            {filteredPosts.map(post => {
              const conInfo = post.constitution ? CONSTITUTIONS[post.constitution] : null
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Tags row */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          post.tab === 'tmi' ? 'bg-rose-50 text-rose-600' :
                          post.tab === 'qna' ? 'bg-blue-50 text-blue-600' :
                          post.tab === 'check' ? 'bg-blue-50 text-blue-600' :
                          post.tab === 'review' ? 'bg-purple-50 text-purple-600' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {TABS.find(t => t.id === post.tab)?.label}
                        </span>
                        {conInfo && (
                          <span
                            className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white"
                            style={{ background: `linear-gradient(135deg, ${conInfo.gradientFrom}, ${conInfo.gradientTo})` }}
                          >
                            {conInfo.emoji} {conInfo.name}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-gray-800 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {post.title}
                      </h3>

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span>{post.author}</span>
                        <span>{post.timeAgo}</span>
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          {post.comments}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />
                          {post.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <ThumbsUp className="w-3 h-3" />
                          {post.likes}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex gap-1.5 mt-2">
                        {post.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-50 text-[10px] text-gray-500 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredPosts.length === 0 && (
              <div className="text-center py-16">
                <span className="text-4xl block mb-3">🔍</span>
                <p className="text-gray-500">게시글이 없어요</p>
                <p className="text-sm text-gray-400 mt-1">다른 탭이나 필터를 선택해보세요</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Popular Topics */}
        <aside className="lg:w-80 flex-shrink-0">
          {/* Popular Topics */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-bold text-gray-800">인기 토픽</h2>
            </div>
            <div className="space-y-3">
              {POPULAR_TOPICS.map((item, idx) => {
                const cInfo = CONSTITUTIONS[item.constitution]
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: cInfo.bgColor }}
                    >
                      {cInfo.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-orange-600 transition-colors">
                        {item.topic}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <Users className="w-3 h-3" /> {item.members.toLocaleString()}명
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <MessageSquare className="w-3 h-3" /> {item.posts}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Trending Tags */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-bold text-gray-800">트렌딩 태그</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['#태음인', '#다이어트', '#BTS체질', '#눈떨림', '#소양인음식', '#수면', '#체질진단', '#IU', '#한의원', '#소음인'].map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-medium rounded-full hover:bg-orange-100 cursor-pointer transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-2xl p-5 border border-orange-100/50">
            <h3 className="text-sm font-bold text-gray-800 mb-2">내 체질도 궁금하다면?</h3>
            <p className="text-xs text-gray-500 mb-3">체질 진단 후 같은 체질 커뮤니티에 참여해보세요</p>
            <Link
              to="/health/tmi/my-type"
              className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-400 text-white text-xs font-bold rounded-full"
            >
              내 체질 무료 진단
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Floating Write Button */}
      <button
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-orange-500 to-rose-400 text-white rounded-full shadow-lg shadow-orange-200 flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all"
        onClick={() => {/* placeholder */}}
      >
        <PenSquare className="w-6 h-6" />
      </button>
    </div>
  )
}
