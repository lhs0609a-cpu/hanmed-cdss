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

  // 현재 라우트가 "내 글"/"내 북마크" 인지 판별
  const viewMode: 'all' | 'mine' | 'bookmarks' = location.pathname.includes('/community/my/bookmarks')
    ? 'bookmarks'
    : location.pathname.includes('/community/my/posts')
      ? 'mine'
      : 'all'

  // API 상태
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)

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
          if (sortBy) params.sortBy = sortBy
          if (viewMode === 'mine' && user?.id) params.authorId = user.id
        }

        const response = await api.get(endpoint, { params })
        const apiPosts = response.data?.data || response.data || []
        setPosts(Array.isArray(apiPosts) ? apiPosts : [])
      } catch (err) {
        setError(getErrorMessage(err))
        setPosts([])
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [selectedType, sortBy, token, viewMode, user?.id])

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

  // 글쓰기 버튼 클릭 핸들러 - 로그인 여부 확인
  const handleWriteClick = () => {
    if (!isAuthenticated && isGuest) {
      toast({
        title: '로그인이 필요합니다',
        description: '글을 작성하려면 로그인해 주세요.',
        variant: 'destructive',
      })
      navigate('/login', { state: { from: '/dashboard/community/write' } })
      return
    }
    if (!isAuthenticated) {
      toast({
        title: '로그인이 필요합니다',
        description: '글을 작성하려면 로그인해 주세요.',
        variant: 'destructive',
      })
      navigate('/login', { state: { from: '/dashboard/community/write' } })
      return
    }
    navigate('/dashboard/community/write')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">
            커뮤니티
          </h1>
          <p className="mt-1 text-[14px] text-neutral-500">
            한의사들과 사례·지식을 공유합니다.
          </p>
        </div>
        <button
          onClick={handleWriteClick}
          className="inline-flex items-center gap-2 h-11 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-[14px] font-semibold rounded-md transition-colors active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          글쓰기
        </button>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link
          to="/dashboard/community/cases"
          className="surface-card rounded-2xl p-4 hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <BookOpen className="h-6 w-6 text-amber-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-amber-600">케이스 토론</span>
          <p className="text-xs text-gray-500 mt-1">치험례 기반 토론</p>
        </Link>
        <Link
          to="/dashboard/community/qna"
          className="surface-card rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <HelpCircle className="h-6 w-6 text-blue-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-blue-600">Q&A</span>
          <p className="text-xs text-gray-500 mt-1">질문 & 답변</p>
        </Link>
        <Link
          to="/dashboard/community/general"
          className="surface-card rounded-2xl p-4 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <MessageSquare className="h-6 w-6 text-gray-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-gray-600">종합 게시판</span>
          <p className="text-xs text-gray-500 mt-1">자유로운 소통</p>
        </Link>
        <Link
          to="/dashboard/community/forum"
          className="surface-card rounded-2xl p-4 hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <Users className="h-6 w-6 text-purple-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-purple-600">전문 포럼</span>
          <p className="text-xs text-gray-500 mt-1">분과별 토론</p>
        </Link>
        <Link
          to="/dashboard/community/my/bookmarks"
          className="surface-card rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <Bookmark className="h-6 w-6 text-blue-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-blue-600">북마크</span>
          <p className="text-xs text-gray-500 mt-1">저장한 글</p>
        </Link>
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
          const config = postTypeConfig[post.type]
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
      </div>
    </div>
  )
}
