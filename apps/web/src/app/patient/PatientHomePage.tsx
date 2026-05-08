import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Pill, Bell, Phone, MapPin, ChevronRight, Building2 } from 'lucide-react'

interface ClinicConnection {
  code: string
  clinicName: string
  connectedAt: number
}

interface UpcomingAppointment {
  id: string
  date: string
  time: string
  practitioner: string
}

interface ActivePrescription {
  id: string
  formula: string
  takeUntil: string
  nextTime: string
}

/**
 * 환자 홈 — 다음 예약 / 활성 처방 / 알림 설정을 한 화면에 요약.
 *
 * 정책:
 *   - 한의원 연결 안 됐으면 /patient/connect 로 강제 이동.
 *   - 데이터는 백엔드 /api/v1/patient/me/* 에서 페치 (Phase 2 에서 실 연결).
 */
export default function PatientHomePage() {
  const navigate = useNavigate()
  const [clinic, setClinic] = useState<ClinicConnection | null>(null)
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([])
  const [prescriptions, setPrescriptions] = useState<ActivePrescription[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ongojisin:patient:clinic')
      if (!raw) {
        navigate('/patient/connect', { replace: true })
        return
      }
      setClinic(JSON.parse(raw))
    } catch {
      navigate('/patient/connect', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!clinic) return
    // Phase 2 에서 실제 백엔드 연동.
    // 현재는 데모 데이터로 UI 흐름 점검.
    setAppointments([
      { id: 'a1', date: '2026-05-12', time: '오전 10:30', practitioner: '담당 한의사' },
    ])
    setPrescriptions([
      { id: 'p1', formula: '보중익기탕', takeUntil: '2026-05-20', nextTime: '저녁 7시' },
    ])
  }, [clinic])

  if (!clinic) return null

  return (
    <div className="px-5 pt-8 pb-24 max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Building2 className="w-3.5 h-3.5" />
          <span>{clinic.clinicName}</span>
        </div>
        <h1 className="text-xl font-bold">안녕하세요 👋</h1>
        <p className="text-sm text-gray-600">오늘의 진료 정보입니다.</p>
      </header>

      {/* 다음 예약 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-teal-600" />
          다음 진료 예약
        </h2>
        {appointments.length === 0 ? (
          <Link
            to="/patient/appointments"
            className="block rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 hover:border-teal-400"
          >
            예약된 진료가 없습니다. 예약하기 →
          </Link>
        ) : (
          appointments.map((a) => (
            <Link
              key={a.id}
              to={`/patient/appointments/${a.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 hover:border-teal-400 p-4 bg-white"
            >
              <div>
                <div className="font-semibold">{a.date}</div>
                <div className="text-sm text-gray-600 mt-0.5">{a.time} · {a.practitioner}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          ))
        )}
      </section>

      {/* 복용 중인 처방 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-teal-600" />
          복용 중인 처방
        </h2>
        {prescriptions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
            복용 중인 처방이 없습니다.
          </div>
        ) : (
          prescriptions.map((p) => (
            <Link
              key={p.id}
              to={`/patient/prescriptions/${p.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 hover:border-teal-400 p-4 bg-white"
            >
              <div>
                <div className="font-semibold">{p.formula}</div>
                <div className="text-sm text-gray-600 mt-0.5">
                  ~{p.takeUntil} · 다음 복용 {p.nextTime}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          ))
        )}
      </section>

      {/* 알림/한의원 정보 */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/patient/notifications"
          className="rounded-xl border border-gray-200 p-4 bg-white hover:border-teal-400"
        >
          <Bell className="w-5 h-5 text-teal-600" />
          <div className="mt-2 font-semibold text-sm">알림 설정</div>
          <div className="text-xs text-gray-500 mt-0.5">예약·복약 알림</div>
        </Link>
        <a
          href="tel:"
          className="rounded-xl border border-gray-200 p-4 bg-white hover:border-teal-400"
        >
          <Phone className="w-5 h-5 text-teal-600" />
          <div className="mt-2 font-semibold text-sm">한의원 연락</div>
          <div className="text-xs text-gray-500 mt-0.5">{clinic.clinicName}</div>
        </a>
      </section>

      <button
        onClick={() => {
          localStorage.removeItem('ongojisin:patient:clinic')
          navigate('/patient/connect', { replace: true })
        }}
        className="text-xs text-gray-400 underline mx-auto block pt-4"
      >
        한의원 연결 해제
      </button>

      <footer className="pt-6 border-t flex items-start gap-2 text-xs text-gray-500">
        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p>
          본 앱은 환자 안내 전용입니다. 진단/처방은 한의원에서 한의사가 진행합니다.
          알림은 한의원 운영 시간에만 발송됩니다.
        </p>
      </footer>
    </div>
  )
}
