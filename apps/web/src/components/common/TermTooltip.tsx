import { useState, useMemo, useCallback, Fragment } from 'react'
import { HelpCircle, BookOpen, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// Medical term definitions with simple explanations
// Categories: constitution(체질), diagnosis(진단), pattern(변증), treatment(치료), herb(본초)
export const MEDICAL_TERMS: Record<string, { korean: string; simple: string; english: string; category: string }> = {
  // 체질 관련
  체열: {
    korean: '체열 (體熱)',
    simple: '몸의 온기 정도. 열이 많으면 열증, 차면 한증',
    english: 'Body Heat Pattern',
    category: 'constitution',
  },
  근실도: {
    korean: '근실도 (筋實度)',
    simple: '근육과 기운의 충실도. 실하면 튼튼, 허하면 약함',
    english: 'Body Strength Level',
    category: 'constitution',
  },
  사상체질: {
    korean: '사상체질 (四象體質)',
    simple: '태양인/소양인/태음인/소음인 4가지 체질 분류',
    english: 'Four Constitution Types',
    category: 'constitution',
  },
  소음인: {
    korean: '소음인 (少陰人)',
    simple: '비위 기능이 약하고 소화력이 약한 체질',
    english: 'So-eum Type',
    category: 'constitution',
  },
  태음인: {
    korean: '태음인 (太陰人)',
    simple: '간 기능이 강하고 체격이 좋은 체질',
    english: 'Tae-eum Type',
    category: 'constitution',
  },
  소양인: {
    korean: '소양인 (少陽人)',
    simple: '비위 기능이 강하고 활동적인 체질',
    english: 'So-yang Type',
    category: 'constitution',
  },
  태양인: {
    korean: '태양인 (太陽人)',
    simple: '폐 기능이 강하고 진취적인 체질',
    english: 'Tae-yang Type',
    category: 'constitution',
  },

  // 진단 관련
  허실: {
    korean: '허실 (虛實)',
    simple: '몸의 기운 상태. 허(약함) vs 실(충실함)',
    english: 'Deficiency vs Excess',
    category: 'diagnosis',
  },
  한열: {
    korean: '한열 (寒熱)',
    simple: '몸이 차가운지(한) 더운지(열) 판단',
    english: 'Cold vs Heat',
    category: 'diagnosis',
  },
  표리: {
    korean: '표리 (表裏)',
    simple: '병이 표면(피부)에 있는지 내부(장기)에 있는지',
    english: 'Exterior vs Interior',
    category: 'diagnosis',
  },
  음양: {
    korean: '음양 (陰陽)',
    simple: '모든 사물을 두 가지 상반된 성질로 분류하는 원리',
    english: 'Yin and Yang',
    category: 'diagnosis',
  },
  맥진: {
    korean: '맥진 (脈診)',
    simple: '손목 맥박을 짚어 몸 상태를 진단하는 방법',
    english: 'Pulse Diagnosis',
    category: 'diagnosis',
  },
  설진: {
    korean: '설진 (舌診)',
    simple: '혀의 색, 모양, 태(苔)를 보고 진단하는 방법',
    english: 'Tongue Diagnosis',
    category: 'diagnosis',
  },
  복진: {
    korean: '복진 (腹診)',
    simple: '배를 만져서 장기 상태를 진단하는 방법',
    english: 'Abdominal Diagnosis',
    category: 'diagnosis',
  },

  // 변증 관련
  변증: {
    korean: '변증 (辨證)',
    simple: '증상을 분석하여 질병의 원인과 성질을 판단',
    english: 'Pattern Differentiation',
    category: 'pattern',
  },
  팔강변증: {
    korean: '팔강변증 (八綱辨證)',
    simple: '음양/한열/허실/표리 8가지로 진단하는 방법',
    english: 'Eight Principle Pattern',
    category: 'pattern',
  },
  음허: {
    korean: '음허 (陰虛)',
    simple: '몸의 수분/진액이 부족한 상태. 입마름, 열감 동반',
    english: 'Yin Deficiency',
    category: 'pattern',
  },
  양허: {
    korean: '양허 (陽虛)',
    simple: '몸의 에너지/열이 부족한 상태. 추위 타고 피로함',
    english: 'Yang Deficiency',
    category: 'pattern',
  },
  기허: {
    korean: '기허 (氣虛)',
    simple: '기운이 부족한 상태. 피로, 무력감이 주 증상',
    english: 'Qi Deficiency',
    category: 'pattern',
  },
  혈허: {
    korean: '혈허 (血虛)',
    simple: '혈액/영양이 부족한 상태. 어지러움, 창백함',
    english: 'Blood Deficiency',
    category: 'pattern',
  },
  기체: {
    korean: '기체 (氣滯)',
    simple: '기운의 순환이 막힌 상태. 답답함, 팽만감',
    english: 'Qi Stagnation',
    category: 'pattern',
  },
  혈어: {
    korean: '혈어 (血瘀)',
    simple: '혈액이 뭉치거나 정체된 상태. 통증, 멍',
    english: 'Blood Stasis',
    category: 'pattern',
  },
  담음: {
    korean: '담음 (痰飮)',
    simple: '체내에 비정상적인 수분이 정체된 상태',
    english: 'Phlegm-Fluid',
    category: 'pattern',
  },
  습열: {
    korean: '습열 (濕熱)',
    simple: '습기와 열이 뭉쳐 생긴 병적 상태',
    english: 'Damp-Heat',
    category: 'pattern',
  },
  풍한: {
    korean: '풍한 (風寒)',
    simple: '바람과 찬 기운에 의한 감기 유형',
    english: 'Wind-Cold',
    category: 'pattern',
  },
  풍열: {
    korean: '풍열 (風熱)',
    simple: '바람과 열에 의한 감기 유형',
    english: 'Wind-Heat',
    category: 'pattern',
  },

  // 치료 관련
  군신좌사: {
    korean: '군신좌사 (君臣佐使)',
    simple: '처방의 약재 구성 원리. 주된 약/보조약/안내약',
    english: 'Formula Composition',
    category: 'treatment',
  },
  보법: {
    korean: '보법 (補法)',
    simple: '부족한 것을 보충하는 치료법',
    english: 'Tonification',
    category: 'treatment',
  },
  사법: {
    korean: '사법 (瀉法)',
    simple: '과한 것을 내보내는 치료법',
    english: 'Draining Method',
    category: 'treatment',
  },
  청열: {
    korean: '청열 (清熱)',
    simple: '몸의 열을 식히는 치료법',
    english: 'Clearing Heat',
    category: 'treatment',
  },
  온보: {
    korean: '온보 (溫補)',
    simple: '몸을 따뜻하게 하고 보충하는 치료법',
    english: 'Warm Tonification',
    category: 'treatment',
  },
  활혈: {
    korean: '활혈 (活血)',
    simple: '혈액 순환을 촉진하는 치료법',
    english: 'Blood Activation',
    category: 'treatment',
  },
  거습: {
    korean: '거습 (祛濕)',
    simple: '체내 습기를 제거하는 치료법',
    english: 'Dampness Elimination',
    category: 'treatment',
  },
  해표: {
    korean: '해표 (解表)',
    simple: '표면의 사기를 풀어내는 치료법 (감기 초기)',
    english: 'Exterior Release',
    category: 'treatment',
  },

  // 본초 관련
  본초: {
    korean: '본초 (本草)',
    simple: '약재의 기원, 성질, 효능을 연구하는 학문',
    english: 'Materia Medica',
    category: 'herb',
  },
  성미: {
    korean: '성미 (性味)',
    simple: '약재의 성질(한열온량)과 맛(산고감신함)',
    english: 'Nature and Flavor',
    category: 'herb',
  },
  귀경: {
    korean: '귀경 (歸經)',
    simple: '약재가 주로 작용하는 경락/장부',
    english: 'Channel Tropism',
    category: 'herb',
  },
  배오: {
    korean: '배오 (配伍)',
    simple: '약재들을 함께 사용하는 방법과 원리',
    english: 'Herb Combination',
    category: 'herb',
  },
  십팔반: {
    korean: '십팔반 (十八反)',
    simple: '함께 쓰면 안 되는 18가지 약재 배합',
    english: 'Eighteen Incompatibilities',
    category: 'herb',
  },
  십구외: {
    korean: '십구외 (十九畏)',
    simple: '함께 쓰면 효과가 감소하는 19가지 배합',
    english: 'Nineteen Fears',
    category: 'herb',
  },
}

// Category labels in Korean
export const TERM_CATEGORIES: Record<string, string> = {
  constitution: '체질',
  diagnosis: '진단',
  pattern: '변증',
  treatment: '치료',
  herb: '본초',
}

interface TermTooltipProps {
  term: keyof typeof MEDICAL_TERMS | string
  children?: React.ReactNode
  showIcon?: boolean
  className?: string
}

export function TermTooltip({ term, children, showIcon = true, className }: TermTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const termInfo = MEDICAL_TERMS[term]

  if (!termInfo) {
    return <span className={className}>{children || term}</span>
  }

  return (
    <span
      className={cn('relative inline-flex items-center gap-1 cursor-help', className)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children || term}
      {showIcon && <HelpCircle className="h-3.5 w-3.5 text-gray-400" />}

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]">
            <div className="font-medium text-sm mb-1">{termInfo.korean}</div>
            <div className="text-xs text-gray-300 mb-2">{termInfo.simple}</div>
            <div className="text-xs text-gray-400 border-t border-gray-700 pt-1.5 mt-1.5">
              {termInfo.english}
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full">
              <div className="border-8 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </span>
  )
}

