import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, ChevronRight, User, Calendar, Clock, Sparkles, Mail } from 'lucide-react'
import { useSajuStore, SajuTier } from '@/stores/sajuStore'
import { useAuthStore } from '@/stores/authStore'
import { analyzeProfile, formatPillarHanja, formatPillar, getPillarColors, ELEMENT_EMOJI } from '@/lib/saju'
import { ElementBar } from '@/components/health/ElementChart'
import SajuProductCard from '@/components/health/SajuProductCard'
import { SAJU_PRODUCTS, getSajuProduct } from '@/lib/saju-products'

const hourOptions = [
  { label: '모름', value: undefined },
  { label: '자시 (23~01)', value: 0 },
  { label: '축시 (01~03)', value: 2 },
  { label: '인시 (03~05)', value: 4 },
  { label: '묘시 (05~07)', value: 6 },
  { label: '진시 (07~09)', value: 8 },
  { label: '사시 (09~11)', value: 10 },
  { label: '오시 (11~13)', value: 12 },
  { label: '미시 (13~15)', value: 14 },
  { label: '신시 (15~17)', value: 16 },
  { label: '유시 (17~19)', value: 18 },
  { label: '술시 (19~21)', value: 20 },
  { label: '해시 (21~23)', value: 22 },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SajuInputPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setInputData = useSajuStore((s) => s.setInputData)
  const user = useAuthStore((s) => s.user)

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthHour, setBirthHour] = useState<number | undefined>(undefined)
  const [gender, setGender] = useState<string>('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [selectedTier, setSelectedTier] = useState<SajuTier>(
    (searchParams.get('tier') as SajuTier) || 'standard',
  )

  // 로그인한 사용자는 이메일 자동 기입 (이미 있음)
  const emailIsValid = !email || EMAIL_REGEX.test(email)
  const emailRequired = !user // 비로그인 사용자는 필수

  // 실시간 사주 미리보기
  const preview = useMemo(() => {
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
    try {
      return analyzeProfile(birthDate, birthHour)
    } catch {
      return null
    }
  }, [birthDate, birthHour])

  const isValid =
    name.trim().length >= 2 &&
    birthDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    emailIsValid &&
    (!emailRequired || email.trim().length > 0)

  const handleSubmit = () => {
    if (!isValid) return
    setInputData({
      name: name.trim(),
      birthDate,
      birthHour,
      gender: gender || undefined,
      tier: selectedTier,
      email: email.trim() || undefined,
    })
    navigate('/health/saju/payment')
  }

  const selectedProduct = getSajuProduct(selectedTier)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => navigate('/health/saju')}
        className="flex items-center gap-1 text-gray-500 hover:text-orange-500 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        사주 서비스
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-gray-900 mb-2">내 정보 입력</h1>
        <p className="text-gray-500 mb-8">사주 분석을 위한 기본 정보를 입력해주세요</p>

        {/* 입력 폼 */}
        <div className="space-y-5 mb-8">
          {/* 이름 */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <User className="w-4 h-4" />
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            />
          </div>

          {/* 생년월일 */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Calendar className="w-4 h-4" />
              생년월일 (양력)
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            />
          </div>

          {/* 출생 시간 */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Clock className="w-4 h-4" />
              출생 시간 (선택)
            </label>
            <select
              value={birthHour ?? ''}
              onChange={(e) =>
                setBirthHour(e.target.value === '' ? undefined : Number(e.target.value))
              }
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
            >
              {hourOptions.map((opt, i) => (
                <option key={i} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              시간을 모르면 '모름'으로 두셔도 분석 가능해요
            </p>
          </div>

          {/* 성별 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              성별 (선택)
            </label>
            <div className="flex gap-3">
              {['남', '여'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(gender === g ? '' : g)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    gender === g
                      ? 'border-orange-400 bg-orange-50 text-orange-600'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-orange-200'
                  }`}
                >
                  {g === '남' ? '남성' : '여성'}
                </button>
              ))}
            </div>
          </div>

          {/* 이메일 (비로그인 시 필수) */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Mail className="w-4 h-4" />
              이메일 {emailRequired ? <span className="text-orange-500">*</span> : '(선택)'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 ${
                email && !emailIsValid
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-gray-200 focus:ring-orange-300 focus:border-orange-300'
              }`}
            />
            <p className="text-xs text-gray-400 mt-1">
              {emailRequired
                ? '결제 후 리포트 링크를 이메일로 보내드려요'
                : '리포트를 이메일로도 받고 싶다면 입력해주세요'}
            </p>
            {email && !emailIsValid && (
              <p className="text-xs text-red-500 mt-1">올바른 이메일 형식이 아니에요</p>
            )}
          </div>
        </div>

        {/* 사주 미리보기 */}
        {preview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-8 border border-purple-100"
          >
            <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-1.5">
              <Star className="w-4 h-4" />
              사주 미리보기
            </h3>

            {/* 사주 4주 */}
            <div className="flex justify-center gap-4 mb-4">
              {[
                { label: '년주', pillar: preview.saju.year },
                { label: '월주', pillar: preview.saju.month },
                { label: '일주', pillar: preview.saju.day },
                ...(preview.saju.hour
                  ? [{ label: '시주', pillar: preview.saju.hour }]
                  : []),
              ].map(({ label, pillar }) => {
                const [stemColor, branchColor] = getPillarColors(pillar)
                return (
                  <div key={label} className="text-center">
                    <span className="text-[10px] text-gray-400 block mb-1">{label}</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xl font-black" style={{ color: stemColor === '#f8fafc' ? '#64748b' : stemColor }}>
                        {formatPillarHanja(pillar).charAt(0)}
                      </span>
                      <span className="text-xl font-black" style={{ color: branchColor === '#f8fafc' ? '#64748b' : branchColor }}>
                        {formatPillarHanja(pillar).charAt(1)}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">{formatPillar(pillar)}</span>
                  </div>
                )
              })}
            </div>

            {/* 오행 밸런스 바 */}
            <div className="mb-3">
              <ElementBar balance={preview.balance} />
            </div>

            {/* 간단 분석 */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-white/70 rounded-full text-gray-600">
                {preview.saju.zodiacEmoji} {preview.saju.zodiac}띠
              </span>
              <span className="px-2 py-1 bg-white/70 rounded-full text-gray-600">
                {ELEMENT_EMOJI[preview.health.dominantElement]} {preview.health.dominantElement} 강
              </span>
              <span className="px-2 py-1 bg-white/70 rounded-full text-gray-600">
                {ELEMENT_EMOJI[preview.health.weakElement]} {preview.health.weakElement} 약
              </span>
            </div>
          </motion.div>
        )}

        {/* 티어 선택 */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">리포트 선택</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SAJU_PRODUCTS.map((product) => (
              <SajuProductCard
                key={product.tier}
                {...product}
                isSelected={selectedTier === product.tier}
                onSelect={() => setSelectedTier(product.tier)}
              />
            ))}
          </div>
        </div>

        {/* 결제 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            isValid
              ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-xl shadow-purple-200 hover:shadow-2xl hover:-translate-y-0.5'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          {selectedProduct
            ? `${selectedProduct.name} 리포트 결제하기 (${selectedProduct.price.toLocaleString()}원)`
            : '결제하기'}
          <ChevronRight className="w-5 h-5" />
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          결제 후 AI가 즉시 리포트를 작성합니다 (3~5분 소요)
        </p>
      </motion.div>
    </div>
  )
}
