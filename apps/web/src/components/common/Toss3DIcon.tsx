import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// 토스(toss.im) 가 헤더·카드 아이콘에 자주 쓰는 "gradient pill + 흰 글리프 + 부드러운 그림자" 룩을
// CSS-only 로 재현한다. 핸드드로잉 3D 일러스트는 아니지만 토스 디자인 시스템의
// 'small 3D icon container' 패턴과 시각적으로 동일.

export type Toss3DTone =
  | 'purple'
  | 'indigo'
  | 'blue'
  | 'sky'
  | 'teal'
  | 'mint'
  | 'green'
  | 'lime'
  | 'amber'
  | 'orange'
  | 'pink'
  | 'rose'
  | 'red'
  | 'slate'
  | 'gray'

export type Toss3DSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface Tone {
  from: string
  to: string
  glow: string // 상단 하이라이트 색
  ring: string // 외곽 글로우 색 (rgba)
}

// 손글씨 같은 부드러운 채도. 너무 sat 하면 의료 도메인에 어울리지 않음.
const TONES: Record<Toss3DTone, Tone> = {
  purple: { from: '#A78BFA', to: '#7C3AED', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(124,58,237,0.30)' },
  indigo: { from: '#818CF8', to: '#4F46E5', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(79,70,229,0.30)' },
  blue:   { from: '#60A5FA', to: '#2563EB', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(37,99,235,0.30)' },
  sky:    { from: '#7DD3FC', to: '#0284C7', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(2,132,199,0.30)' },
  teal:   { from: '#5EEAD4', to: '#0D9488', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(13,148,136,0.30)' },
  mint:   { from: '#6EE7B7', to: '#059669', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(5,150,105,0.30)' },
  green:  { from: '#86EFAC', to: '#16A34A', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(22,163,74,0.30)' },
  lime:   { from: '#BEF264', to: '#65A30D', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(101,163,13,0.30)' },
  amber:  { from: '#FCD34D', to: '#D97706', glow: 'rgba(255,255,255,0.60)', ring: 'rgba(217,119,6,0.30)' },
  orange: { from: '#FDBA74', to: '#EA580C', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(234,88,12,0.30)' },
  pink:   { from: '#F9A8D4', to: '#DB2777', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(219,39,119,0.30)' },
  rose:   { from: '#FDA4AF', to: '#E11D48', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(225,29,72,0.30)' },
  red:    { from: '#FCA5A5', to: '#DC2626', glow: 'rgba(255,255,255,0.55)', ring: 'rgba(220,38,38,0.30)' },
  slate:  { from: '#94A3B8', to: '#475569', glow: 'rgba(255,255,255,0.50)', ring: 'rgba(71,85,105,0.30)' },
  gray:   { from: '#9CA3AF', to: '#4B5563', glow: 'rgba(255,255,255,0.50)', ring: 'rgba(75,85,99,0.30)' },
}

interface SizeSpec {
  box: string
  icon: number
  radius: string
  stroke: number
}

const SIZES: Record<Toss3DSize, SizeSpec> = {
  xs:  { box: 'w-6 h-6',   icon: 12, radius: 'rounded-md',  stroke: 2.6 },
  sm:  { box: 'w-8 h-8',   icon: 16, radius: 'rounded-lg',  stroke: 2.5 },
  md:  { box: 'w-10 h-10', icon: 20, radius: 'rounded-xl',  stroke: 2.4 },
  lg:  { box: 'w-12 h-12', icon: 24, radius: 'rounded-2xl', stroke: 2.3 },
  xl:  { box: 'w-14 h-14', icon: 28, radius: 'rounded-2xl', stroke: 2.2 },
  '2xl': { box: 'w-16 h-16', icon: 32, radius: 'rounded-2xl', stroke: 2.2 },
}

interface Toss3DIconProps {
  icon: LucideIcon
  tone?: Toss3DTone
  size?: Toss3DSize
  className?: string
  ariaLabel?: string
}

export function Toss3DIcon({
  icon: Icon,
  tone = 'purple',
  size = 'md',
  className,
  ariaLabel,
}: Toss3DIconProps) {
  const t = TONES[tone]
  const s = SIZES[size]

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 isolate',
        s.box,
        s.radius,
        className
      )}
      style={{
        background: `linear-gradient(155deg, ${t.from} 0%, ${t.to} 100%)`,
        // 떠 있는 느낌의 외부 그림자 + 상단 안쪽 하이라이트 + 하단 안쪽 라인.
        boxShadow: [
          `0 6px 16px -6px ${t.ring}`,
          `0 2px 4px -2px ${t.ring}`,
          `inset 0 1px 0 0 rgba(255,255,255,0.45)`,
          `inset 0 -1px 0 0 rgba(0,0,0,0.06)`,
        ].join(', '),
      }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {/* 상단 하이라이트 — 3D 입체감 핵심. blur 로 윗부분만 밝게. */}
      <span
        className="pointer-events-none absolute inset-x-[12%] top-[8%] h-[35%] rounded-[inherit] opacity-70"
        style={{
          background: `linear-gradient(180deg, ${t.glow} 0%, rgba(255,255,255,0) 100%)`,
          filter: 'blur(2px)',
        }}
      />
      <Icon
        size={s.icon}
        strokeWidth={s.stroke}
        className="relative z-10 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]"
      />
    </span>
  )
}

export default Toss3DIcon
