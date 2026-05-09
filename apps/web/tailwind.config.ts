import type { Config } from 'tailwindcss'

/**
 * Toss 스타일 디자인 토큰.
 *
 * 정책:
 *   - 흑/백/회 9단계 + 단일 액센트(블루). 보조 시그널 색만 최소.
 *   - 라운드 12-16px, 섀도 거의 없음(border 로 분리), 애니메이션 0.2s ease-out 한정.
 *   - Pretendard 본문, 숫자는 weight 700 으로 숫자 우선 시각화.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        // shadcn-compatible HSL tokens — index.css 에서 값 정의
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Toss 정밀 팔레트 — 직접 참조 시 사용
        // 기존 teal/emerald 커스텀 컬러를 단일 브랜드 블루로 통일
        brand: {
          50: '#EBF3FE',
          100: '#D8E7FE',
          200: '#A8C9FB',
          300: '#7BAEF9',
          400: '#5798F8',
          500: '#3182F6', // Toss 블루 — 핵심 액센트
          600: '#1B64DA',
          700: '#1456B0',
          800: '#0D3D80',
          900: '#082A5A',
        },
        // 회색 9단계 — 토스가 명도 단계로 거의 모든 위계를 만든다
        neutral: {
          50: '#F9FAFB',
          100: '#F2F4F6',
          200: '#E5E8EB',
          300: '#D1D6DB',
          400: '#B0B8C1',
          500: '#8B95A1',
          600: '#6B7684',
          700: '#4E5968',
          800: '#333D4B',
          900: '#191F28', // 본문 검정
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Toss 8/13/15/17/19/22/26/32 단계
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['15px', { lineHeight: '24px' }],
        lg: ['17px', { lineHeight: '26px' }],
        xl: ['19px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '32px' }],
        '3xl': ['26px', { lineHeight: '36px' }],
        '4xl': ['32px', { lineHeight: '42px' }],
        '5xl': ['40px', { lineHeight: '52px' }],
        '6xl': ['52px', { lineHeight: '64px' }],
      },
      letterSpacing: {
        tight: '-0.02em',
        tighter: '-0.03em',
      },
      boxShadow: {
        // 토스는 섀도가 거의 없다. 카드 분리는 border 또는 배경색 차이로.
        sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.06)',
        md: '0 4px 12px rgba(0, 0, 0, 0.06)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.08)',
        focus: '0 0 0 3px rgba(49, 130, 246, 0.16)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.24s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
