import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, Plus, Trash2 } from 'lucide-react'
import {
  listSavedGuides,
  removeGuide,
  type SavedGuide,
} from '@/lib/patientGuides'

/**
 * 환자 홈 — 내가 받은 복약 안내서 보관함.
 *
 * 예전 이 화면은 예약과 처방을 보여줬는데 전부 코드에 박아 둔 가짜였다
 * ('2026-05-12 오전 10:30', '보중익기탕'). 서버에는 그런 데이터가 없고,
 * 한의원 연결에 쓰던 API 는 아예 존재하지 않아 항상 404 였다.
 * 없는 예약을 보여주는 화면 하나로 나머지 전부를 못 믿게 된다.
 *
 * 그래서 실제로 있는 것 위에 다시 세운다 — 한의원이 발행한 복약 안내서다.
 * 목록은 이 기기에만 저장된다. 안내서는 약봉투의 QR 로 언제든 다시 열 수 있다.
 */
export default function PatientHomePage() {
  const [guides, setGuides] = useState<SavedGuide[]>([])

  useEffect(() => {
    setGuides(listSavedGuides())
  }, [])

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold">내 복약 안내서</h1>
        <p className="mt-1 text-[14px] leading-relaxed text-gray-600">
          한의원에서 받은 안내서를 모아 둡니다. 무엇이 들어 있는지, 언제까지 드시는지
          여기서 다시 볼 수 있습니다.
        </p>
      </header>

      {guides.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-6 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" aria-hidden="true" />
          <p className="mb-1 text-[15px] font-semibold">아직 저장된 안내서가 없습니다</p>
          <p className="mb-5 text-[14px] leading-relaxed text-gray-600">
            약봉투의 QR 코드를 찍거나, 한의원에서 받은 링크를 열면 여기에 담깁니다.
          </p>
          <Link
            to="/patient/connect"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-3 text-[15px] font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            링크로 추가하기
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {guides.map((g) => (
              <li key={g.token} className="flex items-center gap-2">
                <Link
                  to={`/guide/${g.token}`}
                  className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold">
                      {g.formulaName || '복약 안내서'}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-gray-500">
                      {g.clinicName || '한의원'} · {g.issuedAt.slice(0, 10)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
                </Link>
                <button
                  type="button"
                  onClick={() => setGuides(removeGuide(g.token))}
                  aria-label={`${g.formulaName || '안내서'} 목록에서 지우기`}
                  className="rounded-xl p-3 text-gray-300 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <Link
            to="/patient/connect"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 py-3 text-[15px] font-semibold text-gray-700"
          >
            <Plus className="h-4 w-4" />
            안내서 추가
          </Link>
        </>
      )}

      <p className="mt-8 text-[12px] leading-relaxed text-gray-400">
        이 목록은 이 기기에만 저장됩니다. 기기를 바꾸셔도 약봉투의 QR 코드로 안내서를
        다시 여실 수 있습니다. 증상이 갑자기 심해지면 한의원 또는 가까운 의료기관에
        직접 연락해 주세요.
      </p>
    </div>
  )
}
