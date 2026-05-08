import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import type { LoginResponse } from '@/types'

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
    role: 'practitioner' as 'practitioner' | 'student' | 'public_health_doctor',
  })
  const [consents, setConsents] = useState({
    terms: false,        // 이용약관 (필수)
    privacy: false,      // 개인정보처리방침 (필수)
    marketing: false,    // 마케팅 정보 수신 (선택)
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 한의사 면허번호 형식 검증: 숫자만, 5-8자리. 학생/공보의는 면제.
  const requiresLicense = formData.role === 'practitioner'
  const licenseDigitsOnly = formData.licenseNumber.replace(/\D/g, '')
  const licenseValid =
    !requiresLicense || (licenseDigitsOnly.length >= 5 && licenseDigitsOnly.length <= 8)

  const allRequiredConsentsChecked = consents.terms && consents.privacy

  const handleConsentAll = (checked: boolean) => {
    setConsents({
      terms: checked,
      privacy: checked,
      marketing: checked,
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
      setError('한의사 면허번호는 5~8자리 숫자로 입력해 주세요. (학생/공보의는 가입 유형에서 변경)')
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
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">온</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">회원가입</h2>
          <p className="mt-2 text-sm text-gray-600">
            진료 차트 + 임상 결정 보조 시스템, 온고지신을 시작합니다
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일 *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                이름 *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호 * (8자 이상)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                비밀번호 확인 *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                가입 유형 *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as typeof formData.role })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="practitioner">한의사 (개원·근무)</option>
                <option value="public_health_doctor">공중보건한의사</option>
                <option value="student">한의대생/수련생</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                학생/공보의는 처방 추천·차트 저장 등 일부 기능이 제한됩니다.
              </p>
            </div>

            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">
                한의사 면허번호 {requiresLicense ? '*' : '(선택)'}
              </label>
              <input
                id="licenseNumber"
                name="licenseNumber"
                type="text"
                inputMode="numeric"
                placeholder="숫자 5~8자리 (예: 12345)"
                required={requiresLicense}
                value={formData.licenseNumber}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${
                  formData.licenseNumber && !licenseValid ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {formData.licenseNumber && !licenseValid && (
                <p className="mt-1 text-xs text-red-500">5~8자리 숫자만 입력 가능합니다.</p>
              )}
              {requiresLicense && (
                <p className="mt-1 text-xs text-gray-500">
                  관리자 검수 후 ‘면허 인증 완료’ 배지가 부여되며, 그 전까지는 일부 기능이 제한됩니다.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700">
                한의원명 (선택)
              </label>
              <input
                id="clinicName"
                name="clinicName"
                type="text"
                value={formData.clinicName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* 약관 동의 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <input
                type="checkbox"
                id="consent-all"
                checked={consents.terms && consents.privacy && consents.marketing}
                onChange={(e) => handleConsentAll(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="consent-all" className="text-sm font-semibold text-gray-900">
                전체 동의
              </label>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="consent-terms"
                checked={consents.terms}
                onChange={(e) => setConsents({ ...consents, terms: e.target.checked })}
                className="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="consent-terms" className="text-sm text-gray-700">
                <span className="text-red-500">[필수]</span>{' '}
                <Link to="/terms" target="_blank" className="text-primary hover:underline">
                  이용약관
                </Link>
                에 동의합니다
              </label>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="consent-privacy"
                checked={consents.privacy}
                onChange={(e) => setConsents({ ...consents, privacy: e.target.checked })}
                className="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="consent-privacy" className="text-sm text-gray-700">
                <span className="text-red-500">[필수]</span>{' '}
                <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                  개인정보처리방침
                </Link>
                에 동의합니다
              </label>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="consent-marketing"
                checked={consents.marketing}
                onChange={(e) => setConsents({ ...consents, marketing: e.target.checked })}
                className="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="consent-marketing" className="text-sm text-gray-700">
                <span className="text-gray-500">[선택]</span> 마케팅 정보 수신에 동의합니다
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !allRequiredConsentsChecked || !licenseValid}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? '가입 중...'
              : !allRequiredConsentsChecked
                ? '필수 약관에 동의해주세요'
                : !licenseValid
                  ? '면허번호를 확인해주세요'
                  : '회원가입'}
          </button>

          <p className="text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary/90">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
