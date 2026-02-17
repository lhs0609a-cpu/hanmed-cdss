import { Component, ReactNode, useState } from 'react'
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  CheckCircle,
  WifiOff,
  Clock,
  ShieldAlert,
  Bug,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { captureError } from '@/lib/sentry'
import api from '@/services/api'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

// 에러 카테고리
type ErrorCategory = 'network' | 'auth' | 'timeout' | 'validation' | 'unknown'

// 에러 카테고리 분류
function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase()

  if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
    return 'network'
  }
  if (message.includes('401') || message.includes('unauthorized') || message.includes('auth')) {
    return 'auth'
  }
  if (message.includes('timeout') || message.includes('aborted')) {
    return 'timeout'
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return 'validation'
  }
  return 'unknown'
}

// 카테고리별 정보
const CATEGORY_INFO: Record<
  ErrorCategory,
  { icon: typeof AlertTriangle; title: string; description: string; color: string }
> = {
  network: {
    icon: WifiOff,
    title: '네트워크 연결 문제',
    description: '인터넷 연결을 확인해주세요. WiFi 또는 모바일 데이터가 활성화되어 있는지 확인하세요.',
    color: 'text-orange-600 bg-orange-100',
  },
  auth: {
    icon: ShieldAlert,
    title: '인증 오류',
    description: '로그인 세션이 만료되었거나 접근 권한이 없습니다. 다시 로그인해주세요.',
    color: 'text-purple-600 bg-purple-100',
  },
  timeout: {
    icon: Clock,
    title: '요청 시간 초과',
    description: '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
    color: 'text-yellow-600 bg-yellow-100',
  },
  validation: {
    icon: AlertTriangle,
    title: '데이터 오류',
    description: '입력 데이터에 문제가 있습니다. 입력 내용을 확인해주세요.',
    color: 'text-blue-600 bg-blue-100',
  },
  unknown: {
    icon: Bug,
    title: '예기치 않은 오류',
    description: '알 수 없는 오류가 발생했습니다. 문제가 지속되면 고객센터에 문의해주세요.',
    color: 'text-red-600 bg-red-100',
  },
}

