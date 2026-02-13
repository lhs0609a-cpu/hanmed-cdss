import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getHealthCheckBySlug, healthChecks } from '@/data/healthChecks'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Share2,
  Copy,
  Clock,
  Users,
  AlertTriangle,
  MessageCircle,
  ChevronRight,
} from 'lucide-react'

type Phase = 'intro' | 'checking' | 'result'

const dummySimilarStories = [
  { id: 1, text: '저도 같은 증상이었는데, 한 달 정도 관리하니 많이 좋아졌어요!', author: '건강지킴이', likes: 42 },
  { id: 2, text: '한의원 가서 상담받으니 원인을 정확히 알게 되었어요. 추천합니다.', author: '몸알림이', likes: 38 },
  { id: 3, text: '생활 팁 따라해보니 2주 만에 체감이 되네요 :)', author: '건강한하루', likes: 27 },
]

export default function HealthCheckPage() {
  const { slug } = useParams<{ slug: string }>()
  const check = getHealthCheckBySlug(slug ?? '')

  const [phase, setPhase] = useState<Phase>('intro')
  const [checked, setChecked] = useState<boolean[]>([])
  const [copied, setCopied] = useState(false)

  const checkedCount = useMemo(() => checked.filter(Boolean).length, [checked])

  if (!check) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">건강체크를 찾을 수 없어요</h2>
        <p className="text-gray-500 mb-6">요청하신 건강체크가 존재하지 않습니다.</p>
        <Link
          to="/health"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-medium rounded-full hover:bg-orange-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로 돌아가기
        </Link>
      </div>
    )
  }

  const handleStart = () => {
    setChecked(new Array(check.questions.length).fill(false))
    setPhase('checking')
  }

  const handleToggle = (index: number) => {
    setChecked((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const handleResult = () => {
    setPhase('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: do nothing
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `몸이알려줌 - ${check.title}`,
          text: `나의 ${check.subtitle} 결과를 확인해보세요!`,
          url: window.location.href,
        })
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink()
    }
  }

  const getResultLevel = () => {
    if (checkedCount <= check.result.lowThreshold) return 'low'
    if (checkedCount <= check.result.midThreshold) return 'mid'
    return 'high'
  }

  const resultLevel = getResultLevel()
  const resultInfo = check.result.levels[resultLevel]
  const percentage = Math.round((checkedCount / check.questions.length) * 100)

  const resultColorMap = {
    low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-400' },
    mid: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-400' },
    high: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', bar: 'bg-rose-400' },
  }
  const colors = resultColorMap[resultLevel]

  const otherChecks = healthChecks.filter((c) => c.slug !== slug).slice(0, 3)

  // Phase: Intro
  if (phase === 'intro') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
        <Link
          to="/health"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          건강체크 목록
        </Link>

        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-orange-100/30 text-center">
          <span className="text-6xl block mb-6">{check.emoji}</span>
          <span className="inline-block px-3 py-1 bg-orange-50 text-orange-600 text-sm font-medium rounded-full mb-4">
            {check.category}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{check.title}</h1>
          <p className="text-gray-600 leading-relaxed mb-8 max-w-lg mx-auto">{check.description}</p>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-8">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-orange-400" />
              {check.participantCount.toLocaleString()}명 참여
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-400" />
              약 {check.estimatedMinutes}분
            </span>
          </div>

          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-rose-400 text-white font-semibold rounded-full text-lg hover:shadow-lg hover:shadow-orange-200 transition-all"
          >
            시작하기
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // Phase: Checking
  if (phase === 'checking') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setPhase('intro')}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로
          </button>
          <span className="text-sm text-gray-500">
            {checkedCount}/{check.questions.length} 선택
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-orange-100 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-rose-400 rounded-full transition-all duration-500"
            style={{ width: `${(checkedCount / check.questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-orange-100/30">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{check.emoji}</span>
            <div>
              <h2 className="font-bold text-gray-900">{check.subtitle}</h2>
              <p className="text-sm text-gray-500">해당하는 항목을 모두 체크하세요</p>
            </div>
          </div>

          <div className="space-y-3">
            {check.questions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleToggle(index)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  checked[index]
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-100 bg-gray-50/50 hover:border-orange-200 hover:bg-orange-50/30'
                }`}
              >
                <div
                  className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                    checked[index] ? 'bg-orange-500' : 'bg-white border-2 border-gray-200'
                  }`}
                >
                  {checked[index] && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className={`text-sm font-medium ${checked[index] ? 'text-orange-800' : 'text-gray-700'}`}>
                  {question}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleResult}
            className="w-full mt-8 py-3.5 bg-gradient-to-r from-orange-500 to-rose-400 text-white font-semibold rounded-xl text-base hover:shadow-lg hover:shadow-orange-200 transition-all"
          >
            결과 확인하기
          </button>
        </div>
      </div>
    )
  }

  // Phase: Result
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <Link
        to="/health"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        건강체크 목록
      </Link>

      {/* Result Summary Card */}
      <div className={`rounded-2xl p-6 md:p-8 mb-6 border ${colors.bg} ${colors.border}`}>
        <div className="text-center mb-6">
          <span className="text-5xl block mb-4">{check.emoji}</span>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{check.subtitle} 결과</h2>
          <p className="text-sm text-gray-500">
            {check.questions.length}개 항목 중 <strong className={colors.text}>{checkedCount}개</strong> 해당
          </p>
        </div>

        {/* Result bar */}
        <div className="relative h-4 bg-white rounded-full mb-3 overflow-hidden">
          <div
            className={`h-full ${colors.bar} rounded-full transition-all duration-1000`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-gray-400">0%</span>
          <span className={`text-sm font-bold ${colors.text}`}>{percentage}%</span>
          <span className="text-xs text-gray-400">100%</span>
        </div>

        {/* Result label */}
        <div className={`text-center px-4 py-3 rounded-xl bg-white/80 border ${colors.border}`}>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${colors.bg} ${colors.text} mb-2`}>
            {resultInfo.label}
          </span>
          <p className="text-sm text-gray-700 leading-relaxed">{resultInfo.description}</p>
        </div>
      </div>

      {/* Korean Medicine Explanation */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-orange-100/30 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-sm">📜</span>
          한의학에서는 이렇게 봐요
        </h3>
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg text-sm">
            <span className="font-bold text-amber-800">{check.result.koreanMedicine.term}</span>
            <span className="text-amber-600">({check.result.koreanMedicine.termHanja})</span>
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {check.result.koreanMedicine.explanation}
        </p>
      </div>

      {/* Lifestyle Tips */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-orange-100/30 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-sm">💡</span>
          생활 속 관리 팁
        </h3>
        <div className="space-y-4">
          {check.result.tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl shrink-0">{tip.icon}</span>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1 text-sm">{tip.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-orange-100/30 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </span>
          이런 경우 한의사 상담이 필요해요
        </h3>
        <ul className="space-y-2.5">
          {check.result.warnings.map((warning, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="shrink-0 w-1.5 h-1.5 bg-rose-400 rounded-full mt-2" />
              {warning}
            </li>
          ))}
        </ul>
      </div>

      {/* Share Buttons */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100/30 mb-6">
        <h3 className="font-bold text-gray-900 mb-4 text-center">결과 공유하기</h3>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-medium rounded-full text-sm hover:bg-orange-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            공유하기
          </button>
          <button
            onClick={handleCopyLink}
            className={`inline-flex items-center gap-2 px-5 py-2.5 border font-medium rounded-full text-sm transition-all ${
              copied
                ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                : 'border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            <Copy className="w-4 h-4" />
            {copied ? '복사됨!' : '링크 복사'}
          </button>
        </div>
      </div>

      {/* Similar Stories */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-orange-100/30 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-orange-400" />
            비슷한 사람들의 이야기
          </h3>
          <Link
            to="/health/community"
            className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-0.5"
          >
            더보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {dummySimilarStories.map((story) => (
            <div key={story.id} className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-700 mb-2">{story.text}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{story.author}</span>
                <span>♥ {story.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ask Doctor CTA */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-orange-500 to-rose-400 text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">한의사에게 물어보기</h3>
        <p className="text-white/90 text-sm mb-4">
          체크 결과에 대해 전문 한의사의 답변을 받아보세요
        </p>
        <Link
          to="/health/qna"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-orange-600 font-semibold rounded-full text-sm hover:shadow-lg transition-all"
        >
          질문하러 가기
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Other Checks */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-900 mb-4">다른 건강체크도 해보세요</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {otherChecks.map((other) => (
            <Link
              key={other.slug}
              to={`/health/check/${other.slug}`}
              onClick={() => {
                setPhase('intro')
                setChecked([])
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-orange-100/30 hover:shadow-md hover:border-orange-200 transition-all"
            >
              <span className="text-2xl">{other.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{other.title}</p>
                <p className="text-xs text-gray-400">{other.participantCount.toLocaleString()}명 참여</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Medical Disclaimer */}
      <div className="text-center py-4 border-t border-orange-100">
        <p className="text-xs text-gray-400 leading-relaxed">
          본 건강체크 결과는 의학적 진단이 아니며, 참고용 건강 정보입니다.
          <br />
          정확한 진단과 치료는 반드시 한의사 또는 의료 전문가와 상담하시기 바랍니다.
        </p>
      </div>
    </div>
  )
}
