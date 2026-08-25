import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { BookOpen, ChevronRight, Zap, AlertCircle } from 'lucide-react'
import { Toss3DIcon } from '@/components/common/Toss3DIcon'
import { FollowUpCard } from '@/components/followup/FollowUpCard'
import { InactivePatientsCard } from '@/components/followup/InactivePatientsCard'
import { PatientReportsCard } from '@/components/guide/PatientReportsCard'
import { ConsultationLauncher } from '@/components/dashboard/ConsultationLauncher'
import { CorpusBand } from '@/components/dashboard/CorpusBand'
import { DailyCaseCard } from '@/components/dashboard/DailyCaseCard'

/**
 * 대시보드 — Toss 식 단순화.
 *
 * 한의사가 매일 하는 동작은 사실상 "새 진료 시작" 1개. 그 외 통계·차트·팁·CRM 위젯은
 * 모두 별도 페이지(/analytics, /crm 등)로 분리하고 여기엔 띄우지 않는다.
 *
 * 다만 그 단순화가 신규 사용자에게는 역효과였다. 경과 확인·환자 리포트·이탈 환자·
 * 최근 진료가 전부 데이터 의존이라 가입 직후에는 넷이 동시에 숨고, 화면이 인사말과
 * 빈 상자만 남는다. 제품을 평가하는 바로 그 순간에 제일 초라해 보였다.
 *
 * 그래서 사용자 데이터가 없어도 비지 않는 것 두 개를 첫 화면에 올린다 —
 * 코퍼스 규모(CorpusBand)와 오늘의 치험례(DailyCaseCard). 둘 다 이 제품의 축인
 * 치험례에서 나온다.
 *
 * 넓은 화면에서는 2단으로 나눈다. 왼쪽은 오늘 할 일(진료 진입·경과·최근 진료),
 * 오른쪽은 근거(코퍼스·오늘의 치험례). max-w-3xl 한 줄로 두면 1,700px 모니터에서
 * 3분의 2가 빈 채로 남는데, 그 여백이 "밋밋하다" 의 큰 원인이었다.
 */

interface RecentActivityItem {
  type: 'consultation' | 'prescription'
  title: string
  description: string
  time: string
  patientId?: string
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs)) return ''
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

function useRecentActivities() {
  return useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/recent-activity?limit=10')
      return data.data as RecentActivityItem[]
    },
    staleTime: 60_000,
    // 실패 시 빈 배열로 fallback (대시보드가 깨지지 않게)
    retry: 1,
  })
}

