import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Copy, Check, AlertTriangle, Printer } from 'lucide-react'
import { api } from '@/services/api'
import { logError } from '@/lib/errors'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

/**
 * 자동차보험 첩약 처방·조제내역서 초안.
 *
 * 2026년 자보 한의과 진료비 합리화 대책으로 첩약·약침 조제내역서 제출이
 * 의무화됐다(자동차보험진료수가에 관한 기준 별지 제13호). 같은 대책에서
 * 1회 최대 처방일수가 10일에서 7일로 줄고 사전조제가 원칙적으로 제한됐다.
 * 모르고 예전처럼 10일을 내면 그대로 삭감된다.
 *
 * 서식이 요구하는 네 부분(① 기관 ② 환자 ③ 진료 ④ 처방·조제) 중 앞의 셋은
 * 이미 우리가 가진 기록이다. 약재 구성도 처방 카탈로그에서 채운다.
 * 용량(g)과 원산지는 한의원마다 달라 우리가 지어낼 수 없으므로 빈칸으로 두고
 * 채워야 할 곳임을 표시한다 — 지어낸 값을 제출하면 그게 더 큰 문제다.
 */

/** 2026 자보 기준: 첩약 1회 최대 처방일수 */
const AUTO_INSURANCE_MAX_DAYS = 7

export interface AutoInsuranceVisit {
  visitedAt: string
  diagnosis: string
  formulaName: string
  days: number
}

interface HerbRow {
  name: string
  amount: string
  origin: string
}

interface Props {
  patientName: string
  patientBirthDate?: string
  visit: AutoInsuranceVisit
  onClose: () => void
}

