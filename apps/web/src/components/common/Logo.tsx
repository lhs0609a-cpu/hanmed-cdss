import type { CSSProperties } from 'react'

/**
 * 온고지신 AI 브랜드 마크 — CSS/SVG 실사급 3D 스쿼클.
 *
 * 그동안 "온" 마크가 7곳에 인라인 복붙되어 있었고(색·크기 제각각),
 * 파비콘/OG는 청록+한자로 정체성이 갈라져 있었다.
 * 이 컴포넌트로 단일화한다. 브랜드 컬러는 Toss Blue #3182F6 → Purple #7856FF.
 *
 * 3D 표현: 입체 그라디언트 + 다중 그림자(접지/앰비언트) + 상단 하이라이트 글로우 +
 *          내부 임보스 음영 + 글자 엠보싱. 벡터라 어느 배율에서도 선명.
 */

const BRAND_FROM = '#3182F6'
const BRAND_TO = '#7856FF'

export interface LogoProps {
  /** 아이콘(정사각형) 한 변 px. 기본 32 */
  size?: number
  /** 옆에 워드마크("온고지신 AI") 표시 여부. 기본 false */
  showWordmark?: boolean
  /** 워드마크 텍스트. 기본 "온고지신 AI" */
  wordmark?: string
  /** 마크 안 글자. 기본 "온" */
  glyph?: string
  /** 3D 효과 끄기(플랫). 기본 false = 3D 켜짐 */
  flat?: boolean
  /** 루트 요소 추가 클래스 */
  className?: string
  /** 워드마크 텍스트 클래스(크기/두께/색 커스텀) */
  wordmarkClassName?: string
  /** 접근성 라벨. 기본 "온고지신 AI" */
  title?: string
}

/**
 * 3D 스쿼클 마크만 (워드마크 없이). 헤더/사이드바/파비콘 대체 등에서 재사용.
 */
export function LogoMark({
  size = 32,
  glyph = '온',
  flat = false,
  title = '온고지신 AI',
  className,
}: Pick<LogoProps, 'size' | 'glyph' | 'flat' | 'title' | 'className'>) {
  // 크기에 비례해 그림자/광원을 스케일 (기준 32px)
  const s = size / 32
  const radius = Math.round(size * 0.28)
  const fontSize = Math.round(size * 0.44)

  const base3D: CSSProperties = {
    background: `linear-gradient(150deg, ${BRAND_FROM} 0%, #4B74FF 45%, ${BRAND_TO} 100%)`,
    boxShadow: [
      // 접지 그림자 (표면에서 살짝 떠 있는 느낌)
      `0 ${1.5 * s}px ${3 * s}px rgba(49,130,246,0.28)`,
      // 부드러운 컬러 앰비언트 글로우
      `0 ${6 * s}px ${16 * s}px rgba(96,92,255,0.30)`,
      // 상단 내부 하이라이트 (광원 위쪽)
      `inset 0 ${1.4 * s}px ${1.2 * s}px rgba(255,255,255,0.55)`,
      // 하단 내부 음영 (입체 볼륨)
      `inset 0 ${-2.2 * s}px ${3 * s}px rgba(35,20,110,0.38)`,
      // 가장자리 경계 정의
      `inset 0 0 0 ${Math.max(1, 0.5 * s)}px rgba(255,255,255,0.18)`,
    ].join(','),
  }

  const flat2D: CSSProperties = {
    background: `linear-gradient(135deg, ${BRAND_FROM}, ${BRAND_TO})`,
  }

  return (
    <span
      role="img"
      aria-label={title}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        ...(flat ? flat2D : base3D),
      }}
    >
      {/* 상단 글로시 하이라이트 (광원 반사) */}
      {!flat && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            background:
              'radial-gradient(120% 85% at 30% 8%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 34%, rgba(255,255,255,0) 58%)',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* 글자 (엠보싱) */}
      <span
        style={{
          position: 'relative',
          color: '#ffffff',
          fontSize,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          textShadow: flat
            ? 'none'
            : `0 ${1 * s}px ${1.5 * s}px rgba(20,12,70,0.35), 0 ${-0.5 * s}px 0 rgba(255,255,255,0.25)`,
        }}
      >
        {glyph}
      </span>
    </span>
  )
}

/**
 * 마크 + 워드마크 락업. showWordmark로 텍스트 표시.
 */
export function Logo({
  size = 32,
  showWordmark = false,
  wordmark = '온고지신 AI',
  glyph = '온',
  flat = false,
  className,
  wordmarkClassName = 'text-[16px] font-bold tracking-tight text-neutral-900',
  title = '온고지신 AI',
}: LogoProps) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: showWordmark ? Math.round(size * 0.3) : 0 }}>
      <LogoMark size={size} glyph={glyph} flat={flat} title={title} />
      {showWordmark && <span className={wordmarkClassName}>{wordmark}</span>}
    </span>
  )
}

export default Logo
