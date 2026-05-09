import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Upload, CheckCircle2, AlertTriangle, ChevronRight, Database, X } from 'lucide-react'
import { ADAPTERS, importFromEmr, type EmrSource, type ImportReport } from '@/lib/emrAdapter'
import { useAuthStore } from '@/stores/authStore'

const MIGRATION_DONE_KEY = 'ongojisin:migration:done:v1'

const SOURCE_LABELS: Record<EmrSource, { label: string; subtitle: string }> = {
  'hanmed-chart': { label: '한의차트', subtitle: '환자 내보내기 CSV' },
  'doctor-palette': { label: '닥터팔레트', subtitle: '환자 목록 CSV' },
  jasen: { label: '자생 EMR', subtitle: '환자 export CSV' },
  highmedi: { label: '하이메디', subtitle: '환자 목록 CSV' },
  'csv-generic': { label: '일반 CSV', subtitle: 'name, birth_date, phone …' },
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
    setStep('done')
    markMigrationDone()
  }

  function skip() {
    markMigrationDone()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-white px-5 py-12">
      <div className="mx-auto max-w-[560px]">
        <header className="mb-12">
          <span className="text-2xl font-extrabold tracking-tight text-neutral-900">
            온고지신
          </span>
        </header>

        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">
          {user?.name ? `${user.name} 원장님,` : '환영합니다.'}
        </h1>
        <p className="text-[15px] text-neutral-600 mb-10">
          이전에 사용하시던 차트의 환자 정보를 5분 안에 옮겨드릴게요.
          <br />
          진료를 시작하기 전 한 번만 하면 됩니다.
        </p>

        {step === 'pick' && (
          <div className="space-y-8">
            <section>
              <p className="text-[13px] font-medium text-neutral-500 mb-3">1 / 2</p>
              <h2 className="text-lg font-bold text-neutral-900 mb-4">어디서 가져오시나요?</h2>
              <div className="space-y-2">
                {(Object.keys(ADAPTERS) as EmrSource[]).map((s) => {
                  const info = SOURCE_LABELS[s]
                  const selected = source === s
                  return (
                    <button
                      key={s}
                      onClick={() => setSource(s)}
                      className={
                        'w-full flex items-center justify-between rounded-md border px-4 h-14 text-left transition-colors ' +
                        (selected
                          ? 'border-primary bg-brand-50/50'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white')
                      }
                    >
                      <div>
                        <div className="font-semibold text-neutral-900">{info.label}</div>
                        <div className="text-[12px] text-neutral-500">{info.subtitle}</div>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <p className="text-[13px] font-medium text-neutral-500 mb-3">2 / 2</p>
              <h2 className="text-lg font-bold text-neutral-900 mb-4">파일 업로드</h2>
              <label
                className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-neutral-200 hover:border-primary cursor-pointer bg-neutral-50 transition-colors py-12 text-center"
                htmlFor="emr-file"
              >
                <Upload className="w-8 h-8 text-neutral-400 mb-3" />
                <p className="font-medium text-neutral-900">CSV 파일을 선택하세요</p>
                <p className="text-[12px] text-neutral-500 mt-1">최대 50MB</p>
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
                <p className="text-[13px] text-neutral-500 mt-3 text-center">
                  파일을 분석하는 중입니다…
                </p>
              )}
            </section>

            <div className="flex justify-between items-center pt-4 border-t border-neutral-200">
              <button
                onClick={skip}
                className="text-[13px] text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1"
              >
                나중에 하기
                <X className="h-4 w-4" />
              </button>
              <Link
                to="/dashboard"
                className="text-[13px] text-neutral-900 font-medium inline-flex items-center gap-1"
                onClick={markMigrationDone}
              >
                먼저 둘러보기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {step === 'preview' && report && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md bg-brand-50 text-primary flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">분석이 끝났어요</h2>
                <p className="text-[13px] text-neutral-500">{file?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="환자" value={report.patientsImported} />
              <Stat label="진료 기록" value={report.visitsImported} />
            </div>

            {report.errors.length > 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <div className="text-[13px] space-y-1">
                    <p className="font-semibold">매핑 경고 {report.errors.length}건</p>
                    <ul className="space-y-0.5 opacity-80">
                      {report.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>· (행 {e.row}) {e.reason}</li>
                      ))}
                      {report.errors.length > 5 && (
                        <li>· 외 {report.errors.length - 5}건</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep('pick')}
                className="flex-1 h-14 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-semibold rounded-md transition-colors"
              >
                다시 선택
              </button>
              <button
                onClick={confirmImport}
                className="flex-[2] h-14 bg-primary hover:bg-brand-600 text-white font-semibold rounded-md transition-colors active:scale-[0.99]"
              >
                {report.patientsImported}명 가져오기
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-6 text-center pt-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-50 text-primary flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-neutral-900">완료!</h2>
              <p className="text-[15px] text-neutral-600">
                {report?.patientsImported ?? 0}명의 환자 정보가 옮겨졌습니다.
                <br />
                지금부터 새 진료는 여기서 기록하세요.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full h-14 bg-primary hover:bg-brand-600 text-white text-[16px] font-semibold rounded-md transition-colors active:scale-[0.99]"
            >
              대시보드로 이동
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-4 py-4">
      <div className="text-[12px] text-neutral-500 mb-1">{label}</div>
      <div className="text-2xl font-bold tabular text-neutral-900">{value.toLocaleString()}건</div>
    </div>
  )
}
