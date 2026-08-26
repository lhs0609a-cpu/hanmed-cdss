import {
  BookOpen,
  HelpCircle,
  Info,
  Leaf,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import type { Dosing, PublicGuide } from '@/services/publicGuide'
import { DoseTracker } from './DoseTracker'

const SEVERITY_LABEL: Record<string, string> = {
  critical: '함께 드시면 안 됩니다',
  major: '주의가 필요합니다',
  moderate: '지켜봐야 합니다',
  minor: '참고하세요',
}

interface Props {
  guide: PublicGuide
  dosing: Dosing
  onDosingChange: (next: Dosing) => void
}

/**
 * 안내서 본문 — 약봉투 QR(/guide/:token)과 카톡 추적 링크(/t/:token)가 함께 쓴다.
 *
 * 한의원 기피 이유 조사 상위가 전부 "모른다" 였다.
 *   · 뭘 먹는지 모른다   → 약재 구성과 각 약재가 하는 일
 *   · 왜 이 약인지 모른다 → 같은 증상 치험례 몇 건에서 나온 처방인지
 *   · 안전한지 모른다     → 복용 중인 양약과의 상호작용, 즉시 알려야 할 징후
 *   · 얼마인지 모른다     → 항목별 금액과 총액
 *   · 몇 일분 받았는지 모른다 → 총 일수 대비 수령분(환불 분쟁의 대부분이 여기)
 *
 * 한의사 앱(글래스 디자인)과 섞지 않는다. 이건 환자가 약봉투와 함께 보는
 * 문서라, 흰 바탕에 큰 글씨로 읽히는 것이 전부다.
 */
export function GuideBody({ guide, dosing, onDosingChange }: Props) {
  const remaining =
    guide.totalDays != null && guide.dispensedDays != null
      ? guide.totalDays - guide.dispensedDays
      : null

  return (
    <>
      {/* 무엇으로 보았는지 — "한의사마다 진단이 다르다" 가 효과 불신의 뿌리인데
          정작 환자는 자기가 무엇으로 진단됐는지도 모른 채 약을 받는다. */}
      {guide.diagnosis && (
        <section className="mb-6 rounded-2xl border border-neutral-200 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <h2 className="text-[15px] font-bold">무엇으로 보셨나요?</h2>
          </div>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
            {guide.diagnosis}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
            한의학의 진단은 증상·체질·맥 같은 여러 가지를 함께 보기 때문에 한의사에
            따라 다르게 볼 수 있습니다. 다른 곳에서 다른 이야기를 들으셨다면 어느 쪽이
            틀린 것이 아니라 보는 축이 다른 것일 수 있습니다.
          </p>
        </section>
      )}

      {/* 왜 이 약인지 — 효과 불확실·표준화 불신에 대한 답 */}
      {guide.evidence && (
        <section className="mb-6 rounded-2xl border border-neutral-200 p-5">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <h2 className="text-[15px] font-bold">왜 이 처방인가요?</h2>
          </div>
          <p className="text-[15px] leading-relaxed text-neutral-700">
            비슷한 증상으로 이 처방을 쓴 치험례가{' '}
            <strong>{guide.evidence.caseCount.toLocaleString()}건</strong> 기록되어
            있습니다.
            {guide.evidence.successRate != null && (
              <>
                {' '}
                그중 호전 이상으로 기록된 비율은{' '}
                <strong>{guide.evidence.successRate}%</strong>입니다.
              </>
            )}
          </p>
          {guide.evidence.source && (
            <p className="mt-1.5 text-[13px] text-neutral-500">
              출전: {guide.evidence.source}
            </p>
          )}
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
            치험례집은 성공한 사례를 주로 싣기 때문에 실제 성공률보다 높게 나옵니다.
            참고 자료로만 봐 주세요.
          </p>
        </section>
      )}

      {/* 약재 구성 — "뭘 먹는지 모른다" 에 대한 답 */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Leaf className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          <h2 className="text-[15px] font-bold">
            무엇이 들어 있나요?
            {guide.herbs.length > 0 && ` (${guide.herbs.length}가지)`}
          </h2>
        </div>

        {guide.herbs.length === 0 ? (
          // 목록이 없으면 없다고 말한다. 섹션을 통째로 감추면 환자는 이 화면에
          // 원래 약재 이야기가 없는 줄 안다.
          <div className="rounded-2xl border border-neutral-200 p-4">
            <p className="text-[15px] leading-relaxed text-neutral-700">
              이 안내서에는 약재 구성이 기재되지 않았습니다.
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">
              무엇이 들어갔는지는 환자분이 아셔야 하는 내용입니다. 한의원에 요청하시면
              알려드릴 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
              {guide.herbs.map((h) => (
                <li key={h.name} className="flex items-baseline gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{h.name}</p>
                    {h.effect && (
                      <p className="mt-0.5 text-[14px] leading-relaxed text-neutral-600">
                        {h.effect}
                      </p>
                    )}
                  </div>
                  {/* 용량은 실제 조제 내용일 때만 보여준다. 카탈로그의 용량은
                      고전 표기(一錢半, 各五分)라 환자에게 읽히지 않고 실제
                      조제량과도 다르다. 잘못 읽히느니 없는 편이 낫다. */}
                  {guide.herbSource === 'prescription' && h.amount && (
                    <span className="shrink-0 text-[14px] tabular-nums text-neutral-500">
                      {h.amount}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {guide.herbSource === 'catalog' && (
              <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-relaxed text-amber-700">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                위 목록은 <strong>{guide.formulaName}</strong>의 표준 구성입니다. 실제로
                조제된 약은 증상에 맞춰 약재를 더하거나 뺐을 수 있습니다. 정확한 조제
                내용은 한의원에 요청해 주세요.
              </p>
            )}

            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
              알레르기가 있거나 예전에 문제가 있었던 약재가 보이면 복용 전에 한의원에
              알려 주세요.
            </p>
          </>
        )}

        {/* 원산지 — 한약 불신의 큰 축인데 지금까지 어디에도 답이 없었다 */}
        <div className="mt-3 rounded-xl bg-neutral-50 px-4 py-3">
          <p className="text-[13px] font-medium text-neutral-700">약재 원산지·규격</p>
          <p className="mt-0.5 text-[14px] leading-relaxed text-neutral-600">
            {guide.herbOrigin || '이 안내서에는 기재되지 않았습니다. 한의원에 문의해 주세요.'}
          </p>
        </div>
      </section>

      {/* 복용법 + 복용 진행 */}
      <section className="mb-6 rounded-2xl bg-neutral-50 p-5">
        <h2 className="mb-2 text-[15px] font-bold">어떻게 드시나요?</h2>
        {guide.instructions && (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
            {guide.instructions}
          </p>
        )}
        {guide.totalDays != null && (
          <p className="mt-2 text-[15px] text-neutral-700">
            총 <strong>{guide.totalDays}일분</strong>
            {guide.dispensedDays != null && (
              <>
                {' '}
                중 <strong>{guide.dispensedDays}일분</strong>을 받으셨습니다
                {remaining != null && remaining > 0 && (
                  <span className="text-neutral-500"> (남은 {remaining}일분)</span>
                )}
              </>
            )}
          </p>
        )}

        <div className="mt-4 border-t border-neutral-200 pt-4">
          <DoseTracker
            token={guide.token}
            dosing={dosing}
            totalDays={guide.totalDays}
            onChange={onDosingChange}
          />
        </div>
      </section>

      {/* 상호작용 — "안전한지 모른다" 에 대한 답.
          0건일 때 섹션을 감추면 환자는 안전하다는 뜻으로 읽는다. 확인했는데
          문제없는 것과 확인 자체를 안 한 것은 전혀 다른 이야기다. */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          {guide.interactions.length > 0 ? (
            <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          )}
          <h2 className="text-[15px] font-bold">복용 중인 약과의 주의사항</h2>
        </div>

        {guide.interactions.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 p-4">
            {guide.reviewedDrugCount == null ? (
              <p className="text-[15px] leading-relaxed text-neutral-700">
                복용 중인 양약과의 대조를 하지 못했습니다.
              </p>
            ) : guide.reviewedDrugCount === 0 ? (
              <p className="text-[15px] leading-relaxed text-neutral-700">
                복용 중인 양약을 알려주신 것이 없어 <strong>대조하지 못했습니다.</strong>
              </p>
            ) : (
              <p className="text-[15px] leading-relaxed text-neutral-700">
                알려주신 양약 <strong>{guide.reviewedDrugCount}가지</strong>와 대조했고,
                주의할 조합은 나오지 않았습니다.
              </p>
            )}
            <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">
              {guide.reviewedDrugCount
                ? '대조 이후에 새로 드시기 시작한 약이 있으면 한의원에 알려 주세요.'
                : '드시는 양약·영양제가 있으면 한의원에 알려 주세요. 대법원은 양약을 드시는 분께 한약을 처방할 때 상호작용 위험을 설명하도록 하고 있습니다.'}
            </p>
          </div>
        )}

        {guide.interactions.length > 0 && (
          <ul className="space-y-2">
            {guide.interactions.map((it, i) => (
              <li
                key={`${it.drug}-${it.herb}-${i}`}
                className={`rounded-2xl border p-4 ${
                  it.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <p className="text-[15px] font-bold text-neutral-900">
                  {it.drug} · {SEVERITY_LABEL[it.severity] ?? '확인이 필요합니다'}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-neutral-700">
                  한약 재료 중 <strong>{it.herb}</strong>과(와) 함께 작용할 수 있습니다.
                </p>
                {it.advice && (
                  <p className="mt-1 text-[14px] leading-relaxed text-neutral-700">
                    {it.advice}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 주의사항 */}
      {guide.cautions && (
        <section className="mb-6 rounded-2xl border border-neutral-200 p-5">
          <h2 className="mb-2 text-[15px] font-bold">주의사항</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
            {guide.cautions}
          </p>
        </section>
      )}

      {/* 비용 — "얼마인지 모른다" 가 한약 복용 의향이 없는 이유 1위였다.
          안 적혔다고 섹션을 감추면 그 1위가 그대로 남는다. */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          <h2 className="text-[15px] font-bold">비용</h2>
        </div>

        {guide.costItems.length === 0 && guide.totalCost == null ? (
          <div className="rounded-2xl border border-neutral-200 p-4">
            <p className="text-[15px] leading-relaxed text-neutral-700">
              이 안내서에는 금액이 기재되지 않았습니다.
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">
              비급여 진료는 의료법 제45조의2 에 따라 하기 <strong>전에</strong> 가격과
              사유를 설명받으실 수 있습니다. 항목별 금액을 한의원에 요청해 주세요.
            </p>
          </div>
        ) : (
          <>
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {guide.costItems.map((c) => (
              <li key={c.name} className="flex justify-between px-4 py-3 text-[15px]">
                <span className="text-neutral-700">{c.name}</span>
                <span className="font-semibold tabular-nums">
                  {c.amount.toLocaleString()}원
                </span>
              </li>
            ))}
            {guide.totalCost != null && (
              <li className="flex justify-between bg-neutral-50 px-4 py-3 text-[15px] font-bold">
                <span>합계</span>
                <span className="tabular-nums">{guide.totalCost.toLocaleString()}원</span>
              </li>
            )}
          </ul>
          {remaining != null && remaining > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-relaxed text-neutral-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              아직 받지 않은 {remaining}일분이 있습니다. 복용을 중단하시게 되면 받지
              않은 분에 대해 한의원에 환불을 요청하실 수 있습니다.
            </p>
          )}
          {/* 선납 후 일부만 받은 상태가 환불 분쟁의 대부분이다. 수령 일수가
              비어 있으면 다툴 때 근거가 될 숫자가 없다는 뜻이므로 그렇게 적는다. */}
          {guide.totalDays != null && guide.dispensedDays == null && (
            <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-relaxed text-amber-700">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              지금까지 몇 일분을 받으셨는지가 기재되지 않았습니다. 선납하신 뒤 일부만
              받으신 상태라면 남은 분에 대해 환불을 요청하실 수 있으니, 수령하신
              일수를 한의원과 함께 확인해 두세요.
            </p>
          )}
          </>
        )}
      </section>
    </>
  )
}

export default GuideBody
