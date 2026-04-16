import { useMemo } from 'react'
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
  Sparkles,
  Heart,
  Search,
  Star,
  AlertTriangle,
} from 'lucide-react'
import { getAllCelebrities } from '@/data/celebrities'
import { CONSTITUTIONS } from '@/data/constitutions'
import { CODE_TO_TYPE } from '@/data/celebs/types'
import { analyzeProfile } from '@/lib/saju'

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
  { id: 1, title: '나 태음인인데 정국이랑 같은 체질이래!! 🎉', comments: 127, views: 4892, tag: '체질TMI' },
  { id: 2, title: '소양인끼리 모여라~ 같은 체질 셀럽 누가 있어?', comments: 89, views: 3241, tag: '체질TMI' },
  { id: 3, title: '눈떨림 체크 해봤는데 혈허래요... 대추차 효과 있으신 분?', comments: 34, views: 892, tag: '경험공유' },
  { id: 4, title: '소음인 음식 추천받고 2주 실천 후기', comments: 67, views: 1543, tag: '후기' },
  { id: 5, title: '식후졸림이 비위기허라니... 직장인 분들 어떻게 관리하세요?', comments: 89, views: 2341, tag: '질문' },
]

/** 셀럽 마키 티커용 데이터 (이미지 있는 셀럽만, 랜덤 셔플) */
function useTickerCelebs() {
  return useMemo(() => {
    const all = getAllCelebrities().filter(c => c.imageUrl)
    // Fisher-Yates shuffle with seed for consistency
    const shuffled = [...all].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 40).map(c => {
      const con = CONSTITUTIONS[CODE_TO_TYPE[c.constitution]]
      return { ...c, constitution: con }
    })
  }, [])
}

/** 2026 건강 주의보 TOP 12 셀럽 (이미지 있는 셀럽 우선, 위험도 순 정렬) */
function useRiskCelebs() {
  return useMemo(() => {
    const all = getAllCelebrities()
    const withRisk = all.map(c => {
      const { risk } = analyzeProfile(c.birthDate, c.birthHour)
      const con = CONSTITUTIONS[CODE_TO_TYPE[c.constitution]]
      return { ...c, risk, constitution: con }
    })
    // 이미지 있는 셀럽 우선, 그 다음 위험도 순
    return withRisk
      .filter(c => c.risk.level !== 'safe')
      .sort((a, b) => {
        const imgA = a.imageUrl ? 1 : 0
        const imgB = b.imageUrl ? 1 : 0
        if (imgA !== imgB) return imgB - imgA
        return b.risk.score - a.risk.score
      })
      .slice(0, 12)
  }, [])
}

