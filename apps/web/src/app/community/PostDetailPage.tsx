import { useState } from 'react'
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
} from 'lucide-react'
import type { CommunityPost, CommunityComment } from '../../types'

// 더미 데이터
const dummyPost: CommunityPost = {
  id: '1',
  title: '이중탕 처방 시 복통이 심해지는 환자, 어떻게 대처하시나요?',
  content: `소음인 환자에게 이중탕을 처방했는데 오히려 복통이 심해졌다고 합니다.

## 환자 정보
- 45세 여성, 소음인
- 주소증: 소화불량, 복부 냉증
- 기존 증상: 식욕부진, 복부팽만, 수족냉증, 설사

## 처방 내용
이중탕(理中湯)
- 인삼 6g, 백출 9g, 건강 6g, 감초 3g

## 문제 상황
복용 시작 3일 후 복통이 심해졌다고 합니다.
건강 용량을 줄여볼까요, 아니면 다른 접근이 필요할까요?

경험 많으신 선생님들의 조언 부탁드립니다.`,
  type: 'qna',
  author: {
    id: '1',
    name: '김한의',
    isLicenseVerified: true,
    subscriptionTier: 'pro',
    contributionPoints: 234,
  },
  isAnonymous: false,
  viewCount: 156,
  likeCount: 12,
  commentCount: 8,
  bookmarkCount: 5,
  isPinned: false,
  isSolved: true,
  acceptedAnswerId: 'c2',
  tags: ['이중탕', '소음인', '복통'],
  status: 'active',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  authorId: '1',
}

const dummyComments: CommunityComment[] = [
  {
    id: 'c1',
    content: `좋은 질문이네요. 건강의 용량이 문제일 수 있습니다.

건강은 온열성이 강해서 환자의 체질과 현재 상태에 따라 반응이 다를 수 있습니다.

제 경험상 이런 경우:
1. 건강을 3g으로 줄이고
2. 백작약 6g을 추가하면

복통 완화에 도움이 됩니다.`,
    postId: '1',
    authorId: '2',
    author: {
      id: '2',
      name: '이전문',
      isLicenseVerified: true,
      subscriptionTier: 'master',
      contributionPoints: 1520,
      acceptedAnswerCount: 45,
      specialization: '상한론',
    },
    isAnonymous: false,
    likeCount: 8,
    isAcceptedAnswer: false,
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
  },
  {
    id: 'c2',
    content: `동의합니다. 추가로 고려해볼 점은:

**건강 대신 포강(炮薑) 사용**
- 포강은 건강보다 온열성이 완화되어 있어 위장에 부담이 적습니다.

**복진 재확인 필요**
- 복진상 심하 비경(心下痞硬)이 있다면 반하사심탕 계열로 전환도 고려해보세요.

실제로 비슷한 케이스에서 포강으로 교체 후 좋은 결과를 얻은 적이 있습니다.`,
    postId: '1',
    authorId: '3',
    author: {
      id: '3',
      name: '박경험',
      isLicenseVerified: true,
      subscriptionTier: 'master',
      contributionPoints: 980,
      acceptedAnswerCount: 32,
    },
    isAnonymous: false,
    likeCount: 15,
    isAcceptedAnswer: true,
    createdAt: '2024-01-15T11:30:00Z',
    updatedAt: '2024-01-15T11:30:00Z',
  },
  {
    id: 'c3',
    content: '저도 포강 사용에 동의합니다. 참고가 되었습니다!',
    postId: '1',
    authorId: '4',
    author: {
      id: '4',
      name: '최후배',
      isLicenseVerified: true,
      subscriptionTier: 'starter',
      contributionPoints: 45,
    },
    isAnonymous: false,
    parentId: 'c2',
    likeCount: 2,
    isAcceptedAnswer: false,
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
  },
]

