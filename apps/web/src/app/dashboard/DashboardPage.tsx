import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { Stethoscope, BookOpen, ArrowRight, ChevronRight, Zap, AlertCircle } from 'lucide-react'
import { Toss3DIcon } from '@/components/common/Toss3DIcon'
import { FollowUpCard } from '@/components/followup/FollowUpCard'

/**
 * 대시보드 — Toss 식 단순화.
 *
 * 한의사가 매일 하는 동작은 사실상 "새 진료 시작" 1개. 그 외 통계·차트·팁·CRM 위젯은
 * 모두 별도 페이지(/analytics, /crm 등)로 분리하고 여기엔 띄우지 않는다.
 * 화면 = 인사 + 큰 CTA + 최근 진료 환자 리스트.
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

  const recentQuery = useRecentActivities()
  const recent = recentQuery.data ?? []

  // 아직 진료 기록이 없는 신규 한의사에게는 예시 증례 카드를 대시보드 안에서 바로 권한다.
  // (예전에는 여기서 /consultation?demo=1 로 리다이렉트했으나,
  //  ① 조회 실패 시에도 recent=[] 라 멀쩡한 사용자가 예시 화면으로 튕겼고
  //  ② replace 리다이렉트라 진료 1건이 쌓이기 전까지 대시보드에 접근할 수 없었다.)
  const showExampleCard =
    !recentQuery.isLoading && !recentQuery.isError && recent.length === 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 인사 */}
      <div className="pt-2">
        <p className="text-[13px] text-neutral-500">{greeting}</p>
        <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 mt-1">
          {user?.name ? `${user.name}님` : '환영합니다'}
        </h1>
      </div>

      {/* 큰 CTA — 새 진료 시작 1개만.
          앱 내부는 라이트 기반이지만 이 카드만 액센트 그라디언트로 한 단계 띄운다.
          (하루에 가장 많이 누르는 단일 동작) */}
      <Link
        to="/dashboard/consultation"
        className="group relative block overflow-hidden rounded-2xl p-7 text-white accent-gradient accent-glow transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-[1.04]"
      >
        {/* 유리 광택 — 좌상단 하이라이트 */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-24 h-56 w-56 rounded-full"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,255,255,0.30), transparent 68%)',
            filter: 'blur(8px)',
          }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Toss3DIcon icon={Stethoscope} tone="teal" size="sm" />
              <span className="text-[13px] font-medium text-white/75">진료 시작</span>
            </div>
            <p className="mt-2 text-[22px] font-bold tracking-tight">
              증상 입력하고 처방 후보 받기
            </p>
            <p className="mt-1 text-[13px] text-white/75">
              변증 후보와 유사 치험례를 근거와 함께 정리해 드립니다.
            </p>
          </div>
          <ArrowRight className="h-6 w-6 flex-shrink-0 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>

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
      <FollowUpCard />

      {/* 치험례 — 이 제품의 축.
          매일 여는 첫 화면에 "근거가 몇 건 쌓여 있는지" 가 보여야
          한의사가 이걸 검색 도구가 아니라 임상 자산으로 인식한다. */}
      <Link
        to="/dashboard/cases"
        className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300"
      >
        <Toss3DIcon icon={BookOpen} tone="amber" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-neutral-900">
            치험례에서 근거 찾기
          </p>
          <p className="mt-0.5 text-[13px] text-neutral-600">
            실제 임상 기록을 주소증·처방·변증으로 검색합니다. 진료 결과의 근거도 여기서 나옵니다.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5" />
      </Link>

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
  )
}
