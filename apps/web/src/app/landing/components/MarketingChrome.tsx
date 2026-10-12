import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react'
import { APP_VERSION, BUILD_DATE, DESKTOP_VERSION } from '@/config/version'
import '../landing.css'
import '../conversion.css'

// href 는 같은 페이지 안의 앵커, to 는 다른 화면으로의 이동이다.
// 데스크톱 앱은 별도 페이지라 앵커로 둘 수 없다 — 앵커로 두면 눌러도
// 아무 일이 일어나지 않는다.
const NAV: { href?: string; to?: string; label: string }[] = [
  { href: '#demo', label: '제품 체험' },
  { href: '#features', label: '주요 기능' },
  { href: '#evidence', label: '근거와 신뢰' },
  { href: '#pricing', label: '요금제' },
  { to: '/download', label: '데스크톱 앱' },
]
/** 클릭 기록에 쓸 메뉴 이름. 앵커(#demo)와 라우트(/download)를 같은 규칙으로 줄인다. */
const navSlug = (item: { href?: string; to?: string }) =>
  (item.href ?? item.to ?? '').replace(/[^a-z0-9]/gi, '')
function Brand() {
  return (
    <Link to="/" className="landing-brand" aria-label="온고지신 AI 홈">
      <span className="landing-brand-mark">
        <img src="/brand/logo-knowledge-v1.png" width={40} height={40} alt="" />
      </span>
      <span>
        온고지신<span className="brand-ai">AI</span>
      </span>
    </Link>
  )
}

export function MarketingHeader({
  home = false,
  trackButtonClick = () => {},
}: {
  home?: boolean
  trackButtonClick?: (name: string) => void
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!mobileMenuOpen) return
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        menuButton.current?.focus()
      }
    }
    const media = window.matchMedia('(min-width: 960px)')
    const resize = () => {
      if (media.matches) setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', escape)
    media.addEventListener('change', resize)
    return () => {
      document.removeEventListener('keydown', escape)
      media.removeEventListener('change', resize)
    }
  }, [mobileMenuOpen])

  return (
    <header className="landing-header">
      <div className="landing-container landing-header-inner">
        <Brand />
        <nav className="landing-desktop-nav" aria-label="주 메뉴">
          {NAV.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                aria-current={!home && item.to === '/download' ? 'page' : undefined}
                data-growth={`nav_${navSlug(item)}`}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={home ? item.href : `/${item.href}`}
                data-growth={`nav_${navSlug(item)}`}
              >
                {item.label}
              </a>
            ),
          )}
        </nav>
        <div className="landing-header-actions">
          <Link to="/login" className="landing-login">
            로그인
          </Link>
          <Link
            to="/register"
            className="landing-button landing-button-small"
            data-growth="signup_header"
            onClick={() => trackButtonClick('landing_signup_header')}
          >
            무료로 시작하기
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <button
          type="button"
          className="landing-menu-button"
          ref={menuButton}
          aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={mobileMenuOpen}
          aria-controls="landing-mobile-nav"
          data-growth="mobile_menu_toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileMenuOpen && (
        <nav className="landing-mobile-nav" id="landing-mobile-nav" aria-label="모바일 메뉴">
          {NAV.map((item) =>
            item.to ? (
              <Link
                to={item.to}
                aria-current={!home && item.to === '/download' ? 'page' : undefined}
                key={item.label}
                data-growth={`nav_mobile_${navSlug(item)}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <a
                href={home ? item.href : `/${item.href}`}
                key={item.label}
                data-growth={`nav_mobile_${navSlug(item)}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ),
          )}
          <Link to="/login">로그인</Link>
          <Link
            to="/register"
            className="landing-button"
            data-growth="signup_mobile"
            onClick={() => trackButtonClick('landing_signup_mobile')}
          >
            무료로 시작하기
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      )}
    </header>
  )
}

export function MarketingFooter({
  home = false,
  desktopVersion = DESKTOP_VERSION,
}: {
  home?: boolean
  desktopVersion?: string
}) {
  return (
    <footer className="landing-footer landing-container">
      <div className="landing-footer-top">
        <div>
          <Brand />
          <p>
            오래된 지혜에 새로운 연결을.
            <br />
            한의사를 위한 임상 워크스페이스.
          </p>
        </div>
        <nav aria-label="하단 제품 메뉴">
          <strong>제품</strong>
          <a href={home ? '#demo' : '/#demo'}>제품 체험</a>
          <a href={home ? '#features' : '/#features'}>주요 기능</a>
          <a href={home ? '#pricing' : '/#pricing'}>요금제</a>
          <Link to="/download">데스크톱 앱 다운로드</Link>
          <a href={home ? '#faq' : '/#faq'}>자주 묻는 질문</a>
        </nav>
        {/*
            공개 자료로 들어가는 입구.

            오랫동안 이 쪽들은 사이트맵에만 있었다. 사이트맵은 "이런 주소가
            있다" 고 말할 뿐이고, 크롤러가 무게를 매기는 것은 어디서 링크가
            걸려 있느냐다 — 홈에서 한 번도 닿지 않는 쪽은 있으나 마나 한
            취급을 받는다. 사람도 마찬가지로 찾을 길이 없었다.
          */}
        <nav aria-label="공개 자료">
          <strong>공개 자료</strong>
            <Link to="/cases">고전 의안</Link>
            <Link to="/formulas">처방 사전</Link>
            <Link to="/herbs">본초 사전</Link>
            <Link to="/references">한의학 문헌</Link>
            <Link to="/journals">학술지별 문헌</Link>
            <Link to="/topics">주제별 문헌</Link>
            <Link to="/guides">한의사 가이드</Link>
            <Link to="/nonpay">한방 비급여 가격</Link>
            <Link to="/sick-codes">한의과 상병코드</Link>
        </nav>
        <nav aria-label="서비스 정책">
          <strong>서비스 안내</strong>
          <Link to="/terms">이용약관</Link>
          <Link to="/privacy">개인정보처리방침</Link>
          <Link to="/subscription-terms">구독 약관</Link>
          <Link to="/refund-policy">환불정책</Link>
        </nav>
        <div className="footer-contact">
          <strong>함께 시작해요</strong>
          <a href="mailto:lhs0609c@naver.com">
            lhs0609c@naver.com
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <Link to="/login">
            기존 회원 로그인
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="landing-footer-bottom">
        <p>
          본 서비스는 한의사의 임상 의사결정을 보조하는 참고 정보를 제공합니다. 모든 진단과 처방의
          최종 판단은 한의사가 합니다.
        </p>
        <span>© {new Date().getFullYear()} 온고지신 AI</span>
        {/* 버전 표기 — 문의가 들어왔을 때 "무슨 버전 쓰고 계세요"를 되묻지
              않으려면, 쓰는 사람이 스스로 찾을 수 있는 자리에 적혀 있어야
              한다. */}
        <span className="landing-version">
          웹 v{APP_VERSION} ({BUILD_DATE}) · 데스크톱 v{desktopVersion}
        </span>
      </div>
    </footer>
  )
}
