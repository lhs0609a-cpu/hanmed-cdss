import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, MessageSquare, Eye } from 'lucide-react'
import { api } from '@/services/api'

/**
 * 커뮤니티에서 지금.
 *
 * 대시보드를 매일 열 이유는 결국 "내가 모르는 사이에 뭔가 있었다" 는 것인데,
 * 사용자 본인 데이터로는 그걸 만들 수 없다(내가 안 하면 아무 일도 안 일어난다).
 * 동료들이 지금 보고 있는 글은 내가 아무것도 안 해도 바뀐다.
 *
 * 글이 없으면 카드를 숨긴다. "아직 글이 없습니다" 를 첫 화면에 띄우면
 * 커뮤니티가 죽어 있다는 인상만 남기고, 그건 사실이더라도 여기서 할 말이 아니다.
 */

interface TrendingPost {
  id: string
  title: string
  viewCount: number
  commentCount: number
  isSolved?: boolean
}

const TYPE_LIMIT = 3

function useTrendingPosts() {
  return useQuery({
    queryKey: ['community-trending', TYPE_LIMIT],
    queryFn: async (): Promise<TrendingPost[]> => {
      const { data } = await api.get(`/community/posts/trending?limit=${TYPE_LIMIT}`)
      const rows = Array.isArray(data?.data) ? data.data : data
      return Array.isArray(rows) ? (rows as TrendingPost[]) : []
    },
    staleTime: 10 * 60_000,
    retry: 1,
  })
}

export function CommunityPulseCard() {
  const { data, isLoading } = useTrendingPosts()

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[var(--shadow-2)]">
        <div className="h-3 w-28 animate-pulse rounded bg-neutral-100" />
        <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
        <div className="mt-2.5 h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
      </section>
    )
  }

  const posts = (data ?? []).filter((p) => p?.id && p?.title?.trim())
  if (posts.length === 0) return null

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[var(--shadow-2)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          <h2 className="text-[15px] font-bold text-neutral-900">커뮤니티에서 지금</h2>
        </div>
        <Link
          to="/dashboard/community"
          className="group inline-flex items-center gap-0.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-900"
        >
          모두 보기
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <ul className="divide-y divide-neutral-100">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              to={`/dashboard/community/post/${p.id}`}
              className="flex items-center gap-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-neutral-900">
                  {p.title}
                </p>
                <p className="mt-0.5 flex items-center gap-2.5 text-[12px] text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" aria-hidden="true" />
                    {p.commentCount ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    {p.viewCount ?? 0}
                  </span>
                  {p.isSolved && (
                    <span className="font-medium text-green-600">해결됨</span>
                  )}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default CommunityPulseCard