export function AutoInsuranceSheet({
  patientName,
  patientBirthDate,
  visit,
  onClose,
}: Props) {
  const user = useAuthStore((s) => s.user)
  const [herbs, setHerbs] = useState<HerbRow[]>([])
  const [days, setDays] = useState(String(visit.days || AUTO_INSURANCE_MAX_DAYS))
  const [preDispensed, setPreDispensed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  /** 처방 카탈로그에서 약재 이름을 끌어온다. 용량·원산지는 비워 둔다. */
  const loadHerbs = useCallback(async () => {
    if (!visit.formulaName) {
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get<{ data: Array<{ id: string; name: string }> }>(
        '/formulas/search',
        { params: { q: visit.formulaName, limit: 1 } },
      )
      const hit = data?.data?.[0]
      if (!hit) return
      const { data: detail } = await api.get<{
        herbs?: Array<{ name?: string }>
      }>(`/formulas/${hit.id}`)
      setHerbs(
        (detail.herbs ?? [])
          // 이름 없는 행이 카탈로그에 섞여 있다(용량만 있는 행). 서식에 못 쓴다.
          .filter((h): h is { name: string } => Boolean(h.name))
          .map((h) => ({ name: h.name, amount: '', origin: '' })),
      )
    } catch (err) {
      logError(err, 'AutoInsuranceSheet.loadHerbs')
    } finally {
      setLoading(false)
    }
  }, [visit.formulaName])

  useEffect(() => {
    void loadHerbs()
  }, [loadHerbs])

  const dayCount = parseInt(days, 10) || 0
  const overDays = dayCount > AUTO_INSURANCE_MAX_DAYS
  const missingAmount = herbs.some((h) => !h.amount.trim())
  const missingOrigin = herbs.some((h) => !h.origin.trim())

  const setHerb = (i: number, patch: Partial<HerbRow>) =>
    setHerbs((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)))

  const sheet = useMemo(() => {
    const nl = String.fromCharCode(10)
    const lines = [
      '[자동차보험 첩약 처방·조제내역서 초안]',
      '',
      '① 기관 정보',
      `   - 요양기관명: ${user?.clinicName || '(설정에서 한의원명을 입력해 주세요)'}`,
      `   - 면허번호: ${user?.licenseNumber || '(미입력)'}`,
      '   - 요양기관기호: (직접 기재)',
      '',
      '② 환자 정보',
      `   - 성명: ${patientName}`,
      `   - 생년월일: ${patientBirthDate || '(미입력)'}`,
      '',
      '③ 진료 정보',
      `   - 진료일: ${visit.visitedAt.slice(0, 10)}`,
      `   - 상병(변증): ${visit.diagnosis || '(차트에 기록 없음)'}`,
      '',
      '④ 처방·조제 정보',
      `   - 처방명: ${visit.formulaName || '(차트에 기록 없음)'}`,
      `   - 투여일수: ${dayCount}일분`,
      `   - 사전조제 여부: ${preDispensed ? '예' : '아니오'}`,
      '   - 약재 구성:',
      ...herbs.map(
        (h) =>
          `     · ${h.name} ${h.amount || '(용량 미기재)'} / 원산지 ${h.origin || '(미기재)'}`,
      ),
      '',
      '※ 차트 기록과 처방 카탈로그에서 만든 초안입니다.',
      '※ 용량·원산지·요양기관기호는 확인 후 반드시 채워 제출해 주세요.',
    ]
    return lines.join(nl)
  }, [user, patientName, patientBirthDate, visit, dayCount, preDispensed, herbs])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sheet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      logError(err, 'AutoInsuranceSheet.copy')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 className="text-[17px] font-bold text-neutral-900">
              자보 첩약 처방·조제내역서
            </h2>
            <p className="mt-0.5 text-[12px] text-neutral-500">
              별지 제13호 서식 · 2026년부터 제출 의무
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* 규칙 경고 — 처방을 내기 전에 알아야 의미가 있다 */}
          {overDays && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-[13px] leading-relaxed text-red-800">
                2026년부터 자보 첩약은 <strong>1회 최대 {AUTO_INSURANCE_MAX_DAYS}일분</strong>
                입니다. {dayCount}일분은 삭감 대상입니다.
              </p>
            </div>
          )}
          {preDispensed && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-[13px] leading-relaxed text-amber-800">
                사전조제는 원칙적으로 제한됩니다. 인정 사유를 진료기록부에 남겨 주세요.
              </p>
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                투여일수
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className={cn(
                    'w-24 rounded-xl border px-3 py-2 text-[14px] focus:outline-none focus:ring-2',
                    overDays
                      ? 'border-red-300 bg-red-50 focus:ring-red-500/20'
                      : 'border-neutral-200 bg-neutral-50 focus:border-blue-500 focus:ring-blue-500/20',
                  )}
                />
                <span className="text-[13px] text-neutral-500">일분</span>
              </div>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-[13px] text-neutral-700">
                <input
                  type="checkbox"
                  checked={preDispensed}
                  onChange={(e) => setPreDispensed(e.target.checked)}
                  className="h-4 w-4 accent-blue-500"
                />
                사전조제한 첩약입니다
              </label>
            </div>
          </div>

          {/* 약재 표 */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-neutral-700">
              약재 구성 {herbs.length > 0 && `(${herbs.length}종)`}
            </span>
            {(missingAmount || missingOrigin) && herbs.length > 0 && (
              <span className="text-[12px] text-amber-700">
                용량·원산지는 직접 채워야 합니다
              </span>
            )}
          </div>

          {loading ? (
            <p className="py-6 text-center text-[13px] text-neutral-500">
              처방 구성을 불러오는 중…
            </p>
          ) : herbs.length === 0 ? (
            <p className="rounded-xl bg-neutral-50 px-3 py-4 text-[13px] text-neutral-500">
              처방 카탈로그에서 «{visit.formulaName}»의 구성을 찾지 못했습니다. 약재는
              직접 기재해 주세요.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-[13px]">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">약재명</th>
                    <th className="px-3 py-2 text-left font-medium">1첩 용량</th>
                    <th className="px-3 py-2 text-left font-medium">원산지</th>
                  </tr>
                </thead>
                <tbody>
                  {herbs.map((h, i) => (
                    <tr key={`${h.name}-${i}`} className="border-t border-neutral-100">
                      <td className="px-3 py-1.5 font-medium text-neutral-800">{h.name}</td>
                      <td className="px-3 py-1.5">
                        <input
                          value={h.amount}
                          onChange={(e) => setHerb(i, { amount: e.target.value })}
                          placeholder="예: 4g"
                          aria-label={`${h.name} 용량`}
                          className="w-24 rounded-lg border border-neutral-200 px-2 py-1 focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={h.origin}
                          onChange={(e) => setHerb(i, { origin: e.target.value })}
                          placeholder="예: 국산"
                          aria-label={`${h.name} 원산지`}
                          className="w-28 rounded-lg border border-neutral-200 px-2 py-1 focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4" data-print-area>
            <p className="mb-2 text-[13px] font-medium text-neutral-700">내역서 초안</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-[12px] leading-relaxed text-neutral-700">
              {sheet}
            </pre>
          </div>
        </div>

        <div className="flex gap-3 border-t border-neutral-100 px-6 py-4">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-4 py-2.5 text-[14px] font-medium text-neutral-700 hover:bg-neutral-200"
          >
            <Printer className="h-4 w-4" />
            인쇄
          </button>
          <button
            onClick={() => void copy()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-blue-700"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? '복사됨' : '내역서 복사'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AutoInsuranceSheet
