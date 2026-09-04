import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import { toLoginErrorView, type LoginErrorView } from './loginError'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import type { LoginResponse } from '@/types'
import { LogoMark } from '@/components/common'

interface TwoFactorChallenge {
  twoFactorRequired: true
  challengeId: string
}

type LoginApiResponse = LoginResponse | TwoFactorChallenge

const DEMO_CONFIG = {
  user: {
    id: import.meta.env.VITE_DEMO_USER_ID || 'demo-user',
    email: import.meta.env.VITE_DEMO_EMAIL || 'demo@ongojisin.ai',
    name: import.meta.env.VITE_DEMO_NAME || '체험 사용자',
    subscriptionTier: 'free' as const,
    isVerified: true,
  },
  token: import.meta.env.VITE_DEMO_TOKEN || '',
  refreshToken: import.meta.env.VITE_DEMO_REFRESH_TOKEN || '',
}

export default function LoginPage() {
  useSEO(PAGE_SEO.login)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  /**
   * 실패 이유를 코드까지 들고 있는다.
   *
   * 문장만 띄우면 "비밀번호가 틀렸습니다" 로 끝나고, 다음에 눌러야 할 것
   * (가입하기 / 비밀번호 재설정 / 오타 교정)을 사람이 스스로 찾아야 한다.
   */
  const [loginError, setLoginError] = useState<LoginErrorView | null>(null)
  /** Caps Lock 이 켜져 있으면 알려 준다. 비밀번호 실패의 흔한 원인이다. */
  const [capsLock, setCapsLock] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')

  // 로그인 직후엔 곧장 대시보드로. 신규 사용자는 대시보드가 예시 진료(아하 모먼트)로
  // 넘겨준다. CSV 마이그레이션은 미리보기 전용이라 첫 관문에 두지 않는다(설정에서 접근).
  const goNext = () => navigate('/dashboard')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoginError(null)
    setIsLoading(true)
    try {
      const response = await api.post<LoginApiResponse>('/auth/login', { email, password })
      const data = response.data
      if ('twoFactorRequired' in data) {
        setChallengeId(data.challengeId)
        setTotpCode('')
        return
      }
      login(data.user, data.accessToken, data.refreshToken)
      goNext()
    } catch (err) {
      const view = toLoginErrorView(err, email)
      setLoginError(view)
      // 고쳐야 할 칸으로 커서를 옮긴다. 어디를 고쳐야 하는지 화면이
      // 말해 주면서 손까지 데려다주는 편이 낫다.
      if (view.focus === 'email') {
        document.getElementById('email')?.focus()
      } else if (view.focus === 'password') {
        const el = document.getElementById('password') as HTMLInputElement | null
        el?.focus()
        el?.select()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handle2faSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!challengeId) return
    const cleaned = totpCode.trim()
    const isTotp = /^\d{6}$/.test(cleaned)
    const isBackup = /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(cleaned)
    if (!isTotp && !isBackup) return
    setError('')
    setIsLoading(true)
    try {
      const response = await api.post<LoginResponse>('/auth/2fa/login', {
        challengeId,
        code: isBackup
          ? cleaned.toUpperCase().replace(/^([A-Z0-9]{4})([A-Z0-9]{4})$/, '$1-$2')
          : cleaned,
      })
      const { user, accessToken, refreshToken } = response.data
      login(user, accessToken, refreshToken)
      goNext()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDemoLogin() {
    setError('')
    if (DEMO_CONFIG.token) {
      login(DEMO_CONFIG.user, DEMO_CONFIG.token, DEMO_CONFIG.refreshToken)
      goNext()
      return
    }
    setIsLoading(true)
    try {
      const response = await api.post<LoginResponse>('/auth/demo-login')
      const { user, accessToken, refreshToken } = response.data
      login(user, accessToken, refreshToken)
      goNext()
    } catch (err) {
      // 429 를 "로그인 실패" 로 뭉뚱그리면 안 된다.
      // 한의원은 여러 직원이 한 공인 IP 를 쓰기 때문에 체험 버튼만 몇 번 눌러도 걸린다.
      // 원인과 대기 시간을 알려주지 않으면 "서비스가 고장났다" 로 읽힌다.
      const res = (err as { response?: { status?: number; headers?: Record<string, string> } })
        ?.response
      if (res?.status === 429) {
        const retryAfter = Number(res.headers?.['retry-after'])
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? `${retryAfter}초` : '잠시'
        setError(
          `체험 로그인 요청이 짧은 시간에 몰렸습니다. ${wait} 후 다시 눌러 주세요. ` +
            '(같은 인터넷 회선에서 여러 번 시도하면 잠시 제한됩니다)',
        )
      } else {
        setError('데모 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 py-12">
      {/* 라이트 메시 배경 — 랜딩의 3D 무드를 아주 옅게만 가져온다.
          로그인은 입력 정확도가 중요한 화면이라 대비를 해치지 않는 선에서 멈춘다. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(55% 45% at 15% 10%, rgba(49,130,246,0.10), transparent 62%)',
            'radial-gradient(45% 40% at 88% 20%, rgba(120,86,255,0.08), transparent 64%)',
            'radial-gradient(60% 50% at 50% 100%, rgba(49,130,246,0.07), transparent 66%)',
          ].join(','),
        }}
      />

      <div className="relative w-full max-w-[400px]">
        {/* 로고 */}
        <Link to="/" className="mb-10 inline-flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="text-2xl font-extrabold tracking-tight text-neutral-900">
            온고지신 AI
          </span>
        </Link>

        {challengeId ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">
              인증 코드 입력
            </h1>
            <p className="text-[15px] text-neutral-600 mb-10">
              인증 앱에 표시된 6자리 숫자를 입력해주세요.
              <br />
              백업 코드(XXXX-XXXX)도 사용할 수 있어요.
            </p>

            <form onSubmit={handle2faSubmit} className="space-y-4">
              {error && <ErrorBanner>{error}</ErrorBanner>}

              <input
                id="totp"
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                maxLength={9}
                required
                autoFocus
                value={totpCode}
                onChange={(e) =>
                  setTotpCode(e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 9))
                }
                placeholder="000000"
                className="w-full text-center tracking-[0.4em] text-2xl font-mono h-16 bg-neutral-50 border border-neutral-200 rounded-md text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-primary focus:shadow-focus focus:bg-white transition uppercase"
              />

              <button
                type="submit"
                disabled={
                  isLoading ||
                  (totpCode.length !== 6 && totpCode.replace(/-/g, '').length !== 8)
                }
                className="flex h-14 w-full items-center justify-center gap-2 rounded-md text-[16px] font-semibold text-white accent-gradient accent-glow transition-[filter,transform] hover:brightness-[1.05] active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {isLoading ? '확인 중' : '확인'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setChallengeId(null)
                  setTotpCode('')
                  setError('')
                }}
                className="w-full text-[14px] text-neutral-500 hover:text-neutral-900 py-2"
              >
                다른 계정으로 로그인
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">
              로그인
            </h1>
            <p className="text-[15px] text-neutral-600 mb-10">
              한의원의 하루를 시작해볼까요?
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorBanner>{error}</ErrorBanner>}

              {/* 실패 이유 + 다음에 누를 것.
                  이유를 갈라 알려 주기로 한 이상, 안내는 행동까지 이어져야 한다. */}
              {loginError && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[14px] leading-relaxed text-red-800"
                >
                  <p>{loginError.message}</p>

                  {loginError.suggestion && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(loginError.suggestion as string)
                        setLoginError(null)
                        document.getElementById('password')?.focus()
                      }}
                      className="mt-2 inline-flex items-center rounded border border-red-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-red-700 hover:bg-red-100"
                    >
                      {loginError.suggestion} 로 바꾸기
                    </button>
                  )}

                  {loginError.action && (
                    <div className="mt-2">
                      {loginError.action.to ? (
                        <Link
                          to={
                            loginError.action.kind === 'signup'
                              ? `${loginError.action.to}?email=${encodeURIComponent(email)}`
                              : loginError.action.to
                          }
                          className="text-[13px] font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
                        >
                          {loginError.action.label}
                        </Link>
                      ) : (
                        <a
                          href="mailto:lhs0609c@naver.com"
                          className="text-[13px] font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
                        >
                          {loginError.action.label}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Field label="이메일">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (loginError?.focus === 'email') setLoginError(null)
                    }}
                    placeholder="doctor@example.com"
                    className="w-full h-14 bg-neutral-50 border border-neutral-200 rounded-md px-4 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:shadow-focus focus:bg-white transition"
                  />
                </Field>

                <Field label="비밀번호">
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (loginError?.focus === 'password') setLoginError(null)
                      }}
                      onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                      placeholder="비밀번호"
                      className="w-full h-14 bg-neutral-50 border border-neutral-200 rounded-md pl-4 pr-12 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:shadow-focus focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-neutral-700"
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {/* 비밀번호가 안 맞는 흔한 이유. 눌린 줄 모르는 경우가 많다. */}
                  {capsLock && (
                    <p className="mt-1.5 text-[12px] text-amber-700">
                      Caps Lock 이 켜져 있습니다. 대소문자가 바뀌어 입력됩니다.
                    </p>
                  )}
                </Field>
              </div>

              <div className="flex justify-end -mt-1">
                <Link
                  to="/forgot-password"
                  className="text-[13px] text-neutral-500 hover:text-neutral-900"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-md text-[16px] font-semibold text-white accent-gradient accent-glow transition-[filter,transform] hover:brightness-[1.05] active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    확인 중
                  </>
                ) : (
                  <>
                    로그인
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full h-14 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-[15px] font-semibold rounded-md transition-colors active:scale-[0.99]"
              >
                데모 계정으로 체험
              </button>
            </form>
          </>
        )}

        <p className="text-center text-[13px] text-neutral-500 mt-10">
          계정이 없으신가요?{' '}
          <Link to="/register" className="font-semibold text-neutral-900 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-neutral-700 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-[13px] font-medium">
      {children}
    </div>
  )
}
