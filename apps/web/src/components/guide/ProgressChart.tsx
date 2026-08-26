import { TrendingDown } from 'lucide-react'
import type { MyReport } from '@/services/publicGuide'

interface Props {
  reports: MyReport[]
  /** 처방이 여러 번 바뀐 경우 막대 아래에 처방명을 붙인다 */
  showFormula?: boolean
}

/**
 * 내 경과.
 *
 * 기록을 보내기만 하고 다시 볼 수 없으면 좋아지고 있는지 본인이 알 수 없다.
 * 한의원 기피 이유 4위가 "효과가 불확실하다" 인데, 정작 본인의 호전을 본인
 * 눈으로 볼 자리가 없었다.
 *
 * 처방이 바뀌어도 그래프는 이어진다. 처방마다 처음부터 다시 그리면 나아지고
 * 있는지를 볼 수가 없다.
 */
export function ProgressChart({ reports, showFormula = false }: Props) {
  const scored = reports.filter((r) => r.symptomScore != null)
  if (scored.length === 0) return null

  const first = scored[0].symptomScore as number
  const last = scored[scored.length - 1].symptomScore as number
  const delta = scored.length >= 2 ? last - first : null

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-neutral-500" aria-hidden="true" />
        <h2 className="text-[15px] font-bold">내 경과</h2>
      </div>

      {delta != null && (
        <p className="mb-3 text-[15px] leading-relaxed text-neutral-700">
          {delta < 0 ? (
            <>
              처음 기록보다 <strong className="text-green-700">{-delta}점</strong>{' '}
              낮아졌습니다.
            </>
          ) : delta > 0 ? (
            <>
              처음 기록보다 <strong className="text-red-700">{delta}점</strong>{' '}
              높아졌습니다. 불편이 계속되면 한의원에 알려 주세요.
            </>
          ) : (
            <>처음 기록과 같습니다.</>
          )}
        </p>
      )}

      <div className="flex items-end gap-1.5 overflow-x-auto rounded-2xl border border-neutral-200 p-4">
        {scored.slice(-14).map((r) => (
          <div key={r.id} className="flex min-w-[24px] flex-1 flex-col items-center gap-1">
            <span className="text-[11px] text-neutral-500">{r.symptomScore}</span>
            <div
              className={`w-full rounded-t ${
                (r.symptomScore as number) <= 3
                  ? 'bg-green-400'
                  : (r.symptomScore as number) <= 6
                    ? 'bg-amber-400'
                    : 'bg-red-400'
              }`}
              style={{ height: `${Math.max(4, (r.symptomScore as number) * 10)}px` }}
            />
            <span className="text-[10px] text-neutral-400">
              {r.reportedAt.slice(5, 10).replace('-', '/')}
            </span>
            {showFormula && r.formulaName && (
              <span className="max-w-[48px] truncate text-[9px] text-neutral-400">
                {r.formulaName}
              </span>
            )}
          </div>
        ))}
      </div>

      {reports.some((r) => r.adverseFlags.length > 0) && (
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
          이상반응을 표시하신 기록이 있습니다. 한의원에서 확인합니다.
        </p>
      )}
    </section>
  )
}

export default ProgressChart
