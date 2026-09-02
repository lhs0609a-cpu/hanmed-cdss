import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Users,
  MessageSquare,
  HelpCircle,
  BookOpen,
  Bookmark,
  Search,
  Plus,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  CheckCircle,
  Shield,
  ChevronRight,
  Loader2,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import type { CommunityPost, PostType } from '../../types'
import { LevelIndicator } from '@/components/community/LevelBadge'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'

const postTypeConfig = {
  case_discussion: { label: '케이스 토론', icon: BookOpen, color: 'text-amber-600 bg-amber-100' },
  qna: { label: 'Q&A', icon: HelpCircle, color: 'text-blue-600 bg-blue-100' },
  general: { label: '종합', icon: MessageSquare, color: 'text-gray-600 bg-gray-100' },
  forum: { label: '포럼', icon: Users, color: 'text-purple-600 bg-purple-100' },
}

/**
 * 건의사항은 별도 게시판 유형을 만들지 않고 예약 태그로 모은다.
 * post.type 은 Postgres enum(post_type_enum)이라 값을 늘리려면 운영 DB 에
 * ALTER TYPE 이 필요한데, 이 DB 는 마이그레이션 이력이 이미 어긋나 있다.
 * 전문 포럼의 분과도 같은 방식(태그)으로 보존하고 있어 흐름도 일관된다.
 */
export const SUGGESTION_TAG = '건의사항'

/**
 * 임상정보 게시판.
 *
 * 종합 게시판은 한의사끼리 이야기하라고 비워 둔다. 운영팀이 올리는
 * 자료가 거기에 쌓이면 사람 글이 묻히고, 묻히면 아무도 안 쓴다.
 *
 * 큐레이션한 것 — 진료 팁, 제도 변경, KCI 한의학 논문 — 은 이쪽에 모은다.
 * 건의사항과 같은 방식으로 예약 태그를 쓴다. post.type 은 Postgres
 * enum 이라 값을 늘리려면 운영 DB 에 ALTER TYPE 이 필요한데, 이 DB 는
 * 마이그레이션 이력이 이미 어긋나 있다.
 */
export const CLINICAL_TAG = '임상정보'

/**
 * 첫 화면 게시판 카드.
 *
 * 여섯 장을 손으로 늘어놓았더니 한 장 고칠 때마다 나머지 다섯 장과
 * 어긋났다. 배열로 두면 글 수 표시 같은 것을 한 번만 붙이면 된다.
 *
 * countKey 는 서버가 주는 집계의 열쇠다.
 *
 * 북마크는 한때 null 이었다. "사람마다 다른 값이라 서버가 합계로 세지
 * 않는다" 는 이유였는데, 다시 보니 로그인한 사람의 것을 세면 되는 일이었다.
 * 못 세는 것과 안 센 것은 다르다.
 */
const BOARD_CARDS: Array<{
  to: string
  label: string
  hint: string
  icon: typeof BookOpen
  iconColor: string
  hoverBorder: string
  hoverText: string
  countKey: string | null
}> = [
  {
    to: '/dashboard/community/cases',
    label: '케이스 토론',
    hint: '치험례 기반 토론',
    icon: BookOpen,
    iconColor: 'text-amber-500',
    hoverBorder: 'hover:border-amber-300',
    hoverText: 'group-hover:text-amber-600',
    countKey: 'case_discussion',
  },
  {
    to: '/dashboard/community/qna',
    label: 'Q&A',
    hint: '질문 & 답변',
    icon: HelpCircle,
    iconColor: 'text-blue-500',
    hoverBorder: 'hover:border-blue-300',
    hoverText: 'group-hover:text-blue-600',
    countKey: 'qna',
  },
  {
    to: '/dashboard/community/general',
    label: '종합 게시판',
    hint: '자유로운 소통',
    icon: MessageSquare,
    iconColor: 'text-gray-500',
    hoverBorder: 'hover:border-gray-300',
    hoverText: 'group-hover:text-gray-600',
    countKey: 'general',
  },
  {
    to: '/dashboard/community/forum',
    label: '전문 포럼',
    hint: '분과별 토론',
    icon: Users,
    iconColor: 'text-purple-500',
    hoverBorder: 'hover:border-purple-300',
    hoverText: 'group-hover:text-purple-600',
    countKey: 'forum',
  },
  {
    to: '/dashboard/community/suggestions',
    label: '건의사항',
    hint: '불편한 점·바라는 기능',
    icon: Lightbulb,
    iconColor: 'text-emerald-500',
    hoverBorder: 'hover:border-emerald-300',
    hoverText: 'group-hover:text-emerald-600',
    countKey: 'suggestions',
  },
  {
    to: '/dashboard/community/clinical',
    label: '임상정보',
    hint: '진료 팁·제도·논문',
    icon: Sparkles,
    iconColor: 'text-teal-500',
    hoverBorder: 'hover:border-teal-300',
    hoverText: 'group-hover:text-teal-600',
    countKey: 'clinical',
  },
  {
    to: '/dashboard/community/my/bookmarks',
    label: '북마크',
    hint: '저장한 글',
    icon: Bookmark,
    iconColor: 'text-blue-500',
    hoverBorder: 'hover:border-blue-300',
    hoverText: 'group-hover:text-blue-600',
    countKey: 'bookmarks',
  },
]

