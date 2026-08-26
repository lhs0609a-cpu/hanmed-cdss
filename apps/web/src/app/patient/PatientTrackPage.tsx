import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BellOff, ChevronRight, History } from 'lucide-react'
import {
  fetchTrack,
  optOutOfNotifications,
  type Dosing,
  type TrackPayload,
} from '@/services/publicGuide'
import { saveGuide } from '@/lib/patientGuides'
import { GuideBody } from '@/components/guide/GuideBody'
import { ProgressChart } from '@/components/guide/ProgressChart'
import { SelfReportForm } from '@/components/guide/SelfReportForm'
import { logError } from '@/lib/errors'

/**
 * 내 복약 현황 — 한의원이 카톡으로 보내 준 링크가 여는 곳.
 *
 * 안내서(/guide/:token)는 진료 한 건을 연다. 처방이 바뀌면 토큰도 바뀌므로,
 * 그 주소를 카톡으로 보내면 환자는 처방마다 다른 링크를 받게 되고 지난 경과와
 * 이어 볼 수 없다. 여기는 환자 단위 토큰 하나로 지금 먹는 약, 처방을 가로지른
 * 증상 추이, 지난 처방을 한자리에서 연다.
 *
 * 로그인은 없다. 이 링크를 아는 사람이 곧 본인이라는 전제다. 그래서 이름·
 * 연락처·생년월일은 어느 응답에도 담기지 않고, 한의사는 언제든 링크를 회수할
 * 수 있으며, 환자는 여기서 직접 알림 수신을 끊을 수 있다.
 */
export default function PatientTrackPage() {
  const { trackToken } = useParams<{ trackToken: string }>()
  const [data, setData] = useState<TrackPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [optingOut, setOptingOut] = useState(false)

  const load = useCallback(async () => {
    if (!trackToken) return
    try {
      const payload = await fetchTrack(trackToken)
      setData(payload)
      // 지금 먹는 안내서는 이 기기의 보관함에도 담아 둔다.
      if (payload.current) {
        saveGuide({
          token: payload.current.token,
          formulaName: payload.current.formulaName,
          clinicName: payload.current.clinicName,
          issuedAt: payload.current.issuedAt,
        })
      }
    } catch {
      setError(
        '링크를 열 수 없습니다. 한의원에서 링크를 닫았거나 주소가 잘못되었을 수 있습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [trackToken])

  useEffect(() => {
    void load()
  }, [load])

  const setDosing = (next: Dosing) =>
    setData((prev) =>
      prev && prev.current
        ? { ...prev, current: { ...prev.current, dosing: next } }
        : prev,
    )

  const optOut = async () => {
    if (!trackToken || optingOut) return
    if (
      !confirm(
        '복약 확인 알림을 더 이상 받지 않습니다. 이 링크는 계속 열 수 있습니다. 계속할까요?',
      )
    )
      return
    setOptingOut(true)
    try {
      await optOutOfNotifications(trackToken)
      await load()
    } catch (err) {
      logError(err, 'PatientTrackPage.optOut')
    } finally {
      setOptingOut(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center text-neutral-500">
        불러오는 중…
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-[15px] leading-relaxed text-neutral-700">
          {error ?? '링크를 열 수 없습니다.'}
        </p>
      </main>
    )
  }

  const { current } = data

  return (
    <main className="mx-auto max-w-xl bg-white px-5 pb-20 pt-8 text-neutral-900">
      <header className="mb-8">
        <p className="text-[13px] text-neutral-500">{data.clinicName || '한의원'}</p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">내 복약 현황</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
          지금 드시는 약과 지금까지의 경과입니다. 이 링크는 그대로 두고 쓰시면 됩니다 —
          처방이 바뀌어도 같은 주소에서 이어집니다.
        </p>
      </header>

      {current ? (
        <>
          <div className="mb-6 rounded-2xl bg-neutral-900 px-5 py-4 text-white">
            <p className="text-[13px] text-neutral-300">지금 드시는 약</p>
            <p className="mt-0.5 text-[20px] font-bold">
              {current.formulaName || '처방'}
            </p>
            <p className="mt-1 text-[13px] text-neutral-300">
              {current.issuedAt.slice(0, 10)} 처방
              {current.dosing.dayIndex != null &&
                ` · 복용 ${current.dosing.dayIndex}일째`}
            </p>
          </div>

          <GuideBody
            guide={current}
            dosing={current.dosing}
            onDosingChange={setDosing}
          />
        </>
      ) : (
        <div className="mb-6 rounded-2xl border border-neutral-200 p-6 text-center">
          <p className="text-[15px] font-semibold">지금 드시는 약이 없습니다</p>
          <p className="mt-1 text-[14px] leading-relaxed text-neutral-600">
            다음 처방을 받으시면 여기에 나타납니다.
          </p>
        </div>
      )}

      {/* 경과는 처방을 가로질러 이어진다 — 처방이 바뀌었다고 처음부터
          다시 그리면 나아지고 있는지를 볼 수가 없다. */}
      <ProgressChart reports={data.timeline} showFormula={data.past.length > 0} />

      {current && (
        <SelfReportForm
          token={current.token}
          adverseFlagOptions={data.adverseFlagOptions}
          onSent={load}
        />
      )}

      {/* 지난 처방 */}
      {data.past.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <h2 className="text-[15px] font-bold">지난 처방 {data.past.length}건</h2>
          </div>
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {data.past.map((g) => (
              <li key={g.token}>
                <Link
                  to={`/guide/${g.token}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">
                      {g.formulaName || '처방'}
                    </p>
                    <p className="mt-0.5 text-[13px] text-neutral-500">
                      {g.issuedAt.slice(0, 10)}
                      {g.totalDays != null && ` · ${g.totalDays}일분`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 수신 거부 — 법이 요구하는 수단이기도 하고, 없으면 링크 자체를 안 연다 */}
      <div className="mt-8 border-t border-neutral-100 pt-5">
        {data.notifyOptedOut ? (
          <p className="text-[13px] leading-relaxed text-neutral-500">
            복약 확인 알림을 받지 않도록 설정되어 있습니다. 다시 받으시려면 한의원에
            말씀해 주세요.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void optOut()}
            disabled={optingOut}
            className="flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 underline disabled:opacity-50"
          >
            <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
            복약 확인 알림 그만 받기
          </button>
        )}
        <p className="mt-3 text-[12px] leading-relaxed text-neutral-400">
          이 화면은 {data.clinicName || '한의원'}에서 보낸 것입니다. 개인을 식별할 수
          있는 정보는 담겨 있지 않습니다. 증상이 갑자기 심해지면 이 화면 대신 의료기관에
          직접 연락해 주세요.
        </p>
      </div>
    </main>
  )
}
