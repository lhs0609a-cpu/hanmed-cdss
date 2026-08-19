import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, Info, ShieldCheck } from 'lucide-react'
import { CHEOPYAK_DISEASES } from '@/data/cheopyak-codes'

/**
 * 한약 비용 미리 알아보기 — 진료를 받기 전에.
 *
 * 2024년 한방의료이용 실태조사에서 한약 복용 의향이 없는 이유 1위가
 * "한약 값이 비싸서" 였고, 개선 요구 1순위가 "보험급여 적용 확대" 였다.
 * 그런데 정작 첩약에 건강보험이 되는 질환이 있다는 사실 자체를 모르는 사람이 많다.
 *
 * 여기서는 값을 지어내지 않는다. 우리가 아는 것은 제도이지 개별 한의원의
 * 가격이 아니다. 실제 가격은 심평원이 공개하는 곳으로 보낸다.
 *
 * 출처
 *   - 첩약 건강보험 적용 2단계 시범사업 (보건복지부 보도자료)
 *     본인부담 한의원 30%·한방병원 40%·종합병원 50%,
 *     연간 2개 질환 × 각 20일, 참여기관 5,955개소,
 *     참여 환자 조사에서 1인당 84,860원 경감
 *   - 비급여 진료비용 공개: 693개 항목, 2025-09-03 부터 (심평원 누리집·건강e음)
 *   - 비급여 사전 설명 의무: 의료법 제45조의2
 */

const HIRA_NONPAY_URL = 'https://www.hira.or.kr/npay/index.do'
const HIRA_SPECIAL_ORG_URL =
  'https://www.hira.or.kr/ra/spclMgtAdmInfm/spclMgtAdmInfm.do?pgmid=HIRAA030003000000'

const PILOT_DISEASES = CHEOPYAK_DISEASES.filter((d) => d.isPilotCovered !== false)

export default function PatientCostPage() {
  const [selected, setSelected] = useState<string | null>(null)

  const covered = selected !== null && selected !== 'other'

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold">한약, 얼마나 들까요?</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">
          한약에도 건강보험이 되는 질환이 있습니다. 먼저 해당하는지 확인해 보세요.
        </p>
      </header>

      <section className="mb-6">
        <p className="mb-3 text-[15px] font-semibold">어떤 증상으로 가시나요?</p>
        <div className="space-y-2">
          {PILOT_DISEASES.map((d) => (
            <button
              key={d.pilotCode}
              type="button"
              onClick={() => setSelected(d.name)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[15px] ${
                selected === d.name
                  ? 'border-gray-900 bg-gray-900 font-semibold text-white'
                  : 'border-gray-300 text-gray-800'
              }`}
            >
              {d.name}
              {selected === d.name && <Check className="h-4 w-4" aria-hidden="true" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected('other')}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[15px] ${
              selected === 'other'
                ? 'border-gray-900 bg-gray-900 font-semibold text-white'
                : 'border-gray-300 text-gray-800'
            }`}
          >
            그 밖의 증상
            {selected === 'other' && <Check className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </section>

      {covered && (
        <section className="mb-6 rounded-2xl border-2 border-gray-900 p-5">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" aria-hidden="true" />
            <h2 className="text-[16px] font-bold">건강보험이 적용되는 질환입니다</h2>
          </div>
          <ul className="space-y-2 text-[15px] leading-relaxed text-gray-800">
            <li>
              한의원에서 받으시면 <strong>본인부담 30%</strong>입니다. (한방병원 40%,
              종합병원 50%)
            </li>
            <li>
              1년에 <strong>2개 질환까지, 질환마다 20일분까지</strong> 적용됩니다.
            </li>
            <li>
              시범사업에 <strong>참여한 한의원에서만</strong> 됩니다. 전국 5,955개소가
              선정되어 있습니다.
            </li>
          </ul>
          <p className="mt-3 rounded-xl bg-gray-50 p-3 text-[14px] leading-relaxed text-gray-700">
            시범사업에 참여한 환자 조사에서, 보험이 안 되는 첩약을 살 때보다 1인당{' '}
            <strong>84,860원</strong>을 덜 냈다고 응답했습니다. (보건복지부)
          </p>
          <a
            href={HIRA_SPECIAL_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 py-3.5 text-[15px] font-semibold text-white"
          >
            참여 한의원 찾기
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <p className="mt-2 text-[12px] text-gray-500">
            심평원 「특수운영기관 정보」에서 지역별로 찾으실 수 있습니다.
          </p>
        </section>
      )}

      {selected === 'other' && (
        <section className="mb-6 rounded-2xl border border-gray-300 p-5">
          <h2 className="mb-2 text-[16px] font-bold">이 증상은 아직 비급여입니다</h2>
          <p className="text-[15px] leading-relaxed text-gray-700">
            첩약 건강보험은 위 6개 질환에만 적용됩니다. 그 밖의 증상으로 드시는 한약은
            전액 본인 부담이고, <strong>가격은 한의원마다 다릅니다.</strong>
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
            심평원이 전체 의료기관의 비급여 693개 항목 가격을 공개하고 있습니다. 가시려는
            한의원의 가격을 미리 확인해 보세요.
          </p>
        </section>
      )}

      {/* 가격 확인처 — 우리가 값을 지어내지 않고 공개된 곳으로 보낸다 */}
      <section className="mb-6 rounded-2xl bg-gray-50 p-5">
        <h2 className="mb-2 text-[15px] font-bold">가격은 어디서 확인하나요?</h2>
        <p className="text-[14px] leading-relaxed text-gray-700">
          심평원 누리집과 「건강e음」 앱에서 의료기관별 비급여 가격을 공개합니다. 지역별로
          비교해 볼 수 있습니다.
        </p>
        <a
          href={HIRA_NONPAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gray-400 py-3 text-[15px] font-semibold text-gray-800"
        >
          비급여 가격 조회하기
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </section>

      {/* 환자가 잘 모르는 권리 — 알아야 요구할 수 있다 */}
      <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <h2 className="text-[15px] font-bold text-blue-900">
            비급여는 미리 설명받으실 수 있습니다
          </h2>
        </div>
        <p className="text-[14px] leading-relaxed text-blue-900">
          의료법에 따라 의료기관은 비급여 진료를 하기 <strong>전에</strong> 항목과 가격,
          그게 왜 필요한지, 대신할 수 있는 다른 방법이 있는지를 설명하도록 되어 있습니다.
          진료 전에 물어보셔도 됩니다.
        </p>
      </section>

      <Link
        to="/patient"
        className="block text-center text-[14px] font-semibold text-gray-600"
      >
        ← 처음으로
      </Link>

      <p className="mt-8 text-[12px] leading-relaxed text-gray-400">
        여기 적힌 제도 내용은 보건복지부·심평원이 공개한 자료를 정리한 것입니다. 개별
        한의원의 가격은 저희가 알 수 없어 표시하지 않습니다. 실제 적용 여부와 금액은
        진료받으실 한의원에서 확인해 주세요.
      </p>
    </div>
  )
}
