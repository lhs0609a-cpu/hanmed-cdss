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
import type { CommunityLevel } from '@/types/level'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

// 더미 게시글 데이터
const dummyPosts: CommunityPost[] = [
  {
    id: '1',
    title: '이중탕 처방 시 복통이 심해지는 환자, 어떻게 대처하시나요?',
    content: '소음인 환자에게 이중탕을 처방했는데 오히려 복통이 심해졌다고 합니다. 건강 용량을 줄여볼까요?',
    type: 'qna',
    author: {
      id: '1',
      name: '김한의',
      isLicenseVerified: true,
      subscriptionTier: 'professional',
      contributionPoints: 234,
      communityLevel: 'good_answerer' as CommunityLevel,
    },
    isAnonymous: false,
    viewCount: 156,
    likeCount: 12,
    commentCount: 8,
    bookmarkCount: 5,
    isPinned: false,
    isSolved: true,
    tags: ['이중탕', '소음인', '복통'],
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    authorId: '1',
  },
  {
    id: '2',
    title: '[케이스 토론] 만성 피로 환자 보중익기탕 처방 경험',
    content: '52세 여성 환자, 장기간 과로로 인한 만성 피로. 보중익기탕 8주 처방 후 80% 호전...',
    type: 'case_discussion',
    linkedCase: {
      id: 'LEE-2001-0128',
      chiefComplaint: '만성 피로, 기력 저하',
      constitution: '태음인',
      formulaName: '보중익기탕',
    },
    author: {
      id: '2',
      name: '이전문',
      isLicenseVerified: true,
      subscriptionTier: 'clinic',
      contributionPoints: 1520,
      acceptedAnswerCount: 45,
      communityLevel: 'expert' as CommunityLevel,
    },
    isAnonymous: false,
    viewCount: 324,
    likeCount: 28,
    commentCount: 15,
    bookmarkCount: 22,
    isPinned: true,
    isSolved: false,
    tags: ['보중익기탕', '만성피로', '태음인'],
    status: 'active',
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T09:00:00Z',
    authorId: '2',
  },
  {
    id: '3',
    title: '반하사심탕 vs 반하백출천마탕, 현훈 치료 시 선택 기준이 궁금합니다',
    content: '두 처방 모두 현훈에 사용되는데, 어떤 기준으로 선택하시나요?',
    type: 'qna',
    author: {
      id: '3',
      name: '익명의 한의사 #A3F2',
      isLicenseVerified: false,
      communityLevel: 'member' as CommunityLevel,
    },
    isAnonymous: true,
    anonymousNickname: '익명의 한의사 #A3F2',
    viewCount: 89,
    likeCount: 5,
    commentCount: 6,
    bookmarkCount: 3,
    isPinned: false,
    isSolved: false,
    tags: ['반하사심탕', '반하백출천마탕', '현훈'],
    status: 'active',
    createdAt: '2024-01-13T14:20:00Z',
    updatedAt: '2024-01-13T14:20:00Z',
    authorId: '3',
  },
  {
    id: '4',
    title: '본초학 세미나 후기 - 약재 감별의 중요성',
    content: '지난 주 한의학회 본초학 세미나에 다녀왔습니다. 특히 진품과 위품 감별 부분이 유익했습니다.',
    type: 'forum',
    category: {
      id: 'herbology',
      name: '본초학',
      slug: 'herbology',
      postType: 'forum',
      sortOrder: 1,
      requiredTier: 'free',
    },
    author: {
      id: '4',
      name: '박약재',
      isLicenseVerified: true,
      subscriptionTier: 'professional',
      contributionPoints: 567,
      specialization: '본초학',
      communityLevel: 'good_answerer' as CommunityLevel,
    },
    isAnonymous: false,
    viewCount: 201,
    likeCount: 18,
    commentCount: 4,
    bookmarkCount: 8,
    isPinned: false,
    isSolved: false,
    tags: ['본초학', '세미나', '약재감별'],
    status: 'active',
    createdAt: '2024-01-12T16:45:00Z',
    updatedAt: '2024-01-12T16:45:00Z',
    authorId: '4',
  },
  {
    id: '5',
    title: '개원 3년차, 환자 관리 시스템 어떻게 운영하시나요?',
    content: '전자차트 외에 환자 관리에 도움되는 팁이 있으시면 공유해주세요.',
    type: 'general',
    author: {
      id: '5',
      name: '최개원',
      isLicenseVerified: true,
      subscriptionTier: 'free',
      contributionPoints: 45,
      communityLevel: 'intern' as CommunityLevel,
    },
    isAnonymous: false,
    viewCount: 178,
    likeCount: 9,
    commentCount: 12,
    bookmarkCount: 6,
    isPinned: false,
    isSolved: false,
    tags: ['개원', '환자관리', '운영팁'],
    status: 'active',
    createdAt: '2024-01-11T11:00:00Z',
    updatedAt: '2024-01-11T11:00:00Z',
    authorId: '5',
  },
]

