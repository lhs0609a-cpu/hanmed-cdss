import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Brain,
  Clock,
  Search,
  Shield,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Play,
  Star,
  Users,
  TrendingUp,
  BookOpen,
  Zap,
  Award,
  ChevronRight,
  Quote,
  AlertTriangle,
  FileText,
  Target,
  Lightbulb,
  Phone,
  Mail,
  Building2,
  X,
} from 'lucide-react'

// UTM 파라미터 추적
function useUTMTracking() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const utmData = {
      source: searchParams.get('utm_source'),
      medium: searchParams.get('utm_medium'),
      campaign: searchParams.get('utm_campaign'),
      content: searchParams.get('utm_content'),
      term: searchParams.get('utm_term'),
      timestamp: new Date().toISOString(),
    }

    if (utmData.source) {
      localStorage.setItem('utm_data', JSON.stringify(utmData))
      // Analytics 이벤트 전송
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'landing_page_view', utmData)
      }
    }
  }, [searchParams])
}

// 실시간 카운터 애니메이션
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [end, duration])

  return <span>{count.toLocaleString()}{suffix}</span>
}

// 후기 데이터
const testimonials = [
  {
    name: '김○○ 원장',
    clinic: '서울 강남 OO한의원',
    experience: '15년차',
    image: null,
    rating: 5,
    quote: '복잡한 변증 케이스에서 AI가 제안하는 처방 옵션들이 정말 도움됩니다. 특히 가감법 추천이 실제 임상에서 바로 적용 가능해요.',
    highlight: '진료 시간 40% 단축',
  },
  {
    name: '이○○ 원장',
    clinic: '경기 성남 OO한의원',
    experience: '8년차',
    image: null,
    rating: 5,
    quote: '환자에게 왜 이 처방인지 설명할 때, AI가 제공하는 근거 자료가 신뢰를 줍니다. 재진율이 확실히 올랐어요.',
    highlight: '환자 재진율 25% 증가',
  },
  {
    name: '박○○ 원장',
    clinic: '부산 해운대 OO한방병원',
    experience: '20년차',
    image: null,
    rating: 5,
    quote: '40년 임상 경험이 담긴 데이터베이스라는 게 느껴집니다. 제가 모르는 처방도 배우게 되고, 확신을 갖고 처방할 수 있어요.',
    highlight: '처방 정확도 향상',
  },
]

// 비교 데이터
const comparisonData = {
  before: [
    '복잡한 증례에서 30분 이상 고민',
    '확신 없이 처방, 불안한 마음',
    '환자 질문에 명확한 답변 어려움',
    '유사 증례 찾으려면 책 뒤적임',
    '경험 많은 선배에게 물어봐야 함',
  ],
  after: [
    '3분 만에 최적 처방 추천',
    '데이터 기반 확신 있는 처방',
    '근거 자료로 명확한 설명',
    'AI가 6,000건 치험례 즉시 검색',
    '40년 임상 경험 즉시 활용',
  ],
}

