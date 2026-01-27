import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Send,
  Image,
  Link as LinkIcon,
  BookOpen,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  Plus,
  Save,
  Trash2,
  LogIn,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/stores/authStore'
import type { PostType } from '../../types'

const DRAFT_STORAGE_KEY = 'hanmed_post_draft'

interface PostDraft {
  postType: PostType
  title: string
  content: string
  tags: string[]
  isAnonymous: boolean
  forumCategory: string
  linkedCaseId: string
  savedAt: string
}

const postTypeOptions = [
  { value: 'qna', label: 'Q&A', description: '질문하고 답변 받기', icon: HelpCircle },
  { value: 'case_discussion', label: '케이스 토론', description: '치험례 기반 토론', icon: BookOpen },
  { value: 'general', label: '종합 게시판', description: '자유로운 소통', icon: Eye },
  { value: 'forum', label: '전문 포럼', description: '분과별 전문 토론', icon: EyeOff },
]

const forumCategories = [
  { slug: 'herbology', name: '본초학' },
  { slug: 'shanghanlun', name: '상한론' },
  { slug: 'wenbing', name: '온병학' },
  { slug: 'constitution', name: '사상체질' },
  { slug: 'acupuncture', name: '침구학' },
  { slug: 'gynecology', name: '부인과' },
  { slug: 'pediatrics', name: '소아과' },
  { slug: 'internal', name: '내과' },
  { slug: 'neuropsychiatry', name: '신경정신과' },
]

