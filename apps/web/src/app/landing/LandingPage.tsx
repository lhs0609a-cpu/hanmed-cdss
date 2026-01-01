import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  Brain,
  BookOpen,
  FileSearch,
  Shield,
  Mic,
  Users,
  Stethoscope,
  Pill,
  GraduationCap,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Star,
  ChevronDown,
  Menu,
  X,
  Play,
  Zap,
  Clock,
  TrendingUp,
  Award,
  HeartPulse,
  Search,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// 숫자 카운트업 훅
function useCountUp(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return

    let startTime: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * (end - start) + start))
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }, [isVisible, end, duration, start])

  return { count, ref }
}

// 스크롤 애니메이션 훅
function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}

// 타이핑 효과 컴포넌트
function TypingEffect({ texts, className }: { texts: string[]; className?: string }) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentFullText = texts[currentTextIndex]
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentFullText.length) {
          setDisplayText(currentFullText.slice(0, displayText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), 2000)
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1))
        } else {
          setIsDeleting(false)
          setCurrentTextIndex((prev) => (prev + 1) % texts.length)
        }
      }
    }, isDeleting ? 50 : 100)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, currentTextIndex, texts])

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [demoSymptom, setDemoSymptom] = useState('')
  const [demoResult, setDemoResult] = useState<{
    formula: string
    confidence: number
    herbs: string[]
  } | null>(null)
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  // 통계 카운트업
  const stat1 = useCountUp(429, 2000)
  const stat2 = useCountUp(4359, 2500)
  const stat3 = useCountUp(500, 2000)
  const stat4 = useCountUp(1000, 2000)

  // 섹션별 스크롤 애니메이션
  const featuresAnim = useScrollAnimation()
  const targetsAnim = useScrollAnimation()
  const demoAnim = useScrollAnimation()
  const pricingAnim = useScrollAnimation()

  const typingTexts = [
    'AI가 변증을 분석합니다',
    '6,000건 치험례를 검색합니다',
    '최적의 처방을 추천합니다',
    '삭감 위험을 예측합니다',
  ]

  const features = [
    {
      icon: Brain,
      title: 'AI 변증 진단',
      description: '환자 증상을 입력하면 AI가 팔강변증, 장부변증을 분석하고 적합한 처방을 추천합니다.',
      badge: 'AI',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: FileSearch,
      title: '치험례 검색',
      description: '4,300건 이상의 실제 임상 치험례에서 유사 사례를 찾아 치료 참고자료로 활용하세요.',
      badge: 'HOT',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Shield,
      title: '삭감 예측',
      description: '보험 청구 전 삭감 가능성을 미리 예측하여 청구 누락을 방지합니다.',
      badge: 'NEW',
      color: 'from-teal-500 to-emerald-500',
    },
    {
      icon: Mic,
      title: '음성 차트',
      description: '진료 내용을 말하면 AI가 자동으로 SOAP 형식의 진료 기록을 생성합니다.',
      badge: 'AI',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Pill,
      title: '약물 상호작용',
      description: '양약과 한약의 상호작용을 실시간으로 검사하여 안전한 처방을 돕습니다.',
      badge: null,
      color: 'from-rose-500 to-pink-500',
    },
    {
      icon: BookOpen,
      title: '처방 검색',
      description: '방약합편 기반 429건의 처방을 검색하고 구성, 효능, 비교 분석을 확인하세요.',
      badge: null,
      color: 'from-amber-500 to-orange-500',
    },
  ]

  const targetAudiences = [
    {
      icon: Stethoscope,
      title: '한의사',
      benefits: [
        'AI 변증으로 진단 정확도 향상',
        '치험례 참고로 치료 효과 증대',
        '삭감 예측으로 보험 청구 최적화',
        '음성 차트로 진료 시간 단축',
      ],
    },
    {
      icon: Building2,
      title: '한방병원',
      benefits: [
        '진료 프로토콜 표준화',
        '신규 한의사 교육 자료 활용',
        '다양한 전문가 의견 통합',
        '진료 품질 관리 및 개선',
      ],
    },
    {
      icon: GraduationCap,
      title: '한의대생',
      benefits: [
        '임상 실습 전 사례 학습',
        '처방 구성 원리 이해',
        '변증 진단 연습',
        '국시 대비 참고 자료',
      ],
    },
    {
      icon: Users,
      title: '한약사 · 한약업사',
      benefits: [
        '처방 구성 및 용량 확인',
        '약재별 효능 빠른 검색',
        '고객 상담 참고 자료',
        '양약 상호작용 안내',
      ],
    },
  ]

  const pricingPlans = [
    {
      name: 'Starter',
      price: '무료',
      period: '',
      description: '한의학 입문자를 위한 기본 플랜',
      features: [
        '처방 검색 (일 10회)',
        '약재 정보 열람',
        '기본 상호작용 검사',
        '커뮤니티 읽기',
      ],
      cta: '무료로 시작하기',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '29,000',
      period: '월',
      description: '임상 한의사를 위한 전문 플랜',
      features: [
        '무제한 처방 검색',
        'AI 변증 진단 (월 100회)',
        '치험례 전체 열람',
        '삭감 예측 기능',
        '음성 차트 (월 50회)',
        '약물 상호작용 무제한',
        '우선 고객 지원',
      ],
      cta: 'Pro 시작하기',
      highlighted: true,
    },
    {
      name: 'Master',
      price: '99,000',
      period: '월',
      description: '병원 및 팀을 위한 프리미엄',
      features: [
        'Pro의 모든 기능',
        'AI 기능 무제한',
        '팀 멤버 관리 (5명)',
        '개인 치험례 저장 무제한',
        'API 연동 지원',
        '전담 매니저 배정',
        '맞춤형 기능 개발',
      ],
      cta: '문의하기',
      highlighted: false,
    },
  ]

  const faqs = [
    {
      question: '온고지신은 어떤 서비스인가요?',
      answer: '온고지신은 AI 기반 한의학 임상 의사결정 지원 시스템(CDSS)입니다. 4,300건 이상의 치험례와 429건의 처방 데이터를 기반으로 변증 진단, 처방 추천, 삭감 예측 등 한의사의 임상 진료를 지원합니다.',
    },
    {
      question: 'AI 진단을 신뢰할 수 있나요?',
      answer: 'AI는 참고 도구로서 최종 진단과 처방 결정은 항상 한의사의 임상적 판단에 따릅니다. 온고지신의 AI는 수천 건의 실제 임상 데이터를 학습하여 보조적인 인사이트를 제공합니다.',
    },
    {
      question: '무료 플랜으로도 충분히 사용할 수 있나요?',
      answer: '네, 기본적인 처방 검색과 약재 정보 열람은 무료로 이용 가능합니다. 다만 AI 변증 진단, 치험례 전체 열람, 삭감 예측 등 고급 기능은 Pro 플랜부터 이용하실 수 있습니다.',
    },
    {
      question: '병원에서 여러 명이 함께 사용할 수 있나요?',
      answer: 'Master 플랜에서는 최대 5명의 팀 멤버를 관리할 수 있습니다. 더 많은 인원이 필요하시면 별도 문의해 주세요.',
    },
    {
      question: '데이터 보안은 어떻게 되나요?',
      answer: '모든 데이터는 암호화되어 저장되며, 환자 정보는 철저히 보호됩니다. 의료 정보 보안 기준을 준수하고 있습니다.',
    },
  ]

  const testimonials = [
    {
      content: '치험례 검색 기능이 정말 유용합니다. 비슷한 증상의 환자를 치료할 때 큰 도움이 됩니다.',
      author: '김○○ 원장',
      role: '서울 ○○한의원',
      rating: 5,
    },
    {
      content: 'AI 변증 진단으로 놓칠 수 있는 부분을 다시 확인할 수 있어 좋습니다.',
      author: '이○○ 원장',
      role: '부산 ○○한방병원',
      rating: 5,
    },
    {
      content: '한의대생인데 국시 준비하면서 처방 공부할 때 많이 참고합니다.',
      author: '박○○',
      role: '○○대학교 한의학과',
      rating: 5,
    },
  ]

  // 데모 시뮬레이션
  const handleDemoSubmit = () => {
    if (!demoSymptom.trim()) return
    setIsDemoLoading(true)

    // 실제로는 API 호출하지만, 여기서는 시뮬레이션
    setTimeout(() => {
      const demoResults = [
        { formula: '이중탕(理中湯)', confidence: 92, herbs: ['인삼', '백출', '건강', '감초'] },
        { formula: '보중익기탕(補中益氣湯)', confidence: 87, herbs: ['황기', '인삼', '백출', '당귀'] },
        { formula: '사군자탕(四君子湯)', confidence: 84, herbs: ['인삼', '백출', '복령', '감초'] },
      ]
      setDemoResult(demoResults[Math.floor(Math.random() * demoResults.length)])
      setIsDemoLoading(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">온고지신</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">기능</a>
              <a href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">데모</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">가격</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">FAQ</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-600">로그인</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-lg shadow-teal-500/25 btn-press">
                  무료로 시작하기
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 animate-fade-in-down">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-gray-600 hover:text-gray-900 py-2">기능</a>
                <a href="#demo" className="text-gray-600 hover:text-gray-900 py-2">데모</a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 py-2">가격</a>
                <a href="#faq" className="text-gray-600 hover:text-gray-900 py-2">FAQ</a>
                <div className="flex gap-3 pt-4">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full">로그인</Button>
                  </Link>
                  <Link to="/register" className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-teal-500 to-emerald-600">시작하기</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-teal-50/50 via-white to-white" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl animate-pulse-slow delay-1000" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <Badge className="mb-6 bg-teal-100 text-teal-700 hover:bg-teal-100 animate-bounce-in px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI 기반 한의학 CDSS
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in-up">
              옛것을 익혀 새것을 안다
              <br />
              <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                온고지신
              </span>
            </h1>

            <div className="h-8 mb-8">
              <TypingEffect
                texts={typingTexts}
                className="text-lg sm:text-xl text-gray-600"
              />
            </div>

            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in-up delay-200 opacity-0" style={{ animationFillMode: 'forwards' }}>
              4,300건 이상의 치험례와 AI 변증 진단으로
              <br className="hidden sm:block" />
              한의학 임상의 새로운 기준을 제시합니다
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in-up delay-300 opacity-0" style={{ animationFillMode: 'forwards' }}>
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-lg px-8 py-6 shadow-xl shadow-teal-500/25 btn-press group">
                  무료로 시작하기
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 group btn-press">
                  <Play className="w-5 h-5 mr-2" />
                  데모 체험하기
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div ref={stat1.ref} className="text-center p-4 rounded-2xl bg-white/50 backdrop-blur border border-gray-100 hover-lift">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                  {stat1.count}+
                </div>
                <div className="text-sm text-gray-500 mt-1">처방 데이터</div>
              </div>
              <div ref={stat2.ref} className="text-center p-4 rounded-2xl bg-white/50 backdrop-blur border border-gray-100 hover-lift">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                  {stat2.count.toLocaleString()}+
                </div>
                <div className="text-sm text-gray-500 mt-1">치험례</div>
              </div>
              <div ref={stat3.ref} className="text-center p-4 rounded-2xl bg-white/50 backdrop-blur border border-gray-100 hover-lift">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                  {stat3.count}+
                </div>
                <div className="text-sm text-gray-500 mt-1">약재 정보</div>
              </div>
              <div ref={stat4.ref} className="text-center p-4 rounded-2xl bg-white/50 backdrop-blur border border-gray-100 hover-lift">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                  {stat4.count.toLocaleString()}+
                </div>
                <div className="text-sm text-gray-500 mt-1">약물 상호작용</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-gray-400">
              <Award className="w-5 h-5" />
              <span className="text-sm font-medium">의료정보 보안 준수</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">SSL 암호화</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">99.9% 가동률</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <HeartPulse className="w-5 h-5" />
              <span className="text-sm font-medium">실제 임상 데이터 기반</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div ref={featuresAnim.ref} className={`max-w-7xl mx-auto ${featuresAnim.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-100">핵심 기능</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              한의학 임상을 위한 모든 것
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              AI 기술과 임상 데이터의 결합으로 더 정확하고 효율적인 진료를 지원합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border-gray-100 overflow-hidden hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                    {feature.badge && (
                      <Badge variant="secondary" className={`text-xs ${
                        feature.badge === 'AI' ? 'bg-purple-100 text-purple-700' :
                        feature.badge === 'HOT' ? 'bg-orange-100 text-orange-700' :
                        'bg-teal-100 text-teal-700'
                      }`}>
                        {feature.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div ref={demoAnim.ref} className={`max-w-4xl mx-auto ${demoAnim.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-teal-100 text-teal-700 hover:bg-teal-100">라이브 데모</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              지금 바로 체험해보세요
            </h2>
            <p className="text-lg text-gray-600">
              증상을 입력하면 AI가 실시간으로 처방을 추천합니다
            </p>
          </div>

          <Card className="overflow-hidden shadow-2xl border-0">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-white/80 text-sm font-medium">온고지신 AI 진료 어시스턴트</span>
              </div>
            </div>
            <CardContent className="p-6 sm:p-8 bg-gray-50">
              <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={demoSymptom}
                    onChange={(e) => setDemoSymptom(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDemoSubmit()}
                    placeholder="환자 증상을 입력하세요 (예: 소화불량, 피로감, 식욕부진)"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white"
                  />
                </div>
                <Button
                  onClick={handleDemoSubmit}
                  disabled={isDemoLoading || !demoSymptom.trim()}
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 px-6 btn-press"
                >
                  {isDemoLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {/* Quick symptom tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {['소화불량', '피로감', '두통', '불면증', '요통'].map((symptom) => (
                  <button
                    key={symptom}
                    onClick={() => setDemoSymptom(symptom)}
                    className="px-3 py-1.5 text-sm rounded-full bg-white border border-gray-200 text-gray-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
                  >
                    {symptom}
                  </button>
                ))}
              </div>

              {/* Demo Result */}
              {demoResult && (
                <div className="bg-white rounded-xl p-5 border border-gray-100 animate-scale-in">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <span className="font-semibold text-gray-900">AI 추천 처방</span>
                      </div>
                      <h3 className="text-xl font-bold text-teal-600">{demoResult.formula}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-semibold">{demoResult.confidence}% 일치</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {demoResult.herbs.map((herb, idx) => (
                      <span key={idx} className="px-3 py-1 text-sm rounded-lg bg-gray-100 text-gray-700">
                        {herb}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link to="/register">
                      <Button className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 btn-press">
                        전체 분석 결과 보기
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {!demoResult && !isDemoLoading && (
                <div className="text-center py-8 text-gray-400">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>증상을 입력하면 AI가 분석을 시작합니다</p>
                </div>
              )}

              {isDemoLoading && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 border-3 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                  <p className="text-gray-500">AI가 분석 중입니다...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Target Audience Section */}
      <section id="targets" className="py-24 px-4 sm:px-6 lg:px-8">
        <div ref={targetsAnim.ref} className={`max-w-7xl mx-auto ${targetsAnim.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-100 text-amber-700 hover:bg-amber-100">이런 분들께 추천</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              한의학 전문가를 위한 맞춤 솔루션
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              각 분야의 니즈에 맞는 기능으로 업무 효율을 높여드립니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {targetAudiences.map((target, index) => (
              <Card key={index} className="bg-white border-gray-100 hover:shadow-xl transition-all hover-lift">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-teal-500/20">
                    <target.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{target.title}</h3>
                  <ul className="space-y-3">
                    {target.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-600">
                        <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">사용자 후기</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              현장의 목소리
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white border-gray-100 hover-lift">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div ref={pricingAnim.ref} className={`max-w-7xl mx-auto ${pricingAnim.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100">가격 플랜</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              합리적인 가격, 강력한 기능
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              필요에 맞는 플랜을 선택하세요. 언제든 업그레이드할 수 있습니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative hover-lift ${
                  plan.highlighted
                    ? 'border-2 border-teal-500 shadow-2xl shadow-teal-500/20 scale-105'
                    : 'border-gray-100'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg">
                      추천
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === '무료' ? '무료' : `₩${plan.price}`}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500">/{plan.period}</span>
                    )}
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-600">
                        <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button
                      className={`w-full btn-press ${
                        plan.highlighted
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-lg shadow-teal-500/25'
                          : ''
                      }`}
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gray-200 text-gray-700 hover:bg-gray-200">자주 묻는 질문</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              FAQ
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 animate-fade-in">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-teal-600 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
            무료로 가입하고 한의학 임상의 새로운 경험을 만나보세요.
            <br />
            언제든 플랜을 업그레이드할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto bg-white text-teal-600 hover:bg-gray-100 text-lg px-8 py-6 shadow-xl btn-press group">
                무료로 시작하기
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10 text-lg px-8 py-6 btn-press">
                이미 계정이 있으신가요?
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white">온고지신</span>
              </div>
              <p className="text-sm leading-relaxed">
                AI 기반 한의학 임상 의사결정 지원 시스템
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">서비스</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">기능 소개</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">가격 안내</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">자주 묻는 질문</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">법적 고지</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms" className="hover:text-white transition-colors">이용약관</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">개인정보처리방침</Link></li>
                <li><Link to="/refund-policy" className="hover:text-white transition-colors">환불 정책</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">고객지원</h4>
              <ul className="space-y-2 text-sm">
                <li>이메일: support@hanmed.kr</li>
                <li>운영시간: 평일 09:00 - 18:00</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 text-sm text-center">
            <p>&copy; 2024 온고지신. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
