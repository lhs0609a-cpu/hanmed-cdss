import { Link } from 'react-router-dom'
import { Leaf, ShieldAlert, Receipt, ChevronRight } from 'lucide-react'
import { LogoMark } from '@/components/common'

/**
 * 환자 앱 랜딩.
 *
 * 예전에는 "예약 확인/변경", "복약 알림" 을 할 수 있다고 적어 두고 한의원 코드를
 * 받았다. 셋 다 없는 기능이었고 코드 확인 API 는 서버에 존재하지도 않았다.
 * 없는 것을 광고하면 있는 것까지 못 믿게 된다.
 *
 * 지금 이 앱이 실제로 하는 일은 하나다 — 한의원이 발행한 복약 안내서를 열고
 * 모아 두는 것. 그것만 적는다.
 */
export default function PatientLandingPage() {
  return (
    <div className="mx-auto max-w-md space-y-8 px-5 pb-24 pt-12">
      <header className="text-center">
        <div className="mb-4">
          <LogoMark size={64} />
        </div>
        <h1 className="text-[24px] font-bold">내가 먹는 한약, 제대로 알기</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
          한의원에서 받은 복약 안내서를 열고 모아 둡니다. 약봉투의 QR 코드를 찍으면
          바로 열립니다.
        </p>
      </header>

      <section className="space-y-3">
        <Link
          to="/patient/home"
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-400"
        >
          <div>
            <div className="font-semibold">내 복약 안내서</div>
            <div className="text-[12px] text-gray-500">받은 안내서 보관함</div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>

        <Link
          to="/patient/connect"
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-400"
        >
          <div>
            <div className="font-semibold">링크로 안내서 추가</div>
            <div className="text-[12px] text-gray-500">한의원에서 받은 링크 붙여넣기</div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-3 text-[12px] text-gray-500">안내서에서 볼 수 있는 것</p>
          <ul className="space-y-2 text-[14px]">
            <li className="flex items-start gap-2">
              <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
              어떤 약재가 들어 있고 각각 무슨 일을 하는지
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
              복용 중인 약과 겹치는 주의사항, 이상반응 알리기
            </li>
            <li className="flex items-start gap-2">
              <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
              항목별 비용과 몇 일분을 받았는지
            </li>
          </ul>
        </div>
      </section>

      <p className="text-center text-[12px] leading-relaxed text-gray-400">
        진료·처방·청구는 한의원에서 진행됩니다. 예약과 복약 알림은 아직 제공하지
        않습니다. 증상이 갑자기 심해지면 한의원 또는 가까운 의료기관에 직접 연락해
        주세요.
      </p>
    </div>
  )
}
