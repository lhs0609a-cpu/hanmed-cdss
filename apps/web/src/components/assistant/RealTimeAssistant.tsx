import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Minimize2,
  MessageSquare,
} from 'lucide-react'

// AI Engine URL
const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL || 'http://3.36.106.82:8080'

interface Suggestion {
  id: string
  type: 'formula' | 'symptom' | 'warning' | 'tip' | 'case'
  title: string
  description: string
  confidence?: number
  link?: string
}

interface RealTimeAssistantProps {
  // 현재 입력된 주소증/증상
  chiefComplaint?: string
  symptoms?: string[]
  constitution?: string
  // 어시스턴트 활성화 여부
  enabled?: boolean
}

export function RealTimeAssistant({
  chiefComplaint = '',
  symptoms = [],
  constitution = '',
  enabled = true,
}: RealTimeAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'suggestions' | 'tips'>('suggestions')
  const debounceRef = useRef<NodeJS.Timeout>()

  // 입력이 변경될 때 제안 업데이트 (debounced)
  useEffect(() => {
    if (!enabled) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const query = [chiefComplaint, ...symptoms].filter(Boolean).join(' ')
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query)
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [chiefComplaint, symptoms, constitution, enabled])

  const fetchSuggestions = async (query: string) => {
    setIsLoading(true)
    try {
      // 치험례 검색으로 관련 처방 추천
      const response = await fetch(`${AI_ENGINE_URL}/api/v1/cases/list?search=${encodeURIComponent(query)}&limit=5`)

      if (response.ok) {
        const data = await response.json()
        const cases = data.data?.cases || data.cases || []

        // 관련 처방 추출 및 그룹화
        const formulaCounts: Record<string, { count: number; cases: unknown[] }> = {}

        for (const caseItem of cases) {
          const formulaName = caseItem.formula_name || caseItem.treatment_formula
          if (formulaName) {
            if (!formulaCounts[formulaName]) {
              formulaCounts[formulaName] = { count: 0, cases: [] }
            }
            formulaCounts[formulaName].count++
            formulaCounts[formulaName].cases.push(caseItem)
          }
        }

        // 제안 생성
        const newSuggestions: Suggestion[] = []

        // 처방 제안
        const topFormulas = Object.entries(formulaCounts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3)

        for (const [formulaName, data] of topFormulas) {
          newSuggestions.push({
            id: `formula-${formulaName}`,
            type: 'formula',
            title: formulaName,
            description: `${data.count}건의 유사 치험례에서 사용`,
            confidence: Math.min(95, 60 + data.count * 10),
            link: `/formulas?search=${encodeURIComponent(formulaName)}`,
          })
        }

        // 관련 치험례 제안
        if (cases.length > 0) {
          newSuggestions.push({
            id: 'cases',
            type: 'case',
            title: `${cases.length}건의 유사 치험례`,
            description: '비슷한 증상의 치험례를 확인하세요',
            link: `/cases?search=${encodeURIComponent(query)}`,
          })
        }

        // 증상 기반 팁
        if (query.includes('두통') || query.includes('어지러움')) {
          newSuggestions.push({
            id: 'tip-headache',
            type: 'tip',
            title: '두통 감별진단',
            description: '외감두통/내상두통/어혈두통 구분 필요',
          })
        }

        if (query.includes('소화') || query.includes('더부룩') || query.includes('복통')) {
          newSuggestions.push({
            id: 'tip-digestion',
            type: 'tip',
            title: '소화불량 변증 팁',
            description: '비위허한/담음정체/간기범위 감별 고려',
          })
        }

        if (query.includes('피로') || query.includes('권태')) {
          newSuggestions.push({
            id: 'tip-fatigue',
            type: 'tip',
            title: '피로 원인 감별',
            description: '기허/혈허/양허/음허 중 주원인 파악',
          })
        }

        // 경고 (특정 키워드)
        if (query.includes('흉통') || query.includes('호흡곤란')) {
          newSuggestions.unshift({
            id: 'warning-chest',
            type: 'warning',
            title: '주의: 응급 증상 확인 필요',
            description: '흉통/호흡곤란은 심혈관계 응급 감별 우선',
          })
        }

        setSuggestions(newSuggestions)
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      // 오프라인 제안
      setSuggestions([
        {
          id: 'offline-tip',
          type: 'tip',
          title: '오프라인 모드',
          description: 'AI 서버 연결 확인 필요',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // 진료 팁 데이터
  const generalTips = [
    { title: '사진(四診)', description: '망문문절의 체계적 접근' },
    { title: '팔강변증', description: '음양/표리/한열/허실 판단' },
    { title: '체질 고려', description: '사상체질별 약물 반응 차이' },
    { title: '복약 지도', description: '복용법/식이/생활 지도 중요' },
  ]

  if (!enabled || isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40"
        title="AI 어시스턴트 열기"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-40">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">AI 어시스턴트</span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-white" />
            ) : (
              <ChevronUp className="h-4 w-4 text-white" />
            )}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <Minimize2 className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'suggestions'
                  ? 'text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              실시간 제안
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'tips'
                  ? 'text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              진료 팁
            </button>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {activeTab === 'suggestions' ? (
              <div className="p-3 space-y-2">
                {suggestions.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">증상을 입력하면 실시간으로</p>
                    <p className="text-sm">처방을 추천해드립니다</p>
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                  ))
                )}
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {generalTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-100"
                  >
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 text-sm">{tip.title}</p>
                        <p className="text-xs text-amber-600 mt-0.5">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400 text-center">
              ?를 눌러 단축키 도움말 보기
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const typeConfig = {
    formula: {
      icon: BookOpen,
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-700',
    },
    case: {
      icon: BookOpen,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      iconColor: 'text-emerald-500',
      titleColor: 'text-emerald-700',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-red-50',
      border: 'border-red-100',
      iconColor: 'text-red-500',
      titleColor: 'text-red-700',
    },
    tip: {
      icon: Lightbulb,
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-700',
    },
    symptom: {
      icon: Sparkles,
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      iconColor: 'text-purple-500',
      titleColor: 'text-purple-700',
    },
  }

  const config = typeConfig[suggestion.type]
  const Icon = config.icon

  const content = (
    <div
      className={`p-3 ${config.bg} rounded-lg border ${config.border} ${
        suggestion.link ? 'hover:shadow-md cursor-pointer' : ''
      } transition-all`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-medium ${config.titleColor} text-sm truncate`}>
              {suggestion.title}
            </p>
            {suggestion.confidence && (
              <span className={`text-xs ${config.iconColor} font-medium`}>
                {suggestion.confidence}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{suggestion.description}</p>
        </div>
        {suggestion.link && (
          <ArrowRight className={`h-4 w-4 ${config.iconColor} flex-shrink-0`} />
        )}
      </div>
    </div>
  )

  if (suggestion.link) {
    return <Link to={suggestion.link}>{content}</Link>
  }

  return content
}

export default RealTimeAssistant
