import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  Globe,
  Info,
  Monitor,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { LogoMark } from '@/components/common'
import { useSEO } from '@/hooks/useSEO'
import { MeshBackdrop, GrainOverlay, Orb } from '@/app/landing/components/AbstractBackdrop'
import {
  APP_VERSION,
  BUILD_DATE,
  RELEASES_URL,
  detectPlatform,
  isDesktopApp,
  releaseNotesUrl,
  type DetectedPlatform,
} from '@/config/version'
import { formatSize, useLatestRelease, type ReleaseAsset } from '@/hooks/useLatestRelease'

/* ────────────────────────────────────────────────────────────
   프리미티브 — 랜딩과 같은 유리 카드 톤을 쓴다.
   다운로드 페이지만 다른 옷을 입으면 다른 사이트로 보인다.
   ──────────────────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────────────────
   콘텐츠
   ──────────────────────────────────────────────────────────── */

const PLATFORM_LABEL: Record<DetectedPlatform, string> = {
  windows: 'Windows',
  mac: 'macOS',
  other: '데스크톱',
}

const BENEFITS = [
  {
    icon: Monitor,
    title: '진료 중에는 창 하나만',
    desc: '브라우저 탭 사이를 오가지 않습니다. 차트와 검색이 한 창 안에 머물고, 실수로 닫히지 않습니다.',
  },
  {
    icon: RefreshCw,
    title: '업데이트는 앱이 알아서',
    desc: '새 버전이 올라오면 앱이 알려주고 재시작 한 번으로 끝납니다. 설치 파일을 다시 받을 일이 없습니다.',
  },
  {
    icon: ShieldCheck,
    title: '환자 정보는 그대로 서버에',
    desc: '데스크톱 앱은 웹과 같은 계정, 같은 데이터를 봅니다. PC 를 바꿔도 따로 옮길 것이 없습니다.',
  },
]

/** 설치 뒤 처음 여는 순서 — OS 별로 걸리는 지점이 다르다. */
const INSTALL_STEPS: Record<'windows' | 'mac', { step: string; detail: string }[]> = {
  windows: [
    { step: '받은 설치 파일을 실행합니다', detail: 'OngojisinAI-Setup-….exe' },
    {
      step: 'Windows의 PC 보호 창이 뜨면 [추가 정보] → [실행]',
      detail: '아직 코드 서명 인증서를 붙이지 않아 처음 한 번은 이 경고가 나옵니다.',
    },
    { step: '설치 경로를 고르고 [설치]', detail: '바탕화면과 시작 메뉴에 아이콘이 생깁니다.' },
  ],
  mac: [
    { step: '받은 dmg 를 열고 앱을 [응용 프로그램]으로 끕니다', detail: 'OngojisinAI-….dmg' },
    {
      step: '처음 열 때는 아이콘을 우클릭 → [열기]',
      detail: '공증(notarization) 전이라 그냥 더블클릭하면 확인되지 않은 개발자 경고가 납니다.',
    },
    { step: '한 번 열고 나면 다음부터는 평소처럼 실행됩니다', detail: '' },
  ],
}

const REQUIREMENTS: [string, string][] = [
  ['Windows', 'Windows 10 이상 (64비트) · 메모리 4GB 이상 · 저장공간 400MB'],
  ['macOS', 'macOS 11 Big Sur 이상 · Apple 실리콘과 인텔 모두 지원'],
  ['네트워크', '진료 데이터는 서버에서 옵니다. 인터넷 연결이 필요합니다.'],
]

/* ────────────────────────────────────────────────────────────
   페이지
   ──────────────────────────────────────────────────────────── */

