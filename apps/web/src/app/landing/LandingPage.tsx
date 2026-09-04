import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSEO } from '@/hooks/useSEO'
import { ArrowRight, Check, ChevronDown, Menu, X } from 'lucide-react'
import { LogoMark } from '@/components/common'
import { BASE_STATS } from '@/config/stats.config'
import {
  MockupPatternDiagnosis,
  MockupCaseSearch,
  MockupClaimCheck,
  MockupInteraction,
  MockupFormulaSearch,
} from '@/components/common/FeatureMockups'
import { MeshBackdrop, GridFloor, GrainOverlay, Orb, GlassOrb } from './components/AbstractBackdrop'
import { AppWindowMockup } from './components/AppWindowMockup'
import {
  PLAN_TIERS,
  BILLING_ADDON,
  VERIFIED_FACTS,
  ANNUAL_DISCOUNT_LABEL,
  formatKRW,
} from './components/PricingData'

/* ────────────────────────────────────────────────────────────
   공통 프리미티브
   ──────────────────────────────────────────────────────────── */

/** 글래스 카드 — 랜딩 전역에서 재사용 */
function GlassCard({
  children,
  className = '',
  glow = false,
}: {
  children: React.ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl ${className}`}
      style={{
        background:
          'linear-gradient(160deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 100%)',
        boxShadow: glow
          ? '0 30px 90px -30px rgba(49,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.12)'
          : '0 20px 60px -30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}
    >
      {children}
    </div>
  )
}

/** 섹션 상단 라벨 */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[12px] font-medium tracking-wide text-white/60 backdrop-blur">
      {children}
    </span>
  )
}

function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string
  title: React.ReactNode
  desc?: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <h2 className="mt-5 text-[32px] font-bold leading-[1.22] tracking-[-0.02em] text-white sm:text-[42px]">
        {title}
      </h2>
      {desc && (
        <p className="mt-4 text-[15px] leading-relaxed text-white/55 sm:text-[17px]">{desc}</p>
      )}
    </div>
  )
}

const NAV_LINKS = [
  { href: '#features', label: '기능' },
  { href: '#flow', label: '작동 방식' },
  { href: '#pricing', label: '요금제' },
  { href: '#faq', label: 'FAQ' },
]

/* ────────────────────────────────────────────────────────────
   콘텐츠
   ──────────────────────────────────────────────────────────── */

const PAIN_POINTS = [
  {
    n: '01',
    title: '변증은 머릿속에,\n근거는 책장에',
    body: '판단은 이미 서 있는데, 뒷받침할 조문과 유사 사례를 찾으려면 진료를 멈춰야 합니다.',
  },
  {
    n: '02',
    title: '차트를 쓰다 보면\n다음 환자가 밀린다',
    body: '진료보다 기록에 시간이 더 드는 날이 있습니다. SOAP 형식을 갖추려면 더 그렇습니다.',
  },
  {
    n: '03',
    title: '삭감은 늘\n한참 뒤에 알게 된다',
    body: '청구 시점에는 문제가 보이지 않고, 심사 결과가 와야 무엇이 잘못됐는지 알 수 있습니다.',
  },
]

const FEATURES = [
  {
    mockup: MockupPatternDiagnosis,
    shot: '/screens/pattern.webp',
    title: '변증 후보 추론',
    body: '증상·설진·맥진을 입력하면 팔강·장부 변증 후보를 입력 소견과의 일치도 순으로 제시합니다. 근거가 된 조문과 사례를 함께 보여줘 판단을 검증할 수 있습니다.',
  },
  {
    mockup: MockupCaseSearch,
    shot: '/screens/cases.webp',
    title: '치험례 검색',
    body: '지금 보고 있는 환자와 닮은 실제 임상 사례를 찾아, 어떤 처방이 어떤 경과로 이어졌는지 확인합니다.',
  },
  {
    mockup: MockupClaimCheck,
    title: '수가·상병 코드 조회',
    body: '한방 수가 코드와 산정 기준을 처방 화면을 벗어나지 않고 찾아봅니다. 청구 프로그램 연동과 자동 제출은 아직 지원하지 않습니다.',
  },
  {
    mockup: MockupInteraction,
    title: '약물 상호작용 점검',
    body: '환자가 복용 중인 양약과 한약재의 상호작용을 처방 시점에 검사합니다.',
  },
  {
    mockup: MockupFormulaSearch,
    shot: '/screens/formulas.webp',
    title: '처방 데이터베이스',
    body: `방약합편 기반 처방 ${BASE_STATS.formulas}건을 구성·효능·가감으로 탐색하고, 유사 처방과 비교합니다.`,
  },
]

const FLOW_STEPS = [
  {
    step: '01',
    title: '증상 입력',
    body: '문진 내용을 그대로 적거나 말하면 됩니다. 형식을 맞출 필요는 없습니다.',
  },
  {
    step: '02',
    title: '근거와 함께 후보 제시',
    body: '변증 후보, 처방 후보, 참고 치험례가 약재 구성과 근거를 달고 나옵니다.',
  },
  {
    step: '03',
    title: '한의사가 결정',
    body: '제안은 후보일 뿐입니다. 선택과 가감은 한의사가 하고, 시스템은 그 결정을 기록합니다.',
  },
  {
    step: '04',
    title: '차트와 설명자료로',
    body: '결정한 내용이 환자 차트에 남고, 환자 설명자료와 진료 근거서로 바로 출력됩니다.',
  },
]

const FAQS = [
  {
    q: '온고지신 AI는 정확히 무엇인가요?',
    a: '한의사를 위한 임상 결정 보조(CDSS)입니다. 증상을 입력하면 변증 후보와 처방 후보를 근거·약재 구성·유사 치험례와 함께 제시하고, 환자 차트와 설명자료로 이어집니다. 보험 청구 프로그램을 대체하지는 않으며, 수가·상병 코드 조회를 보조합니다.',
  },
  {
    q: 'AI가 진단을 대신하나요?',
    a: '아닙니다. AI가 내놓는 것은 근거가 붙은 후보이며, 진단과 처방의 최종 결정은 한의사가 합니다. 시스템은 그 결정 과정을 기록해 이후 검토할 수 있게 합니다.',
  },
  {
    q: '무료 플랜으로 어디까지 쓸 수 있나요?',
    a: '처방·약재·경혈 데이터베이스 열람, 환자 등록과 진료 기록 작성 같은 핵심 임상 기능은 무료 플랜에서 계속 쓸 수 있습니다. AI 챗봇은 월 50회까지 제공됩니다.',
  },
  {
    q: '기존에 쓰던 차트 데이터를 옮길 수 있나요?',
    a: 'CSV 파일을 올리면 구조를 자동으로 분석해 환자·진료 기록으로 변환합니다. 별도의 EMR 종류 선택 없이 파일만 넣으면 됩니다.',
  },
  {
    q: '연간 결제는 얼마나 저렴한가요?',
    a: `연간 결제 시 ${ANNUAL_DISCOUNT_LABEL} 혜택이 적용됩니다. 언제든 월 결제로 전환할 수 있습니다.`,
  },
  {
    q: '환자 개인정보는 어떻게 보호되나요?',
    a: '환자 식별 정보는 암호화해 저장하며, 한의원 단위로 접근 권한을 분리합니다. 직역(원장·한의사·접수·간호·청구)별로 볼 수 있는 범위가 나뉘고, 접근 기록은 감사 로그로 남습니다.',
  },
]

/* ────────────────────────────────────────────────────────────
   페이지
   ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate()
  const enterAsGuest = useAuthStore((state) => state.enterAsGuest)
  useSEO()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const handleTryProgram = () => {
    enterAsGuest()
    navigate('/dashboard')
  }

  return (
    <div className="ojs-immersive relative min-h-screen overflow-x-hidden bg-[#05070D] text-white antialiased">
      {/* ═══ 전역 배경 ═══ */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <MeshBackdrop />
        <GrainOverlay opacity={0.14} />
      </div>

      {/* ═══ 내비게이션 ═══ */}
      <header className="sticky top-0 z-50">
        <div
          className="border-b border-white/8 backdrop-blur-xl"
          style={{ background: 'rgba(5,7,13,0.62)' }}
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <LogoMark size={32} />
              <span className="text-[16px] font-bold tracking-tight">온고지신 AI</span>
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-[14px] text-white/55 transition-colors hover:text-white"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <Link
                to="/login"
                className="text-[14px] font-medium text-white/70 transition-colors hover:text-white"
              >
                로그인
              </Link>
              <Link
                to="/register"
                className="rounded-lg px-4 py-2 text-[14px] font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #3182F6, #5B7CFA)' }}
              >
                무료로 시작
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden"
              aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className="border-b border-white/8 px-6 py-4 backdrop-blur-xl md:hidden"
            style={{ background: 'rgba(5,7,13,0.92)' }}
          >
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-2 py-2.5 text-[15px] text-white/70"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-white/8 pt-4">
                <Link to="/login" className="rounded-lg px-2 py-2.5 text-[15px] text-white/70">
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg px-4 py-2.5 text-center text-[15px] font-semibold"
                  style={{ background: 'linear-gradient(135deg, #3182F6, #5B7CFA)' }}
                >
                  무료로 시작
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ═══ 히어로 ═══ */}
      <section className="relative z-10 overflow-hidden px-6 pb-24 pt-20 sm:pt-28">
        <Orb size="34rem" color="rgba(49,130,246,0.55)" className="-left-40 -top-32" />
        <Orb size="28rem" color="rgba(120,86,255,0.45)" className="-right-32 top-10" delay="-4s" />
        <GlassOrb size="10rem" className="right-[8%] top-[52%] hidden lg:block" delay="-2s" />
        <GlassOrb size="5.5rem" className="left-[6%] top-[30%] hidden lg:block" delay="-7s" />
        <GridFloor />

        <div className="relative mx-auto max-w-6xl">
          {/* 넓은 화면에서는 카피 왼쪽 · 모델 오른쪽. 좁은 화면에서는 카피만 가운데로. */}
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="text-center lg:text-left">
          <div className="ojs-rise">
            <SectionEyebrow>
              치험례 {BASE_STATS.cases.toLocaleString()}건 · 40년 임상 기록
            </SectionEyebrow>
          </div>

          <h1
            className="ojs-rise mt-7 text-[40px] font-bold leading-[1.14] tracking-[-0.035em] sm:text-[68px]"
            style={{ animationDelay: '0.06s' }}
          >
            <span
              className="bg-clip-text text-transparent"
              style={
                {
                  '--ojs-text-gradient': 'linear-gradient(180deg, #FFFFFF 0%, #A9C2EC 100%)',
                } as React.CSSProperties
              }
            >
              40년치 임상 기록으로
              <br />
              오늘의 환자를 봅니다
            </span>
          </h1>

          <p
            className="ojs-rise mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/60 sm:text-[19px] lg:mx-0"
            style={{ animationDelay: '0.12s' }}
          >
            증상을 입력하면 가장 가까운 치험례와 처방 후보를 약재 구성·근거까지 붙여
            30초에 돌려드립니다.{' '}
            <br className="hidden sm:block" />
            최종 판단은 언제나 한의사가 합니다.
          </p>

          <div
            className="ojs-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
            style={{ animationDelay: '0.18s' }}
          >
            <div className="relative">
              <div
                aria-hidden
                className="ojs-pulse-glow absolute -inset-3 rounded-2xl blur-xl"
                style={{
                  background: 'radial-gradient(circle, rgba(49,130,246,0.55), transparent 70%)',
                }}
              />
              <Link
                to="/register"
                className="relative inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #3182F6, #5B7CFA)' }}
              >
                무료로 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <button
              type="button"
              onClick={handleTryProgram}
              className="inline-flex items-center gap-2 rounded-xl border border-white/14 bg-white/5 px-7 py-3.5 text-[16px] font-semibold text-white/90 backdrop-blur-xl transition-colors hover:bg-white/10"
            >
              둘러보기
            </button>
          </div>

          <p className="ojs-rise mt-5 text-[13px] text-white/35" style={{ animationDelay: '0.24s' }}>
            신용카드 없이 시작 · 무료 플랜은 기간 제한 없이 사용
          </p>
            </div>

            {/* 브랜드 모델 — 배경을 따낸 누끼라 다크 지면 위에 그대로 선다. */}
            <div
              className="ojs-rise relative flex justify-center"
              style={{ animationDelay: '0.26s' }}
            >
              <div
                aria-hidden
                className="absolute bottom-0 h-[85%] w-[110%] rounded-full blur-3xl"
                style={{
                  background:
                    'radial-gradient(ellipse 45% 50% at 50% 55%, rgba(49,130,246,0.38), transparent 70%)',
                }}
              />
              {/* 바닥에 닿는 그림자 — 인물이 공중에 뜬 느낌을 없앤다 */}
              <div
                aria-hidden
                className="absolute bottom-1 h-6 w-[70%] rounded-[100%] blur-md"
                style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)' }}
              />
              <img
                src="/brand/model-cutout.webp"
                alt="온고지신 AI 브랜드 모델"
                width={381}
                height={1400}
                loading="eager"
                decoding="async"
                className="relative h-[420px] w-auto sm:h-[520px] lg:h-[600px]"
              />
            </div>
          </div>

          {/* 근거 막대 — 첫 화면 안에 들어와야 한다.
              헤드라인이 "40년치 임상 기록으로" 라고 약속했으면 그 근거가
              스크롤 전에 보여야 한다. 예전에는 앱 목업 아래에 있어서
              화면 두 번을 내려야 나왔다 — 그러면 약속만 하고 증거는 안 대는
              꼴이 된다. */}
          <div
            className="ojs-rise mt-12 rounded-2xl border border-white/10 px-4 py-6 backdrop-blur-xl sm:mt-14 sm:px-8 sm:py-7"
            style={{
              background:
                'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
            }}
          >
            <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0">
              {VERIFIED_FACTS.map((f, i) => (
                <div
                  key={f.label}
                  className={`text-center ${i > 0 ? 'sm:border-l sm:border-white/10' : ''}`}
                >
                  <p className="text-[30px] font-bold tabular-nums tracking-tight text-white sm:text-[38px]">
                    {f.value}
                    <span className="ml-0.5 text-[16px] font-semibold text-white/45">{f.unit}</span>
                  </p>
                  <p className="mt-1.5 text-[12px] leading-snug text-white/50 sm:text-[13px]">
                    {f.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="ojs-rise mt-14 sm:mt-16" style={{ animationDelay: '0.3s' }}>
            <AppWindowMockup />
          </div>
        </div>
      </section>

      {/* ═══ 문제 제기 ═══ */}
      <section className="relative z-10 px-6 py-24">
        <SectionHeading
          eyebrow="왜 필요한가"
          title={
            <>
              진료실에서 매일
              <br />
              반복되는 세 가지
            </>
          }
        />

        <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
          {PAIN_POINTS.map((p) => (
            <GlassCard key={p.n} className="p-7">
              <span className="text-[13px] font-bold tabular-nums text-[#5B8DEF]">{p.n}</span>
              <h3 className="mt-4 whitespace-pre-line text-[20px] font-bold leading-snug tracking-tight text-white">
                {p.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-white/50">{p.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ═══ 기능 ═══ */}
      <section id="features" className="relative z-10 scroll-mt-20 px-6 py-24">
        <Orb size="30rem" color="rgba(49,130,246,0.30)" className="left-1/2 top-0 -translate-x-1/2" />

        <SectionHeading
          eyebrow="기능"
          title={
            <>
              판단을 대신하지 않습니다.
              <br />
              근거를 옆에 둡니다
            </>
          }
          desc="진료 흐름을 끊지 않는 자리에 필요한 정보를 놓았습니다."
        />

        <div className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ mockup: Mockup, shot, title, body }) => (
            <GlassCard
              key={title}
              className="p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              {/* 실제 제품 화면을 그대로 쓴다.
                  손으로 그린 축소 목업은 "있어 보이는 그림" 이지 증거가 아니다.
                  캡처가 아직 없는 기능만 기존 목업으로 남긴다. */}
              <div className="mb-5 overflow-hidden rounded-xl border border-white/10">
                {shot ? (
                  <img
                    src={shot}
                    alt={`${title} 실제 화면`}
                    width={1600}
                    height={911}
                    loading="lazy"
                    decoding="async"
                    className="block h-40 w-full object-cover object-top sm:h-44"
                  />
                ) : (
                  <Mockup size="md" />
                )}
              </div>
              <h3 className="text-[17px] font-bold tracking-tight text-white">{title}</h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-white/50">{body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ═══ 작동 방식 ═══ */}
      <section id="flow" className="relative z-10 scroll-mt-20 px-6 py-24">
        <SectionHeading
          eyebrow="작동 방식"
          title="입력에서 청구까지, 한 번만 씁니다"
          desc="같은 내용을 두 번 입력하지 않도록 설계했습니다."
        />

        <div className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((s) => (
            <GlassCard key={s.step} className="p-6">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[13px] font-bold"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(49,130,246,0.35), rgba(120,86,255,0.25))',
                }}
              >
                {s.step}
              </div>
              <h3 className="mt-4 text-[16px] font-bold tracking-tight text-white">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/50">{s.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ═══ 요금제 ═══ */}
      <section id="pricing" className="relative z-10 scroll-mt-20 px-6 py-24">
        <Orb size="32rem" color="rgba(120,86,255,0.28)" className="right-0 top-20" delay="-5s" />

        <SectionHeading
          eyebrow="요금제"
          title="쓰는 만큼만 지불합니다"
          desc="핵심 임상 기능은 무료 플랜에서 계속 사용할 수 있습니다."
        />

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <span
            className={`text-[14px] ${!isAnnual ? 'font-semibold text-white' : 'text-white/45'}`}
          >
            월 결제
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            aria-label="연간 결제로 전환"
            onClick={() => setIsAnnual((v) => !v)}
            className="relative h-6 w-11 rounded-full border border-white/15 transition-colors"
            style={{ background: isAnnual ? '#3182F6' : 'rgba(255,255,255,0.10)' }}
          >
            <span
              className="absolute top-1/2 rounded-full bg-white transition-transform"
              style={{
                height: '1.1rem',
                width: '1.1rem',
                marginTop: '-0.55rem',
                transform: isAnnual ? 'translateX(1.35rem)' : 'translateX(0.15rem)',
              }}
            />
          </button>
          <span className={`text-[14px] ${isAnnual ? 'font-semibold text-white' : 'text-white/45'}`}>
            연 결제
          </span>
          <span className="rounded-full border border-[#3182F6]/30 bg-[#3182F6]/15 px-2.5 py-0.5 text-[12px] font-semibold text-[#8AB4FF]">
            {ANNUAL_DISCOUNT_LABEL}
          </span>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_TIERS.map((plan) => {
            const price = isAnnual ? plan.yearly : plan.monthly
            const suffix = plan.monthly === 0 ? '' : isAnnual ? '원 / 년' : '원 / 월'
            return (
              <GlassCard
                key={plan.id}
                glow={plan.highlight}
                className={`flex flex-col p-6 ${plan.highlight ? 'ring-1 ring-[#3182F6]/45' : ''}`}
              >
                {plan.highlight && (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-[#3182F6] px-2.5 py-0.5 text-[11px] font-bold">
                    가장 많이 선택
                  </span>
                )}
                <h3 className="text-[18px] font-bold tracking-tight text-white">{plan.name}</h3>
                <p className="mt-1 text-[13px] text-white/45">{plan.tagline}</p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-[30px] font-bold tabular-nums tracking-tight text-white">
                    {price === 0 ? '무료' : formatKRW(price)}
                  </span>
                  {suffix && <span className="text-[13px] text-white/45">{suffix}</span>}
                </div>
                <p className="mt-1.5 text-[12px] text-white/35">
                  AI 챗봇 월 {formatKRW(plan.includedQueries)}회 포함
                </p>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-[13px] leading-relaxed text-white/65"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5B8DEF]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`mt-7 rounded-lg py-2.5 text-center text-[14px] font-semibold transition-colors ${
                    plan.highlight
                      ? 'text-white'
                      : 'border border-white/14 bg-white/5 text-white/85 hover:bg-white/10'
                  }`}
                  style={
                    plan.highlight
                      ? { background: 'linear-gradient(135deg, #3182F6, #5B7CFA)' }
                      : undefined
                  }
                >
                  {plan.cta}
                </Link>
              </GlassCard>
            )
          })}
        </div>

        <div className="mx-auto mt-5 max-w-6xl">
          <GlassCard className="flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-bold tracking-tight text-white">
                  {BILLING_ADDON.name}
                </h3>
                <span className="rounded-md border border-white/12 bg-white/5 px-2 py-0.5 text-[11px] text-white/50">
                  부가서비스
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-white/50">{BILLING_ADDON.description}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[22px] font-bold tabular-nums tracking-tight text-white">
                {formatKRW(isAnnual ? BILLING_ADDON.yearly : BILLING_ADDON.monthly)}
                <span className="ml-1 text-[13px] font-medium text-white/45">
                  원 / {isAnnual ? '년' : '월'}
                </span>
              </p>
              <p className="mt-0.5 text-[12px] text-white/35">기존 플랜에 추가</p>
            </div>
          </GlassCard>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-[12px] leading-relaxed text-white/30">
          표시 금액은 부가세 별도입니다. 결제일 기준으로 자동 갱신되며, 언제든 해지할 수 있습니다.
        </p>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="relative z-10 scroll-mt-20 px-6 py-24">
        <SectionHeading eyebrow="FAQ" title="자주 묻는 질문" />

        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {FAQS.map((faq, i) => {
            const open = openFaq === i
            return (
              <GlassCard key={faq.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-[15px] font-semibold text-white">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open && (
                  <p className="px-6 pb-5 text-[14px] leading-relaxed text-white/55">{faq.a}</p>
                )}
              </GlassCard>
            )
          })}
        </div>
      </section>

      {/* ═══ 마무리 CTA ═══ */}
      <section className="relative z-10 overflow-hidden px-6 py-28">
        <Orb size="36rem" color="rgba(49,130,246,0.45)" className="left-1/2 top-0 -translate-x-1/2" />
        <GlassOrb size="8rem" className="left-[12%] top-[20%] hidden lg:block" delay="-3s" />
        <GlassOrb size="6rem" className="right-[14%] top-[58%] hidden lg:block" delay="-8s" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="relative mx-auto mb-8 w-fit">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-full blur-2xl"
              style={{
                background: 'radial-gradient(circle, rgba(49,130,246,0.45), transparent 70%)',
              }}
            />
            <img
              src="/brand/model-avatar.webp"
              alt="온고지신 AI 브랜드 모델"
              width={104}
              height={104}
              loading="lazy"
              decoding="async"
              className="relative h-[104px] w-[104px] rounded-full border border-white/20 object-cover shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]"
            />
          </div>

          <h2 className="text-[34px] font-bold leading-[1.2] tracking-[-0.025em] text-white sm:text-[48px]">
            오늘 진료부터
            <br />
            바로 써보세요
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/55">
            설치할 것도, 계약할 것도 없습니다. 가입하면 바로 첫 환자를 등록할 수 있습니다.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #3182F6, #5B7CFA)' }}
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={handleTryProgram}
              className="inline-flex items-center rounded-xl border border-white/14 bg-white/5 px-8 py-3.5 text-[16px] font-semibold text-white/90 backdrop-blur-xl transition-colors hover:bg-white/10"
            >
              둘러보기
            </button>
          </div>
        </div>
      </section>

      {/* ═══ 푸터 ═══ */}
      <footer className="relative z-10 border-t border-white/8 px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                <LogoMark size={32} />
                <span className="text-[16px] font-bold tracking-tight">온고지신 AI</span>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-white/40">
                한의사의 임상 판단을 보조하는 진료 차트 · 결정 지원 시스템입니다. 진단과 처방의 최종
                결정은 한의사가 합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div>
                <h4 className="text-[13px] font-semibold text-white/80">제품</h4>
                <ul className="mt-3 space-y-2 text-[13px] text-white/40">
                  <li>
                    <a href="#features" className="hover:text-white/70">
                      기능
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-white/70">
                      요금제
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="hover:text-white/70">
                      FAQ
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-white/80">회사</h4>
                <ul className="mt-3 space-y-2 text-[13px] text-white/40">
                  <li>
                    <Link to="/terms" className="hover:text-white/70">
                      이용약관
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="hover:text-white/70">
                      개인정보처리방침
                    </Link>
                  </li>
                  <li>
                    <Link to="/refund-policy" className="hover:text-white/70">
                      환불정책
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-white/80">문의</h4>
                <ul className="mt-3 space-y-2 text-[13px] text-white/40">
                  <li>
                    <a href="mailto:lhs0609c@naver.com" className="hover:text-white/70">
                      lhs0609c@naver.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-white/8 pt-7">
            <p className="text-[12px] leading-relaxed text-white/30">
              본 서비스는 한의사의 임상 의사결정을 보조하기 위한 참고 정보를 제공하며, 의료행위를
              대체하지 않습니다. 모든 진단과 처방의 책임은 이를 수행하는 한의사에게 있습니다.
            </p>
            <p className="mt-4 text-[12px] text-white/25">
              © {new Date().getFullYear()} 온고지신 AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
