import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Database,
  X,
  Sparkles,
} from 'lucide-react'
import { ADAPTERS, importFromEmr, type EmrSource, type ImportReport } from '@/lib/emrAdapter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'

/**
 * 자동 마이그레이션 마법사 — 첫 로그인 직후 강제 노출되어, 이전 EMR 데이터를
 * 5분 안에 흡수하도록 한다. SoR 락인의 출발점.
 *
 * 정책:
 *   - 한 번 완료/스킵하면 localStorage 에 표시 → 재노출 X (Settings 에서 다시 열기 가능).
 *   - 스킵 가능 (강제는 아님) — 그러나 강하게 권유.
 *   - 업로드 → 미리보기(처음 5건) → 확정 import.
 */

const MIGRATION_DONE_KEY = 'ongojisin:migration:done:v1'

const SOURCE_LABELS: Record<EmrSource, { label: string; subtitle: string }> = {
  'hanmed-chart': { label: '한의차트', subtitle: '환자 내보내기 CSV' },
  'doctor-palette': { label: '닥터팔레트', subtitle: '환자 목록 CSV' },
  jasen: { label: '자생 EMR', subtitle: '환자 export CSV' },
  highmedi: { label: '하이메디', subtitle: '환자 목록 CSV' },
  'csv-generic': { label: '일반 CSV', subtitle: 'name, birth_date, phone, … 컬럼' },
}

export function markMigrationDone(): void {
  try {
    localStorage.setItem(MIGRATION_DONE_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

export function isMigrationDone(): boolean {
  try {
    return Boolean(localStorage.getItem(MIGRATION_DONE_KEY))
  } catch {
    return false
  }
}

export default function MigrationWizardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user) as { name?: string } | null
  const [source, setSource] = useState<EmrSource>('hanmed-chart')
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [step, setStep] = useState<'pick' | 'preview' | 'done'>('pick')

  useEffect(() => {
    if (isMigrationDone()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  async function onFile(f: File) {
    setFile(f)
    setIsImporting(true)
    try {
      const r = await importFromEmr(source, f)
      setReport(r)
      setStep('preview')
    } finally {
      setIsImporting(false)
    }
  }

  async function confirmImport() {
    // 운영에서는 백엔드 import API 호출.
    // 현 단계에서는 클라이언트 측 보고만 표기 — Phase 2 에서 서버 import.
    setStep('done')
    markMigrationDone()
  }

  function skip() {
    markMigrationDone()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            온고지신 시작하기
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.name ? `${user.name} 원장님, ` : ''}이전 EMR 데이터를 가져올까요?
          </h1>
          <p className="mt-2 text-gray-600">
            기존 한의차트·닥터팔레트의 환자 정보를 5분 안에 옮길 수 있습니다.
            <br />
            진료 시작 전에 한 번만 하면 됩니다.
          </p>
        </header>

        {step === 'pick' && (
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">1. 어디서 가져오시나요?</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(ADAPTERS) as EmrSource[]).map((s) => {
                    const info = SOURCE_LABELS[s]
                    const selected = source === s
                    return (
                      <button
                        key={s}
                        onClick={() => setSource(s)}
                        className={`text-left rounded-xl border p-4 transition-all ${
                          selected
                            ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{info.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{info.subtitle}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">2. 파일 업로드</h2>
                <label
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-400 transition-colors cursor-pointer bg-gray-50/50 p-10"
                  htmlFor="emr-file"
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="font-medium text-gray-700">CSV 파일을 선택하거나 끌어 놓으세요</p>
                  <p className="text-xs text-gray-500 mt-1">최대 50MB · 환자 정보 포함</p>
                  <input
                    id="emr-file"
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onFile(f)
                    }}
                  />
                </label>
                {isImporting && (
                  <p className="text-sm text-gray-600 mt-3 text-center">파일을 분석하는 중…</p>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={skip}
                  className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                >
                  나중에 하기
                  <X className="h-4 w-4" />
                </button>
                <Link
                  to="/dashboard"
                  className="text-sm text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
                  onClick={markMigrationDone}
                >
                  먼저 둘러보기
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'preview' && report && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-emerald-600" />
                <div>
                  <h2 className="text-xl font-bold">분석 결과</h2>
                  <p className="text-sm text-gray-600">{file?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-900">
                  <div className="text-xs uppercase font-semibold opacity-70">환자</div>
                  <div className="text-2xl font-bold">{report.patientsImported}건</div>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-900">
                  <div className="text-xs uppercase font-semibold opacity-70">진료 기록</div>
                  <div className="text-2xl font-bold">{report.visitsImported}건</div>
                </div>
              </div>

              {report.errors.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">매핑 경고 {report.errors.length}건</div>
                      <ul className="text-xs space-y-0.5">
                        {report.errors.slice(0, 5).map((e, i) => (
                          <li key={i}>· (행 {e.row}) {e.reason}</li>
                        ))}
                        {report.errors.length > 5 && <li>· 외 {report.errors.length - 5}건</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep('pick')}>
                  다시 선택
                </Button>
                <Button onClick={confirmImport} className="flex-1">
                  {report.patientsImported}건 가져오기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold">마이그레이션 완료!</h2>
              <p className="text-gray-600">
                {report?.patientsImported ?? 0}명의 환자 정보가 온고지신으로 옮겨졌습니다.
                <br />
                지금부터 새 진료는 여기서 기록하세요.
              </p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                대시보드로 이동
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
