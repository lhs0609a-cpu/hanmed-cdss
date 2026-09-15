import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  LockKeyhole,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSEO } from '@/hooks/useSEO'
import { usePublicStats } from '@/hooks/usePublicStats'
import { useLandingTracking } from './components/useLandingTracking'
import { ClinicalDemo, type DemoEvent } from './components/PublicCaseDemo'
import {
  ANNUAL_DISCOUNT_LABEL,
  BILLING_ADDON,
  buildVerifiedFacts,
  formatKRW,
  PLAN_TIERS,
} from './components/PricingData'
import './landing.css'
import './conversion.css'

const NAV = [
  { href: '#demo', label: '제품 체험' },
  { href: '#features', label: '주요 기능' },
  { href: '#evidence', label: '근거와 신뢰' },
  { href: '#pricing', label: '요금제' },
]
const PRODUCT_VIEWS = [
  {
    title: '변증 후보 추론',
    label: '변증',
    image: '/screens/pattern.webp',
    icon: Sparkles,
    text: '입력한 소견과 변증 후보를 함께 살펴보세요. 후보의 근거를 확인하며 임상 판단을 이어갈 수 있습니다.',
  },
  {
    title: '치험례 검색',
    label: '치험례',
    image: '/screens/cases.webp',
    icon: Search,
    text: '환자와 닮은 임상 기록을 찾아보세요. 증상뿐 아니라 처방 구성과 진료 경과까지 맥락을 함께 읽습니다.',
  },
  {
    title: '처방 데이터베이스',
    label: '처방',
    image: '/screens/formulas.webp',
    icon: BookOpen,
    text: '처방의 구성과 효능, 가감 정보를 한곳에서 탐색하세요. 필요한 정보를 진료 가까이에 둡니다.',
  },
] as const
const FAQS = [
  {
    q: '온고지신 AI는 어떤 서비스인가요?',
    a: '한의사를 위한 임상 의사결정 지원 서비스(CDSS)입니다. 변증 후보 추론, 치험례 검색, 처방·약재 정보 조회, 약물 상호작용 점검, 환자 기록 등 진료에 필요한 도구를 제공합니다. 최종 진단과 처방은 한의사가 결정합니다.',
  },
  {
    q: '가입 전에 제품을 체험할 수 있나요?',
    a: '가입 없이 공개 학회지 증례의 소견·변증·처방·경과와 원문 출처를 살펴볼 수 있습니다. 문헌을 요약한 고정 예시이며 실시간 검색이나 AI 분석 결과는 아닙니다. ‘실제 프로그램 둘러보기’에서는 게스트 모드로 제품 화면을 확인할 수 있습니다.',
  },
  {
    q: '무료 플랜은 어디까지 사용할 수 있나요?',
    a: '처방·약재·경혈 데이터베이스 열람, 환자 등록 및 진료 기록 작성, 약물 상호작용 기본 점검을 제공하며 AI 챗봇은 월 50회 포함됩니다. 무료 플랜에는 사용 기간 제한이 없습니다. 기능별 상세 범위는 요금표에서 확인할 수 있습니다.',
  },
  {
    q: '기존 차트 데이터를 가져올 수 있나요?',
    a: 'CSV 파일을 통한 환자·진료 기록 가져오기를 지원합니다. 파일에 포함된 항목과 변환 결과를 확인한 후 사용해 주세요. 사용 중인 시스템의 내보내기 형식이나 도입 절차는 이메일로 문의할 수 있습니다.',
  },
  {
    q: '환자 정보와 접근 권한은 어떻게 관리하나요?',
    a: '환자 정보 보호와 이용 범위는 개인정보처리방침에서 확인할 수 있습니다. Clinic 플랜은 직역별 권한 분리와 한의원 감사 로그를 제공합니다. 서버 보관 등 필요한 기능의 제공 플랜을 확인한 후 도입해 주세요.',
  },
  {
    q: '연간 결제와 보험청구 부가서비스가 궁금합니다.',
    a: `연간 결제에는 ${ANNUAL_DISCOUNT_LABEL} 혜택이 적용되며 요금표에 연간 총 결제 금액이 표시됩니다. 보험청구·삭감방지는 별도 요금의 부가서비스입니다. 기존 청구 프로그램의 연동·자동 제출 지원 여부와 도입 가능한 범위는 신청 전 문의해 주세요.`,
  },
]

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

