import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { Stethoscope, BookOpen, ArrowRight, ChevronRight } from 'lucide-react'
import { Toss3DIcon } from '@/components/common/Toss3DIcon'

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 인사 */}
      <div className="pt-2">
        <p className="text-[13px] text-neutral-500">{greeting}</p>
        <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 mt-1">
          {user?.name ? `${user.name}님` : '환영합니다'}
        </h1>
      </div>

      {/* 큰 CTA — 새 진료 시작 1개만 */}
      <Link
        to="/dashboard/consultation"
        className="group block bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl p-7 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Toss3DIcon icon={Stethoscope} tone="teal" size="sm" />
              <span className="text-[13px] font-medium text-white/70">진료 시작</span>
            </div>
            <p className="mt-2 text-[22px] font-bold tracking-tight">
              증상 입력하고 처방 후보 받기
            </p>
            <p className="mt-1 text-[13px] text-white/70">
              평균 3초 안에 6,000+ 치험례에서 유사 사례를 찾아드려요.
            </p>
          </div>
          <ArrowRight className="h-6 w-6 flex-shrink-0 transition-transform group-hover:translate-x-1" />
        </div>
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

        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          {recentQuery.isLoading ? (
            <div className="p-10 text-center text-[13px] text-neutral-500">불러오는 중…</div>
          ) : recent.length === 0 ? (
            <div className="p-10 text-center">
              <BookOpen className="h-7 w-7 mx-auto mb-3 text-neutral-300" aria-hidden="true" />
              <p className="text-[14px] font-medium text-neutral-700">아직 진료 기록이 없습니다</p>
              <p className="text-[12px] text-neutral-500 mt-1">위 버튼으로 첫 진료를 시작해보세요</p>
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
