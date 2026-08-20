import { AlertTriangle, ArrowRight, Lightbulb, Stethoscope } from 'lucide-react'

/**
 * 치험례 구조화 요약 — 임상의가 자기 케이스와 대조하기 위한 화면.
 *
 * 원문은 한 덩어리다. 6,454건 중 817건이 4천자를 넘고, 한 글에 이 사례 +
 * 다른 사람 시험복용례 + 고전 인용 + 다른 처방 교과서 해설 + 또 다른 활용사례가
 * 함께 들어 있는 경우가 흔하다. 진료 중에 그걸 읽고 판단할 수는 없다.
 *
 * 그래서 읽는 순서를 정해 둔다.
 *   1) 한 줄 요약 — 볼지 말지 3초 안에 결정
 *   2) 결정적 소견 — 내 환자와 겹치는지
 *   3) 변증 논리 — 왜 그렇게 봤는지
 *   4) 처방과 가감 — 무엇을 왜 더했는지
 *   5) 경과 — 몇 번째 복용에 무엇이 달라졌는지
 *   6) 이 사례의 특징 — 내 케이스에 가져다 쓸 수 있는지
 *
 * 6번이 핵심이다. 나이·주소증만으로는 비교가 안 된다.
 *
 * 요약이 없는 치험례(아직 정리 전)에는 아무것도 그리지 않는다 — 빈 껍데기를
 * 보여주느니 원문을 보여주는 편이 낫다.
 */

export interface CaseSummary {
  summaryOneLine?: string | null
  keyFindings?: string[] | null
  patternReasoning?: string | null
  modification?: string | null
  courseSteps?: Array<{ step: string; change: string }> | null
  distinctive?: string | null
  verifiedFormulaName?: string | null
  formulaMismatch?: boolean | null
  hasMixedContent?: boolean | null
}

interface Props {
  summary: CaseSummary
  /** 목록에 저장돼 있는 처방명 — 본문과 어긋날 때 같이 보여준다 */
  storedFormulaName?: string | null
  className?: string
}

export function CaseSummaryPanel({ summary, storedFormulaName, className }: Props) {
  const {
    summaryOneLine,
    keyFindings,
    patternReasoning,
    modification,
    courseSteps,
    distinctive,
    verifiedFormulaName,
    formulaMismatch,
    hasMixedContent,
  } = summary

  const findings = keyFindings ?? []
  const steps = courseSteps ?? []

  // 정리된 게 하나도 없으면 그리지 않는다.
  if (
    !summaryOneLine &&
    findings.length === 0 &&
    !patternReasoning &&
    steps.length === 0 &&
    !distinctive
  ) {
    return null
  }

  return (
    <div className={className}>
      {/* 표제 위의 작은 한자 — 이 화면이 무엇인지 한 눈에 말한다. */}
      <div className="hanja mb-1.5 text-[10.5px] tracking-[0.3em] text-ink-faint">治 驗 例</div>
      {summaryOneLine && (
        <p className="font-serif text-[17px] font-bold leading-relaxed text-ink">
          {summaryOneLine}
        </p>
      )}

      {/* 데이터가 못 미더운 지점은 먼저 말한다. 근거로 쓰는 화면이다. */}
      {(formulaMismatch || hasMixedContent) && (
        <div className="mt-3 space-y-2">
          {formulaMismatch && verifiedFormulaName && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <p className="text-[13px] leading-relaxed text-amber-900">
                목록에는 <strong>{storedFormulaName || '다른 처방'}</strong>으로 되어 있지만,
                본문에서 실제로 쓴 처방은 <strong>{verifiedFormulaName}</strong>입니다. 원문을
                확인해 주세요.
              </p>
            </div>
          )}
          {hasMixedContent && (
            <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
              <p className="text-[13px] leading-relaxed text-neutral-700">
                이 원문에는 다른 사례나 처방 해설이 함께 실려 있습니다. 아래 정리는 첫
                번째 사례만 다룹니다.
              </p>
            </div>
          )}
        </div>
      )}

      {findings.length > 0 && (
        <section className="mt-5">
          <h4 className="mb-2 font-serif text-[14px] font-bold text-ink-soft">결정적 소견</h4>
          <ul className="space-y-1.5">
            {findings.map((f, i) => (
              <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-neutral-700">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}

      {patternReasoning && (
        <section className="mt-5">
          <h4 className="mb-1.5 font-serif text-[14px] font-bold text-ink-soft">변증 논리</h4>
          <p className="text-[14px] leading-relaxed text-neutral-700">{patternReasoning}</p>
        </section>
      )}

      {(verifiedFormulaName || modification) && (
        <section className="mt-5 rounded-xl bg-blue-50 px-4 py-3">
          <h4 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-blue-900">
            <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            처방
          </h4>
          {verifiedFormulaName && (
            <p className="text-[15px] font-semibold text-blue-900">{verifiedFormulaName}</p>
          )}
          {modification && (
            <p className="mt-1 text-[14px] leading-relaxed text-blue-900">
              가감 · {modification}
            </p>
          )}
        </section>
      )}

      {steps.length > 0 && (
        <section className="mt-5">
          <h4 className="mb-2.5 font-serif text-[14px] font-bold text-ink-soft">복용 경과</h4>
          <ol className="relative space-y-3 border-l border-neutral-200 pl-4">
            {steps.map((s, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-blue-500" />
                <p className="text-[13px] font-semibold text-neutral-900">{s.step}</p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-neutral-700">{s.change}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {distinctive && (
        <section className="mt-5 rounded-xl border border-neutral-900/10 bg-neutral-900/[0.03] px-4 py-3">
          <h4 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-neutral-900">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            이 치험례의 특징
          </h4>
          <p className="text-[14px] leading-relaxed text-neutral-800">{distinctive}</p>
          <p className="mt-2 flex items-center gap-1 text-[12px] text-neutral-500">
            <ArrowRight className="h-3 w-3" aria-hidden="true" />내 환자와 겹치는 부분이
            있는지 위 소견과 대조해 보세요.
          </p>
        </section>
      )}
    </div>
  )
}

export default CaseSummaryPanel