export default function CommunityPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isGuest = useAuthStore((state) => state.isGuest)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<PostType | ''>('')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'comments'>('latest')

  const isSuggestions = location.pathname.includes('/community/suggestions')
  const isClinical = location.pathname.includes('/community/clinical')

  // 현재 라우트가 "내 글"/"내 북마크" 인지 판별
  const viewMode: 'all' | 'mine' | 'bookmarks' = location.pathname.includes('/community/my/bookmarks')
    ? 'bookmarks'
    : location.pathname.includes('/community/my/posts')
      ? 'mine'
      : 'all'

  // API 상태
  const [posts, setPosts] = useState<CommunityPost[]>([])

  /**
   * 목록 페이지.
   *
   * 서버는 처음부터 page·limit 를 받고 meta.totalPages 까지 돌려줬는데
   * 화면이 그걸 하나도 안 썼다. 전문 포럼에 2천 편이 있어도 첫 20편에서
   * 끝이고 나머지는 열 방법이 없었다.
   */
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)

  /**
   * 게시판별 글 수.
   *
   * 카드에 이름만 있으면 어디에 글이 있는지 몰라서 하나씩 눌러 보게 된다.
   * 숫자를 못 받아 와도 카드는 그대로 보여야 하므로 실패는 조용히 넘긴다 —
   * 글 목록이 아니라 곁들이는 정보다.
   */
  const [boardCounts, setBoardCounts] = useState<{
    byType: Record<string, number>
    suggestions: number
    clinical: number
    bookmarks: number
  } | null>(null)

  useEffect(() => {
    if (!token) return
    let alive = true
    api
      .get('/community/board-counts')
      .then((res) => {
        const d = res.data?.data ?? res.data
        if (alive && d && typeof d === 'object') setBoardCounts(d)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [token])

  // API에서 게시글 가져오기
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      setError(null)

      try {
        // 내 북마크는 전용 엔드포인트, 그 외(전체/내 글)는 /community/posts 사용
        const endpoint = viewMode === 'bookmarks' ? '/community/bookmarks' : '/community/posts'
        const params: Record<string, string> = {}
        if (viewMode !== 'bookmarks') {
          if (selectedType) params.type = selectedType
          if (isSuggestions) params.tag = SUGGESTION_TAG
          if (isClinical) params.tag = CLINICAL_TAG
          if (sortBy) params.sortBy = sortBy
          if (viewMode === 'mine' && user?.id) params.authorId = user.id
        }
        params.page = String(page)

        const response = await api.get(endpoint, { params })
        const body = response.data
        const apiPosts = body?.data || body || []
        setPosts(Array.isArray(apiPosts) ? apiPosts : [])
        // 북마크 엔드포인트도 같은 meta 를 준다.
        const meta = body?.meta
        setTotalPages(Math.max(Number(meta?.totalPages) || 1, 1))
        setTotal(Number(meta?.total) || (Array.isArray(apiPosts) ? apiPosts.length : 0))
      } catch (err) {
        setError(getErrorMessage(err))
        setPosts([])
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [selectedType, sortBy, token, viewMode, user?.id, isSuggestions, isClinical, page])

  // 필터가 바뀌면 첫 페이지로 돌아간다.
  // 3페이지를 보다가 게시판을 옮겼는데 그대로 3페이지면, 글이 몇 개 없는
  // 게시판에서는 빈 화면이 나온다.
  useEffect(() => {
    setPage(1)
  }, [selectedType, sortBy, viewMode, isSuggestions, isClinical])

  // URL 경로에 따라 selectedType 설정
  useEffect(() => {
    const path = location.pathname
    if (path.includes('/community/cases')) {
      setSelectedType('case_discussion')
    } else if (path.includes('/community/qna')) {
      setSelectedType('qna')
    } else if (path.includes('/community/general')) {
      setSelectedType('general')
    } else if (path.includes('/community/forum')) {
      setSelectedType('forum')
    } else if (path.includes('/community/suggestions')) {
      // 건의사항은 태그로 모으므로 유형 필터를 걸지 않는다.
      setSelectedType('')
    } else if (path.includes('/community/clinical')) {
      // 임상정보도 태그로 모은다. 유형은 가리지 않는다.
      setSelectedType('')
    } else {
      // 전체/내 글/내 북마크 — 타입 필터 없음
      setSelectedType('')
    }
  }, [location.pathname])

  const filteredPosts = useMemo(() => {
    // 타입 필터·정렬은 서버(/community/posts)에서 처리한다.
    // 클라이언트에서는 검색어로 한 번 더 좁히고 고정 게시글만 위로 올린다.
    const filtered = posts.filter((post) => {
      return (
        !searchQuery ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) => tag.includes(searchQuery))
      )
    })

    // 고정 게시글 우선
    return [...filtered].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  }, [posts, searchQuery])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  // 건의사항 화면에서 글쓰기를 누르면 건의사항으로 미리 채워 보낸다.
  const writePath = isSuggestions
    ? `/dashboard/community/write?type=general&tag=${encodeURIComponent(SUGGESTION_TAG)}`
    : '/dashboard/community/write'

  // 글쓰기 버튼 클릭 핸들러 - 로그인 여부 확인
  const handleWriteClick = () => {
    if (!isAuthenticated && isGuest) {
      toast({
        title: '로그인이 필요합니다',
        description: '글을 작성하려면 로그인해 주세요.',
        variant: 'destructive',
      })
      navigate('/login', { state: { from: writePath } })
      return
    }
    if (!isAuthenticated) {
      toast({
        title: '로그인이 필요합니다',
        description: '글을 작성하려면 로그인해 주세요.',
        variant: 'destructive',
      })
      navigate('/login', { state: { from: writePath } })
      return
    }
    navigate(writePath)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">
            {isSuggestions ? '건의사항' : '커뮤니티'}
          </h1>
          <p className="mt-1 text-[14px] text-neutral-500">
            {isSuggestions
              ? '쓰면서 불편했던 점, 있었으면 하는 기능을 남겨주세요. 다른 분 건의에 공감과 댓글도 달 수 있습니다.'
              : '한의사들과 사례·지식을 공유합니다.'}
          </p>
        </div>
        <button
          onClick={handleWriteClick}
          className="inline-flex items-center gap-2 h-11 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-[14px] font-semibold rounded-md transition-colors active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          {isSuggestions ? '건의하기' : '글쓰기'}
        </button>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {BOARD_CARDS.map((card) => {
          const Icon = card.icon
          // 북마크는 사람마다 다르고 서버가 합계로 세지 않는다.
          // 모르는 것을 0 으로 적으면 "저장한 글이 없다" 는 거짓말이 된다.
          const count =
            card.countKey === null
              ? null
              : // 건의사항·임상정보는 게시판 유형이 아니라 예약 태그라
                // 서버가 byType 이 아니라 최상위에 따로 담아 준다. 여기서
                // 갈라 주지 않으면 임상정보 카드에 숫자가 안 나온다.
                card.countKey === 'suggestions'
                ? (boardCounts?.suggestions ?? null)
                : card.countKey === 'clinical'
                  ? (boardCounts?.clinical ?? null)
                  : card.countKey === 'bookmarks'
                    ? (boardCounts?.bookmarks ?? null)
                    : (boardCounts?.byType?.[card.countKey] ?? null)

          return (
            <Link
              key={card.to}
              to={card.to}
              className={`surface-card rounded-2xl p-4 transition-all group hover:shadow-md ${card.hoverBorder}`}
            >
              <div className="flex items-start justify-between">
                <Icon className={`h-6 w-6 ${card.iconColor} mb-2`} />
                {count !== null && (
                  <span className="text-xs font-semibold text-gray-500 tabular-nums">
                    {count.toLocaleString()}
                  </span>
                )}
              </div>
              <span className={`font-medium text-gray-900 ${card.hoverText}`}>{card.label}</span>
              <p className="text-xs text-gray-500 mt-1">{card.hint}</p>
            </Link>
          )
        })}
      </div>

      {/* Search & Filters */}
      <div className="surface-card rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 내용, 태그로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as PostType | '')}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            >
              <option value="">전체 게시판</option>
              <option value="case_discussion">케이스 토론</option>
              <option value="qna">Q&A</option>
              <option value="general">종합</option>
              <option value="forum">전문 포럼</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular' | 'comments')}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            >
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
              <option value="comments">댓글순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-16 surface-card rounded-2xl">
            <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">게시글을 불러오는 중...</p>
          </div>
        )}

        {!loading && filteredPosts.map((post) => {
          // 예약 태그로 옮긴 글은 옮긴 게시판 이름을 보여준다.
          //
          // post.type 은 그대로 두고 태그로만 옮겼기 때문에, 그냥 두면
          // 임상정보 글에 '포럼' 배지가 붙는다. 옮겼다면서 옛 이름이
          // 보이면 어느 게시판 글인지 알 수 없다.
          const reserved = post.tags?.includes(CLINICAL_TAG)
            ? { label: '임상정보', icon: Sparkles, color: 'text-teal-600 bg-teal-100' }
            : post.tags?.includes(SUGGESTION_TAG)
              ? { label: '건의사항', icon: Lightbulb, color: 'text-emerald-600 bg-emerald-100' }
              : null
          const config = reserved ?? postTypeConfig[post.type]
          const TypeIcon = config.icon

          return (
            <Link
              key={post.id}
              to={`/dashboard/community/post/${post.id}`}
              className="block surface-card rounded-2xl p-6 hover:shadow-lg hover:border-blue-200 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {post.isPinned && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded font-medium">
                        고정
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${config.color}`}>
                      <TypeIcon className="h-3 w-3 inline mr-1" />
                      {config.label}
                    </span>
                    {post.isSolved && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        해결됨
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {post.title}
                  </h3>

                  {/* Content Preview */}
                  <p className="mt-1 text-sm text-gray-500 line-clamp-1">{post.content}</p>

                  {/* Linked Case */}
                  {post.linkedCase && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                      <BookOpen className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-700">
                        케이스: {post.linkedCase.chiefComplaint} ({post.linkedCase.formulaName})
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        #{tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{post.tags.length - 3}</span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      {post.author.communityLevel && (
                        <LevelIndicator level={post.author.communityLevel} size="sm" />
                      )}
                      {post.author.isLicenseVerified && (
                        <Shield className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="font-medium text-gray-700">{post.author.name}</span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(post.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {post.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {post.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      {post.commentCount}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </div>
            </Link>
          )
        })}

        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-16 surface-card rounded-2xl">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">게시글이 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">첫 번째 글을 작성해보세요!</p>
            <button
              onClick={handleWriteClick}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              글쓰기
            </button>
          </div>
        )}

        {/* 페이지 이동
            서버가 meta.totalPages 를 주는데 화면이 안 쓰고 있었다. 전문
            포럼에 2천 편이 있어도 첫 20편에서 끝이었다. */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>

            {/* 현재 쪽 둘레만 보여준다. 100쪽이 넘어가면 번호를 다 그릴 수 없다. */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const half = 3
              let start = Math.max(page - half, 1)
              if (start + 6 > totalPages) start = Math.max(totalPages - 6, 1)
              return start + i
            })
              .filter((n) => n <= totalPages)
              .map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={
                    n === page
                      ? 'px-3 py-2 text-sm rounded-lg bg-gray-900 text-white font-semibold'
                      : 'px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }
                >
                  {n}
                </button>
              ))}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>

            <span className="ml-2 text-xs text-gray-400">
              {page} / {totalPages}쪽 · 전체 {total.toLocaleString()}편
            </span>
          </div>
        )}

      </div>
    </div>
  )
}