export default function DashboardPage() {
  useSEO(PAGE_SEO.dashboard)

  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? '좋은 아침이에요' : currentHour < 18 ? '안녕하세요' : '수고하셨어요'

  // 화면에서 제일 큰 글자가 로그인 아이디로 찍히는 계정이 있었다(name 에 이메일이
  // 저장된 경우). 첫인상에서 제일 아까운 자리라 @ 가 들어 있으면 이름으로 안 쓴다.
  const rawName = user?.name?.trim()
  const displayName = rawName && !rawName.includes('@') ? rawName : null

  const recentQuery = useRecentActivities()
  const recent = recentQuery.data ?? []

  // 아직 진료 기록이 없는 신규 한의사에게는 예시 증례 카드를 대시보드 안에서 바로 권한다.
  // (예전에는 여기서 /consultation?demo=1 로 리다이렉트했으나,
  //  ① 조회 실패 시에도 recent=[] 라 멀쩡한 사용자가 예시 화면으로 튕겼고
  //  ② replace 리다이렉트라 진료 1건이 쌓이기 전까지 대시보드에 접근할 수 없었다.)
  const showExampleCard =
    !recentQuery.isLoading && !recentQuery.isError && recent.length === 0

  return (
    <div className="max-w-6xl mx-auto">
      {/* 인사 */}
      <div className="pt-2">
        <p className="text-[13px] text-neutral-500">{greeting}</p>
        <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 mt-1">
          {displayName ? `${displayName}님` : '환영합니다'}
        </h1>
      </div>

      {/* 왼쪽 = 오늘 할 일, 오른쪽 = 근거.
          오른쪽 열은 사용자 데이터와 무관하게 항상 차 있어서 신규 사용자의
          화면이 무너지지 않는다. 좁은 화면에서는 그대로 한 줄로 쌓인다. */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="min-w-0 space-y-6">
          {/* 진료 진입 — 카드가 아니라 입력창. 매일 제일 많이 하는 동작이라
              클릭 한 번을 없앤다. */}
          <ConsultationLauncher />

          {/* 아하 모먼트 — 진료 기록이 아직 없을 때만. 환자 데이터를 넣기 전에
              예시 증례로 변증 → 처방 후보 → 근거까지 실제 결과를 먼저 보여준다. */}
          {showExampleCard && (
            <Link
              to="/dashboard/consultation?demo=1"
              className="group flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 transition-colors hover:bg-blue-50"
            >
              <Toss3DIcon icon={Zap} tone="blue" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-neutral-900">
                  먼저 예시 진료 결과부터 보기
                </p>
                <p className="mt-0.5 text-[13px] text-neutral-600">
                  환자 데이터 입력 없이 30초면 됩니다. 실제 AI 분석을 그대로 돌려 보여드려요.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-blue-500 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}

          {/* 경과 확인 — 처방을 낸 뒤 결과를 기록하게 만드는 자리.
              확인할 게 없으면 카드가 스스로 숨는다. */}
          {/* 환자가 복용 중에 보낸 기록 — 이상반응은 경과 확인보다 먼저 봐야 한다. */}
          <PatientReportsCard />

          <FollowUpCard />

          {/* 이탈은 조용히 일어난다 — 누가 안 오고 있는지 목록으로 보여 준다. */}
          <InactivePatientsCard />

          {/* "치험례에서 근거 찾기" 링크 카드는 뺐다. 오른쪽 열의 CorpusBand 와
              DailyCaseCard 가 같은 곳으로 보내면서 실제 내용까지 보여준다 —
              같은 목적지로 가는 입구를 셋이나 둘 이유가 없다. */}

          {/* 최근 진료 — 매일 보는 핵심 리스트 */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[15px] font-bold text-neutral-900">최근 진료</h2>
              <Link
                to="/dashboard/patients"
                className="text-[13px] font-medium text-neutral-500 hover:text-neutral-900"
              >
                환자 전체
              </Link>
            </div>

            {/* 목록은 불투명 흰 표면 유지 — 환자명/시각을 읽는 곳이라 가독성 우선.
                글래스는 셸(사이드바·헤더)과 강조 CTA 에만 쓴다. */}
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[var(--shadow-2)]">
              {recentQuery.isLoading ? (
                <div className="p-10 text-center text-[13px] text-neutral-500">불러오는 중…</div>
              ) : recentQuery.isError ? (
                <div className="p-10 text-center">
                  <AlertCircle className="h-7 w-7 mx-auto mb-3 text-neutral-300" aria-hidden="true" />
                  <p className="text-[14px] font-medium text-neutral-700">
                    최근 진료를 불러오지 못했습니다
                  </p>
                  <p className="text-[12px] text-neutral-500 mt-1">
                    진료 기록이 없는 것이 아니라, 조회에 실패했습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => recentQuery.refetch()}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              ) : recent.length === 0 ? (
                <div className="p-10 text-center">
                  <BookOpen className="h-7 w-7 mx-auto mb-3 text-neutral-300" aria-hidden="true" />
                  <p className="text-[14px] font-medium text-neutral-700">아직 진료 기록이 없습니다</p>
                  <p className="text-[12px] text-neutral-500 mt-1">
                    첫 진료를 시작하면 여기에 쌓입니다
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {recent.map((activity, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() =>
                          activity.patientId &&
                          navigate(`/dashboard/patients/${activity.patientId}`)
                        }
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-neutral-900 truncate">
                            {activity.title}
                          </p>
                          <p className="text-[12px] text-neutral-500 truncate mt-0.5">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-[12px] text-neutral-400 whitespace-nowrap">
                          {formatRelativeTime(activity.time)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-neutral-300 flex-shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* 오른쪽 = 근거. 사용자 데이터와 무관해서 가입 첫날에도 비지 않는다.
            xl 미만에서는 왼쪽 열 아래로 그대로 쌓인다. */}
        <aside className="min-w-0 space-y-6">
          <CorpusBand />
          <DailyCaseCard />
        </aside>
      </div>
    </div>
  )
}
