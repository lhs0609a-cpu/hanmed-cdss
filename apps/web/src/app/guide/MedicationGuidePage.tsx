import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { saveGuide, takeLegacyDoseLog } from '@/lib/patientGuides'
import {
  fetchGuide,
  fetchGuideReports,
  importDoses,
  type Dosing,
  type MyReport,
  type PublicGuide,
} from '@/services/publicGuide'
import { GuideBody } from '@/components/guide/GuideBody'
import { ProgressChart } from '@/components/guide/ProgressChart'
import { SelfReportForm } from '@/components/guide/SelfReportForm'

/**
 * 환자용 복약 안내서 — 약봉투의 QR 로 열린다.
 *
 * 로그인은 요구하지 않는다. 로그인시키면 아무도 안 본다.
 * 대신 이 문서에는 이름·연락처·생년월일이 애초에 담기지 않는다.
 *
 * 이 주소는 진료 한 건을 연다. 처방을 새로 받으면 토큰도 바뀐다.
 * 처방을 가로질러 경과를 이어 보는 곳은 카톡으로 받는 /t/:trackToken 이다.
 */
export default function MedicationGuidePage() {
  const { token } = useParams<{ token: string }>()
  const [guide, setGuide] = useState<PublicGuide | null>(null)
  const [dosing, setDosing] = useState<Dosing | null>(null)
  const [reports, setReports] = useState<MyReport[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadReports = useCallback(async () => {
    if (!token) return
    // 내 기록을 못 불러와도 안내서는 떠야 한다.
    try {
      setReports(await fetchGuideReports(token))
    } catch {
      setReports([])
    }
  }, [token])

  const load = useCallback(async () => {
    if (!token) return
    try {
      const loaded = await fetchGuide(token)
      setGuide(loaded)

      // 복용 기록이 이 기기의 localStorage 에만 있던 시절의 데이터를 한 번만
      // 서버로 옮긴다. 그냥 버리면 환자가 지금까지 눌러 온 것이 사라진다.
      let dose = loaded.dosing
      if (dose.takenDates.length === 0) {
        const legacy = takeLegacyDoseLog(token)
        if (legacy && legacy.takenDates.length > 0) {
          try {
            dose = await importDoses(token, legacy.takenDates)
          } catch {
            /* 이관 실패는 무시 — 오늘부터 다시 체크하면 된다 */
          }
        }
      }
      setDosing(dose)

      // 한 번 연 안내서는 이 기기의 보관함(/patient/home)에 담아 둔다.
      // 약봉투를 버린 뒤에도 다시 찾을 수 있어야 한다.
      saveGuide({
        token,
        formulaName: loaded.formulaName,
        clinicName: loaded.clinicName,
        issuedAt: loaded.issuedAt,
      })
      await loadReports()
    } catch {
      setError(
        '안내서를 찾을 수 없습니다. 링크가 만료되었거나 한의원에서 닫았을 수 있습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [token, loadReports])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center text-neutral-500">
        불러오는 중…
      </main>
    )
  }

  if (error || !guide || !dosing) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-[15px] leading-relaxed text-neutral-700">
          {error ?? '안내서를 찾을 수 없습니다.'}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl bg-white px-5 pb-20 pt-8 text-neutral-900">
      <header className="mb-8">
        <p className="text-[13px] text-neutral-500">
          {guide.clinicName || '한의원'} · {guide.issuedAt.slice(0, 10)}
        </p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">
          {guide.formulaName || '처방 안내'}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
          이번에 드시는 한약의 구성과 주의사항입니다.
        </p>
      </header>

      <GuideBody guide={guide} dosing={dosing} onDosingChange={setDosing} />

      <ProgressChart reports={reports} />

      <SelfReportForm
        token={guide.token}
        adverseFlagOptions={guide.adverseFlagOptions}
        onSent={loadReports}
      />

      <p className="mt-8 text-[12px] leading-relaxed text-neutral-400">
        이 안내서는 {guide.clinicName || '한의원'}에서 발행했습니다. 개인을 식별할 수
        있는 정보는 담겨 있지 않습니다. 증상이 갑자기 심해지면 이 문서 대신 의료기관에
        직접 연락해 주세요.
      </p>
    </main>
  )
}
