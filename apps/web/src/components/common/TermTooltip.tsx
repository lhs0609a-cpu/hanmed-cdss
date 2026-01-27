import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Medical term definitions with simple explanations
export const MEDICAL_TERMS: Record<string, { korean: string; simple: string; english: string }> = {
  체열: {
    korean: '체열 (體熱)',
    simple: '몸의 온기 정도. 열이 많으면 열증, 차면 한증',
    english: 'Body Heat Pattern',
  },
  근실도: {
    korean: '근실도 (筋實度)',
    simple: '근육과 기운의 충실도. 실하면 튼튼, 허하면 약함',
    english: 'Body Strength Level',
  },
  허실: {
    korean: '허실 (虛實)',
    simple: '몸의 기운 상태. 허(약함) vs 실(충실함)',
    english: 'Deficiency vs Excess',
  },
  한열: {
    korean: '한열 (寒熱)',
    simple: '몸이 차가운지(한) 더운지(열) 판단',
    english: 'Cold vs Heat',
  },
  음허: {
    korean: '음허 (陰虛)',
    simple: '몸의 수분/진액이 부족한 상태. 입마름, 열감 동반',
    english: 'Yin Deficiency',
  },
  양허: {
    korean: '양허 (陽虛)',
    simple: '몸의 에너지/열이 부족한 상태. 추위 타고 피로함',
    english: 'Yang Deficiency',
  },
  기허: {
    korean: '기허 (氣虛)',
    simple: '기운이 부족한 상태. 피로, 무력감이 주 증상',
    english: 'Qi Deficiency',
  },
  혈허: {
    korean: '혈허 (血虛)',
    simple: '혈액/영양이 부족한 상태. 어지러움, 창백함',
    english: 'Blood Deficiency',
  },
  변증: {
    korean: '변증 (辨證)',
    simple: '증상을 분석하여 질병의 원인과 성질을 판단',
    english: 'Pattern Differentiation',
  },
  사상체질: {
    korean: '사상체질 (四象體質)',
    simple: '태양인/소양인/태음인/소음인 4가지 체질 분류',
    english: 'Four Constitution Types',
  },
  소음인: {
    korean: '소음인 (少陰人)',
    simple: '비위 기능이 약하고 소화력이 약한 체질',
    english: 'So-eum Type',
  },
  태음인: {
    korean: '태음인 (太陰人)',
    simple: '간 기능이 강하고 체격이 좋은 체질',
    english: 'Tae-eum Type',
  },
  소양인: {
    korean: '소양인 (少陽人)',
    simple: '비위 기능이 강하고 활동적인 체질',
    english: 'So-yang Type',
  },
  태양인: {
    korean: '태양인 (太陽人)',
    simple: '폐 기능이 강하고 진취적인 체질',
    english: 'Tae-yang Type',
  },
  팔강변증: {
    korean: '팔강변증 (八綱辨證)',
    simple: '음양/한열/허실/표리 8가지로 진단하는 방법',
    english: 'Eight Principle Pattern',
  },
  표리: {
    korean: '표리 (表裏)',
    simple: '병이 표면(피부)에 있는지 내부(장기)에 있는지',
    english: 'Exterior vs Interior',
  },
  군신좌사: {
    korean: '군신좌사 (君臣佐使)',
    simple: '처방의 약재 구성 원리. 주된 약/보조약/안내약',
    english: 'Formula Composition',
  },
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

export default TermTooltip
