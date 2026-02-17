/**
 * 공유 카드 컴포넌트
 * 체질 분석 결과를 이미지로 저장/공유
 */
import { useRef, useCallback } from 'react'
import { Download, Copy, Share2 } from 'lucide-react'
import { CONSTITUTIONS } from '@/data/constitutions'
import { ELEMENT_EMOJI, type ElementBalance, type ConstitutionType, ELEMENTS } from '@/lib/saju'

interface ShareCardProps {
  name: string
  constitution: ConstitutionType
  balance: ElementBalance
  subtitle?: string // "BTS 정국과 같은 태음인!" 등
}

export default function ShareCard({ name, constitution, balance, subtitle }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const info = CONSTITUTIONS[constitution]

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert('링크가 복사되었습니다!')
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = window.location.href
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('링크가 복사되었습니다!')
    }
  }, [])

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return

    try {
      // html2canvas 없이 간단한 캡처 방식
      // DOM을 Canvas로 변환하는 대신 SVG foreignObject 사용
      const card = cardRef.current
      const canvas = document.createElement('canvas')
      const scale = 2 // Retina
      canvas.width = card.offsetWidth * scale
      canvas.height = card.offsetHeight * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.scale(scale, scale)
      ctx.fillStyle = info.bgColor
      ctx.fillRect(0, 0, card.offsetWidth, card.offsetHeight)

      // 간단한 텍스트 렌더링
      ctx.fillStyle = info.color
      ctx.font = 'bold 32px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(info.emoji + ' ' + info.name, card.offsetWidth / 2, 50)

      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 24px system-ui'
      ctx.fillText(name, card.offsetWidth / 2, 90)

      if (subtitle) {
        ctx.fillStyle = '#6b7280'
        ctx.font = '16px system-ui'
        ctx.fillText(subtitle, card.offsetWidth / 2, 120)
      }

      // 오행 바
      const barY = 150
      const barWidth = (card.offsetWidth - 80) / 5
      ELEMENTS.forEach((el, i) => {
        const x = 40 + i * barWidth
        ctx.fillStyle = '#e5e7eb'
        ctx.fillRect(x, barY, barWidth - 8, 20)
        ctx.fillStyle = info.color
        ctx.fillRect(x, barY, (barWidth - 8) * balance[el] / 100, 20)
        ctx.fillStyle = '#374151'
        ctx.font = '12px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(`${ELEMENT_EMOJI[el]}${balance[el]}%`, x + (barWidth - 8) / 2, barY + 40)
      })

      // 워터마크
      ctx.fillStyle = '#d1d5db'
      ctx.font = '12px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('몸이알려줌 - 체질TMI', card.offsetWidth / 2, card.offsetHeight - 15)

      // 다운로드
      const link = document.createElement('a')
      link.download = `체질TMI_${name}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      alert('이미지 저장에 실패했습니다. 스크린샷을 이용해주세요.')
    }
  }, [name, constitution, balance, subtitle, info])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name}의 체질 분석 - 체질TMI`,
          text: subtitle || `${name}은(는) ${info.name}! ${info.nickname} 타입이에요.`,
          url: window.location.href,
        })
      } catch {
        // 사용자가 공유 취소
      }
    } else {
      handleCopyLink()
    }
  }, [name, subtitle, info, handleCopyLink])

  return (
    <div className="space-y-3">
      {/* 공유 카드 프리뷰 */}
      <div
        ref={cardRef}
        className="relative rounded-2xl p-6 text-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${info.gradientFrom}15, ${info.gradientTo}15)`,
          border: `2px solid ${info.color}30`,
        }}
      >
        {/* 배경 데코 */}
        <div
          className="absolute top-2 right-4 text-6xl opacity-10"
          style={{ color: info.color }}
        >
          {info.emoji}
        </div>

        <div className="relative z-10">
          <div className="text-4xl mb-2">{info.emoji}</div>
          <h3 className="text-xl font-bold text-gray-800">{name}</h3>
          <div
            className="inline-block mt-2 px-4 py-1 rounded-full text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${info.gradientFrom}, ${info.gradientTo})` }}
          >
            {info.name} - {info.nickname}
          </div>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
          )}

          {/* 미니 오행 */}
          <div className="flex justify-center gap-3 mt-4">
            {ELEMENTS.map(el => (
              <div key={el} className="text-center">
                <div className="text-lg">{ELEMENT_EMOJI[el]}</div>
                <div className="text-xs font-bold" style={{ color: info.color }}>
                  {balance[el]}%
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[10px] text-gray-400">
            몸이알려줌 - 체질TMI
          </p>
        </div>
      </div>

      {/* 공유 버튼들 */}
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-500 to-rose-400 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
        >
          <Share2 className="w-4 h-4" />
          공유하기
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
        >
          <Copy className="w-4 h-4" />
          링크
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
        >
          <Download className="w-4 h-4" />
          저장
        </button>
      </div>
    </div>
  )
}
