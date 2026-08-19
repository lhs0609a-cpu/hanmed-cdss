import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Link2 } from 'lucide-react'
import { extractGuideToken, saveGuide } from '@/lib/patientGuides'

/**
 * 안내서 추가 — 한의원에서 받은 링크나 코드로.
 *
 * 예전에는 한의원 코드를 받아 /api/v1/patient/clinic-connect 를 호출했는데
 * 그 엔드포인트는 서버에 없다(항상 404). 개발 모드에서만 통과시켜 '데모 한의원'
 * 으로 넘어가고 있었다 — 연결이 된 적이 없는 화면이었다.
 *
 * 지금은 실제로 있는 것만 다룬다. 링크가 진짜 열리는지 서버에 확인한 뒤에만
 * 보관함에 담는다. 확인되지 않으면 담지 않는다.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.ongojisin.co.kr/api/v1'

export default function PatientConnectPage() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const token = extractGuideToken(input)
    if (!token) {
      setError('링크 또는 코드를 다시 확인해 주세요.')
      return
    }

    setSubmitting(true)
    try {
      // 실제로 열리는 안내서만 담는다.
      const { data } = await axios.get(`${API_BASE}/public/guides/${token}`)
      const guide = data?.data ?? data
      saveGuide({
        token,
        formulaName: guide?.formulaName ?? '',
        clinicName: guide?.clinicName ?? null,
        issuedAt: guide?.issuedAt ?? new Date().toISOString(),
      })
      navigate('/patient/home', { replace: true })
    } catch {
      setError('안내서를 찾을 수 없습니다. 링크가 만료되었거나 한의원에서 닫았을 수 있습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-10">
      <header className="mb-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Link2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-[22px] font-bold">안내서 추가</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">
          한의원에서 받은 링크를 붙여 넣어 주세요. 약봉투의 QR 코드를 찍으셨다면 이
          과정 없이 바로 열립니다.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="guide-link" className="mb-1.5 block text-[14px] font-medium">
            안내서 링크
          </label>
          <input
            id="guide-link"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://... /guide/..."
            autoComplete="off"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] focus:border-gray-900 focus:outline-none"
          />
          {error && <p className="mt-2 text-[14px] text-red-600">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gray-900 py-3.5 text-[16px] font-semibold text-white disabled:opacity-50"
        >
          {submitting ? '확인하는 중…' : '추가하기'}
        </button>
      </form>

      <p className="mt-8 text-[12px] leading-relaxed text-gray-400">
        안내서에는 이름·연락처 같은 개인정보가 담기지 않습니다. 목록은 이 기기에만
        저장됩니다.
      </p>
    </div>
  )
}
