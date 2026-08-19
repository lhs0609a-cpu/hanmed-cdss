import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, MessageSquare, ChevronRight } from 'lucide-react'
import { fetchUnreviewedReports, type UnreviewedReport } from '@/services/guides'
import { logError } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * 환자가 복용 중에 보낸 자가 기록.
 *
 * 소비자원 한방 피해구제 신청 사유 1위가 부작용(45.7%)이었고, 그중 간 기능
 * 이상을 호소한 사례가 있었다. 문제는 환자가 이상을 느껴도 다음 내원까지
 * 말할 데가 없다는 것이다. 안내서에서 보낸 기록을 여기서 먼저 본다.
 *
 * 이상반응이 붙은 기록이 위로 온다. 확인은 환자 화면에서 처리한다 —
 * 여기서 '확인' 만 눌러 없애면 정작 환자에게 연락하지 않게 된다.
 */
export function PatientReportsCard() {
  const [items, setItems] = useState<UnreviewedReport[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setItems(await fetchUnreviewedReports())
    } catch (err) {
      logError(err, 'PatientReportsCard')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || items.length === 0) return null

  const urgent = items.filter((r) => r.adverseFlags.length > 0).length

  return (
    <section
      className={cn(
        'rounded-2xl border p-5',
        urgent > 0 ? 'border-red-200 bg-red-50/60' : 'border-neutral-200 bg-white',
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {urgent > 0 ? (
          <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
        ) : (
          <MessageSquare className="h-4 w-4 text-neutral-500" aria-hidden="true" />
        )}
        <h2 className="text-[15px] font-bold text-neutral-900">
          환자가 보낸 기록 {items.length}건
          {urgent > 0 && (
            <span className="ml-2 text-[13px] font-semibold text-red-600">
              이상반응 {urgent}건
            </span>
          )}
        </h2>
      </div>

      <ul className="space-y-2">
        {items.slice(0, 5).map((r) => {
          const body = (
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-white p-3.5',
                r.adverseFlags.length > 0 ? 'border-red-200' : 'border-neutral-200',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-neutral-900">
                  {r.formulaName || '처방 없음'}
                  {r.symptomScore != null && (
                    <span className="ml-2 font-normal text-neutral-500">
                      증상 {r.symptomScore}/10
                    </span>
                  )}
                </p>
                {r.adverseFlags.length > 0 ? (
                  <p className="mt-0.5 truncate text-[12px] font-medium text-red-700">
                    {r.adverseFlags.join(', ')}
                  </p>
                ) : (
                  <p className="mt-0.5 truncate text-[12px] text-neutral-500">
                    {r.note || '메모 없음'}
                  </p>
                )}
              </div>
              {r.patientId && (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
              )}
            </div>
          )
          return (
            <li key={r.id}>
              {r.patientId ? (
                <Link to={`/dashboard/patients/${r.patientId}`}>{body}</Link>
              ) : (
                body
              )}
            </li>
          )
        })}
      </ul>

      {items.length > 5 && (
        <p className="mt-2 text-[12px] text-neutral-500">외 {items.length - 5}건</p>
      )}
    </section>
  )
}

export default PatientReportsCard
