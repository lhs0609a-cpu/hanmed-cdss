import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { isMigrationDone } from '@/app/onboarding/MigrationWizardPage'
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import type { LoginResponse } from '@/types'

interface TwoFactorChallenge {
  twoFactorRequired: true
  challengeId: string
}

type LoginApiResponse = LoginResponse | TwoFactorChallenge

const DEMO_CONFIG = {
  user: {
    id: import.meta.env.VITE_DEMO_USER_ID || 'demo-user',
    email: import.meta.env.VITE_DEMO_EMAIL || 'demo@hanmed.com',
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
  const [isLoading, setIsLoading] = useState(false)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')

  const goNext = () => navigate(isMigrationDone() ? '/dashboard' : '/welcome/migration')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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
      setError(getErrorMessage(err))
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
    } catch {
      setError('데모 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        {/* 로고 */}
        <Link to="/" className="inline-block mb-12">
          <span className="text-2xl font-extrabold tracking-tight text-neutral-900">온고지신</span>
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
                className="w-full h-14 bg-primary hover:bg-brand-600 disabled:opacity-40 text-white text-[16px] font-semibold rounded-md transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
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

              <div className="space-y-3">
                <Field label="이메일">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      onChange={(e) => setPassword(e.target.value)}
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
                className="w-full h-14 bg-primary hover:bg-brand-600 disabled:opacity-40 text-white text-[16px] font-semibold rounded-md transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
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
