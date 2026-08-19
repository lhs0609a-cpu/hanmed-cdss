import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserMinus, ChevronRight } from 'lucide-react'
import { fetchInactivePatients, type InactivePatient } from '@/services/myPatients'
import { logError } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * 한동안 안 온 환자.
 *
 * 신환을 데려오는 비용보다 이미 온 환자가 다시 오게 하는 쪽이 훨씬 싸다.
 * 그런데 "누가 안 오고 있는지" 는 아무 화면에도 없어서 이탈은 조용히 일어난다.
 *
 * 연락할 사람을 고르는 화면이므로 오래 안 온 순으로만 보여 주고,
 * 자동 문자 같은 건 하지 않는다 — 환자에게 나가는 연락은 한의사가 결정할 일이다.
 * 대상이 없으면 카드를 숨긴다.
 */

const RANGES = [
  { days: 30, label: '1개월' },
  { days: 60, label: '2개월' },
  { days: 180, label: '6개월' },
]

export function InactivePatientsCard() {
  // 기본값은 가장 민감한 1개월. 기간 버튼이 카드 안에 있어서, 기본값을 넓게
  // 잡으면 정작 대상이 있는데도 카드가 숨어 버려 기간을 좁힐 방법이 없다.
  const [days, setDays] = useState(30)
  const [items, setItems] = useState<InactivePatient[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setItems(await fetchInactivePatients(days))
    } catch (err) {
      logError(err, 'InactivePatientsCard')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || items.length === 0) return null

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <UserMinus className="h-4 w-4 text-neutral-500" aria-hidden="true" />
        <h2 className="text-[15px] font-bold text-neutral-900">
          한동안 안 온 환자 {items.length}명
        </h2>
        <div className="ml-auto flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={cn(
                'rounded-lg px-2 py-1 text-[12px] font-medium transition-colors',
                days === r.days
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
              )}
            >
              {r.label}+
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {items.slice(0, 6).map((p) => (
          <li key={p.id}>
            <Link
              to={`/dashboard/patients/${p.id}`}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 transition-colors hover:bg-neutral-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-neutral-900">
                  {p.name}
                  {p.mainComplaint && (
                    <span className="ml-2 font-normal text-neutral-500">
                      {p.mainComplaint}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[12px] text-neutral-500">
                  {p.neverVisited
                    ? `등록 후 ${p.daysSinceLastVisit}일째 내원 없음`
                    : `마지막 내원 ${p.daysSinceLastVisit}일 전 · 총 ${p.totalVisits}회`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
            </Link>
          </li>
        ))}
      </ul>

      {items.length > 6 && (
        <p className="mt-2 text-[12px] text-neutral-500">외 {items.length - 6}명</p>
      )}
    </section>
  )
}

export default InactivePatientsCard
