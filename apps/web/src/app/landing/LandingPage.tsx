import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSEO } from '@/hooks/useSEO'
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
  const navigate = useNavigate()
  const enterAsGuest = useAuthStore((state) => state.enterAsGuest)

  // 랜딩페이지 SEO 설정 (기본값 사용)
  useSEO()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [faqCategory, setFaqCategory] = useState<string>('전체')
  const [showAllFaq, setShowAllFaq] = useState(false) // FAQ 전체 보기
  const [isAnnual, setIsAnnual] = useState(false) // 기본값: 월결제
  const [demoSymptom, setDemoSymptom] = useState('')
  const [demoResult, setDemoResult] = useState<{
    formula: string
    confidence: number
    herbs: string[]
  } | null>(null)
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  // 게스트 모드로 프로그램 체험
  const handleTryProgram = () => {
    enterAsGuest()
    navigate('/dashboard')
  }

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

  // 가격 정책 최적화 (2024.02) - toss-payments.service.ts와 동기화
  const pricingPlans = [
    {
      name: 'Basic',
      monthlyPrice: 19900, // 월 19,900원
      dailyPrice: 663, // 하루 약 663원
      annualPrice: 199000, // 연 199,000원 (17% 할인, 2개월 무료)
      annualMonthlyPrice: 16583, // 연간 결제 시 월 환산
      description: '한의학 입문자를 위한 기본 플랜',
      features: [
        'AI 쿼리 월 100회',
        '처방 검색 무제한',
        '약재 정보 열람',
        '기본 상호작용 검사',
        '커뮤니티 읽기',
      ],
      cta: 'Basic 시작하기',
      highlighted: false,
    },
    {
      name: 'Professional',
      monthlyPrice: 99000, // 월 99,000원
      dailyPrice: 3300, // 하루 약 3,300원
      annualPrice: 990000, // 연 990,000원 (17% 할인, 2개월 무료)
      annualMonthlyPrice: 82500, // 연간 결제 시 월 환산
      description: '임상 한의사를 위한 전문 플랜',
      features: [
        'AI 쿼리 월 300회',
        '무제한 처방 검색',
        '치험례 전체 열람',
        '삭감 예측 기능',
        '음성 차트 (월 50회)',
        '약물 상호작용 무제한',
        '우선 고객 지원',
      ],
      cta: 'Professional 시작하기',
      highlighted: true,
    },
    {
      name: 'Clinic',
      monthlyPrice: 299000, // 월 299,000원 (마진 개선: 42% → 54%)
      dailyPrice: 9967, // 하루 약 9,967원
      annualPrice: 2990000, // 연 2,990,000원 (17% 할인, 2개월 무료)
      annualMonthlyPrice: 249167, // 연간 결제 시 월 환산
      description: '병원 및 팀을 위한 프리미엄',
      features: [
        'Professional의 모든 기능',
        'AI 쿼리 월 1,500회 (Fair Use)',
        '팀 멤버 관리 (5명)',
        '개인 치험례 저장 무제한',
        'API 연동 지원',
        '전담 매니저 배정',
        '맞춤형 기능 개발',
      ],
      cta: 'Clinic 시작하기',
      highlighted: false,
    },
  ]

  const faqs = [
    // 서비스 소개
    {
      question: '온고지신은 어떤 서비스인가요?',
      answer: '온고지신은 AI 기반 한의학 임상 의사결정 지원 시스템(CDSS)입니다. 4,300건 이상의 치험례와 429건의 처방 데이터를 기반으로 변증 진단, 처방 추천, 삭감 예측 등 한의사의 임상 진료를 지원합니다.',
      category: '서비스 소개',
    },
    {
      question: '온고지신이라는 이름의 의미는 무엇인가요?',
      answer: '"온고지신(溫故知新)"은 "옛것을 익혀 새것을 안다"는 뜻의 사자성어입니다. 전통 한의학의 지혜를 AI 기술과 결합하여 현대 임상에 활용한다는 의미를 담고 있습니다.',
      category: '서비스 소개',
    },
    {
      question: '누가 이 서비스를 사용할 수 있나요?',
      answer: '한의사, 한방병원, 한의대생, 한약사, 한약업사 등 한의학 관련 종사자라면 누구나 사용할 수 있습니다. 각 직군에 맞는 기능과 활용법을 제공합니다.',
      category: '서비스 소개',
    },
    {
      question: '모바일에서도 사용할 수 있나요?',
      answer: '네, 온고지신은 반응형 웹으로 제작되어 PC, 태블릿, 스마트폰 등 모든 기기에서 사용할 수 있습니다. 별도의 앱 설치 없이 웹 브라우저로 접속하시면 됩니다.',
      category: '서비스 소개',
    },
    {
      question: '무료 체험이 가능한가요?',
      answer: '네, 회원가입 없이도 게스트 모드로 주요 기능을 체험해 보실 수 있습니다. 본격적인 사용을 원하시면 Basic 플랜부터 시작하실 수 있으며, AI 변증 진단, 치험례 전체 열람, 삭감 예측 등 고급 기능은 Professional 플랜부터 이용하실 수 있습니다.',
      category: '서비스 소개',
    },
    // AI 기능
    {
      question: 'AI 진단을 신뢰할 수 있나요?',
      answer: 'AI는 참고 도구로서 최종 진단과 처방 결정은 항상 한의사의 임상적 판단에 따릅니다. 온고지신의 AI는 수천 건의 실제 임상 데이터를 학습하여 보조적인 인사이트를 제공합니다.',
      category: 'AI 기능',
    },
    {
      question: 'AI 변증 진단은 어떻게 작동하나요?',
      answer: '환자의 주소, 현병력, 맥진, 설진 등의 정보를 입력하면 AI가 팔강변증, 장부변증, 육경변증 등을 분석하고 그에 맞는 처방을 추천합니다. 수천 건의 실제 임상 데이터를 학습한 모델을 사용합니다.',
      category: 'AI 기능',
    },
    {
      question: 'AI가 추천하는 처방의 정확도는 어느 정도인가요?',
      answer: '현재 AI 처방 추천의 일치율은 약 80-90% 수준입니다. 다만 AI는 참고용이며, 최종 처방 결정은 반드시 한의사의 임상적 판단에 따라야 합니다.',
      category: 'AI 기능',
    },
    {
      question: 'AI 분석에 시간이 얼마나 걸리나요?',
      answer: '일반적으로 증상 입력 후 3-5초 내에 변증 분석과 처방 추천 결과가 제공됩니다. 네트워크 상황에 따라 다소 차이가 있을 수 있습니다.',
      category: 'AI 기능',
    },
    {
      question: 'AI 기능 사용 횟수에 제한이 있나요?',
      answer: 'Basic 플랜은 월 100회, Professional 플랜은 월 300회, Clinic 플랜은 월 1,500회 (Fair Use Policy)를 제공합니다. 초과 사용 시 건당 추가 요금이 적용됩니다.',
      category: 'AI 기능',
    },
    {
      question: 'AI가 학습하는 데이터는 어디서 오나요?',
      answer: '대한한방내과학회지 등 학술지에 발표된 치험례와 전문 한의사들의 임상 데이터를 수집하여 학습에 활용합니다. 모든 데이터는 익명화 처리되어 사용됩니다.',
      category: 'AI 기능',
    },
    {
      question: 'AI 분석 결과를 저장할 수 있나요?',
      answer: '네, Professional 플랜 이상에서는 AI 분석 결과를 저장하고 나중에 다시 확인할 수 있습니다. 환자별로 분석 기록을 관리할 수도 있습니다.',
      category: 'AI 기능',
    },
    {
      question: 'AI가 분석하지 못하는 경우도 있나요?',
      answer: '입력된 증상 정보가 불충분하거나 매우 드문 케이스의 경우 AI가 명확한 결과를 제공하지 못할 수 있습니다. 이 경우 추가 정보 입력을 권장드립니다.',
      category: 'AI 기능',
    },
    // 치험례 검색
    {
      question: '치험례는 총 몇 건이나 있나요?',
      answer: '현재 4,300건 이상의 치험례가 등록되어 있으며, 지속적으로 업데이트되고 있습니다. 대한한방내과학회지 등 신뢰할 수 있는 학술자료를 기반으로 합니다.',
      category: '치험례 검색',
    },
    {
      question: '치험례 검색은 어떻게 하나요?',
      answer: '질환명, 증상, 처방명, 변증 유형 등으로 검색할 수 있습니다. 복합 검색도 가능하여 "소화불량 + 비기허" 같은 조건으로 검색할 수 있습니다.',
      category: '치험례 검색',
    },
    {
      question: '치험례에서 어떤 정보를 볼 수 있나요?',
      answer: '환자 정보(연령, 성별), 주소, 현병력, 사진 정보, 변증, 처방 내용, 치료 경과, 고찰 등 상세한 임상 정보를 확인할 수 있습니다.',
      category: '치험례 검색',
    },
    {
      question: '치험례 데이터는 얼마나 자주 업데이트되나요?',
      answer: '새로운 학술 자료가 발표될 때마다 검토 후 추가됩니다. 일반적으로 월 1-2회 정도 업데이트가 이루어집니다.',
      category: '치험례 검색',
    },
    {
      question: '내 치험례를 등록할 수 있나요?',
      answer: 'Clinic 플랜에서는 개인 치험례를 무제한으로 저장하고 관리할 수 있습니다. 저장된 치험례는 본인만 열람할 수 있습니다.',
      category: '치험례 검색',
    },
    // 처방/약재 검색
    {
      question: '처방 데이터는 어떤 것이 있나요?',
      answer: '방약합편을 기반으로 한 429건의 처방 데이터가 있습니다. 각 처방의 구성, 용량, 효능, 주치, 가감법 등을 확인할 수 있습니다.',
      category: '처방/약재',
    },
    {
      question: '약재 정보는 어떤 것을 확인할 수 있나요?',
      answer: '500종 이상의 약재에 대해 성미, 귀경, 효능, 용량, 주의사항, 포제법 등의 정보를 제공합니다.',
      category: '처방/약재',
    },
    {
      question: '처방 간 비교 분석이 가능한가요?',
      answer: '네, 유사한 처방들을 비교 분석하는 기능이 있습니다. 구성 약재의 차이점, 적응증 비교 등을 한눈에 확인할 수 있습니다.',
      category: '처방/약재',
    },
    {
      question: '처방의 가감법도 확인할 수 있나요?',
      answer: '네, 각 처방에 대해 증상별 가감법을 제공합니다. 기본 처방에서 어떤 약재를 가감하면 좋을지 참고할 수 있습니다.',
      category: '처방/약재',
    },
    {
      question: '처방 검색 횟수에 제한이 있나요?',
      answer: 'Basic 플랜에서는 일 10회로 제한되며, Professional 플랜 이상에서는 무제한으로 검색할 수 있습니다.',
      category: '처방/약재',
    },
    // 삭감 예측
    {
      question: '삭감 예측 기능은 무엇인가요?',
      answer: '보험 청구 시 삭감(심사 조정)될 가능성이 있는 항목을 미리 예측해주는 기능입니다. 진단명과 처방 내용을 분석하여 주의가 필요한 부분을 알려드립니다.',
      category: '삭감 예측',
    },
    {
      question: '삭감 예측 정확도는 어느 정도인가요?',
      answer: '과거 심사 결과 데이터를 학습하여 약 85% 이상의 정확도로 삭감 위험을 예측합니다. 다만 실제 심사 결과는 다양한 요인에 따라 달라질 수 있습니다.',
      category: '삭감 예측',
    },
    {
      question: '어떤 항목의 삭감을 예측할 수 있나요?',
      answer: '진찰료, 투약료, 처치료, 첩약 등 주요 한방 급여 항목에 대한 삭감 위험을 예측합니다. 비급여 항목은 대상이 아닙니다.',
      category: '삭감 예측',
    },
    {
      question: '삭감 예측 결과를 어떻게 활용하나요?',
      answer: '삭감 위험이 높은 항목에 대해 소견서 보완, 청구 내역 수정, 증빙 자료 준비 등의 대응을 할 수 있습니다. 구체적인 대응 방안도 함께 안내해드립니다.',
      category: '삭감 예측',
    },
    {
      question: '삭감 예측 기능은 어떤 플랜에서 사용할 수 있나요?',
      answer: 'Professional 플랜 이상에서 삭감 예측 기능을 사용할 수 있습니다.',
      category: '삭감 예측',
    },
    // 음성 차트
    {
      question: '음성 차트 기능은 무엇인가요?',
      answer: '진료 내용을 음성으로 말하면 AI가 자동으로 SOAP 형식의 진료 기록을 생성해주는 기능입니다. 키보드 입력 없이 빠르게 차트를 작성할 수 있습니다.',
      category: '음성 차트',
    },
    {
      question: '음성 인식 정확도는 어느 정도인가요?',
      answer: '한의학 전문 용어에 최적화된 음성 인식 모델을 사용하여 약 95% 이상의 인식 정확도를 제공합니다. 인식된 내용은 편집이 가능합니다.',
      category: '음성 차트',
    },
    {
      question: '음성 차트 사용 횟수에 제한이 있나요?',
      answer: 'Professional 플랜에서는 월 50회, Clinic 플랜에서는 월 200회까지 사용할 수 있습니다.',
      category: '음성 차트',
    },
    {
      question: '생성된 차트를 수정할 수 있나요?',
      answer: '네, AI가 생성한 차트 내용을 직접 수정하거나 보완할 수 있습니다. 저장 전에 내용을 확인하고 필요한 부분을 편집하세요.',
      category: '음성 차트',
    },
    // 약물 상호작용
    {
      question: '약물 상호작용 검사는 어떤 기능인가요?',
      answer: '양약과 한약 간의 상호작용, 한약재 간의 상호작용을 검사하는 기능입니다. 배합금기, 상오약, 상살약 등의 정보를 제공합니다.',
      category: '약물 상호작용',
    },
    {
      question: '몇 가지 약물을 동시에 검사할 수 있나요?',
      answer: '한 번에 최대 20개의 약물(양약+한약)을 동시에 검사할 수 있습니다.',
      category: '약물 상호작용',
    },
    {
      question: '양약 정보는 어디서 가져오나요?',
      answer: '식품의약품안전처의 의약품 정보와 국내외 약물 상호작용 데이터베이스를 참고하여 제공합니다.',
      category: '약물 상호작용',
    },
    {
      question: '상호작용 정보는 얼마나 신뢰할 수 있나요?',
      answer: '공인된 데이터베이스와 연구 문헌을 기반으로 하지만, 참고용으로만 사용하시고 중요한 결정은 약사 또는 전문의와 상담하시기 바랍니다.',
      category: '약물 상호작용',
    },
    // 요금제/결제
    {
      question: '어떤 요금제가 있나요?',
      answer: 'Basic(월 19,900원), Professional(월 99,000원), Clinic(월 299,000원) 세 가지 플랜이 있습니다. 연간 결제 시 17% 할인(2개월 무료)이 적용됩니다. 대형 병원/네트워크를 위한 Enterprise 맞춤형 플랜도 별도 문의 가능합니다.',
      category: '요금제/결제',
    },
    {
      question: '결제 수단은 무엇이 있나요?',
      answer: '신용카드, 체크카드로 결제할 수 있습니다. 토스페이먼츠를 통해 안전하게 처리됩니다.',
      category: '요금제/결제',
    },
    {
      question: '환불 정책은 어떻게 되나요?',
      answer: '결제 후 7일 이내에는 전액 환불이 가능합니다. 7일 이후에는 잔여 기간에 대해 일할 계산하여 환불해 드립니다. 자세한 내용은 환불 정책 페이지를 참고해 주세요.',
      category: '요금제/결제',
    },
    {
      question: '플랜 업그레이드는 어떻게 하나요?',
      answer: '설정 > 구독 관리에서 언제든 상위 플랜으로 업그레이드할 수 있습니다. 업그레이드 시 기존 결제 금액은 일할 계산하여 차감됩니다.',
      category: '요금제/결제',
    },
    {
      question: '플랜 다운그레이드도 가능한가요?',
      answer: '네, 현재 구독 기간이 끝난 후 다음 결제일부터 하위 플랜으로 변경할 수 있습니다. 설정 > 구독 관리에서 변경하실 수 있습니다.',
      category: '요금제/결제',
    },
    {
      question: '자동 결제를 해지할 수 있나요?',
      answer: '네, 설정 > 구독 관리에서 자동 결제를 해지할 수 있습니다. 해지 후에도 결제 기간 종료일까지는 서비스를 이용할 수 있습니다.',
      category: '요금제/결제',
    },
    {
      question: '세금계산서 발급이 가능한가요?',
      answer: '네, 사업자 회원의 경우 세금계산서 발급이 가능합니다. 설정 > 결제 내역에서 신청하실 수 있습니다.',
      category: '요금제/결제',
    },
    {
      question: '병원에서 여러 명이 함께 사용할 수 있나요?',
      answer: 'Clinic 플랜에서는 최대 5명의 팀 멤버를 관리할 수 있습니다. 더 많은 인원이 필요하시면 별도 문의해 주세요.',
      category: '요금제/결제',
    },
    // 계정/보안
    {
      question: '데이터 보안은 어떻게 되나요?',
      answer: '모든 데이터는 SSL/TLS로 암호화되어 전송되며, 서버에서도 AES-256으로 암호화되어 저장됩니다. 의료 정보 보안 기준을 준수하고 있습니다.',
      category: '계정/보안',
    },
    {
      question: '환자 정보를 입력해도 안전한가요?',
      answer: '환자 정보는 개인정보보호법에 따라 철저히 보호됩니다. 민감한 개인정보는 입력하지 않는 것을 권장드리며, 필요시 익명화하여 입력해 주세요.',
      category: '계정/보안',
    },
    {
      question: '계정이 해킹당하면 어떻게 하나요?',
      answer: '즉시 support@hanmed.kr로 연락해 주세요. 계정을 일시 정지하고 비밀번호 재설정 절차를 안내해 드립니다. 이중 인증 설정을 권장드립니다.',
      category: '계정/보안',
    },
    {
      question: '비밀번호를 잊어버렸어요.',
      answer: '로그인 페이지의 "비밀번호 찾기"를 클릭하고 가입 시 사용한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.',
      category: '계정/보안',
    },
    {
      question: '계정을 탈퇴하면 데이터는 어떻게 되나요?',
      answer: '계정 탈퇴 시 모든 개인 데이터는 30일 이내에 완전히 삭제됩니다. 삭제 전에 필요한 데이터는 미리 백업해 주세요.',
      category: '계정/보안',
    },
    {
      question: '로그인 기기 제한이 있나요?',
      answer: '동시 로그인은 최대 3대의 기기에서 가능합니다. 새로운 기기에서 로그인하면 가장 오래된 세션이 자동으로 종료됩니다.',
      category: '계정/보안',
    },
    // 기술 지원
    {
      question: '오류가 발생하면 어떻게 하나요?',
      answer: '화면을 새로고침해 보시고, 문제가 지속되면 support@hanmed.kr로 오류 화면 스크린샷과 함께 문의해 주세요. 빠르게 도움드리겠습니다.',
      category: '기술 지원',
    },
    {
      question: '고객 지원 운영 시간은 언제인가요?',
      answer: '평일 오전 9시부터 오후 6시까지 운영됩니다. 이메일 문의는 24시간 접수 가능하며, 영업일 기준 1-2일 내에 답변드립니다.',
      category: '기술 지원',
    },
    {
      question: '기능 추가 요청은 어떻게 하나요?',
      answer: 'support@hanmed.kr로 원하시는 기능에 대해 설명해 주시면 검토 후 개발 일정에 반영합니다. 많은 분들이 요청하시는 기능은 우선 개발됩니다.',
      category: '기술 지원',
    },
    {
      question: '서비스 이용 중 교육이나 안내를 받을 수 있나요?',
      answer: 'Clinic 플랜에서는 전담 매니저가 배정되어 온보딩 교육과 지속적인 사용 안내를 제공합니다. 다른 플랜에서는 이메일 문의로 안내받으실 수 있습니다.',
      category: '기술 지원',
    },
  ]

  const testimonials = [
    {
      content: '치험례 검색 기능이 정말 유용합니다. 비슷한 증상의 환자를 치료할 때 큰 도움이 됩니다.',
      author: '김○○ 원장',
      role: '서울 ○○한의원',
      rating: 5,
      metric: '치료 적중률 25% 향상',
    },
    {
      content: 'AI 변증 진단으로 놓칠 수 있는 부분을 다시 확인할 수 있어 좋습니다.',
      author: '이○○ 원장',
      role: '부산 ○○한방병원',
      rating: 5,
      metric: '진단 정확도 개선',
    },
    {
      content: '한의대생인데 국시 준비하면서 처방 공부할 때 많이 참고합니다.',
      author: '박○○',
      role: '○○대학교 한의학과',
      rating: 5,
      metric: '학습 효율 2배 향상',
    },
    {
      content: '삭감 예측 기능 덕분에 보험 청구 반려율이 확 줄었습니다. 진료에만 집중할 수 있어요.',
      author: '최○○ 원장',
      role: '대구 ○○한의원',
      rating: 5,
      metric: '삭감율 40% 감소',
    },
    {
      content: '음성 차트 기능이 게임체인저입니다. 진료 후 차트 정리 시간이 반으로 줄었어요.',
      author: '정○○ 원장',
      role: '인천 ○○한방병원',
      rating: 5,
      metric: '차트 작성 시간 50% 단축',
    },
    {
      content: '신규 한의사 교육용으로 활용하고 있습니다. 체계적인 변증 학습에 큰 도움이 됩니다.',
      author: '강○○ 병원장',
      role: '광주 ○○한방병원',
      rating: 5,
      metric: '신규 인력 온보딩 가속화',
    },
    {
      content: '처방 구성의 원리를 이해하는 데 정말 좋습니다. 방제학 공부가 훨씬 쉬워졌어요.',
      author: '윤○○',
      role: '○○대학교 한의학과 4학년',
      rating: 5,
      metric: '시험 성적 15% 향상',
    },
    {
      content: '약물 상호작용 검사 기능으로 양약 복용 중인 환자 상담이 훨씬 수월해졌습니다.',
      author: '한○○ 약사',
      role: '서울 ○○한약국',
      rating: 5,
      metric: '안전 상담 품질 향상',
    },
    {
      content: '4,300건이 넘는 치험례 데이터베이스는 다른 곳에서 찾기 어렵습니다. 임상 참고자료로 최고예요.',
      author: '조○○ 원장',
      role: '대전 ○○한의원',
      rating: 5,
      metric: '참고 자료 검색 90% 단축',
    },
  ]

  // 성공 사례 데이터
  const successStories = [
    {
      title: '진료 효율 대폭 개선',
      clinic: '서울 강남 ○○한의원',
      problem: '하루 50명 이상 진료 시 차트 작성에 과도한 시간 소요',
      solution: '온고지신 음성 차트 + AI 변증 도입',
      results: [
        { label: '차트 작성 시간', before: '5분/환자', after: '2분/환자', improvement: '60%' },
        { label: '일 추가 진료 가능', before: '-', after: '+8명', improvement: '+16%' },
        { label: '월 추가 매출', before: '-', after: '약 160만원', improvement: '' },
      ],
      quote: '시간을 아껴서 환자와 더 깊이 소통할 수 있게 되었습니다.',
      period: '도입 3개월 후 결과',
    },
    {
      title: '보험 청구 최적화',
      clinic: '대구 수성구 ○○한방병원',
      problem: '월평균 삭감률 15%로 수익 손실 발생',
      solution: '삭감 예측 기능 활용한 사전 검토 체계 구축',
      results: [
        { label: '월 삭감률', before: '15%', after: '4%', improvement: '73%↓' },
        { label: '재심사 건수', before: '월 20건', after: '월 5건', improvement: '75%↓' },
        { label: '월 손실 방지', before: '-', after: '약 350만원', improvement: '' },
      ],
      quote: '청구 전 미리 확인하니 마음이 편합니다. 행정 업무가 확 줄었어요.',
      period: '도입 6개월 후 결과',
    },
    {
      title: '신규 한의사 역량 강화',
      clinic: '경기 분당 ○○한방의료재단',
      problem: '신규 한의사 임상 적응에 평균 1년 소요',
      solution: '온고지신 기반 표준 진료 프로토콜 교육',
      results: [
        { label: '임상 적응 기간', before: '12개월', after: '6개월', improvement: '50%↓' },
        { label: '변증 일치율', before: '68%', after: '89%', improvement: '+21%p' },
        { label: '환자 만족도', before: '3.8점', after: '4.5점', improvement: '+18%' },
      ],
      quote: '체계적인 학습 도구가 있어서 자신감 있게 진료할 수 있습니다.',
      period: '도입 1년 후 결과',
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
              <Button
                size="lg"
                onClick={handleTryProgram}
                className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-lg px-8 py-6 shadow-xl shadow-teal-500/25 btn-press group"
              >
                <Play className="w-5 h-5 mr-2" />
                무료로 체험하기
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Link to="/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 group btn-press">
                  회원가입
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
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

      {/* Success Stories Section */}
      <section id="success-stories" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">도입 성과</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              실제 도입 성공 사례
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              온고지신을 도입한 한의원/한방병원의 실제 성과를 확인하세요
            </p>
          </div>

          <div className="space-y-8">
            {successStories.map((story, index) => (
              <Card key={index} className="overflow-hidden border-0 shadow-xl hover-lift">
                <div className="grid lg:grid-cols-5">
                  {/* Left: Problem & Solution */}
                  <div className="lg:col-span-2 p-6 lg:p-8 bg-gradient-to-br from-teal-600 to-emerald-600 text-white">
                    <Badge className="mb-4 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm">
                      Case Study #{index + 1}
                    </Badge>
                    <h3 className="text-2xl font-bold mb-2">{story.title}</h3>
                    <p className="text-teal-100 text-sm mb-6">{story.clinic}</p>

                    <div className="space-y-4">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-teal-200 mb-1">문제점</div>
                        <p className="text-sm text-white/90">{story.problem}</p>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-teal-200 mb-1">솔루션</div>
                        <p className="text-sm text-white/90">{story.solution}</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/20">
                      <p className="text-sm italic text-teal-100">"{story.quote}"</p>
                    </div>
                  </div>

                  {/* Right: Results */}
                  <div className="lg:col-span-3 p-6 lg:p-8 bg-white">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-semibold text-gray-900">도입 효과</h4>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{story.period}</span>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      {story.results.map((result, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                          <div className="text-xs text-gray-500 mb-2">{result.label}</div>
                          <div className="flex items-end gap-2">
                            <div>
                              <span className="text-xs text-gray-400 line-through">{result.before}</span>
                              <span className="block text-xl font-bold text-gray-900">{result.after}</span>
                            </div>
                            {result.improvement && (
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                {result.improvement}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>실제 도입 기관 데이터 기반</span>
                      </div>
                      <Link to="/register">
                        <Button variant="outline" size="sm" className="btn-press">
                          자세히 알아보기
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">사용자 후기</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              현장의 목소리
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              다양한 분야의 한의학 전문가들이 온고지신과 함께하고 있습니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.slice(0, 6).map((testimonial, index) => (
              <Card key={index} className="bg-white border-gray-100 hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    {testimonial.metric && (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                        {testimonial.metric}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-semibold">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.author}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
              <div className="text-2xl font-bold text-teal-600">96%</div>
              <div className="text-xs text-gray-500">고객 만족도</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
              <div className="text-2xl font-bold text-teal-600">4.8/5</div>
              <div className="text-xs text-gray-500">평균 평점</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
              <div className="text-2xl font-bold text-teal-600">85%</div>
              <div className="text-xs text-gray-500">재구독률</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
              <div className="text-2xl font-bold text-teal-600">2.5시간</div>
              <div className="text-xs text-gray-500">주당 절약 시간</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div ref={pricingAnim.ref} className={`max-w-7xl mx-auto ${pricingAnim.isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100">가격 플랜</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              합리적인 가격, 강력한 기능
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              필요에 맞는 플랜을 선택하세요. 언제든 업그레이드할 수 있습니다.
            </p>

            {/* 월결제/연결제 토글 */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-gray-900' : 'text-gray-400'}`}>
                월결제
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  isAnnual ? 'bg-teal-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    isAnnual ? 'translate-x-7' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-gray-900' : 'text-gray-400'}`}>
                연결제
              </span>
              {isAnnual && (
                <Badge className="bg-emerald-100 text-emerald-700 animate-bounce-in">
                  10% 할인
                </Badge>
              )}
            </div>
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
                    {isAnnual ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">
                          ₩{plan.annualPrice.toLocaleString()}
                        </span>
                        <span className="text-gray-500">/년</span>
                        <div className="text-sm text-gray-400 mt-1">
                          월 ₩{plan.annualMonthlyPrice.toLocaleString()} 상당
                        </div>
                        <div className="text-xs text-emerald-600 mt-1 font-medium">
                          연 ₩{((plan.monthlyPrice * 12) - plan.annualPrice).toLocaleString()} 절약
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gray-900">
                          ₩{plan.monthlyPrice.toLocaleString()}
                        </span>
                        <span className="text-gray-500">/월</span>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                            <span className="text-sm font-semibold text-amber-700">
                              하루 {plan.dailyPrice.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          연결제 시 10% 할인 적용
                        </div>
                      </>
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gray-200 text-gray-700 hover:bg-gray-200">자주 묻는 질문</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              FAQ
            </h2>
            <p className="text-gray-600">
              궁금한 점이 있으신가요? 자주 묻는 질문을 확인해보세요.
            </p>
          </div>

          {/* 카테고리 탭 - 전체 보기 모드에서만 표시 */}
          {showAllFaq && (
            <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-in">
              {['전체', '서비스 소개', 'AI 기능', '치험례 검색', '처방/약재', '삭감 예측', '음성 차트', '약물 상호작용', '요금제/결제', '계정/보안', '기술 지원'].map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setFaqCategory(category)
                    setOpenFaq(null)
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    faqCategory === category
                      ? 'bg-teal-500 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {(() => {
              // 필터링된 FAQ
              const filteredFaqs = showAllFaq
                ? faqs.filter((faq) => faqCategory === '전체' || faq.category === faqCategory)
                : faqs.slice(0, 6) // 메인에서는 6개만

              return filteredFaqs.map((faq) => {
                const originalIndex = faqs.indexOf(faq)
                return (
                  <div
                    key={originalIndex}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <button
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setOpenFaq(openFaq === originalIndex ? null : originalIndex)}
                    >
                      <span className="font-medium text-gray-900">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-500 flex-shrink-0 ml-4 transition-transform duration-200 ${
                          openFaq === originalIndex ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openFaq === originalIndex && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 animate-fade-in">
                        <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>

          {/* 더 보기 / 접기 버튼 */}
          <div className="text-center mt-8">
            {!showAllFaq ? (
              <Button
                variant="outline"
                onClick={() => setShowAllFaq(true)}
                className="px-8 py-3 btn-press"
              >
                더 많은 질문 보기 ({faqs.length - 6}개 더)
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  {faqCategory === '전체'
                    ? `총 ${faqs.length}개의 질문`
                    : `${faqCategory} 관련 ${faqs.filter(f => f.category === faqCategory).length}개의 질문`}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAllFaq(false)
                    setFaqCategory('전체')
                    setOpenFaq(null)
                  }}
                  className="text-gray-500"
                >
                  접기
                </Button>
              </>
            )}
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
              <Button size="lg" className="w-full sm:w-auto bg-white/20 border-2 border-white text-white hover:bg-white/30 text-lg px-8 py-6 btn-press backdrop-blur-sm">
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
                <li><Link to="/go" className="hover:text-white transition-colors">무료 체험</Link></li>
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
