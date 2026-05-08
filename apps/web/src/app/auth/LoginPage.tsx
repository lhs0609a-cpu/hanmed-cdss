import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { useAppStats } from '@/hooks/useAppStats'
import { isMigrationDone } from '@/app/onboarding/MigrationWizardPage'
import { Sparkles, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import type { LoginResponse } from '@/types'

interface TwoFactorChallenge {
  twoFactorRequired: true
  challengeId: string
}

type LoginApiResponse = LoginResponse | TwoFactorChallenge

// 데모 모드 설정 (환경변수로 관리)
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
  const appStats = useAppStats()

  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
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
      // 첫 로그인 → 마이그레이션 마법사로. 이미 완료된 사용자는 대시보드로 직행.
      navigate(isMigrationDone() ? '/dashboard' : '/welcome/migration')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!challengeId) return
    const cleaned = totpCode.trim()
    // 6자리 숫자(TOTP) 또는 백업 코드(XXXX-XXXX) 둘 다 허용
    const isTotp = /^\d{6}$/.test(cleaned)
    const isBackup = /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(cleaned)
    if (!isTotp && !isBackup) return

    setError('')
    setIsLoading(true)
    try {
      const response = await api.post<LoginResponse>('/auth/2fa/login', {
        challengeId,
        code: isBackup ? cleaned.toUpperCase().replace(/^([A-Z0-9]{4})([A-Z0-9]{4})$/, '$1-$2') : cleaned,
      })
      const { user, accessToken, refreshToken } = response.data
      login(user, accessToken, refreshToken)
      // 첫 로그인 → 마이그레이션 마법사로. 이미 완료된 사용자는 대시보드로 직행.
      navigate(isMigrationDone() ? '/dashboard' : '/welcome/migration')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel2fa = () => {
    setChallengeId(null)
    setTotpCode('')
    setError('')
  }

  const handleDemoLogin = async () => {
    if (DEMO_CONFIG.token) {
      login(DEMO_CONFIG.user, DEMO_CONFIG.token, DEMO_CONFIG.refreshToken)
      // 첫 로그인 → 마이그레이션 마법사로. 이미 완료된 사용자는 대시보드로 직행.
      navigate(isMigrationDone() ? '/dashboard' : '/welcome/migration')
    } else {
      // 데모 토큰이 설정되지 않은 경우 서버 데모 로그인 API 호출
      setIsLoading(true)
      try {
        const response = await api.post<LoginResponse>('/auth/demo-login')
        const { user, accessToken, refreshToken } = response.data
        login(user, accessToken, refreshToken)
        // 첫 로그인 → 마이그레이션 마법사로. 이미 완료된 사용자는 대시보드로 직행.
      navigate(isMigrationDone() ? '/dashboard' : '/welcome/migration')
      } catch (err: unknown) {
        setError('데모 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 p-12 flex-col justify-between overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">온고지신 AI</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            한의원의 하루,<br />
            <span className="text-white/90">여기서 흐릅니다</span>
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            환자 차트·변증 추론·처방·청구 점검·환자 알림까지 한 화면.
            {appStats.formatted.totalCases}의 치험례 + 본인 처방 학습으로 매일 정확해집니다.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="text-3xl font-bold text-white">{appStats.formatted.totalCases}</div>
              <div className="text-sm text-white/70 mt-1">치험례 데이터</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="text-3xl font-bold text-white">99%</div>
              <div className="text-sm text-white/70 mt-1">상호작용 검출률</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/60">
          온고지신 AI × Korean Medicine Technology
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">온고지신 AI</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
            {challengeId ? (
              <>
                <div className="text-center mb-8">
                  <div className="mx-auto w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldCheck className="h-7 w-7 text-teal-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">2단계 인증</h2>
                  <p className="mt-2 text-gray-500 text-sm">
                    인증 앱(Google Authenticator 등)에 표시된 6자리 코드를 입력하세요.
                  </p>
                </div>

                <form onSubmit={handle2faSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="totp" className="block text-sm font-medium text-gray-700 mb-1.5">
                      인증 코드
                    </label>
                    <input
                      id="totp"
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      maxLength={9}
                      required
                      autoFocus
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 9))}
                      className="w-full text-center tracking-[0.3em] text-2xl font-mono py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all uppercase"
                      placeholder="000000"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      6자리 숫자 또는 백업 코드(XXXX-XXXX)를 입력하세요.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || (totpCode.length !== 6 && totpCode.replace(/-/g, '').length !== 8)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        검증 중...
                      </>
                    ) : (
                      <>
                        인증
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel2fa}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    다른 계정으로 로그인
                  </button>
                </form>
              </>
            ) : (
              <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">로그인</h2>
              <p className="mt-2 text-gray-500">계정에 로그인하여 시작하세요</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    이메일
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                      placeholder="doctor@hanmed.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    비밀번호
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500" />
                  <span className="text-sm text-gray-600">로그인 유지</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                  비밀번호 찾기
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  <>
                    로그인
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-sm text-gray-500">또는</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                <Sparkles className="h-5 w-5 text-amber-500" />
                데모 계정으로 체험하기
              </button>
            </form>
              </>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            계정이 없으신가요?{' '}
            <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-700">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
