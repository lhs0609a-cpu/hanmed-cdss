import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import { BASE_STATS, formatStatNumber } from '@/config/stats.config'

/**
 * 핵심 기능 안내 카드 — Toss 톤의 단정한 CTA.
 * 이전의 그라데이션·실시간 데모·다채색 배지를 모두 제거하고
 * 큰 숫자 + 짧은 카피 + 단일 액션 두 개로 구성한다.
 */

interface KillerFeatureHighlightProps {
  compact?: boolean
}

export function KillerFeatureHighlight({ compact = false }: KillerFeatureHighlightProps) {
  if (compact) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-6">
        <p className="text-[12px] font-semibold text-primary mb-1.5">핵심 기능</p>
        <h3 className="text-[17px] font-bold text-neutral-900">처방 추론 어시스턴트</h3>
        <p className="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">
          증상을 입력하면 {formatStatNumber(BASE_STATS.cases)} 치험례에서 후보를 보여드립니다.
        </p>
        <Link
          to="/dashboard/consultation"
          className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-900"
        >
          시작하기
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-8 md:p-10">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-[13px] font-semibold text-primary mb-2">핵심 기능</p>
          <h2 className="text-[28px] font-bold tracking-tight text-neutral-900 leading-snug">
            증상만 입력하면
            <br />
            처방 후보가 나옵니다
          </h2>
          <p className="text-[15px] text-neutral-600 mt-4 leading-relaxed">
            {formatStatNumber(BASE_STATS.cases)} 치험례와 {formatStatNumber(BASE_STATS.formulas)} 처방 데이터에서 유사 사례 기반으로 후보를 보여드립니다.
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6 pt-6 border-t border-neutral-100">
            <Stat label="치험례" value={formatStatNumber(BASE_STATS.cases)} />
            <Stat label="처방" value={formatStatNumber(BASE_STATS.formulas)} />
            <Stat label="평균 응답" value="~3초" />
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            <Link
              to="/dashboard/consultation"
              className="inline-flex items-center gap-2 h-12 px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-[14px] font-semibold rounded-md transition-colors active:scale-[0.99]"
            >
              지금 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard/cases"
              className="inline-flex items-center gap-2 h-12 px-5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-[14px] font-semibold rounded-md transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              치험례 둘러보기
            </Link>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="rounded-md bg-neutral-50 border border-neutral-200 p-6 space-y-3">
            <Step n={1} title="증상 입력" desc="주소증과 동반 증상을 적습니다." />
            <Step n={2} title="변증 추론" desc="기허·혈허·습열 등 후보를 분석합니다." />
            <Step n={3} title="유사 치험례" desc="비슷한 환자의 처방 결과를 찾아냅니다." />
            <Step n={4} title="처방 후보" desc="최종 결정은 한의사가 합니다." />
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[20px] font-extrabold tabular text-neutral-900 tracking-tight">
        {value}
      </div>
      <div className="text-[12px] text-neutral-500 mt-0.5">{label}</div>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-md bg-white border border-neutral-200 text-neutral-700 flex items-center justify-center text-[12px] font-bold flex-shrink-0">
        {n}
      </div>
      <div>
        <p className="font-semibold text-[14px] text-neutral-900">{title}</p>
        <p className="text-[13px] text-neutral-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

export default KillerFeatureHighlight