// Inline badge version with simple explanation
interface TermBadgeProps {
  term: keyof typeof MEDICAL_TERMS | string
  className?: string
}

export function TermBadge({ term, className }: TermBadgeProps) {
  const termInfo = MEDICAL_TERMS[term]

  if (!termInfo) {
    return <span className={cn('px-2 py-0.5 bg-gray-100 rounded text-sm', className)}>{term}</span>
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-sm font-medium">
        {term}
      </span>
      <span className="text-xs text-gray-500">({termInfo.simple.split('.')[0]})</span>
    </span>
  )
}

// Simplified label for form fields
interface SimplifiedLabelProps {
  term: keyof typeof MEDICAL_TERMS | string
  children?: React.ReactNode
  className?: string
}

export function SimplifiedLabel({ term, children, className }: SimplifiedLabelProps) {
  const termInfo = MEDICAL_TERMS[term]

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="font-medium text-gray-900">{children || term}</span>
      {termInfo && (
        <span className="text-xs text-gray-500">{termInfo.simple.split('.')[0]}</span>
      )}
    </div>
  )
}

// Glossary Modal - Full medical term dictionary
interface GlossaryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GlossaryModal({ isOpen, onClose }: GlossaryModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(TERM_CATEGORIES))
  )

  const filteredTerms = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return Object.entries(MEDICAL_TERMS).filter(([term, info]) =>
      term.includes(query) ||
      info.korean.toLowerCase().includes(query) ||
      info.simple.toLowerCase().includes(query) ||
      info.english.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const termsByCategory = useMemo(() => {
    const grouped: Record<string, Array<[string, typeof MEDICAL_TERMS[string]]>> = {}
    for (const [term, info] of filteredTerms) {
      if (!grouped[info.category]) {
        grouped[info.category] = []
      }
      grouped[info.category].push([term, info])
    }
    return grouped
  }, [filteredTerms])

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-xl">
              <BookOpen className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">한의학 용어 사전</h2>
              <p className="text-xs text-gray-500">{Object.keys(MEDICAL_TERMS).length}개 용어</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="용어 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(TERM_CATEGORIES).map(([category, label]) => {
            const terms = termsByCategory[category]
            if (!terms || terms.length === 0) return null

            const isExpanded = expandedCategories.has(category)

            return (
              <div key={category} className="mb-4">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{label}</span>
                    <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs text-gray-600">
                      {terms.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {terms.map(([term, info]) => (
                      <div
                        key={term}
                        className="p-3 bg-white border border-gray-100 rounded-xl hover:border-teal-200 hover:bg-teal-50/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-gray-900">{info.korean}</div>
                            <div className="text-sm text-gray-600 mt-1">{info.simple}</div>
                          </div>
                          <span className="flex-shrink-0 px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-500">
                            {info.english}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {filteredTerms.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Glossary Button - Opens the glossary modal
interface GlossaryButtonProps {
  className?: string
  variant?: 'icon' | 'button' | 'link'
}

export function GlossaryButton({ className, variant = 'button' }: GlossaryButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'p-2 hover:bg-gray-100 rounded-xl transition-colors',
            className
          )}
          title="한의학 용어 사전"
        >
          <BookOpen className="h-5 w-5 text-gray-600" />
        </button>
        <GlossaryModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    )
  }

  if (variant === 'link') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm',
            className
          )}
        >
          <BookOpen className="h-4 w-4" />
          <span>용어 사전</span>
        </button>
        <GlossaryModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-xl hover:bg-teal-100 transition-colors text-sm font-medium',
          className
        )}
      >
        <BookOpen className="h-4 w-4" />
        한의학 용어 사전
      </button>
      <GlossaryModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