// 로그인 필요 화면 컴포넌트
function LoginRequiredScreen({ isGuest }: { isGuest: boolean }) {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          로그인이 필요합니다
        </h2>
        <p className="text-gray-600 mb-6">
          커뮤니티에 글을 작성하려면 로그인해 주세요.
          {isGuest && (
            <span className="block text-sm text-gray-500 mt-2">
              현재 게스트 모드로 이용 중입니다.
            </span>
          )}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            돌아가기
          </button>
          <Link
            to="/login"
            state={{ from: '/dashboard/community/write' }}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2"
          >
            <LogIn className="h-5 w-5" />
            로그인하기
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          아직 계정이 없으신가요?{' '}
          <Link to="/register" className="text-teal-600 hover:underline font-medium">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function WritePostPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isGuest = useAuthStore((state) => state.isGuest)

  const [postType, setPostType] = useState<PostType>(
    (searchParams.get('type') as PostType) || 'qna'
  )
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [forumCategory, setForumCategory] = useState('')
  const [linkedCaseId, setLinkedCaseId] = useState(searchParams.get('caseId') || '')
  const [showCaseSearch, setShowCaseSearch] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // Load draft on mount
  useEffect(() => {
    // 인증되지 않은 사용자는 draft 로드하지 않음
    if (!isAuthenticated) return

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (savedDraft) {
        const draft: PostDraft = JSON.parse(savedDraft)
        // Only load draft if we don't have URL params overriding
        if (!searchParams.get('type') && !searchParams.get('caseId')) {
          setPostType(draft.postType)
          setTitle(draft.title)
          setContent(draft.content)
          setTags(draft.tags)
          setIsAnonymous(draft.isAnonymous)
          setForumCategory(draft.forumCategory)
          setLinkedCaseId(draft.linkedCaseId)
          setHasDraft(true)
          setLastSaved(draft.savedAt)
          toast({
            title: '임시저장 불러옴',
            description: `마지막 저장: ${new Date(draft.savedAt).toLocaleString('ko-KR')}`,
          })
        }
      }
    } catch (err) {
      console.error('Failed to load draft:', err)
    }
  }, [isAuthenticated, searchParams, toast])

  // Auto-save draft (debounced)
  const saveDraft = useCallback(() => {
    if (!title.trim() && !content.trim()) return

    try {
      const draft: PostDraft = {
        postType,
        title,
        content,
        tags,
        isAnonymous,
        forumCategory,
        linkedCaseId,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      setHasDraft(true)
      setLastSaved(draft.savedAt)
    } catch (err) {
      console.error('Failed to save draft:', err)
    }
  }, [postType, title, content, tags, isAnonymous, forumCategory, linkedCaseId])

  // Auto-save every 30 seconds if content changed
  useEffect(() => {
    if (!isAuthenticated) return
    if (!title.trim() && !content.trim()) return

    const timer = setTimeout(() => {
      saveDraft()
    }, 30000) // 30 seconds

    return () => clearTimeout(timer)
  }, [isAuthenticated, title, content, tags, saveDraft])

  // Manual save draft
  const handleSaveDraft = () => {
    saveDraft()
    toast({
      title: '임시저장 완료',
      description: '작성 중인 내용이 저장되었습니다.',
    })
  }

  // Clear draft
  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    setHasDraft(false)
    setLastSaved(null)
    setPostType('qna')
    setTitle('')
    setContent('')
    setTags([])
    setIsAnonymous(false)
    setForumCategory('')
    setLinkedCaseId('')
    toast({
      title: '임시저장 삭제',
      description: '저장된 내용이 삭제되었습니다.',
    })
  }

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 5 && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: '입력 오류',
        description: '제목과 내용을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // API 호출
      console.log('Submitting post:', {
        type: postType,
        title,
        content,
        tags,
        isAnonymous,
        categoryId: forumCategory || undefined,
        linkedCaseId: linkedCaseId || undefined,
      })

      // 성공 시 임시저장 삭제
      localStorage.removeItem(DRAFT_STORAGE_KEY)

      toast({
        title: '게시 완료',
        description: '글이 성공적으로 게시되었습니다.',
      })

      // 성공 시 커뮤니티 페이지로 이동
      setTimeout(() => {
        navigate('/dashboard/community')
      }, 500)
    } catch (error) {
      console.error('Failed to submit post:', error)
      toast({
        title: '게시 실패',
        description: '글 게시 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  // 로그인하지 않은 사용자 (게스트 포함)에게 안내 메시지 표시
  if (!isAuthenticated) {
    return <LoginRequiredScreen isGuest={isGuest} />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          취소
        </button>
        <div className="flex items-center gap-2">
          {/* Draft status */}
          {lastSaved && (
            <span className="text-xs text-gray-500 mr-2">
              마지막 저장: {new Date(lastSaved).toLocaleTimeString('ko-KR')}
            </span>
          )}
          {/* Clear draft button */}
          {hasDraft && (
            <button
              onClick={handleClearDraft}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="임시저장 삭제"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {/* Save draft button */}
          <button
            onClick={handleSaveDraft}
            disabled={!title.trim() && !content.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            임시저장
          </button>
          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            <Send className="h-5 w-5" />
            {isSubmitting ? '게시 중...' : '게시하기'}
          </button>
        </div>
      </div>

      {/* Post Type Selection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-medium text-gray-900 mb-4">게시판 선택</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {postTypeOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => setPostType(option.value as PostType)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  postType === option.value
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon
                  className={`h-6 w-6 mb-2 ${
                    postType === option.value ? 'text-teal-500' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`block font-medium ${
                    postType === option.value ? 'text-teal-700' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </span>
                <span className="text-xs text-gray-500">{option.description}</span>
              </button>
            )
          })}
        </div>

        {/* Forum Category */}
        {postType === 'forum' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">분과 선택</label>
            <select
              value={forumCategory}
              onChange={(e) => setForumCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
            >
              <option value="">분과를 선택하세요</option>
              {forumCategories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Case Link */}
        {postType === 'case_discussion' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              치험례 연결 (선택사항)
            </label>
            {linkedCaseId ? (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <BookOpen className="h-5 w-5 text-amber-600" />
                <span className="text-amber-700">케이스 ID: {linkedCaseId}</span>
                <button
                  onClick={() => setLinkedCaseId('')}
                  className="ml-auto text-amber-600 hover:text-amber-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCaseSearch(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <LinkIcon className="h-5 w-5" />
                치험례 검색하여 연결
              </button>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        {/* Title */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={200}
            className="w-full text-xl font-bold px-0 py-2 border-0 border-b-2 border-gray-200 focus:outline-none focus:border-teal-500 transition-colors placeholder:text-gray-400 placeholder:font-normal"
          />
          <div className="text-right text-sm text-gray-400 mt-1">{title.length}/200</div>
        </div>

        {/* Content */}
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요. 마크다운 문법을 지원합니다.

## 제목
- 목록 항목
**굵은 글씨**
"
            className="w-full min-h-[300px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all resize-none"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 py-2 border-t border-gray-100">
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Image className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <LinkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-medium text-gray-900 mb-4">태그 (최대 5개)</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full"
            >
              #{tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-teal-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
          {tags.length < 5 && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="태그 입력"
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-teal-500 text-sm"
              />
              <button
                onClick={handleAddTag}
                className="p-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">관련 키워드를 태그로 추가하면 검색에 도움이 됩니다.</p>
      </div>

      {/* Options */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-medium text-gray-900 mb-4">옵션</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-5 h-5 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
          />
          <div>
            <span className="font-medium text-gray-900 flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              익명으로 게시
            </span>
            <span className="text-sm text-gray-500 block">
              Pro 이상 구독자만 사용 가능합니다. 민감한 질문에 활용하세요.
            </span>
          </div>
        </label>
      </div>

      {/* Case Search Modal */}
      {showCaseSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">치험례 검색</h3>
              <button
                onClick={() => setShowCaseSearch(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                placeholder="증상, 처방명, 체질로 검색..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
              />
              <div className="mt-4 space-y-2">
                {/* 더미 검색 결과 */}
                {['LEE-1995-0001', 'LEE-1997-0342', 'LEE-2001-0128'].map((caseId) => (
                  <button
                    key={caseId}
                    onClick={() => {
                      setLinkedCaseId(caseId)
                      setShowCaseSearch(false)
                    }}
                    className="w-full p-4 bg-gray-50 hover:bg-amber-50 rounded-xl text-left transition-colors border border-gray-200 hover:border-amber-300"
                  >
                    <span className="font-medium text-gray-900">{caseId}</span>
                    <span className="text-sm text-gray-500 block">소화불량, 복부 냉증 - 이중탕</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
