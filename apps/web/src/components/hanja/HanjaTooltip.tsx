/**
 * 한자 툴팁 컴포넌트
 * 한자에 마우스를 올리면 한글 음독 + 뜻풀이가 표시됨
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface HanjaTooltipProps {
  /** 원본 한자 텍스트 */
  hanja: string
  /** 한글 음독 */
  korean: string
  /** 쉬운 뜻풀이 */
  meaning?: string
  /** 스타일 클래스 */
  className?: string
  /** 한자 표시 여부 (false면 한글만 표시) */
  showHanja?: boolean
}

export function HanjaTooltip({
  hanja,
  korean,
  meaning,
  className,
  showHanja = true,
}: HanjaTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'cursor-help border-b border-dotted border-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors',
              className
            )}
          >
            {showHanja ? hanja : korean}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3">
          <div className="space-y-1">
            {showHanja && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-gray-900">{hanja}</span>
                <span className="text-sm text-blue-600 font-medium">({korean})</span>
              </div>
            )}
            {!showHanja && (
              <div className="text-sm text-gray-500">{hanja}</div>
            )}
            {meaning && (
              <p className="text-sm text-gray-600 leading-relaxed">
                💡 {meaning}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * 여러 한자를 포함한 텍스트를 자동으로 변환하는 컴포넌트
 */
interface HanjaTextProps {
  /** 변환할 텍스트 */
  text: string
  /** 한자 표시 여부 */
  showHanja?: boolean
  /** 변환 사전 */
  dictionary?: Record<string, { korean: string; meaning?: string }>
  className?: string
}

// 기본 의학용어 사전 (자주 쓰이는 것들)
const DEFAULT_MEDICAL_TERMS: Record<string, { korean: string; meaning: string }> = {
  '心膽虛㥘': { korean: '심담허겁', meaning: '심장과 담이 허약해서 쉽게 놀라는 상태' },
  '心膽虛怯': { korean: '심담허겁', meaning: '심장과 담이 허약해서 쉽게 놀라는 상태' },
  '觸事易驚': { korean: '촉사이경', meaning: '무슨 일에든 쉽게 놀람' },
  '虛煩不眠': { korean: '허번불면', meaning: '몸이 허하고 가슴이 답답해서 잠을 못 잠' },
  '夢寐不祥': { korean: '몽매불상', meaning: '꿈자리가 사나움, 악몽' },
  '痰氣鬱結': { korean: '담기울결', meaning: '가래와 기운이 뭉쳐서 목에 걸린 느낌' },
  '氣血兩虛': { korean: '기혈양허', meaning: '기운과 혈액이 모두 부족함' },
  '肝鬱氣滯': { korean: '간울기체', meaning: '스트레스로 기운이 막혀 답답함' },
  '脾胃虛弱': { korean: '비위허약', meaning: '소화기능이 약함' },
  '氣虛痰盛': { korean: '기허담성', meaning: '기운이 약하고 가래가 많음' },
  '血虛': { korean: '혈허', meaning: '혈액이 부족함 (빈혈과 유사)' },
  '陰虛火旺': { korean: '음허화왕', meaning: '몸의 진액이 부족하여 열이 남' },
  '怔忡': { korean: '정충', meaning: '가슴이 두근거리고 불안함' },
  '驚悸': { korean: '경계', meaning: '놀라서 가슴이 뜀' },
  '健忘': { korean: '건망', meaning: '기억력이 떨어짐' },
  '不眠': { korean: '불면', meaning: '잠을 잘 못 잠' },
  '多夢': { korean: '다몽', meaning: '꿈을 많이 꿈' },
  '盜汗': { korean: '도한', meaning: '잘 때 식은땀이 남' },
  '自汗': { korean: '자한', meaning: '움직이지 않아도 땀이 남' },
  '口渴': { korean: '구갈', meaning: '입이 마름' },
  '口苦': { korean: '구고', meaning: '입이 씀' },
  '便秘': { korean: '변비', meaning: '대변을 보기 어려움' },
  '泄瀉': { korean: '설사', meaning: '묽은 변을 자주 봄' },
  '眩暈': { korean: '현훈', meaning: '어지러움' },
  '頭痛': { korean: '두통', meaning: '머리가 아픔' },
  '腰痛': { korean: '요통', meaning: '허리가 아픔' },
  '胸悶': { korean: '흉민', meaning: '가슴이 답답함' },
  '胸痛': { korean: '흉통', meaning: '가슴이 아픔' },
  '中風': { korean: '중풍', meaning: '뇌졸중, 뇌혈관 질환' },
  '半身不遂': { korean: '반신불수', meaning: '몸 한쪽이 마비됨' },
  '人事不省': { korean: '인사불성', meaning: '의식을 잃음' },
}

export function HanjaText({
  text,
  showHanja = true,
  dictionary = DEFAULT_MEDICAL_TERMS,
  className,
}: HanjaTextProps) {
  // 텍스트에서 한자 용어를 찾아서 변환
  const parts: Array<{ type: 'text' | 'hanja'; content: string; data?: { korean: string; meaning?: string } }> = []

  let remaining = text

  // 사전의 키들을 길이 순으로 정렬 (긴 것부터 매칭)
  const sortedKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length)

  while (remaining.length > 0) {
    let found = false

    for (const key of sortedKeys) {
      const index = remaining.indexOf(key)
      if (index === 0) {
        // 매칭 찾음
        parts.push({
          type: 'hanja',
          content: key,
          data: dictionary[key],
        })
        remaining = remaining.slice(key.length)
        found = true
        break
      } else if (index > 0) {
        // 앞부분 일반 텍스트 추가
        parts.push({
          type: 'text',
          content: remaining.slice(0, index),
        })
        parts.push({
          type: 'hanja',
          content: key,
          data: dictionary[key],
        })
        remaining = remaining.slice(index + key.length)
        found = true
        break
      }
    }

    if (!found) {
      // 매칭되는 한자 없음 - 한 글자씩 추가
      parts.push({
        type: 'text',
        content: remaining[0],
      })
      remaining = remaining.slice(1)
    }
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>
        }
        return (
          <HanjaTooltip
            key={index}
            hanja={part.content}
            korean={part.data?.korean || part.content}
            meaning={part.data?.meaning}
            showHanja={showHanja}
          />
        )
      })}
    </span>
  )
}

export default HanjaTooltip
