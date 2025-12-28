/**
 * 약재 표시 컴포넌트
 * 한자 약재명을 한글로 변환하여 표시
 */

import { HanjaTooltip } from './HanjaTooltip'
import { translateHerb, translateDosage, HERB_DICTIONARY } from '@/data/hanja-dictionary'
import { cn } from '@/lib/utils'

// 약재별 상세 설명 (자주 쓰이는 약재)
const HERB_DETAILS: Record<string, { meaning: string; category: string }> = {
  '甘草': { meaning: '달콤한 맛, 여러 약재를 조화시키고 독성을 줄임', category: '보익약' },
  '人蔘': { meaning: '기운을 크게 보충하는 대표적인 보약', category: '보기약' },
  '當歸': { meaning: '혈액을 보충하고 순환시키는 대표 약재', category: '보혈약' },
  '黃芪': { meaning: '기운을 북돋우고 면역력을 높임', category: '보기약' },
  '白朮': { meaning: '소화기능을 강화하고 습기를 제거', category: '보기약' },
  '白茯苓': { meaning: '이뇨작용, 마음을 안정시킴', category: '이수삼습약' },
  '半夏': { meaning: '가래를 삭이고 구토를 멎게 함', category: '화담약' },
  '陳皮': { meaning: '소화를 돕고 가래를 삭임', category: '이기약' },
  '柴胡': { meaning: '간의 울체를 풀고 열을 내림', category: '해표약' },
  '香附子': { meaning: '기운 순환을 돕고 스트레스를 풀어줌', category: '이기약' },
  '枳實': { meaning: '기가 뭉친 것을 풀고 소화를 도움', category: '이기약' },
  '竹茹': { meaning: '열을 내리고 가래를 삭임, 구토 진정', category: '화담약' },
  '酸棗仁': { meaning: '마음을 안정시키고 잠을 잘 오게 함', category: '안신약' },
  '遠志': { meaning: '마음을 안정시키고 기억력을 높임', category: '안신약' },
  '龍眼肉': { meaning: '혈액을 보충하고 마음을 편안하게 함', category: '보혈약' },
  '麥門冬': { meaning: '폐와 위의 진액을 보충', category: '보음약' },
  '生地黃': { meaning: '열을 내리고 진액을 보충', category: '청열약' },
  '熟地黃': { meaning: '혈액과 진액을 보충하는 대표 약재', category: '보혈약' },
  '川芎': { meaning: '혈액 순환을 돕고 두통을 완화', category: '활혈약' },
  '芍藥': { meaning: '간 기능 조절, 통증 완화', category: '보혈약' },
  '白芍藥': { meaning: '간을 조절하고 혈액을 보충', category: '보혈약' },
  '赤芍藥': { meaning: '혈액 순환을 돕고 어혈을 풀어줌', category: '활혈약' },
  '桔梗': { meaning: '가래를 삭이고 기침을 완화', category: '화담약' },
  '防風': { meaning: '풍(바람)을 막고 관절통을 완화', category: '해표약' },
  '獨活': { meaning: '풍습을 제거하고 관절통을 완화', category: '거풍습약' },
  '葛根': { meaning: '열을 내리고 목 뒷부분 경직 완화', category: '해표약' },
  '麻黃': { meaning: '땀을 내서 감기를 치료', category: '해표약' },
  '附子': { meaning: '몸을 따뜻하게 하는 강력한 온열약', category: '온리약' },
  '乾薑': { meaning: '속을 따뜻하게 하고 소화를 도움', category: '온리약' },
  '黃連': { meaning: '열을 강하게 내림, 해독작용', category: '청열약' },
  '黃芩': { meaning: '폐와 위의 열을 내림', category: '청열약' },
  '梔子': { meaning: '열을 내리고 답답함을 풀어줌', category: '청열약' },
  '大黃': { meaning: '변비 해소, 열을 내림', category: '사하약' },
  '薑': { meaning: '생강, 소화를 돕고 속을 따뜻하게', category: '해표약' },
  '棗': { meaning: '대추, 기운을 보충하고 약을 조화시킴', category: '보기약' },
}

interface HerbDisplayProps {
  /** 한자 약재명 */
  herb: string
  /** 용량 (선택) */
  amount?: string
  /** 가공법 (선택) */
  processing?: string
  /** 한자 표시 여부 */
  showHanja?: boolean
  /** 용량 표시 여부 */
  showAmount?: boolean
  className?: string
}

export function HerbDisplay({
  herb,
  amount,
  processing,
  showHanja = false,
  showAmount = true,
  className,
}: HerbDisplayProps) {
  const koreanName = HERB_DICTIONARY[herb] || translateHerb(herb)
  const herbDetail = HERB_DETAILS[herb]
  const koreanAmount = amount ? translateDosage(amount) : ''

  const displayName = showHanja ? herb : koreanName
  const tooltipMeaning = herbDetail
    ? `${herbDetail.meaning} [${herbDetail.category}]`
    : undefined

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <HanjaTooltip
        hanja={herb}
        korean={koreanName}
        meaning={tooltipMeaning}
        showHanja={showHanja}
      />
      {showAmount && koreanAmount && (
        <span className="text-gray-500 text-sm">
          {koreanAmount}
        </span>
      )}
      {processing && (
        <span className="text-xs text-orange-600 bg-orange-50 px-1 rounded">
          {processing}
        </span>
      )}
    </span>
  )
}

/**
 * 처방의 전체 구성을 표시하는 컴포넌트
 */
interface CompositionDisplayProps {
  /** 구성 약재 배열 */
  composition: Array<{
    herb: string
    amount?: string
    processing?: string
  }>
  /** 한자 표시 여부 */
  showHanja?: boolean
  /** 레이아웃 */
  layout?: 'inline' | 'grid' | 'list'
  className?: string
}

export function CompositionDisplay({
  composition,
  showHanja = false,
  layout = 'inline',
  className,
}: CompositionDisplayProps) {
  if (layout === 'inline') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {composition.map((item, index) => (
          <HerbDisplay
            key={index}
            herb={item.herb}
            amount={item.amount}
            processing={item.processing}
            showHanja={showHanja}
          />
        ))}
      </div>
    )
  }

  if (layout === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2', className)}>
        {composition.map((item, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded px-2 py-1 text-sm"
          >
            <HerbDisplay
              herb={item.herb}
              amount={item.amount}
              processing={item.processing}
              showHanja={showHanja}
            />
          </div>
        ))}
      </div>
    )
  }

  // list layout
  return (
    <ul className={cn('space-y-1', className)}>
      {composition.map((item, index) => (
        <li key={index} className="flex items-center gap-2">
          <span className="w-4 h-4 bg-green-100 text-green-700 rounded-full text-xs flex items-center justify-center">
            {index + 1}
          </span>
          <HerbDisplay
            herb={item.herb}
            amount={item.amount}
            processing={item.processing}
            showHanja={showHanja}
          />
        </li>
      ))}
    </ul>
  )
}

export default HerbDisplay
