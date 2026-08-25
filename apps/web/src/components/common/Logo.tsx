/**
 * 온고지신 AI 브랜드 마크 — 촌관척(寸關尺).
 *
 * 진맥할 때 손목에 얹는 세 자리다.
 * 아래 선은 끊이지 않고 흘러온 맥(故), 위 점 셋은 거기서 값을 읽는 자리(新).
 *
 * 점 셋은 15° 기울어진 한 직선 위에 놓는다. 배열이 전부다 —
 * 아치로 휘면 웃는 얼굴이 되고, 수평으로 놓으면 말줄임표(…)로 읽힌다.
 * 직선에 기울기를 주어야 둘 다 피하고, 왼쪽에서 오른쪽으로 올라가는 판독선이 된다.
 * 크기는 촌·관·척 순으로 3.0 / 3.7 / 3.2 — 기준 자리인 관(關)이 가장 크다.
 *
 * 전에는 시스템 폰트로 "온" 글자를 렌더링했다. 기기마다 자형이 달랐고,
 * 한글 폰트가 없는 환경(일부 리눅스 브라우저, 썸네일 생성기)에서는 두부(□)로 깨졌다.
 * 이제 전부 패스로 그린다 — 어디서든 같은 모양이 나온다.
 *
 * 색은 어디서나 단일 브랜드 블루 한 겹이다.
 * 전에는 앱 아이콘에만 블루→퍼플 그라디언트로 3D 를 냈지만,
 * 디자인 토큰이 "그라데이션·다채색 사용 안 함"(index.css) 이라 마크만 정책 밖에 있었다.
 * 처방전은 흑백으로 출력되고 도장·자수·팩스에서 그라디언트는 어차피 죽는다 —
 * 단색으로 성립하는 편이 재현 조건 전부를 통과한다.
 */

const BRAND = '#3182F6'

/** 마크 기하 — 64×64 좌표계. 광학 중심 (32,32). 좌우 대칭은 아니다(15° 기울어져 있다). */
const MARK_VIEWBOX = '0 0 64 64'

/**
 * 스쿼클 안에 들어갈 때의 기하. 여백을 두어 maskable 안전영역(중심에서 반경 25.6)
 * 안에 완전히 들어간다. 파비콘(public/favicon.svg)과 같은 좌표를 쓴다.
 * 좌표를 고치면 public/*.svg 도 같이 고치고 `npm run icons` 로 PNG 를 다시 굽는다.
 */
const INSET_GEOMETRY = {
  dots: [
    { cx: 23, cy: 30.9, r: 3 },
    { cx: 32, cy: 28.5, r: 3.7 },
    { cx: 41, cy: 26.1, r: 3.2 },
  ],
  pulse: 'M13.3 40.2 H50.7',
  pulseWidth: 4,
} as const

/**
 * 마크만 단독으로 쓸 때의 기하. 스쿼클이 없으니 상자를 더 채운다.
 * INSET_GEOMETRY 를 중심 (32,32) 기준 1.24배 한 값이다 — 두 변형의 비례가 어긋나지 않는다.
 */
const BARE_GEOMETRY = {
  dots: [
    { cx: 20.8, cy: 30.6, r: 3.7 },
    { cx: 32, cy: 27.7, r: 4.6 },
    { cx: 43.2, cy: 24.7, r: 4 },
  ],
  pulse: 'M8.8 42.2 H55.2',
  pulseWidth: 5,
} as const

export interface LogoProps {
  /** 아이콘(정사각형) 한 변 px. 기본 32 */
  size?: number
  /** 옆에 워드마크("온고지신 AI") 표시 여부. 기본 false */
  showWordmark?: boolean
  /** 워드마크 텍스트. 기본 "온고지신 AI" */
  wordmark?: string
  /**
   * 'squircle' = 브랜드 그라디언트 사각형 안에 흰 마크 (기본, 헤더·앱아이콘용)
   * 'bare'     = 마크만 currentColor 로 (문서·인쇄·단색 맥락용)
   */
  variant?: 'squircle' | 'bare'
  /**
   * @deprecated 스쿼클이 단색 한 겹이 되어 켜고 끌 3D 가 없다.
   * 기존 호출부 호환을 위해 받기만 하고 무시한다.
   */
  flat?: boolean
  /** 루트 요소 추가 클래스 */
  className?: string
  /** 워드마크 텍스트 클래스(크기/두께/색 커스텀) */
  wordmarkClassName?: string
  /** 접근성 라벨. 기본 "온고지신 AI" */
  title?: string
  /**
   * @deprecated 마크가 글자에서 도형으로 바뀌어 더 이상 쓰이지 않는다.
   * 기존 호출부 호환을 위해 받기만 하고 무시한다.
   */
  glyph?: string
}

/** 촌관척 도형 — 맥선 하나와 점 셋. 색은 호출부가 정한다. */
function MarkGeometry({
  geometry,
  color,
}: {
  geometry: typeof INSET_GEOMETRY | typeof BARE_GEOMETRY
  color: string
}) {
  return (
    <g fill={color}>
      <path
        d={geometry.pulse}
        fill="none"
        stroke={color}
        strokeWidth={geometry.pulseWidth}
        strokeLinecap="round"
      />
      {geometry.dots.map((dot) => (
        <circle key={dot.cx} cx={dot.cx} cy={dot.cy} r={dot.r} />
      ))}
    </g>
  )
}

/**
 * 마크만 (워드마크 없이). 헤더/사이드바/파비콘 대체 등에서 재사용.
 */
export function LogoMark({
  size = 32,
  variant = 'squircle',
  title = '온고지신 AI',
  className,
}: Pick<LogoProps, 'size' | 'variant' | 'flat' | 'title' | 'className' | 'glyph'>) {
  if (variant === 'bare') {
    return (
      <svg
        role="img"
        aria-label={title}
        className={className}
        width={size}
        height={size}
        viewBox={MARK_VIEWBOX}
        style={{ flexShrink: 0, display: 'block' }}
      >
        <title>{title}</title>
        <MarkGeometry geometry={BARE_GEOMETRY} color="currentColor" />
      </svg>
    )
  }

  return (
    <svg
      role="img"
      aria-label={title}
      className={className}
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <title>{title}</title>
      <rect x="3" y="3" width="58" height="58" rx="17" fill={BRAND} />
      <MarkGeometry geometry={INSET_GEOMETRY} color="#ffffff" />
    </svg>
  )
}

/**
 * 마크 + 워드마크 락업. showWordmark로 텍스트 표시.
 */
export function Logo({
  size = 32,
  showWordmark = false,
  wordmark = '온고지신 AI',
  variant = 'squircle',
  className,
  wordmarkClassName = 'text-[16px] font-bold tracking-tight text-neutral-900',
  title = '온고지신 AI',
}: LogoProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: showWordmark ? Math.round(size * 0.3) : 0,
      }}
    >
      <LogoMark size={size} variant={variant} title={title} />
      {showWordmark && <span className={wordmarkClassName}>{wordmark}</span>}
    </span>
  )
}

export default Logo
