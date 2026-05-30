import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreVertical,
  Shield,
  CheckCircle,
  Flag,
  Send,
  ThumbsUp,
  Reply,
  Clock,
  Award,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { CommunityPost, CommunityComment } from '../../types'
import { LevelIndicator } from '@/components/community/LevelBadge'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/stores/authStore'

const POST_TYPE_LABELS: Record<string, string> = {
  qna: 'Q&A',
  case_discussion: '케이스 토론',
  general: '종합 게시판',
  forum: '전문 포럼',
}

export default function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [post, setPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadPost = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [postRes, commentsRes] = await Promise.all([
        api.get<CommunityPost>(`/community/posts/${id}`),
        api.get<CommunityComment[]>(`/community/posts/${id}/comments`),
      ])
      setPost(postRes.data)
      setComments(Array.isArray(commentsRes.data) ? commentsRes.data : [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadPost()
  }, [loadPost])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id) return
    if (!isAuthenticated) {
      toast({
        title: '로그인이 필요합니다',
        description: '댓글을 작성하려면 로그인해 주세요.',
        variant: 'destructive',
      })
      return
    }
    setIsSubmitting(true)
    try {
      await api.post(`/community/posts/${id}/comments`, {
        content: commentText.trim(),
        ...(replyTo ? { parentId: replyTo } : {}),
      })
      setCommentText('')
      setReplyTo(null)
      await loadPost()
      toast({ title: '댓글이 등록되었습니다.' })
    } catch (err) {
      toast({
        title: '댓글 등록 실패',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleLike = async () => {
    if (!id || !isAuthenticated) return
    try {
      const { data } = await api.post<{ liked: boolean }>(`/community/posts/${id}/like`)
      setIsLiked(data.liked)
      setPost((p) =>
        p ? { ...p, likeCount: p.likeCount + (data.liked ? 1 : -1) } : p,
      )
    } catch (err) {
      toast({ title: '오류', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleToggleBookmark = async () => {
    if (!id || !isAuthenticated) return
    try {
      const { data } = await api.post<{ bookmarked: boolean }>(`/community/posts/${id}/bookmark`)
      setIsBookmarked(data.bookmarked)
    } catch (err) {
      toast({ title: '오류', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: '링크가 복사되었습니다.' })
    } catch {
      toast({ title: '링크 복사에 실패했습니다.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        게시글을 불러오는 중...
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">게시글을 불러올 수 없습니다</h2>
          <p className="text-gray-600 mb-6">{error || '게시글을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/dashboard/community')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            커뮤니티로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const renderContent = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return (
          <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">
            {line.replace('## ', '')}
          </h2>
        )
      }
      if (line.startsWith('- ')) {
        return (
          <li key={i} className="text-gray-700">
            {line.replace('- ', '')}
          </li>
        )
      }
      if (line.trim() === '') return <br key={i} />
      return (
        <p key={i} className="text-gray-700">
          {line}
        </p>
      )
    })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        목록으로
      </button>

      {/* Post Content */}
      <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">
              {POST_TYPE_LABELS[post.type] || post.type}
            </span>
            {post.isSolved && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                해결됨
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>

          {/* Author Info */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {post.author?.name?.[0] || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{post.author?.name || '익명'}</span>
                  {post.author?.isLicenseVerified && <Shield className="h-4 w-4 text-blue-500" />}
                  {post.author?.communityLevel && (
                    <LevelIndicator level={post.author.communityLevel} size="sm" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatDate(post.createdAt)}
                  {typeof post.author?.contributionPoints === 'number' && (
                    <>
                      <span>·</span>
                      <span>기여도 {post.author.contributionPoints}점</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="prose prose-gray max-w-none">{renderContent(post.content)}</div>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/dashboard/community?tag=${tag}`}
                  className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                isLiked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{post.likeCount}</span>
            </button>
            <button
              onClick={handleToggleBookmark}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                isBookmarked ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>북마크</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <Share2 className="h-5 w-5" />
              <span>공유</span>
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {post.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.commentCount}
            </span>
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            댓글 {post.commentCount}
          </h2>
        </div>

        {/* Comment Form */}
        <div className="p-6 border-b border-gray-100">
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Reply className="h-4 w-4" />
              <span>답글 작성 중...</span>
              <button onClick={() => setReplyTo(null)} className="text-red-500 hover:text-red-600">
                취소
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              나
            </div>
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isAuthenticated ? '댓글을 입력하세요...' : '로그인 후 댓글을 작성할 수 있습니다.'}
                disabled={!isAuthenticated}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none disabled:opacity-60"
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmitting || !isAuthenticated}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  댓글 작성
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {comments.map((comment) => (
              <div key={comment.id} className="p-6">
                {/* Comment */}
                <div
                  className={`${
                    comment.isAcceptedAnswer
                      ? 'bg-green-50 -m-4 p-4 rounded-xl border border-green-200'
                      : ''
                  }`}
                >
                  {comment.isAcceptedAnswer && (
                    <div className="flex items-center gap-2 mb-3 text-green-600">
                      <Award className="h-5 w-5" />
                      <span className="font-medium">채택된 답변</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {comment.author?.name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {comment.author?.name || '익명'}
                        </span>
                        {comment.author?.isLicenseVerified && (
                          <Shield className="h-4 w-4 text-blue-500" />
                        )}
                        {comment.author?.communityLevel && (
                          <LevelIndicator level={comment.author.communityLevel} size="sm" />
                        )}
                        {comment.author?.specialization && (
                          <span className="text-xs text-gray-500">
                            · {comment.author.specialization} 전문
                          </span>
                        )}
                      </div>

                      <div className="text-gray-700 whitespace-pre-line">
                        {comment.content.split('\n').map((line, i) => {
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return (
                              <p key={i} className="font-bold mt-2">
                                {line.replace(/\*\*/g, '')}
                              </p>
                            )
                          }
                          if (line.startsWith('- ')) {
                            return (
                              <li key={i} className="ml-4 list-disc">
                                {line.replace('- ', '')}
                              </li>
                            )
                          }
                          return <p key={i}>{line}</p>
                        })}
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-gray-500">{formatDate(comment.createdAt)}</span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{comment.likeCount}</span>
                        </span>
                        <button
                          onClick={() => setReplyTo(comment.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          <Reply className="h-4 w-4" />
                          <span>답글</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
                          <Flag className="h-4 w-4" />
                          <span>신고</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies?.map((reply) => (
                  <div key={reply.id} className="mt-4 ml-12 pl-4 border-l-2 border-gray-200">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {reply.author?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {reply.author?.name || '익명'}
                          </span>
                          {reply.author?.isLicenseVerified && (
                            <Shield className="h-3 w-3 text-blue-500" />
                          )}
                        </div>
                        <p className="text-gray-700">{reply.content}</p>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="text-gray-500">{formatDate(reply.createdAt)}</span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{reply.likeCount}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