export default function DownloadPage() {
  useSEO({
    title: '다운로드',
    description:
      '온고지신 AI 데스크톱 앱을 Windows · macOS 에 설치해 진료실 PC 에서 바로 사용하세요.',
  })

  const release = useLatestRelease()
  const [detected] = useState<DetectedPlatform>(() => detectPlatform())
  const alreadyDesktop = useMemo(() => isDesktopApp(), [])

  // 감지된 OS 의 설치 파일을 앞으로 뺀다. 감지가 틀려도 나머지가 바로
  // 아래에 그대로 보이므로, 못 받는 사람이 생기지는 않는다.
  const primary = release.assets.filter((a) => a.target.platform === detected)
  const others = release.assets.filter((a) => a.target.platform !== detected)
  const ordered = primary.length > 0 ? [...primary, ...others] : release.assets

  const publishedLabel = release.publishedAt
    ? new Date(release.publishedAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="ojs-immersive relative min-h-screen overflow-x-hidden bg-[#05070D] text-white antialiased">
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
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="hidden text-[14px] text-white/55 transition-colors hover:text-white sm:block"
              >
                제품 소개
              </Link>
              <Link
                to="/login"
                className="text-[14px] font-medium text-white/70 transition-colors hover:text-white"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ 히어로 + 다운로드 ═══ */}
      <section className="relative z-10 overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
        <Orb size="34rem" color="rgba(49,130,246,0.55)" className="-left-40 -top-32" />
        <Orb size="28rem" color="rgba(120,86,255,0.45)" className="-right-32 top-10" delay="-4s" />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[12px] font-medium tracking-wide text-white/60 backdrop-blur">
            데스크톱 앱
          </span>

          <h1 className="mt-6 text-[34px] font-bold leading-[1.2] tracking-[-0.025em] sm:text-[48px]">
            진료실 PC 에 설치해서
            <br />
            창 하나로 쓰세요
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-[17px]">
            웹에서 쓰던 계정 그대로입니다. 설치 파일을 받아 실행하면 브라우저 없이 바로 열리고, 새
            버전은 앱이 알아서 받아둡니다.
          </p>

          {/* 버전 표기 — 무엇을 받게 되는지 버튼보다 먼저 밝힌다 */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[13px] text-white/45">
            <span className="rounded-md border border-white/12 bg-white/5 px-2.5 py-1 font-mono text-white/75">
              v{release.version}
            </span>
            {publishedLabel && <span>{publishedLabel} 배포</span>}
            <span aria-hidden className="text-white/20">
              ·
            </span>
            <a
              href={releaseNotesUrl(release.version)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-white/75"
            >
              릴리스 노트
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {alreadyDesktop && (
            <p className="mx-auto mt-6 max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] leading-relaxed text-white/60">
              지금 데스크톱 앱으로 보고 계십니다. 업데이트는 메뉴의 [업데이트 확인]에서 받을 수
              있습니다.
            </p>
          )}
        </div>

        {/* 설치 파일 목록 */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-2">
          {ordered.map((asset, i) => (
            <DownloadCard
              key={asset.target.id}
              asset={asset}
              recommended={i === 0 && primary.length > 0}
            />
          ))}
        </div>

        <div className="mx-auto mt-6 flex max-w-4xl flex-col items-center gap-3 text-center">
          {!release.confirmed && (
            <p className="inline-flex items-center gap-2 text-[12.5px] text-white/40">
              <Info className="h-3.5 w-3.5 shrink-0" />
              최신 릴리스 정보를 확인하지 못해 마지막으로 알려진 버전을 보여주고 있습니다.
            </p>
          )}
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] text-white/45 hover:text-white/75"
          >
            지난 버전 전체 보기
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* 설치 없이 쓰기 */}
        <div className="mx-auto mt-10 max-w-4xl">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-5 w-5 shrink-0 text-white/45" />
                <div>
                  <p className="text-[14.5px] font-semibold text-white/85">
                    설치가 어려운 원내 PC 라면 브라우저로 바로
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">
                    설치 권한이 없어도 됩니다. 크롬 주소창 오른쪽의 설치 아이콘을 누르면 앱처럼
                    창으로 띄울 수도 있습니다.
                  </p>
                </div>
              </div>
              <Link
                to="/login"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-[13.5px] font-medium text-white/80 transition-colors hover:bg-white/8"
              >
                웹에서 열기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ═══ 왜 설치하나 ═══ */}
      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <GlassCard key={b.title} className="p-6">
              <b.icon className="h-5 w-5 text-[#5B7CFA]" />
              <h3 className="mt-4 text-[15.5px] font-semibold text-white/90">{b.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/50">{b.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ═══ 설치 방법 ═══ */}
      <section className="relative z-10 px-6 pb-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-[26px] font-bold tracking-[-0.02em] sm:text-[32px]">
            설치는 1분이면 끝납니다
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {(['windows', 'mac'] as const).map((os) => (
              <GlassCard key={os} className="p-6">
                <h3 className="text-[15px] font-semibold text-white/85">{PLATFORM_LABEL[os]}</h3>
                <ol className="mt-5 space-y-4">
                  {INSTALL_STEPS[os].map((s, i) => (
                    <li key={s.step} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[11px] font-semibold text-white/60">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[13.5px] leading-relaxed text-white/75">{s.step}</p>
                        {s.detail && (
                          <p className="mt-1 text-[12.5px] leading-relaxed text-white/40">
                            {s.detail}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 설치 조건 ═══ */}
      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <GlassCard className="p-6 sm:p-8">
            <h3 className="text-[15px] font-semibold text-white/85">설치 조건</h3>
            <dl className="mt-5 space-y-3.5">
              {REQUIREMENTS.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 sm:flex-row sm:gap-6">
                  <dt className="w-24 shrink-0 text-[13px] font-medium text-white/55">{k}</dt>
                  <dd className="text-[13px] leading-relaxed text-white/45">{v}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>
        </div>
      </section>

      {/* ═══ 푸터 ═══ */}
      <footer className="relative z-10 border-t border-white/8 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
          <p className="text-[12px] text-white/30">
            © {new Date().getFullYear()} 온고지신 AI. All rights reserved.
          </p>
          <p className="font-mono text-[11.5px] text-white/25">
            데스크톱 v{release.version} · 웹 v{APP_VERSION} ({BUILD_DATE})
          </p>
        </div>
      </footer>
    </div>
  )
}

/** 설치 파일 하나 */
function DownloadCard({ asset, recommended }: { asset: ReleaseAsset; recommended: boolean }) {
  const size = formatSize(asset.size)

  return (
    <a
      href={asset.url}
      className="group block"
      // 릴리스 자산은 브라우저가 그대로 내려받는다. 다만 자산이 없는
      // 릴리스라면 GitHub 404 페이지가 뜨는데, 같은 탭이면 보고 있던
      // 다운로드 페이지가 그 404 로 덮인다. 새 탭으로 연다.
      target="_blank"
      rel="noreferrer"
    >
      <GlassCard
        glow={recommended}
        className="h-full p-5 transition-transform group-hover:-translate-y-0.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-white/90">{asset.target.label}</span>
              {recommended && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#3182F6]/15 px-2 py-0.5 text-[11px] font-medium text-[#7FA9FF]">
                  <Check className="h-3 w-3" />이 PC 에 맞는 파일
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">{asset.target.hint}</p>
            {size && <p className="mt-2 font-mono text-[11.5px] text-white/30">{size}</p>}
          </div>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #3182F6, #5B7CFA)' }}
          >
            <Download className="h-4 w-4" />
          </span>
        </div>
      </GlassCard>
    </a>
  )
}