export default function HealthHomePage() {
  const tickerCelebs = useTickerCelebs()
  const riskCelebs = useRiskCelebs()
  const row1 = tickerCelebs.slice(0, 20)
  const row2 = tickerCelebs.slice(20, 40)

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

      {/* ═══ 체질TMI - 셀럽 마키 티커 (NEW) ═══ */}
      <section className="py-12 md:py-16 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <h2 className="text-2xl font-bold text-gray-900">체질 TMI</h2>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-xs font-bold rounded-full">HOT</span>
              </div>
              <p className="text-gray-500">내 최애는 무슨 체질? 셀럽 사주 분석</p>
            </div>
            <Link
              to="/health/tmi"
              className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600"
            >
              전체보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Auto-scrolling Row 1 (left) */}
        <div className="relative mb-3">
          <div className="flex animate-scroll-left" style={{ width: 'max-content' }}>
            {[...row1, ...row1].map((c, i) => (
              <Link
                key={`r1-${i}`}
                to={`/health/tmi/${c.id}`}
                className="flex-shrink-0 w-44 mx-1.5 bg-white rounded-xl p-3 border border-gray-100 hover:shadow-lg hover:border-orange-200 hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
                    />
                  ) : null}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0${c.imageUrl ? ' hidden' : ''}`}
                    style={{ backgroundColor: c.constitution.bgColor }}
                  >
                    {c.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.name}</p>
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${c.constitution.gradientFrom}, ${c.constitution.gradientTo})` }}
                    >
                      {c.constitution.emoji} {c.constitution.name}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Auto-scrolling Row 2 (right - reverse) */}
        <div className="relative mb-8">
          <div
            className="flex"
            style={{
              width: 'max-content',
              animation: 'scroll-left 45s linear infinite reverse',
            }}
          >
            {[...row2, ...row2].map((c, i) => (
              <Link
                key={`r2-${i}`}
                to={`/health/tmi/${c.id}`}
                className="flex-shrink-0 w-44 mx-1.5 bg-white rounded-xl p-3 border border-gray-100 hover:shadow-lg hover:border-orange-200 hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
                    />
                  ) : null}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0${c.imageUrl ? ' hidden' : ''}`}
                    style={{ backgroundColor: c.constitution.bgColor }}
                  >
                    {c.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.name}</p>
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${c.constitution.gradientFrom}, ${c.constitution.gradientTo})` }}
                    >
                      {c.constitution.emoji} {c.constitution.name}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* TMI CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-3 px-4">
          <Link
            to="/health/tmi"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-orange-50 hover:border-orange-200 transition-all"
          >
            <Search className="w-4 h-4" />
            셀럽 검색하기
          </Link>
          <Link
            to="/health/tmi/my-type"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-400 text-white rounded-full text-sm font-bold shadow-lg shadow-orange-200 hover:shadow-xl transition-all"
          >
            <Sparkles className="w-4 h-4" />
            내 체질 진단하기
          </Link>
          <Link
            to="/health/tmi/compare"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-pink-50 hover:border-pink-200 transition-all"
          >
            <Heart className="w-4 h-4" />
            궁합 보기
          </Link>
        </div>

        <Link
          to="/health/tmi"
          className="md:hidden flex items-center justify-center gap-1 max-w-6xl mx-auto mt-6 mx-4 py-3 text-sm font-medium text-orange-500 bg-orange-50 rounded-xl"
        >
          체질TMI 전체보기 <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ═══ 2026 건강 주의보 셀럽 ═══ */}
      {riskCelebs.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="text-2xl font-bold text-gray-900">2026 건강 주의보</h2>
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">주의</span>
              </div>
              <p className="text-gray-500">병인(丙寅)년, 사주 충돌 위험도가 높은 셀럽</p>
            </div>
            <Link
              to="/health/tmi"
              className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600"
            >
              전체 보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {riskCelebs.map(c => {
              const riskColor =
                c.risk.level === 'danger' ? '#ef4444' :
                c.risk.level === 'warning' ? '#f97316' : '#eab308'
              return (
                <Link
                  key={c.id}
                  to={`/health/tmi/${c.id}`}
                  className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 border border-gray-100 hover:shadow-lg hover:border-red-200 hover:-translate-y-1 transition-all text-center"
                >
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-14 h-14 mx-auto rounded-full object-cover mb-2"
                      onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
                    />
                  ) : null}
                  <div
                    className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl mb-2${c.imageUrl ? ' hidden' : ''}`}
                    style={{ backgroundColor: c.constitution.bgColor }}
                  >
                    {c.emoji}
                  </div>
                  <p className="text-sm font-bold text-gray-800 truncate">{c.name}</p>
                  <div className="flex justify-center gap-1 mt-1.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: riskColor }}
                    >
                      {c.risk.score}점
                    </span>
                  </div>
                  {c.risk.conflicts[0] && (
                    <p className="text-[10px] text-gray-500 mt-1 truncate">
                      {c.risk.conflicts[0].type} {c.risk.conflicts[0].pillarLabel}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>

          <Link
            to="/health/tmi"
            className="md:hidden flex items-center justify-center gap-1 mt-4 py-3 text-sm font-medium text-red-500 bg-red-50 rounded-xl"
          >
            2026 주의보 셀럽 전체보기 <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      )}

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
              to="/health/community"
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
            to="/health/community"
            className="md:hidden flex items-center justify-center gap-1 mt-6 py-3 text-sm font-medium text-orange-500 bg-orange-50 rounded-xl"
          >
            QnA 전체보기 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Community Preview - 체질TMI 토론 연동 */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">건강 이야기</h2>
            <p className="text-gray-500 mt-1">체질TMI 결과로 대화하고, 건강 경험을 나눠요</p>
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
              <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded ${
                post.tag === '체질TMI'
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-orange-50 text-orange-600'
              }`}>
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

      {/* 건강사주 프로모션 배너 */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <Link
          to="/health/saju"
          className="block rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #9333ea, #c026d3)',
          }}
        >
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3" />
          </div>
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                NEW - AI 건강사주
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                사주 속에 숨은 건강 비밀
              </h3>
              <p className="text-white/80 leading-relaxed mb-4">
                생년월일에 담긴 오행의 기운을 한의학으로 풀어드립니다.
                <br className="hidden md:block" />
                체질, 건강, 운세를 AI가 심층 분석해요.
              </p>
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 font-bold rounded-full text-sm hover:shadow-lg transition-all">
                <Star className="w-4 h-4" />
                내 건강사주 보기
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
            <div className="text-6xl md:text-8xl opacity-80">
              🔮
            </div>
          </div>
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
