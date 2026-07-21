/**
 * 3D 추상 배경 프리미티브 — 이미지 에셋 없이 CSS/SVG 로만 구성.
 *
 * 실사 사진을 쓰지 않는 대신 깊이감을 담당하는 레이어들:
 *   1) MeshBackdrop  — 다중 radial-gradient 로 만든 오로라/메시 그라디언트
 *   2) Orb           — 구체(3D) 느낌의 광원. 하이라이트 + 림라이트 + 그림자 3중 레이어
 *   3) GridFloor     — 원근 투영된 격자 바닥. 공간감 담당
 *   4) GrainOverlay  — 필름 그레인. 그라디언트 밴딩을 깨서 "렌더링된 이미지"처럼 보이게 함
 *
 * 모든 레이어는 pointer-events-none 이며 aria-hidden. 접근성/클릭에 영향 없음.
 * prefers-reduced-motion 존중 — 애니메이션은 CSS 에서 차단된다.
 */

interface OrbProps {
  /** 지름(px 아님 — tailwind 임의값 문자열, 예: '32rem') */
  size: string
  /** 색 (hsl/hex). 광원 중심색 */
  color: string
  className?: string
  /** 애니메이션 지연 — 여러 개가 동시에 뜨지 않게 */
  delay?: string
}

/** 구체 광원 — blur 로 뭉갠 radial gradient 3겹으로 입체감을 만든다 */
export function Orb({ size, color, className = '', delay = '0s' }: OrbProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full ojs-float ${className}`}
      style={{
        width: size,
        height: size,
        animationDelay: delay,
        background: `radial-gradient(circle at 32% 28%, ${color}, transparent 62%)`,
        filter: 'blur(56px)',
        opacity: 0.55,
      }}
    />
  )
}

/** 유리 구체 — 테두리 하이라이트가 있어 좀 더 '오브젝트'처럼 읽힌다 */
export function GlassOrb({ size, className = '', delay = '0s' }: Omit<OrbProps, 'color'>) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full ojs-float ${className}`}
      style={{ width: size, height: size, animationDelay: delay }}
    >
      <div
        className="absolute inset-0 rounded-full border border-white/20"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.28), rgba(255,255,255,0.04) 42%, transparent 68%)',
          boxShadow:
            'inset 0 0 60px rgba(255,255,255,0.10), inset -18px -18px 60px rgba(49,130,246,0.18), 0 30px 80px -20px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
        }}
      />
      {/* 스펙큘러 하이라이트 */}
      <div
        className="absolute rounded-full"
        style={{
          top: '14%',
          left: '18%',
          width: '26%',
          height: '18%',
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.75), transparent 70%)',
          filter: 'blur(6px)',
        }}
      />
    </div>
  )
}

/** 오로라 메시 그라디언트 — 히어로/CTA 섹션 배경 */
export function MeshBackdrop({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(60% 55% at 18% 12%, rgba(49,130,246,0.30), transparent 60%)',
            'radial-gradient(50% 45% at 82% 18%, rgba(120,86,255,0.24), transparent 62%)',
            'radial-gradient(70% 60% at 50% 96%, rgba(28,90,190,0.28), transparent 66%)',
            'radial-gradient(40% 40% at 92% 78%, rgba(0,196,255,0.16), transparent 64%)',
          ].join(','),
        }}
      />
    </div>
  )
}

/** 원근 격자 바닥 — 공간의 '아래'를 만들어 3D 감각을 준다 */
export function GridFloor({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-[38rem] overflow-hidden ${className}`}
      style={{ perspective: '340px' }}
    >
      <div
        className="absolute inset-x-[-60%] bottom-[-14rem] h-[46rem] origin-bottom"
        style={{
          transform: 'rotateX(74deg)',
          backgroundImage: [
            'linear-gradient(to right, rgba(49,130,246,0.22) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(49,130,246,0.22) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '76px 76px',
          maskImage:
            'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 42%, transparent 78%)',
          WebkitMaskImage:
            'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 42%, transparent 78%)',
        }}
      />
    </div>
  )
}

/** 필름 그레인 — SVG feTurbulence. 그라디언트 밴딩 제거용 */
export function GrainOverlay({ opacity = 0.16 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 mix-blend-overlay"
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
      }}
    />
  )
}

/** 위/아래 섹션 경계를 부드럽게 잇는 페이드 */
export function EdgeFade({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 h-32 ${
        position === 'top' ? 'top-0' : 'bottom-0'
      }`}
      style={{
        background: `linear-gradient(to ${position === 'top' ? 'bottom' : 'top'}, #05070D, transparent)`,
      }}
    />
  )
}
