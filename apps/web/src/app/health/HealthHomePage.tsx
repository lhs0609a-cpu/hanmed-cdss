import { Link } from 'react-router-dom'
import { healthChecks } from '@/data/healthChecks'
import {
  ArrowRight,
  Clock,
  Users,
  ChevronRight,
  CheckCircle,
  MessageSquare,
  ThumbsUp,
  Eye,
} from 'lucide-react'

const symptomCategories = [
  { label: '잠', emoji: '🌙' },
  { label: '소화', emoji: '🫄' },
  { label: '두통', emoji: '🤕' },
  { label: '냉증', emoji: '🧊' },
  { label: '피로', emoji: '😴' },
  { label: '스트레스', emoji: '😤' },
  { label: '피부', emoji: '✨' },
  { label: '통증', emoji: '💪' },
]

const dummyQnA = [
  {
    id: 1,
    question: '눈 밑이 2주째 떨리는데, 마그네슘만 먹으면 되나요?',
    answer:
      '마그네슘 보충도 도움이 되지만, 2주 이상 지속되는 눈떨림은 혈허(血虛)를 의심해볼 수 있습니다. 대추차나 구기자차를 병행하시고, 지속되면 한의원 방문을 권합니다.',
    doctor: '김한의 한의사',
    likes: 247,
  },
  {
    id: 2,
    question: '매일 새벽 4시에 깨는데, 자오유주랑 관련이 있나요?',
    answer:
      '네, 새벽 3~5시는 폐(肺)의 시간으로, 이 시간의 반복 각성은 폐기 허약이나 간화 상승과 관련될 수 있습니다. 스트레스 관리와 함께 국화차를 드셔보세요.',
    doctor: '박경혈 한의사',
    likes: 189,
  },
  {
    id: 3,
    question: '손발이 차서 여름에도 양말 신는데, 체질 문제인가요?',
    answer:
      '양허(陽虛) 체질일 가능성이 높습니다. 찬 음식을 줄이고 생강차·계피차를 꾸준히 드시면 도움이 됩니다. 정확한 체질 감별은 한의사 상담을 추천드립니다.',
    doctor: '이온양 한의사',
    likes: 312,
  },
]

const dummyCommunityPosts = [
  { id: 1, title: '눈떨림 체크 해봤는데 혈허래요... 대추차 효과 있으신 분?', comments: 34, views: 892, tag: '경험공유' },
  { id: 2, title: '새벽기상 고민, 태충혈 지압 2주 후기', comments: 67, views: 1543, tag: '후기' },
  { id: 3, title: '식후졸림이 비위기허라니... 직장인 분들 어떻게 관리하세요?', comments: 89, views: 2341, tag: '질문' },
  { id: 4, title: '손발냉증 체크 결과 공유 + 생강차 루틴', comments: 45, views: 1204, tag: '경험공유' },
  { id: 5, title: '탈모고민 체크하고 검은깨 먹기 시작했어요', comments: 23, views: 678, tag: '후기' },
]

export default function HealthHomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-100/80 rounded-full text-sm text-orange-700 font-medium mb-6">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              한의학 기반 건강 셀프체크
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
              당신의 몸은 이미
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-rose-400 bg-clip-text text-transparent">
                말하고 있습니다
              </span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              사소한 증상 속에 숨겨진 한의학의 지혜
              <br className="hidden md:block" />
              2분 체크로 내 몸의 신호를 읽어보세요
            </p>

            {/* Symptom Category Buttons */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {symptomCategories.map((cat) => (
                <button
                  key={cat.label}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm hover:shadow-md hover:bg-orange-50 hover:text-orange-600 transition-all border border-orange-100/50"
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Health Check Grid */}
      <section id="checks" className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">인기 건강체크</h2>
            <p className="text-gray-500 mt-1">가장 많은 사람들이 확인한 건강체크</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {healthChecks.map((check) => (
            <Link
              key={check.slug}
              to={`/health/check/${check.slug}`}
              className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-orange-100/50 border border-orange-100/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{check.emoji}</span>
                <span className="px-2.5 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-full">
                  {check.category}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                {check.title}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                {check.description}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {check.participantCount.toLocaleString()}명 참여
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {check.estimatedMinutes}분
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* QnA Preview */}
      <section className="bg-white/60 border-y border-orange-100/50">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">한의사에게 물어봤어요</h2>
              <p className="text-gray-500 mt-1">한의사 인증 답변을 확인하세요</p>
            </div>
            <Link
              to="/health/qna"
              className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600"
            >
              전체보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {dummyQnA.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-5 md:p-6 shadow-sm border border-orange-100/30 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                    Q
                  </span>
                  <p className="font-medium text-gray-900">{item.question}</p>
                </div>
                <div className="flex items-start gap-3 ml-0 md:ml-9">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                    A
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        {item.doctor}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <ThumbsUp className="w-3 h-3" />
                        {item.likes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/health/qna"
            className="md:hidden flex items-center justify-center gap-1 mt-6 py-3 text-sm font-medium text-orange-500 bg-orange-50 rounded-xl"
          >
            QnA 전체보기 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Community Preview */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">건강 이야기</h2>
            <p className="text-gray-500 mt-1">비슷한 고민을 가진 사람들의 이야기</p>
          </div>
          <Link
            to="/health/community"
            className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600"
          >
            전체보기 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {dummyCommunityPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 bg-white rounded-xl px-5 py-4 shadow-sm border border-orange-100/30 hover:shadow-md transition-shadow cursor-pointer"
            >
              <span className="shrink-0 px-2 py-0.5 bg-orange-50 text-orange-600 text-xs font-medium rounded">
                {post.tag}
              </span>
              <p className="flex-1 text-sm font-medium text-gray-800 truncate">{post.title}</p>
              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 shrink-0">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {post.comments}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {post.views.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/health/community"
          className="md:hidden flex items-center justify-center gap-1 mt-6 py-3 text-sm font-medium text-orange-500 bg-orange-50 rounded-xl"
        >
          커뮤니티 전체보기 <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Doctor CTA Banner */}
      <section className="max-w-6xl mx-auto px-4 pb-12 md:pb-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-rose-400 p-8 md:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3" />
          <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-12">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                한의사이신가요?
              </h3>
              <p className="text-white/90 leading-relaxed">
                온고지신 AI CDSS로 진료 효율을 높이고,
                <br className="hidden md:block" />
                몸이알려줌에서 환자와 연결되세요.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/"
                className="px-6 py-3 bg-white text-orange-600 font-semibold rounded-full text-sm hover:shadow-lg transition-all text-center"
              >
                온고지신 CDSS 알아보기
              </Link>
              <Link
                to="/register"
                className="px-6 py-3 bg-white/20 text-white font-semibold rounded-full text-sm hover:bg-white/30 transition-all text-center border border-white/30"
              >
                한의사 등록하기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