// GlossaryText - Auto-highlight medical terms in text
interface GlossaryTextProps {
  text: string
  className?: string
  showIcon?: boolean
  highlightClassName?: string
}

export function GlossaryText({
  text,
  className,
  showIcon = false,
  highlightClassName,
}: GlossaryTextProps) {
  const processedContent = useMemo(() => {
    // Sort terms by length (longest first) to match longer terms first
    const sortedTerms = Object.keys(MEDICAL_TERMS).sort((a, b) => b.length - a.length)
    const termPattern = new RegExp(`(${sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')

    const parts: Array<{ type: 'text' | 'term'; content: string }> = []
    let lastIndex = 0
    let match

    while ((match = termPattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
      }
      // Add matched term
      parts.push({ type: 'term', content: match[0] })
      lastIndex = termPattern.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) })
    }

    return parts
  }, [text])

  return (
    <span className={className}>
      {processedContent.map((part, index) =>
        part.type === 'term' ? (
          <TermTooltip
            key={index}
            term={part.content}
            showIcon={showIcon}
            className={cn(
              'underline decoration-teal-300 decoration-dotted underline-offset-2 cursor-help',
              highlightClassName
            )}
          >
            {part.content}
          </TermTooltip>
        ) : (
          <Fragment key={index}>{part.content}</Fragment>
        )
      )}
    </span>
  )
}

export default TermTooltip
