import { Link } from 'react-router-dom'
import { Calendar, Pill, Bell, Building2, ChevronRight } from 'lucide-react'

/**
 * 환자 앱 랜딩 — 한의원 코드 입력 → 해당 한의원 환자 흐름 진입.
 *
 * 정책:
 *   - 환자가 처음 들어오면 한의원 식별 코드(4-6자리, 한의사가 알려줌)를 입력해 본인 한의원에 연결.
 *   - 코드는 한의사 측 Settings 에서 확인/공유 가능.
 *   - 향후 카카오 로그인/본인인증 연결 가능.
 */
export default function PatientLandingPage() {
  return (
    <div className="px-5 pt-12 pb-24 max-w-md mx-auto space-y-8">
      <header className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-4">
          <span className="text-white font-bold text-xl">온</span>
        </div>
        <h1 className="text-2xl font-bold">우리 한의원, 손 안에</h1>
        <p className="mt-2 text-sm text-gray-600">
          예약·처방 안내·복약 알림을 한 곳에서. 한의원에서 받은 4~6자리 코드를 입력해 주세요.
        </p>
      </header>

      <section className="space-y-3">
        <Link
          to="/patient/connect"
          className="flex items-center justify-between rounded-xl border border-gray-200 hover:border-teal-400 transition-colors p-4 bg-white shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">한의원 연결</div>
              <div className="text-xs text-gray-500">코드 4~6자리 입력</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-3">앱에서 할 수 있는 일</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-teal-500 mt-0.5" />
              다음 진료 예약 확인 / 변경
            </li>
            <li className="flex items-start gap-2">
              <Pill className="w-4 h-4 text-teal-500 mt-0.5" />
              처방 한약 복용 일정 안내
            </li>
            <li className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-teal-500 mt-0.5" />
              복약/예약 푸시 알림
            </li>
          </ul>
        </div>
      </section>

      <p className="text-center text-xs text-gray-400">
        진료·처방·청구는 한의원에서 진행됩니다. 본 앱은 환자 안내 전용입니다.
      </p>
    </div>
  )
}