export default function LandingPage() {
  const navigate = useNavigate()
  const { stats, isLive } = usePublicStats()
  const { trackButtonClick, trackFeatureUsed } = useLandingTracking()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [productView, setProductView] = useState(1)
  const menuButton = useRef<HTMLButtonElement>(null)
  const productButtons = useRef<(HTMLButtonElement | null)[]>([])
  const selectedProduct = PRODUCT_VIEWS[productView]

  useSEO({
    title: '처방이 고민될 때, 비슷한 치험례부터 | 온고지신 AI',
    description:
      '한의사를 위한 치험례 검색과 처방·약재 정보. 가입 없이 공개 증례를 살펴보고, 기간 제한 없는 무료 플랜으로 시작하세요.',
    ogImage: 'https://www.ongojisin.co.kr/brand/clinical/og-clinical-v1.png',
  })

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

  const handleTry = () => {
    trackButtonClick('landing_guest_try')
    // Preserve an authenticated session when returning from the marketing page.
    const auth = useAuthStore.getState()
    if (!auth.isAuthenticated) auth.enterAsGuest()
    navigate('/dashboard')
  }
  const handleDemoEvent = (event: DemoEvent, detail: string) =>
    trackFeatureUsed(event, { context: detail, surface: 'landing' })

  return (
    <div className="clinical-landing">
      <a className="landing-skip" href="#main">
        본문으로 바로가기
      </a>
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Brand />
          <nav className="landing-desktop-nav" aria-label="주 메뉴">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
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
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileMenuOpen && (
          <nav
            className="landing-mobile-nav"
            id="landing-mobile-nav"
            aria-label="모바일 메뉴"
          >
            {NAV.map((item) => (
              <a
                href={item.href}
                key={item.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ))}
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
      <main id="main">
        <section
          className="landing-hero landing-container"
          aria-labelledby="hero-title"
        >
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span aria-hidden="true" />
              한의사를 위한 임상 워크스페이스
            </span>
            <h1 id="hero-title">
              처방이 고민될 때,
              <br />
              <em>비슷한 치험례부터</em>
              <br />
              찾아보세요.
            </h1>
            <p className="hero-description">
              환자 소견과 관련된 치험례를 찾고,
              <br />
              처방 구성·진료 경과·출처를 함께 검토하세요.
            </p>
            <div className="hero-actions">
              <a
                href="#demo"
                className="landing-button"
                data-growth="demo_start"
                onClick={() => trackButtonClick('landing_demo_start')}
              >
                가입 없이 샘플 보기 <ArrowDown size={17} aria-hidden="true" />
              </a>
              <Link
                to="/register"
                className="landing-button landing-button-outline"
                data-growth="signup_hero"
                onClick={() => trackButtonClick('landing_signup_hero')}
              >
                무료 회원가입 <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <p className="hero-footnote">
              <Check size={15} /> 카드 등록 없음 · 무료 플랜은 기간 제한 없음
            </p>
          </div>
          <div className="hero-people-product">
            <div className="hero-practitioner">
              <div className="practitioner-copy">
                <span>온고지신 AI</span>
                <strong>
                  진료의 중심은
                  <br />
                  언제나 한의사.
                </strong>
                <p>
                  찾고, 비교하고, 판단하는
                  <br />
                  선생님의 진료를 돕습니다.
                </p>
              </div>
              <img
                className="practitioner-photo"
                src="/brand/model-cutout.webp"
                width={376}
                height={1392}
                alt="흰 가운을 입고 미소 짓는 온고지신 AI 브랜드 모델"
                fetchPriority="high"
              />
              <span className="practitioner-label">브랜드 모델 이미지</span>
            </div>
            <div className="hero-result">
              <div className="hero-result-header">
                <span>
                  <Search size={17} /> 치험례 검색
                </span>
                <span>실제 제품 화면</span>
              </div>
              <img
                src="/screens/cases.webp"
                alt="온고지신 AI 치험례 검색 화면: 증상과 처방으로 기록을 탐색하는 제품 인터페이스"
                width={1600}
                height={911}
                fetchPriority="high"
              />
              <div className="hero-result-caption">
                <strong>증상만 찾는 데서 끝나지 않도록.</strong>
                <span>소견 → 관련 기록 → 처방과 경과 → 출처 확인</span>
              </div>
              <a
                href="#demo"
                data-growth="demo_preview"
                className="landing-text-link"
              >
                공개 증례 한 건 직접 살펴보기 <ArrowRight size={17} />
              </a>
            </div>
          </div>
        </section>

        <section
          id="demo"
          className="landing-section landing-container"
          aria-labelledby="demo-title"
        >
          <div className="section-heading section-heading-split">
            <div>
              <span className="landing-eyebrow">MEET YOUR WORKSPACE</span>
              <h2 id="demo-title">
                내 환자와 무엇이 비슷한지,
                <br />
                기록을 직접 비교해 보세요.
              </h2>
            </div>
            <p>
              공개 학회지 증례의 소견부터 처방과 경과까지.
              <br />
              아래 항목을 눌러 원문과 함께 확인하세요.
            </p>
          </div>
          <ClinicalDemo onEvent={handleDemoEvent} onTry={handleTry} />
        </section>

        <section
          id="evidence"
          className="landing-section landing-container evidence-compact"
          aria-labelledby="evidence-title"
        >
          <div className="section-heading">
            <span className="landing-eyebrow">직접 확인할 수 있는 정보</span>
            <h2 id="evidence-title">
              답만 읽지 말고,
              <br />
              판단의 근거까지 확인하세요.
            </h2>
          </div>
          <div className="trust-strip">
            <div>
              <BookOpen size={22} />
              <h3>출처까지 확인</h3>
              <p>
                치험례와 문헌의 원문 정보를 확인하고, 환자 소견과 기록의 차이를
                비교합니다.
              </p>
              <a href="#demo" className="landing-text-link">
                공개 문헌 예시 보기 <ArrowRight size={15} />
              </a>
            </div>
            <div>
              <ShieldCheck size={22} />
              <h3>의료진이 검토하고 결정</h3>
              <p>
                변증 후보와 참고 기록을 검토하는 도구입니다. 최종 진단과 처방은
                한의사가 결정합니다.
              </p>
            </div>
            <div>
              <LockKeyhole size={22} />
              <h3>체험에 환자 정보는 필요 없어요</h3>
              <p>
                공개 증례로 먼저 살펴보세요. 실제 이용 시 정보 처리 범위도
                확인할 수 있습니다.
              </p>
              <Link to="/privacy">
                개인정보처리방침 <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </section>
        <section
          className="landing-stats landing-container"
          aria-label="서비스 수록 데이터"
        >
          <div className="stats-intro">
            <span className="landing-eyebrow">BUILT ON KNOWLEDGE</span>
            <p>
              오랜 임상의 축적을
              <br />
              <strong>오늘의 진료로.</strong>
            </p>
          </div>
          <dl>
            {buildVerifiedFacts(stats).map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>
                  {fact.value}
                  <span>{fact.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="stats-source">
            {isLive ? '공개 데이터 집계 기준' : '최근 등록된 데이터 기준'} ·
            자료 수는 임상적 유효성의 평가 수치가 아닙니다.
          </p>
        </section>

        <section
          id="features"
          className="landing-section landing-features"
          aria-labelledby="features-title"
        >
          <div className="landing-container">
            <div className="section-heading section-heading-center">
              <span className="landing-eyebrow">
                DESIGNED AROUND YOUR PRACTICE
              </span>
              <h2 id="features-title">
                찾는 시간을 줄이고,
                <br />
                생각할 여유를 더하세요.
              </h2>
              <p>진료에 필요한 정보를, 필요한 자리에.</p>
            </div>
            <div className="product-showcase">
              <div className="product-showcase-copy">
                <span className="landing-eyebrow">
                  THE PRODUCT, IN PRACTICE
                </span>
                <h3>{selectedProduct.title}</h3>
                <p>{selectedProduct.text}</p>
                <button
                  type="button"
                  className="landing-text-link"
                  onClick={handleTry}
                >
                  실제 프로그램 둘러보기
                  <ArrowUpRight size={17} aria-hidden="true" />
                </button>
                <div
                  role="tablist"
                  aria-label="제품 화면 선택"
                  className="product-view-tabs"
                >
                  {PRODUCT_VIEWS.map(({ label, icon: Icon }, index) => (
                    <button
                      type="button"
                      role="tab"
                      key={label}
                      id={`product-tab-${index}`}
                      aria-selected={productView === index}
                      aria-controls="product-screen-panel"
                      tabIndex={productView === index ? 0 : -1}
                      ref={(node) => {
                        productButtons.current[index] = node
                      }}
                      onClick={() => {
                        setProductView(index)
                        trackButtonClick(`landing_product_${index}`)
                      }}
                      onKeyDown={(event) => {
                        let next = index
                        if (event.key === 'ArrowRight')
                          next = (index + 1) % PRODUCT_VIEWS.length
                        else if (event.key === 'ArrowLeft')
                          next =
                            (index + PRODUCT_VIEWS.length - 1) %
                            PRODUCT_VIEWS.length
                        else if (event.key === 'Home') next = 0
                        else if (event.key === 'End')
                          next = PRODUCT_VIEWS.length - 1
                        else return
                        event.preventDefault()
                        setProductView(next)
                        productButtons.current[next]?.focus()
                      }}
                    >
                      <Icon size={15} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="product-screen"
                role="tabpanel"
                id="product-screen-panel"
                aria-labelledby={`product-tab-${productView}`}
              >
                <div className="product-screen-top">
                  <span className="window-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>ongojisin.ai</span>
                  <span>실제 제품 화면</span>
                </div>
                <img
                  key={selectedProduct.image}
                  src={selectedProduct.image}
                  alt={`${selectedProduct.title} 실제 제품 화면`}
                  width={1600}
                  height={911}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <div className="feature-utilities">
              <span>진료를 함께 돕는 도구</span>
              <p>
                <ShieldCheck size={16} aria-hidden="true" />
                약물 상호작용 점검
              </p>
              <p>
                <ClipboardList size={16} aria-hidden="true" />
                수가·상병 코드 조회
              </p>
              <p>
                <Users size={16} aria-hidden="true" />
                환자·진료 기록 관리
              </p>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="landing-section landing-container"
          aria-labelledby="pricing-title"
        >
          <div className="section-heading section-heading-center">
            <span className="landing-eyebrow">ROOM TO GROW</span>
            <h2 id="pricing-title">
              무료로 시작하고,
              <br />
              진료에 맞춰 넓혀가세요.
            </h2>
            <p>필요한 기능과 AI 사용량에 맞는 플랜을 선택하세요.</p>
          </div>
          <div className="free-start-card">
            <div>
              <span className="case-badge">기간 제한 없는 무료 플랜</span>
              <h3>카드 없이, 필요한 기능부터.</h3>
              <p>
                처방·약재·경혈 DB · 환자 등록과 진료 기록
                <br />
                약물 상호작용 기본 점검 · AI 챗봇 월 50회
              </p>
              <span>치험례 전체 열람은 Basic 이상에서 제공됩니다.</span>
            </div>
            <Link
              to="/register"
              className="landing-button"
              data-growth="signup_free_plan"
            >
              무료 계정 만들기 <ArrowRight size={17} />
            </Link>
          </div>
          <details className="full-pricing">
            <summary data-growth="pricing_expand">
              전체 요금제·기능·결제 조건 비교하기 <ChevronDown size={18} />
            </summary>
            <div className="pricing-toggle" role="group" aria-label="결제 주기">
              <button
                type="button"
                aria-pressed={!isAnnual}
                onClick={() => {
                  setIsAnnual(false)
                  trackButtonClick('landing_billing_monthly')
                }}
              >
                월 결제
              </button>
              <button
                type="button"
                aria-pressed={isAnnual}
                onClick={() => {
                  setIsAnnual(true)
                  trackButtonClick('landing_billing_annual')
                }}
              >
                연 결제<span>{ANNUAL_DISCOUNT_LABEL}</span>
              </button>
            </div>
            <div className="pricing-grid">
              {PLAN_TIERS.map((plan) => (
                <article
                  className={`pricing-card ${plan.highlight ? 'pricing-card-featured' : ''}`}
                  key={plan.id}
                >
                  <div className="pricing-card-heading">
                    <h3>{plan.name}</h3>
                    {plan.highlight && <span>매일의 진료에</span>}
                  </div>
                  <p className="pricing-tagline">{plan.tagline}</p>
                  <div className="pricing-price">
                    <strong>
                      {plan.monthly === 0
                        ? '무료'
                        : formatKRW(isAnnual ? plan.yearly : plan.monthly)}
                    </strong>
                    {plan.monthly > 0 && (
                      <span>원 / {isAnnual ? '년' : '월'}</span>
                    )}
                  </div>
                  <p className="pricing-allowance">
                    AI 챗봇 월 {formatKRW(plan.includedQueries)}회 포함
                  </p>
                  <Link
                    to="/register"
                    className={`landing-button ${plan.highlight ? '' : 'landing-button-outline'}`}
                    onClick={() =>
                      trackButtonClick(
                        `landing_plan_${plan.id}_${isAnnual ? 'annual' : 'monthly'}`,
                      )
                    }
                  >
                    {plan.cta}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <Check size={15} aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="pricing-addon">
              <div>
                <span className="addon-label">CLINIC ADD-ON</span>
                <h3>{BILLING_ADDON.name}</h3>
                <p>
                  Clinic 플랜에 별도로 추가하는 부가서비스입니다. 연동·자동
                  제출의 지원 범위는 도입 전 확인해 주세요.
                </p>
              </div>
              <div>
                <strong>
                  {formatKRW(
                    isAnnual ? BILLING_ADDON.yearly : BILLING_ADDON.monthly,
                  )}
                  <span>원 / {isAnnual ? '년' : '월'}</span>
                </strong>
                <a
                  href="mailto:lhs0609c@naver.com?subject=%EC%98%A8%EA%B3%A0%EC%A7%80%EC%8B%A0%20AI%20%EB%8F%84%EC%9E%85%20%EB%AC%B8%EC%9D%98"
                  onClick={() => trackButtonClick('landing_addon_contact')}
                >
                  도입 문의
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
            <p className="pricing-note">
              표시 금액은 부가세 별도입니다. 연 결제 선택 시 연간 총액이
              표시됩니다.
              <br />
              결제일 기준 자동 갱신되며, 해지·환불 조건은{' '}
              <Link to="/subscription-terms">구독 약관</Link>과{' '}
              <Link to="/refund-policy">환불정책</Link>에서 확인할 수 있습니다.
            </p>
          </details>
        </section>

        <section
          id="faq"
          className="landing-section landing-faq landing-container"
          aria-labelledby="faq-title"
        >
          <div className="faq-heading">
            <span className="landing-eyebrow">A LITTLE MORE CLARITY</span>
            <h2 id="faq-title">
              궁금한 점을
              <br />
              남기지 않도록.
            </h2>
            <p>도입에 도움이 필요하신가요?</p>
            <a
              href="mailto:lhs0609c@naver.com"
              className="landing-text-link"
              onClick={() => trackButtonClick('landing_contact')}
            >
              이메일로 문의하기
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <div className="faq-list">
            {FAQS.map((faq, index) => (
              <div
                className={`faq-item ${openFaq === index ? 'is-open' : ''}`}
                key={faq.q}
              >
                <h3>
                  <button
                    type="button"
                    id={`faq-trigger-${index}`}
                    aria-expanded={openFaq === index}
                    aria-controls={`faq-answer-${index}`}
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    {faq.q}
                    <ChevronDown size={19} aria-hidden="true" />
                  </button>
                </h3>
                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${index}`}
                  hidden={openFaq !== index}
                >
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="landing-final-cta landing-container"
          aria-labelledby="final-cta-title"
        >
          <div className="final-cta-inner">
            <span className="landing-eyebrow">
              YOUR NEXT CHAPTER OF PRACTICE
            </span>
            <h2 id="final-cta-title">
              다음 진료에서 쓸 도구,
              <br />
              오늘 무료로 시작하세요.
            </h2>
            <p>처방·약재 정보와 AI 챗봇부터 직접 사용해 보세요.</p>
            <div>
              <Link
                to="/register"
                className="landing-button landing-button-light"
                data-growth="signup_footer"
                onClick={() => trackButtonClick('landing_signup_footer')}
              >
                무료로 시작하기
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <button
                type="button"
                className="final-try-button"
                onClick={handleTry}
              >
                프로그램 둘러보기
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
            <span className="final-cta-note">
              설치 없이 브라우저에서 · 카드 등록 없이 시작
            </span>
          </div>
          <div className="final-cta-art" aria-hidden="true">
            <img
              src="/brand/clinical/clarity-hero-768.webp"
              alt=""
              width={768}
              height={512}
              loading="lazy"
              decoding="async"
            />
          </div>
        </section>
      </main>
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
            <a href="#demo">제품 체험</a>
            <a href="#features">주요 기능</a>
            <a href="#pricing">요금제</a>
            <a href="#faq">자주 묻는 질문</a>
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
            본 서비스는 한의사의 임상 의사결정을 보조하는 참고 정보를
            제공합니다. 모든 진단과 처방의 최종 판단은 한의사가 합니다.
          </p>
          <span>© {new Date().getFullYear()} 온고지신 AI</span>
        </div>
      </footer>
    </div>
  )
}
