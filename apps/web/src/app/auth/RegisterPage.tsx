import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import type { LoginResponse } from '@/types'

type Role = 'practitioner' | 'student' | 'public_health_doctor'

export default function RegisterPage() {
  useSEO(PAGE_SEO.register)

  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    licenseNumber: '',
    clinicName: '',
    role: 'practitioner' as Role,
  })
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    aiAdvisory: false,
    marketing: false,
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const requiresLicense = formData.role === 'practitioner'
  const licenseDigitsOnly = formData.licenseNumber.replace(/\D/g, '')

  // 면허번호 검증 — 백엔드 validateLicenseNumber 와 동일 룰:
  //   1) 5~8자리 길이
  //   2) 숫자만 (입력 단계에서 보장되긴 하지만 안전망)
  //   3) 0으로 시작 금지 (한의사 면허번호 체계)
  const licenseFormatChecks = (() => {
    if (!requiresLicense) return { ok: true as const, reason: null as string | null }
    if (!licenseDigitsOnly) return { ok: false, reason: '면허번호를 입력해주세요' }
    if (!/^\d+$/.test(licenseDigitsOnly))
      return { ok: false, reason: '숫자만 입력 가능합니다' }
    if (licenseDigitsOnly.startsWith('0'))
      return { ok: false, reason: '면허번호는 0으로 시작할 수 없습니다' }
    if (licenseDigitsOnly.length < 5 || licenseDigitsOnly.length > 8)
      return { ok: false, reason: '5 ~ 8자리 숫자여야 합니다' }
    return { ok: true, reason: null }
  })()
  const licenseValid = licenseFormatChecks.ok
  const allRequiredConsentsChecked =
    consents.terms && consents.privacy && consents.aiAdvisory

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (requiresLicense && !licenseValid) {
      setError(licenseFormatChecks.reason ?? '면허번호를 확인해주세요.')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.post<LoginResponse>('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        licenseNumber: requiresLicense ? licenseDigitsOnly : undefined,
        clinicName: formData.clinicName || undefined,
        role: formData.role,
        consentTerms: consents.terms,
        consentPrivacy: consents.privacy,
        consentMarketing: consents.marketing,
      })
      const { user, accessToken, refreshToken } = response.data
      login(user, accessToken, refreshToken)
      navigate('/welcome/migration')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-5 py-12">
      <div className="w-full max-w-[440px]">
        <Link to="/" className="inline-block mb-12">
          <span className="text-2xl font-extrabold tracking-tight text-neutral-900">온고지신</span>
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">
          회원가입
        </h1>
        <p className="text-[15px] text-neutral-600 mb-10">
          한의원의 진료 차트와 임상 결정 보조를 시작합니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-[13px] font-medium">
              {error}
            </div>
          )}

          <Field label="이메일" required>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="doctor@example.com"
              className={inputClass}
            />
          </Field>

          <Field label="이름" required>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="김한의"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="비밀번호" required hint="8자 이상">
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputClass}
              />
            </Field>
            <Field label="비밀번호 확인" required>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="가입 유형" required>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
              className={inputClass}
            >
              <option value="practitioner">한의사 (개원·근무)</option>
              <option value="public_health_doctor">공중보건한의사</option>
              <option value="student">한의대생 / 수련생</option>
            </select>
          </Field>

          <Field
            label={requiresLicense ? '한의사 면허번호' : '한의사 면허번호 (선택)'}
            required={requiresLicense}
            hint="숫자 5~8자리 (0으로 시작 불가)"
            error={
              formData.licenseNumber && !licenseValid ? licenseFormatChecks.reason : null
            }
          >
            <input
              id="licenseNumber"
              name="licenseNumber"
              type="text"
              inputMode="numeric"
              pattern="[1-9][0-9]{4,7}"
              required={requiresLicense}
              aria-required={requiresLicense}
              aria-invalid={!!formData.licenseNumber && !licenseValid}
              value={formData.licenseNumber}
              onChange={(e) => {
                // 숫자만 허용 (붙여넣기 시 자동 정제)
                const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                setFormData({ ...formData, licenseNumber: digits })
              }}
              placeholder="12345"
              className={
                formData.licenseNumber && !licenseValid
                  ? inputClass + ' border-red-300'
                  : inputClass
              }
            />
            {requiresLicense && (
              <p className="mt-1.5 text-[12px] text-neutral-500">
                가입 후 면허 검증 상태가 <strong>검증 중</strong> → <strong>검증 완료</strong> 로
                업데이트됩니다. 거부 시 설정에서 사유를 확인하고 재제출할 수 있어요.
              </p>
            )}
          </Field>

          <Field label="한의원명 (선택)">
            <input
              id="clinicName"
              name="clinicName"
              type="text"
              value={formData.clinicName}
              onChange={handleChange}
              placeholder="온고지신 한의원"
              className={inputClass}
            />
          </Field>

          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-4 space-y-3 mt-2">
            <ConsentRow
              checked={
                consents.terms &&
                consents.privacy &&
                consents.aiAdvisory &&
                consents.marketing
              }
              onChange={(v) =>
                setConsents({ terms: v, privacy: v, aiAdvisory: v, marketing: v })
              }
              label="전체 동의"
              bold
            />
            <hr className="border-neutral-200" />
            <ConsentRow
              checked={consents.terms}
              onChange={(v) => setConsents({ ...consents, terms: v })}
              label={
                <>
                  <span className="text-neutral-500">필수</span>{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    className="underline text-neutral-900"
                  >
                    이용약관
                  </Link>
                  에 동의합니다
                </>
              }
            />
            <ConsentRow
              checked={consents.privacy}
              onChange={(v) => setConsents({ ...consents, privacy: v })}
              label={
                <>
                  <span className="text-neutral-500">필수</span>{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    className="underline text-neutral-900"
                  >
                    개인정보처리방침
                  </Link>
                </>
              }
            />
            <ConsentRow
              checked={consents.aiAdvisory}
              onChange={(v) => setConsents({ ...consents, aiAdvisory: v })}
              label={
                <>
                  <span className="text-neutral-500">필수</span>{' '}
                  AI 추천은 <strong>보조 정보</strong>이며 의료 행위가 아닙니다.
                  최종 진단 · 처방은 한의사 본인 판단에 따름을 확인합니다.
                </>
              }
            />
            <ConsentRow
              checked={consents.marketing}
              onChange={(v) => setConsents({ ...consents, marketing: v })}
              label={
                <>
                  <span className="text-neutral-500">선택</span> 마케팅 정보 수신 동의
                </>
              }
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !allRequiredConsentsChecked || !licenseValid}
            className="w-full h-14 mt-2 bg-primary hover:bg-brand-600 disabled:opacity-40 text-white text-[16px] font-semibold rounded-md transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                가입 중
              </>
            ) : !allRequiredConsentsChecked ? (
              '필수 약관에 동의해주세요'
            ) : !licenseValid ? (
              '면허번호를 확인해주세요'
            ) : (
              <>
                회원가입
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <p className="text-center text-[13px] text-neutral-500 pt-2">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-semibold text-neutral-900 hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'w-full h-14 bg-white border border-neutral-200 rounded-md px-4 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:shadow-focus transition'

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-medium text-neutral-700">
          {label}
          {required && <span className="text-primary ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[12px] text-neutral-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}
    </label>
  )
}

function ConsentRow({
  checked,
  onChange,
  label,
  bold,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
  bold?: boolean
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/40"
      />
      <span
        className={
          'text-[14px] ' + (bold ? 'font-semibold text-neutral-900' : 'text-neutral-700')
        }
      >
        {label}
      </span>
    </label>
  )
}