const postTypeConfig = {
  case_discussion: { label: '케이스 토론', icon: BookOpen, color: 'text-amber-600 bg-amber-100' },
  qna: { label: 'Q&A', icon: HelpCircle, color: 'text-blue-600 bg-blue-100' },
  general: { label: '종합', icon: MessageSquare, color: 'text-gray-600 bg-gray-100' },
  forum: { label: '포럼', icon: Users, color: 'text-purple-600 bg-purple-100' },
}

export default function CommunityPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((state) => state.accessToken)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<PostType | ''>('')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'comments'>('latest')

  // API 상태
  const [posts, setPosts] = useState<CommunityPost[]>(dummyPosts)
  const [loading, setLoading] = useState(false)
  const [_error, setError] = useState<string | null>(null)
  const [usingDummyData, setUsingDummyData] = useState(true)

  // API에서 게시글 가져오기
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      setError(null)

      try {
        const params: Record<string, string> = {}
        if (selectedType) params.type = selectedType
        if (sortBy) params.sort = sortBy

        const response = await api.get('/community/posts', { params })
        const apiPosts = response.data?.data || response.data || []

        if (Array.isArray(apiPosts) && apiPosts.length > 0) {
          setPosts(apiPosts)
          setUsingDummyData(false)
        } else {
          // API가 빈 배열 반환 시 더미 데이터 사용
          setPosts(dummyPosts)
          setUsingDummyData(true)
        }
      } catch (err) {
        // API 실패 시 더미 데이터로 폴백
        console.warn('Community API not available, using dummy data:', err)
        setPosts(dummyPosts)
        setUsingDummyData(true)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [selectedType, sortBy, token])

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
    } else if (path === '/community' || path === '/community/') {
      setSelectedType('')
    }
  }, [location.pathname])

  const filteredPosts = useMemo(() => {
    let filtered = posts.filter((post) => {
      const matchesSearch =
        !searchQuery ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) => tag.includes(searchQuery))
      // API에서 이미 타입으로 필터링되므로 더미 데이터 사용 시에만 필터
      const matchesType = !usingDummyData || !selectedType || post.type === selectedType
      return matchesSearch && matchesType
    })

    // 정렬 (더미 데이터 사용 시에만 클라이언트 정렬)
    if (usingDummyData) {
      switch (sortBy) {
        case 'popular':
          filtered = filtered.sort((a, b) => b.likeCount - a.likeCount)
          break
        case 'comments':
          filtered = filtered.sort((a, b) => b.commentCount - a.commentCount)
          break
        default:
          filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    }

    // 고정 게시글 우선
    return filtered.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  }, [posts, searchQuery, selectedType, sortBy, usingDummyData])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-teal-500" />
            커뮤니티
          </h1>
          <p className="mt-1 text-gray-600">한의사/한약사 전문가들과 함께 지식을 나누세요</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/community/write')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <Plus className="h-5 w-5" />
          글쓰기
        </button>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link
          to="/dashboard/community/cases"
          className="p-4 bg-white rounded-xl border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <BookOpen className="h-6 w-6 text-amber-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-amber-600">케이스 토론</span>
          <p className="text-xs text-gray-500 mt-1">치험례 기반 토론</p>
        </Link>
        <Link
          to="/dashboard/community/qna"
          className="p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <HelpCircle className="h-6 w-6 text-blue-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-blue-600">Q&A</span>
          <p className="text-xs text-gray-500 mt-1">질문 & 답변</p>
        </Link>
        <Link
          to="/dashboard/community/general"
          className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <MessageSquare className="h-6 w-6 text-gray-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-gray-600">종합 게시판</span>
          <p className="text-xs text-gray-500 mt-1">자유로운 소통</p>
        </Link>
        <Link
          to="/dashboard/community/forum"
          className="p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <Users className="h-6 w-6 text-purple-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-purple-600">전문 포럼</span>
          <p className="text-xs text-gray-500 mt-1">분과별 토론</p>
        </Link>
        <Link
          to="/dashboard/community/my/bookmarks"
          className="p-4 bg-white rounded-xl border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all group"
        >
          <Bookmark className="h-6 w-6 text-teal-500 mb-2" />
          <span className="font-medium text-gray-900 group-hover:text-teal-600">북마크</span>
          <p className="text-xs text-gray-500 mt-1">저장한 글</p>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 내용, 태그로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as PostType | '')}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
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
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
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
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="h-12 w-12 text-teal-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">게시글을 불러오는 중...</p>
          </div>
        )}

        {/* 더미 데이터 사용 안내 */}
        {!loading && usingDummyData && (
          <div className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
            현재 샘플 데이터를 표시하고 있습니다. 실제 게시글은 API 연동 후 표시됩니다.
          </div>
        )}

        {!loading && filteredPosts.map((post) => {
          const config = postTypeConfig[post.type]
          const TypeIcon = config.icon

          return (
            <Link
              key={post.id}
              to={`/community/post/${post.id}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:border-teal-200 transition-all group"
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
                  <h3 className="font-bold text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-1">
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

                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-teal-500 transition-colors flex-shrink-0" />
              </div>
            </Link>
          )
        })}

        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">게시글이 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">첫 번째 글을 작성해보세요!</p>
            <button
              onClick={() => navigate('/dashboard/community/write')}
              className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              글쓰기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
