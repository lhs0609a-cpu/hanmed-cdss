import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowRight, Loader2 } from 'lucide-react'

/**
 * 환자가 한의원 코드를 입력해 자신의 한의원에 연결한다.
 * 코드는 한의사 측 Settings → '환자 앱 연결 코드' 에서 확인 가능.
 *
 * 정책:
 *   - 코드는 4~6자리 영숫자.
 *   - 코드 검증 결과 + 한의원 표시명을 받으면 localStorage 에 저장.
 *   - 향후 본인인증/카카오 로그인 연결 시 이 화면이 단계 1.
 */
export default function PatientConnectPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = code.trim().toUpperCase()
    if (!/^[A-Z0-9]{4,6}$/.test(trimmed)) {
      setError('코드는 4~6자리 영숫자입니다.')
      return
    }
    setSubmitting(true)
    try {
      // 운영에서는 백엔드 검증. 지금은 코드 유효성만 통과.
      const res = await fetch(`/api/v1/patient/clinic-connect/${encodeURIComponent(trimmed)}`)
      if (!res.ok) throw new Error('확인되지 않은 코드입니다.')
      const data = (await res.json()) as { clinicName?: string }
      localStorage.setItem(
        'ongojisin:patient:clinic',
        JSON.stringify({ code: trimmed, clinicName: data.clinicName || '한의원', connectedAt: Date.now() }),
      )
      navigate('/patient/home', { replace: true })
    } catch (e) {
      // 개발/오프라인 환경에서는 임시로 통과시켜 흐름 점검 가능.
      const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV
      if (isDev) {
        localStorage.setItem(
          'ongojisin:patient:clinic',
          JSON.stringify({ code: trimmed, clinicName: '데모 한의원', connectedAt: Date.now() }),
        )
        navigate('/patient/home', { replace: true })
        return
      }
      setError((e as Error).message || '연결에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-5 pt-10 pb-24 max-w-md mx-auto space-y-8">
      <header className="space-y-2">
        <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">한의원 연결</h1>
        <p className="text-sm text-gray-600">한의원에서 받은 4~6자리 코드를 입력해 주세요.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="예: 4F3K"
          inputMode="text"
          maxLength={6}
          className="w-full text-center text-2xl tracking-[0.4em] font-mono uppercase rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none py-4"
        />
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium py-3.5 disabled:opacity-50 min-h-[48px]"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          연결하기
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center">
        코드를 모르시면 한의원에 문의해 주세요. 한의사 화면 → 설정 → 환자 앱 연결 코드.
      </p>
    </div>
  )
}