export default function AdLandingPage() {
  const navigate = useNavigate()
  const [showVideo, setShowVideo] = useState(false)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useUTMTracking()

  const handleStartTrial = () => {
    // UTM 데이터 유지하면서 회원가입 페이지로
    const utmData = localStorage.getItem('utm_data')
    navigate('/register' + (utmData ? `?ref=landing` : ''))
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    // TODO: 이메일 수집 API 호출
    setTimeout(() => {
      setIsSubmitting(false)
      alert('등록되었습니다! 곧 연락드리겠습니다.')
      setEmail('')
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Above the Fold */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-emerald-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-teal-100/50 to-transparent" />

        {/* Navigation */}
        <nav className="relative z-10 max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">온</span>
              </div>
              <span className="text-xl font-bold text-gray-900">온고지신 AI</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                로그인
              </Link>
              <button
                onClick={handleStartTrial}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all"
              >
                무료 체험
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                300명 이상의 한의사가 이미 사용 중
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                <span className="text-teal-600">40년 임상 경험</span>이<br />
                당신의 진료실에
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-gray-600 leading-relaxed">
                6,000건의 치험례를 학습한 AI가<br />
                <strong className="text-gray-900">3분 만에 최적의 처방</strong>을 추천합니다.
              </p>

              {/* Pain Point Callout */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <p className="text-amber-800 font-medium flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  "이 처방이 맞을까?" 매일 고민하고 계신가요?
                </p>
                <p className="text-amber-700 text-sm mt-2 ml-7">
                  복잡한 변증, 애매한 증례에서 확신을 갖고 처방하세요.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleStartTrial}
                  className="group px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-lg font-bold rounded-2xl hover:shadow-2xl hover:shadow-teal-500/30 transition-all flex items-center justify-center gap-2"
                >
                  14일 무료 체험 시작
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setShowVideo(true)}
                  className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 text-lg font-semibold rounded-2xl hover:border-teal-500 hover:text-teal-600 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  2분 데모 보기
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  카드 등록 없이 시작
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  언제든 취소 가능
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  개인정보 보호
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative">
              {/* Main Product Screenshot */}
              <div className="relative bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-12 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white/30" />
                    <div className="w-3 h-3 rounded-full bg-white/30" />
                    <div className="w-3 h-3 rounded-full bg-white/30" />
                  </div>
                  <span className="text-white/80 text-sm ml-2">온고지신 AI - 진료 어시스턴트</span>
                </div>
                <div className="p-6 space-y-4">
                  {/* Simulated UI */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">주소증 입력</p>
                    <p className="text-gray-800">"65세 남성, 소화불량, 복부 냉감, 설사 반복, 피로감"</p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-5 w-5 text-teal-600" />
                      <span className="font-semibold text-teal-800">AI 추천 처방</span>
                      <span className="ml-auto px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded">95% 일치</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mb-2">이중탕(理中湯)</p>
                    <p className="text-sm text-gray-600">비위허한으로 인한 소화불량, 복냉, 설사에 적합...</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">인삼 君</span>
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">백출 臣</span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">건강 佐</span>
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">감초 使</span>
                  </div>
                </div>
              </div>

              {/* Floating Stats */}
              <div className="absolute -left-8 top-1/4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">6,000+</p>
                    <p className="text-sm text-gray-500">치험례 데이터</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-1/4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">92%</p>
                    <p className="text-sm text-gray-500">처방 일치율</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof Bar */}
          <div className="mt-16 pt-12 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gray-900">
                  <AnimatedCounter end={300} suffix="+" />
                </p>
                <p className="text-gray-500 mt-1">사용 중인 한의사</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gray-900">
                  <AnimatedCounter end={6000} suffix="+" />
                </p>
                <p className="text-gray-500 mt-1">치험례 데이터</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gray-900">
                  <AnimatedCounter end={40} suffix="년" />
                </p>
                <p className="text-gray-500 mt-1">임상 경험 데이터</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gray-900">
                  <AnimatedCounter end={92} suffix="%" />
                </p>
                <p className="text-gray-500 mt-1">처방 일치율</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              혹시 이런 고민 하고 계신가요?
            </h2>
            <p className="text-xl text-gray-600">
              많은 한의사 선생님들이 같은 어려움을 겪고 있습니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: '진료 시간 부족',
                description: '복잡한 증례에서 처방 결정에 30분 이상 고민하시나요?',
                color: 'red',
              },
              {
                icon: AlertTriangle,
                title: '처방 확신 부족',
                description: '"이 처방이 맞나?" 불안한 마음으로 처방하고 계신가요?',
                color: 'amber',
              },
              {
                icon: FileText,
                title: '근거 설명 어려움',
                description: '환자에게 왜 이 처방인지 명확히 설명하기 어려우신가요?',
                color: 'blue',
              },
              {
                icon: Search,
                title: '유사 증례 검색',
                description: '비슷한 환자 사례를 찾으려면 책을 뒤적여야 하나요?',
                color: 'purple',
              },
              {
                icon: Users,
                title: '선배 조언 필요',
                description: '경험 많은 선배에게 물어보고 싶은데 마땅치 않으신가요?',
                color: 'teal',
              },
              {
                icon: Target,
                title: '경쟁 차별화',
                description: '주변 한의원과 차별화된 진료를 하고 싶으신가요?',
                color: 'emerald',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center mb-4`}>
                  <item.icon className={`h-6 w-6 text-${item.color}-600`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution / Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
              <Lightbulb className="h-4 w-4" />
              해결책
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              온고지신 AI가 해결합니다
            </h2>
            <p className="text-xl text-gray-600">
              40년 임상 경험이 담긴 AI 어시스턴트
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-3xl p-8 border border-teal-100">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI 처방 추천</h3>
              <p className="text-gray-600 mb-6">
                증상을 입력하면 6,000건의 치험례를 분석해 <strong>3분 만에 최적의 처방</strong>을 추천합니다.
              </p>
              <ul className="space-y-3">
                {['신뢰도 점수 표시', '군신좌사 구성 설명', '가감법 자동 추천'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-teal-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">치험례 검색</h3>
              <p className="text-gray-600 mb-6">
                유사한 증례를 <strong>즉시 검색</strong>하고 선배 한의사들의 처방 경험을 참고하세요.
              </p>
              <ul className="space-y-3">
                {['6,000+ 실제 치험례', '증상별 자동 매칭', '처방 성공률 확인'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border border-purple-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">안전성 검사</h3>
              <p className="text-gray-600 mb-6">
                한약-양약 상호작용을 <strong>실시간 검사</strong>하고 안전한 처방을 도와드립니다.
              </p>
              <ul className="space-y-3">
                {['실시간 상호작용 체크', '금기 사항 알림', '안전 처방 가이드'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-purple-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Comparison */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              온고지신 AI 사용 전 vs 후
            </h2>
            <p className="text-xl text-gray-400">
              실제 사용자들이 경험한 변화입니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <div className="bg-gray-800 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <X className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold">사용 전</h3>
              </div>
              <ul className="space-y-4">
                {comparisonData.before.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300">
                    <X className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">사용 후</h3>
              </div>
              <ul className="space-y-4">
                {comparisonData.after.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-200 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              실제 사용자 후기
            </h2>
            <p className="text-xl text-gray-600">
              이미 많은 한의사 선생님들이 경험하고 있습니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl p-8 border border-gray-200 hover:shadow-xl transition-shadow"
              >
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <div className="relative mb-6">
                  <Quote className="absolute -top-2 -left-2 h-8 w-8 text-teal-100" />
                  <p className="text-gray-700 leading-relaxed pl-4">
                    {testimonial.quote}
                  </p>
                </div>

                {/* Highlight */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-6">
                  <TrendingUp className="h-4 w-4" />
                  {testimonial.highlight}
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.clinic} · {testimonial.experience}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              합리적인 가격
            </h2>
            <p className="text-xl text-gray-600">
              하루 커피 한 잔 가격으로 40년 임상 경험을 얻으세요
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-8 text-white text-center">
                <p className="text-lg font-medium mb-2">가장 인기 있는</p>
                <h3 className="text-3xl font-bold">Professional 플랜</h3>
              </div>
              <div className="p-8">
                <div className="text-center mb-8">
                  <p className="text-5xl font-bold text-gray-900">
                    월 49,000<span className="text-xl font-normal text-gray-500">원</span>
                  </p>
                  <p className="text-gray-500 mt-2">연간 결제 시 월 39,000원 (2개월 무료)</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {[
                    'AI 진료 상담 무제한',
                    '6,000+ 치험례 검색',
                    '한약-양약 상호작용 검사',
                    '처방 근거 문서화',
                    '환자 관리 시스템',
                    '우선 기술 지원',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-teal-500" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleStartTrial}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-lg font-bold rounded-2xl hover:shadow-xl hover:shadow-teal-500/30 transition-all"
                >
                  14일 무료 체험 시작하기
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                  카드 등록 없이 시작 · 언제든 취소 가능
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              자주 묻는 질문
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'AI가 추천하는 처방을 신뢰할 수 있나요?',
                a: 'AI는 40년 이상 임상 경험을 가진 한의사의 6,000건 이상 치험례를 학습했습니다. 92%의 처방 일치율을 보이며, 최종 처방 결정은 항상 의료인의 전문적 판단에 따릅니다.',
              },
              {
                q: '무료 체험 기간 동안 모든 기능을 사용할 수 있나요?',
                a: '네, 14일 무료 체험 기간 동안 Professional 플랜의 모든 기능을 제한 없이 사용하실 수 있습니다. 카드 등록 없이 시작하며, 체험 후 자동 결제되지 않습니다.',
              },
              {
                q: '환자 데이터는 안전한가요?',
                a: '모든 데이터는 암호화되어 저장되며, 의료 데이터 보안 규정을 준수합니다. 환자 개인정보는 진료 목적으로만 사용되며 제3자와 공유되지 않습니다.',
              },
              {
                q: '기존 EMR 시스템과 연동 가능한가요?',
                a: 'Clinic 플랜에서 주요 EMR 시스템과의 연동을 지원합니다. 연동 가능 여부는 문의 주시면 확인해 드립니다.',
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-gray-600">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-teal-600 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            40년 임상 경험이 당신의 진료실에 함께합니다
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={handleStartTrial}
              className="group px-8 py-4 bg-white text-teal-600 text-lg font-bold rounded-2xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
            >
              14일 무료 체험 시작
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 text-teal-100">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              카드 등록 없이 시작
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              언제든 취소 가능
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">온</span>
                </div>
                <span className="text-xl font-bold text-white">온고지신 AI</span>
              </div>
              <p className="text-sm">
                한의학 임상 의사결정 지원 시스템<br />
                40년 임상 경험을 AI로
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">제품</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="hover:text-white transition-colors">기능 소개</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">요금제</Link></li>
                <li><Link to="/case-studies" className="hover:text-white transition-colors">사례 연구</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">고객지원</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/help" className="hover:text-white transition-colors">도움말</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">문의하기</Link></li>
                <li><a href="tel:02-XXX-XXXX" className="hover:text-white transition-colors">02-XXX-XXXX</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">법적 고지</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-white transition-colors">개인정보처리방침</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">이용약관</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-sm text-center">
            <p>© 2024 온고지신 AI. All rights reserved.</p>
            <p className="mt-2 text-xs text-gray-500">
              본 서비스는 의료 전문가의 진단을 대체하지 않으며, 참고 자료로만 사용해야 합니다.
            </p>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
              {/* TODO: Replace with actual video embed */}
              <p className="text-white text-xl">데모 영상 (준비 중)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