export default function PostDetailPage() {
  const { id: _id } = useParams()
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSubmitComment = () => {
    if (!commentText.trim()) return
    // API 호출
    console.log('Comment submitted:', commentText, 'replyTo:', replyTo)
    setCommentText('')
    setReplyTo(null)
  }

  // 댓글을 계층 구조로 구성
  const topLevelComments = dummyComments.filter((c) => !c.parentId)
  const getReplies = (parentId: string) => dummyComments.filter((c) => c.parentId === parentId)

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
              Q&A
            </span>
            {dummyPost.isSolved && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                해결됨
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{dummyPost.title}</h1>

          {/* Author Info */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                {dummyPost.author.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{dummyPost.author.name}</span>
                  {dummyPost.author.isLicenseVerified && (
                    <Shield className="h-4 w-4 text-blue-500" />
                  )}
                  {dummyPost.author.subscriptionTier === 'master' && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">
                      MASTER
                    </span>
                  )}
                  {dummyPost.author.subscriptionTier === 'pro' && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                      PRO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatDate(dummyPost.createdAt)}
                  <span>·</span>
                  <span>기여도 {dummyPost.author.contributionPoints}점</span>
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
          <div className="prose prose-gray max-w-none">
            {dummyPost.content.split('\n').map((line, i) => {
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
              if (line.trim() === '') {
                return <br key={i} />
              }
              return (
                <p key={i} className="text-gray-700">
                  {line}
                </p>
              )
            })}
          </div>

          {/* Tags */}
          <div className="mt-6 flex flex-wrap gap-2">
            {dummyPost.tags.map((tag) => (
              <Link
                key={tag}
                to={`/community?tag=${tag}`}
                className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                isLiked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{dummyPost.likeCount + (isLiked ? 1 : 0)}</span>
            </button>
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                isBookmarked ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>북마크</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">
              <Share2 className="h-5 w-5" />
              <span>공유</span>
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {dummyPost.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {dummyPost.commentCount}
            </span>
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-teal-500" />
            댓글 {dummyPost.commentCount}
          </h2>
        </div>

        {/* Comment Form */}
        <div className="p-6 border-b border-gray-100">
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Reply className="h-4 w-4" />
              <span>답글 작성 중...</span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-red-500 hover:text-red-600"
              >
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
                placeholder="댓글을 입력하세요..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all resize-none"
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                  댓글 작성
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="divide-y divide-gray-100">
          {topLevelComments.map((comment) => (
            <div key={comment.id} className="p-6">
              {/* Comment */}
              <div className={`${comment.isAcceptedAnswer ? 'bg-green-50 -m-4 p-4 rounded-xl border border-green-200' : ''}`}>
                {comment.isAcceptedAnswer && (
                  <div className="flex items-center gap-2 mb-3 text-green-600">
                    <Award className="h-5 w-5" />
                    <span className="font-medium">채택된 답변</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {comment.author.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{comment.author.name}</span>
                      {comment.author.isLicenseVerified && (
                        <Shield className="h-4 w-4 text-blue-500" />
                      )}
                      {comment.author.subscriptionTier === 'master' && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">
                          MASTER
                        </span>
                      )}
                      {comment.author.specialization && (
                        <span className="text-xs text-gray-500">· {comment.author.specialization} 전문</span>
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
                      <button className="flex items-center gap-1 text-gray-500 hover:text-teal-600 transition-colors">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{comment.likeCount}</span>
                      </button>
                      <button
                        onClick={() => setReplyTo(comment.id)}
                        className="flex items-center gap-1 text-gray-500 hover:text-teal-600 transition-colors"
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
              {getReplies(comment.id).map((reply) => (
                <div key={reply.id} className="mt-4 ml-12 pl-4 border-l-2 border-gray-200">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {reply.author.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{reply.author.name}</span>
                        {reply.author.isLicenseVerified && (
                          <Shield className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      <p className="text-gray-700">{reply.content}</p>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-gray-500">{formatDate(reply.createdAt)}</span>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-teal-600 transition-colors">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{reply.likeCount}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