/**
 * 에러 바운더리 컴포넌트
 *
 * React 컴포넌트 트리에서 발생하는 JavaScript 에러를 캐치하고
 * Sentry로 전송합니다.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })

    // Sentry로 에러 전송
    captureError(error, {
      componentStack: errorInfo.componentStack,
    })

    // 콘솔에도 로깅
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <EnhancedErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

// 향상된 에러 표시 컴포넌트
function EnhancedErrorDisplay({
  error,
  errorInfo,
  onRetry,
  isFullPage = false,
}: {
  error: Error | null
  errorInfo: React.ErrorInfo | null
  onRetry: () => void
  isFullPage?: boolean
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [copied, setCopied] = useState(false)

  const category = error ? categorizeError(error) : 'unknown'
  const categoryInfo = CATEGORY_INFO[category]
  const Icon = categoryInfo.icon

  // 피드백 전송
  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return

    setFeedbackSending(true)
    try {
      await api.post('/feedback/error-report', {
        errorMessage: error?.message,
        errorStack: error?.stack,
        componentStack: errorInfo?.componentStack,
        userFeedback: feedbackText,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      })
      setFeedbackSent(true)
    } catch {
      // 전송 실패해도 무시
    } finally {
      setFeedbackSending(false)
    }
  }

  // 에러 정보 복사
  const handleCopyError = () => {
    const errorText = `
Error: ${error?.message}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
Stack: ${error?.stack || 'N/A'}
    `.trim()

    navigator.clipboard.writeText(errorText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center p-8',
        isFullPage ? 'min-h-screen bg-gray-50' : 'min-h-[400px]'
      )}
    >
      <div className={cn('text-center', isFullPage ? 'max-w-lg' : 'max-w-md')}>
        {/* 아이콘 */}
        <div
          className={cn(
            'mx-auto rounded-full flex items-center justify-center mb-4',
            isFullPage ? 'w-20 h-20 mb-6' : 'w-16 h-16',
            categoryInfo.color
          )}
        >
          <Icon className={cn(isFullPage ? 'w-10 h-10' : 'w-8 h-8')} />
        </div>

        {/* 제목 */}
        <h2 className={cn('font-semibold text-gray-900 mb-2', isFullPage ? 'text-2xl' : 'text-xl')}>
          {categoryInfo.title}
        </h2>

        {/* 설명 */}
        <p className="text-gray-600 mb-6">{categoryInfo.description}</p>

        {/* 액션 버튼 */}
        <div className="flex gap-3 justify-center mb-6">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>

          {category === 'auth' && (
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              로그인
            </a>
          )}

          {isFullPage && (
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              이전 페이지
            </button>
          )}
        </div>

        {/* 에러 상세 정보 (개발 모드 또는 펼침 시) */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDetails ? '상세 정보 숨기기' : '상세 정보 보기'}
          </button>

          {showDetails && (
            <div className="mt-4 text-left">
              {/* 에러 메시지 */}
              <div className="p-3 bg-gray-100 rounded-lg mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">에러 메시지</span>
                  <button
                    onClick={handleCopyError}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        복사
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm font-mono text-red-600 break-all">{error?.message}</p>
              </div>

              {/* 사용자 피드백 */}
              {!feedbackSent ? (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      무엇을 하려고 했나요?
                    </span>
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="오류 발생 당시 상황을 알려주시면 문제 해결에 도움이 됩니다."
                    className="w-full p-2 text-sm border border-blue-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                    rows={3}
                  />
                  <button
                    onClick={handleSendFeedback}
                    disabled={!feedbackText.trim() || feedbackSending}
                    className={cn(
                      'mt-2 flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                      feedbackText.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    <Send className="w-3 h-3" />
                    {feedbackSending ? '전송 중...' : '피드백 전송'}
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">피드백 감사합니다!</span>
                  </div>
                  <p className="mt-1 text-xs text-green-600">
                    문제 해결을 위해 검토하겠습니다.
                  </p>
                </div>
              )}

              {/* 도움말 링크 */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                <a
                  href="mailto:support@ongojisin.ai"
                  className="flex items-center gap-1 hover:text-teal-600"
                >
                  <ExternalLink className="w-3 h-3" />
                  고객센터 문의
                </a>
                <a
                  href="https://ongojisin.co.kr/help"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-teal-600"
                >
                  <ExternalLink className="w-3 h-3" />
                  도움말 센터
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 페이지 레벨 에러 바운더리
 * 전체 페이지를 감싸는 용도로 사용
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <PageErrorFallback />
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// 페이지 레벨 에러 폴백 컴포넌트
function PageErrorFallback() {
  const [showDetails, setShowDetails] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center max-w-lg">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">페이지 로드 중 오류 발생</h1>
        <p className="text-gray-600 mb-6">
          페이지를 불러오는 중 문제가 발생했습니다.
          <br />
          잠시 후 다시 시도해 주세요.
        </p>
        <div className="flex gap-3 justify-center mb-6">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            새로고침
          </button>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            이전 페이지
          </button>
        </div>

        {/* 피드백 섹션 */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-gray-700"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            문제 신고하기
          </button>

          {showDetails && !feedbackSent && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl text-left">
              <p className="text-sm text-blue-900 mb-2">무슨 일이 있었나요?</p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="오류 발생 상황을 알려주세요..."
                className="w-full p-3 border border-blue-200 rounded-lg text-sm resize-none"
                rows={3}
              />
              <button
                onClick={async () => {
                  if (!feedbackText.trim()) return
                  try {
                    await api.post('/feedback/error-report', {
                      userFeedback: feedbackText,
                      url: window.location.href,
                      timestamp: new Date().toISOString(),
                    })
                  } catch {
                    // 무시
                  }
                  setFeedbackSent(true)
                }}
                className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                전송
              </button>
            </div>
          )}

          {feedbackSent && (
            <div className="mt-4 p-4 bg-green-50 rounded-xl">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">감사합니다!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary
