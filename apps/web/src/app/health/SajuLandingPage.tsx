import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, ChevronRight, Shield, Zap, BookOpen, Star, Heart } from 'lucide-react'
import SajuProductCard from '@/components/health/SajuProductCard'
import { SAJU_PRODUCTS } from '@/lib/saju-products'

const differentiators = [
  {
    icon: Heart,
    title: '한의학 x 사주 융합',
    description: '오행과 장부 이론을 결합한 건강사주는 여기에서만 볼 수 있어요',
  },
  {
    icon: Zap,
    title: 'Claude AI 심층 분석',
    description: '최신 AI가 수천 자의 개인 맞춤 리포트를 작성합니다',
  },
  {
    icon: BookOpen,
    title: '실전 양생법 가이드',
    description: '식이, 운동, 수면, 계절별 관리까지 구체적 실천 방안 제시',
  },
  {
    icon: Shield,
    title: '사상체질 정밀진단',
    description: '오행 밸런스 기반 체질 분석과 장부 강약 맞춤 처방',
  },
]

export default function SajuLandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-rose-50" />
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-20 md:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-100/80 rounded-full text-sm text-purple-700 font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI 건강사주 리포트
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
              사주 속에 숨은
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                나만의 건강 비밀
              </span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
              생년월일시에 담긴 오행의 기운을 한의학으로 풀어드립니다.
              <br />
              체질, 건강, 운세를 아우르는 심층 리포트를 AI가 작성해요.
            </p>
            <Link
              to="/health/saju/input"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-bold rounded-full shadow-xl shadow-purple-200 hover:shadow-2xl hover:-translate-y-0.5 transition-all text-lg"
            >
              <Star className="w-5 h-5" />
              내 건강사주 보기
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 차별점 */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            왜 <span className="text-orange-500">건강사주</span>인가요?
          </h2>
          <p className="text-gray-500">일반 사주풀이에 한의학 체질 분석을 융합했습니다</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {differentiators.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-100 to-purple-100 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* 상품 카드 */}
      <section className="bg-gray-50/80 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              나에게 맞는 리포트 선택
            </h2>
            <p className="text-gray-500">모든 리포트는 Claude AI가 개인 맞춤으로 작성합니다</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SAJU_PRODUCTS.map((product) => (
              <Link key={product.tier} to={`/health/saju/input?tier=${product.tier}`}>
                <SajuProductCard {...product} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 샘플 미리보기 (블러) */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            리포트 미리보기
          </h2>
          <p className="text-gray-500">실제 생성되는 리포트의 일부입니다</p>
        </div>
        <div className="relative bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm overflow-hidden">
          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <h3 className="text-lg font-bold text-orange-600">건강 체질 - 한의학 기반 정밀진단</h3>
            <p>
              분석 대상의 사주에서 <strong>토(土)</strong>와 <strong>금(金)</strong>의 기운이
              두드러지게 나타나며, 이는 사상의학에서 <strong>태음인(太陰人)</strong> 체질과
              높은 상관관계를 보입니다. 태음인은 간(肝)과 폐(肺)가 발달하고...
            </p>
            <p>
              특히 비장(脾)과 위(胃)의 기능이 강해 소화력이 좋은 편이지만,
              과식과 습담(濕痰)의 축적에 주의해야 합니다. 계절적으로는...
            </p>
          </div>
          {/* 블러 오버레이 */}
          <div className="absolute inset-0 top-32 bg-gradient-to-t from-white via-white/95 to-transparent flex items-end justify-center pb-8">
            <Link
              to="/health/saju/input"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-4 h-4" />
              전체 리포트 받기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="text-center">
          <Link
            to="/health/saju/input"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-bold rounded-full shadow-xl shadow-purple-200 hover:shadow-2xl hover:-translate-y-0.5 transition-all text-lg"
          >
            <Star className="w-5 h-5" />
            지금 내 건강사주 분석하기
            <ChevronRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            생년월일만 있으면 3분 안에 리포트를 받을 수 있어요
          </p>
        </div>
      </section>
    </div>
  )
}
