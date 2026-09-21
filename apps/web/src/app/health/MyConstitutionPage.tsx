/**
 * 내 체질 진단 페이지
 * 생년월일 + 간단 설문 → 체질 판정 + 결과
 */
import { useSEO } from '@/hooks/useSEO'
import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Heart,
  RotateCcw,
} from 'lucide-react'
import { CONSTITUTIONS } from '@/data/constitutions'
import { getCelebsByConstitution } from '@/data/celebrities'
import {
  analyzeProfile,
  formatPillar,
  formatPillarHanja,
  getPillarColors,
  type ConstitutionType,
} from '@/lib/saju'
import ElementChart, { ElementBar } from '@/components/health/ElementChart'
import ShareCard from '@/components/health/ShareCard'

type Step = 'input' | 'survey' | 'result'

interface SurveyAnswer {
  bodyType: number     // 0: 마름, 1: 보통, 2: 건장
  digestion: number    // 0: 약함, 1: 보통, 2: 강함
  temperature: number  // 0: 추위타는, 1: 보통, 2: 더위타는
  personality: number  // 0: 내성적, 1: 보통, 2: 외향적
  energy: number       // 0: 섬세, 1: 보통, 2: 활발
}

const surveyQuestions = [
  {
    key: 'bodyType' as const,
    question: '체형이 어떤 편인가요?',
    options: ['마른 편', '보통', '건장한 편'],
    emojis: ['🦴', '🧍', '💪'],
  },
  {
    key: 'digestion' as const,
    question: '소화력은 어떤 편인가요?',
    options: ['약한 편 (자주 체함)', '보통', '강한 편 (뭘 먹어도 OK)'],
    emojis: ['😣', '😐', '😋'],
  },
  {
    key: 'temperature' as const,
    question: '추위와 더위 중 뭘 더 못 참나요?',
    options: ['추위를 많이 탐', '보통', '더위를 많이 탐'],
    emojis: ['🥶', '😊', '🥵'],
  },
  {
    key: 'personality' as const,
    question: '성격은 어떤 편인가요?',
    options: ['내성적, 신중한 편', '보통', '외향적, 활발한 편'],
    emojis: ['🤔', '😌', '🤩'],
  },
  {
    key: 'energy' as const,
    question: '에너지 스타일은요?',
    options: ['차분하고 섬세한 편', '보통', '활발하고 적극적인 편'],
    emojis: ['🌊', '☁️', '⚡'],
  },
]

const defaultSurvey: SurveyAnswer = {
  bodyType: 1,
  digestion: 1,
  temperature: 1,
  personality: 1,
  energy: 1,
}

export default function MyConstitutionPage() {
  useSEO({
    title: '내 체질 알아보기',
    description: '생년월일을 입력하면 사주와 오행을 분석해 사상체질을 추론해 드립니다.',
    keywords: ['체질검사', '사상체질', '사주'],
  })

  const [step, setStep] = useState<Step>('input')
  const [birthDate, setBirthDate] = useState('')
  const [birthHour, setBirthHour] = useState<string>('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [currentQ, setCurrentQ] = useState(0)
  const [survey, setSurvey] = useState<SurveyAnswer>(defaultSurvey)

  // 분석 결과
  const analysis = useMemo(() => {
    if (!birthDate) return null
    const hour = birthHour ? parseInt(birthHour) : undefined
    return analyzeProfile(birthDate, hour)
  }, [birthDate, birthHour])

  // 설문 보정 체질
  const adjustedConstitution = useMemo((): ConstitutionType | null => {
    if (!analysis) return null

    // 기본: 사주 기반 체질
    let baseType = analysis.health.constitution

    // 설문 점수로 보정 (-2 ~ +2)
    const surveyScore = {
      taeyang: 0,
      soyang: 0,
      taeeum: 0,
      soeum: 0,
    }

    // 체형: 마름 → 태양/소음, 건장 → 태음
    if (survey.bodyType === 0) { surveyScore.taeyang += 1; surveyScore.soeum += 1 }
    if (survey.bodyType === 2) { surveyScore.taeeum += 2 }

    // 소화: 약함 → 소음, 강함 → 태음/소양
    if (survey.digestion === 0) { surveyScore.soeum += 2 }
    if (survey.digestion === 2) { surveyScore.taeeum += 1; surveyScore.soyang += 1 }

    // 온도: 추위 → 소음, 더위 → 태양/소양
    if (survey.temperature === 0) { surveyScore.soeum += 2 }
    if (survey.temperature === 2) { surveyScore.taeyang += 1; surveyScore.soyang += 1 }

    // 성격: 내성적 → 소음/태음, 외향적 → 태양/소양
    if (survey.personality === 0) { surveyScore.soeum += 1; surveyScore.taeeum += 1 }
    if (survey.personality === 2) { surveyScore.taeyang += 1; surveyScore.soyang += 1 }

    // 에너지: 차분 → 소음, 활발 → 소양
    if (survey.energy === 0) { surveyScore.soeum += 1 }
    if (survey.energy === 2) { surveyScore.soyang += 2 }

    // 가장 높은 설문 점수의 체질이 사주 체질과 다르면, 설문 점수가 충분히 높을 때만 보정
    const maxSurveyType = (Object.entries(surveyScore) as [ConstitutionType, number][])
      .sort(([, a], [, b]) => b - a)[0]

    if (maxSurveyType[1] >= 4 && maxSurveyType[0] !== baseType) {
      baseType = maxSurveyType[0]
    }

    return baseType
  }, [analysis, survey])

  const finalConstitution = adjustedConstitution
    ? CONSTITUTIONS[adjustedConstitution]
    : null

  // 같은 체질 셀럽 매칭 - O(1) precomputed index lookup
  const matchedCelebs = useMemo(() => {
    if (!adjustedConstitution) return []
    return getCelebsByConstitution(adjustedConstitution).slice(0, 6)
  }, [adjustedConstitution])

  const handleStartSurvey = useCallback(() => {
    if (!birthDate) return
    setCurrentQ(0)
    setSurvey(defaultSurvey)
    setStep('survey')
  }, [birthDate])

  const handleSurveyAnswer = useCallback((value: number) => {
    const q = surveyQuestions[currentQ]
    setSurvey(prev => ({ ...prev, [q.key]: value }))

    if (currentQ < surveyQuestions.length - 1) {
      setCurrentQ(prev => prev + 1)
    } else {
      setStep('result')
    }
  }, [currentQ])

  const handleReset = useCallback(() => {
    setStep('input')
    setBirthDate('')
    setBirthHour('')
    setGender('')
    setCurrentQ(0)
    setSurvey(defaultSurvey)
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <Link
        to="/health/tmi"
        className="flex items-center gap-1 text-gray-500 hover:text-orange-500 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        체질 TMI
      </Link>

      <AnimatePresence mode="wait">
        {/* Step 1: Input */}
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="text-center mb-8">
              <span className="text-5xl block mb-3">🔮</span>
              <h1 className="text-2xl font-black text-gray-900 mb-2">내 체질 알아보기</h1>
              <p className="text-gray-500">생년월일을 입력하면 사주와 체질을 분석해드려요</p>
            </div>

            <div className="space-y-4">
              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  생년월일 *
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-base"
                />
              </div>

              {/* Birth Hour */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태어난 시간 (선택)
                </label>
                <select
                  value={birthHour}
                  onChange={e => setBirthHour(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-base"
                >
                  <option value="">모름</option>
                  <option value="0">자시 (23:00~01:00)</option>
                  <option value="2">축시 (01:00~03:00)</option>
                  <option value="4">인시 (03:00~05:00)</option>
                  <option value="6">묘시 (05:00~07:00)</option>
                  <option value="8">진시 (07:00~09:00)</option>
                  <option value="10">사시 (09:00~11:00)</option>
                  <option value="12">오시 (11:00~13:00)</option>
                  <option value="14">미시 (13:00~15:00)</option>
                  <option value="16">신시 (15:00~17:00)</option>
                  <option value="18">유시 (17:00~19:00)</option>
                  <option value="20">술시 (19:00~21:00)</option>
                  <option value="22">해시 (21:00~23:00)</option>
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                <div className="flex gap-3">
                  {[
                    { value: 'male' as const, label: '남성', emoji: '👨' },
                    { value: 'female' as const, label: '여성', emoji: '👩' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGender(opt.value)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        gender === opt.value
                          ? 'border-orange-400 bg-orange-50 text-orange-600'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartSurvey}
                disabled={!birthDate}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-400 text-white font-bold rounded-xl shadow-lg shadow-orange-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                체질 분석 시작
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-xs text-gray-400 text-center">
                * 본 진단은 재미를 위한 것이며, 의학적 진단이 아닙니다.
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 2: Survey */}
        {step === 'survey' && (
          <motion.div
            key="survey"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>질문 {currentQ + 1} / {surveyQuestions.length}</span>
                <span>{Math.round(((currentQ + 1) / surveyQuestions.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-400 to-rose-400 rounded-full"
                  animate={{ width: `${((currentQ + 1) / surveyQuestions.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  {surveyQuestions[currentQ].question}
                </h2>
                <div className="space-y-3">
                  {surveyQuestions[currentQ].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSurveyAnswer(i)}
                      className="w-full py-4 px-6 bg-white border border-gray-200 rounded-xl text-left hover:border-orange-300 hover:bg-orange-50 transition-all flex items-center gap-3"
                    >
                      <span className="text-2xl">{surveyQuestions[currentQ].emojis[i]}</span>
                      <span className="text-sm font-medium text-gray-700">{opt}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {currentQ > 0 && (
              <button
                onClick={() => setCurrentQ(prev => prev - 1)}
                className="mt-4 text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                이전 질문
              </button>
            )}
          </motion.div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && analysis && finalConstitution && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Result Hero */}
            <div
              className="text-center rounded-3xl p-8 mb-6"
              style={{
                background: `linear-gradient(135deg, ${finalConstitution.gradientFrom}20, ${finalConstitution.gradientTo}20)`,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="text-6xl mb-3"
              >
                {finalConstitution.emoji}
              </motion.div>
              <h1 className="text-3xl font-black text-gray-900 mb-1">
                {finalConstitution.name}
              </h1>
              <p className="text-lg font-bold" style={{ color: finalConstitution.color }}>
                {finalConstitution.nickname}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {finalConstitution.description}
              </p>
            </div>

            {/* 사주 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
              <h2 className="text-lg font-bold text-gray-800 mb-3">나의 사주 팔자</h2>
              <div className="flex justify-center gap-4">
                {[
                  { label: '년주', pillar: analysis.saju.year },
                  { label: '월주', pillar: analysis.saju.month },
                  { label: '일주', pillar: analysis.saju.day },
                  ...(analysis.saju.hour ? [{ label: '시주', pillar: analysis.saju.hour }] : []),
                ].map(({ label, pillar }) => {
                  const [stemColor, branchColor] = getPillarColors(pillar)
                  return (
                    <div key={label} className="text-center">
                      <span className="text-[10px] text-gray-400 block mb-1">{label}</span>
                      <span className="text-xl font-black block" style={{ color: stemColor === '#f8fafc' ? '#64748b' : stemColor }}>
                        {formatPillarHanja(pillar).charAt(0)}
                      </span>
                      <span className="text-xl font-black block" style={{ color: branchColor === '#f8fafc' ? '#64748b' : branchColor }}>
                        {formatPillarHanja(pillar).charAt(1)}
                      </span>
                      <span className="text-xs text-gray-500 mt-1 block">{formatPillar(pillar)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="text-center mt-3 text-sm text-gray-500">
                {analysis.saju.zodiacEmoji} {analysis.saju.zodiac}띠
              </div>
            </div>

            {/* 오행 차트 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
              <h2 className="text-lg font-bold text-gray-800 mb-3">오행 밸런스</h2>
              <div className="flex justify-center">
                <div className="hidden sm:block">
                  <ElementChart balance={analysis.balance} size={200} />
                </div>
                <div className="sm:hidden w-full">
                  <ElementBar balance={analysis.balance} />
                </div>
              </div>
            </div>

            {/* 같은 체질 셀럽 */}
            {matchedCelebs.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
                <h2 className="text-lg font-bold text-gray-800 mb-3">
                  {finalConstitution.emoji} 나와 같은 {finalConstitution.name} 셀럽!
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {matchedCelebs.map(c => (
                    <Link
                      key={c.id}
                      to={`/health/tmi/${c.id}`}
                      className="text-center p-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: finalConstitution.bgColor }}
                      >
                        {c.emoji}
                      </div>
                      <span className="text-xs font-medium text-gray-700 mt-1 block truncate">
                        {c.name}
                      </span>
                      {c.group && (
                        <span className="text-[10px] text-gray-400 block truncate">{c.group}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 건강 팁 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
              <h2 className="text-lg font-bold text-gray-800 mb-3">💡 {finalConstitution.name} 건강 팁</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-xl">
                  <h3 className="text-xs font-bold text-green-700 mb-1">👍 좋은 음식</h3>
                  <p className="text-xs text-green-600">{finalConstitution.goodFoods.slice(0, 5).join(', ')}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <h3 className="text-xs font-bold text-red-700 mb-1">👎 피할 음식</h3>
                  <p className="text-xs text-red-600">{finalConstitution.badFoods.slice(0, 4).join(', ')}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <h3 className="text-xs font-bold text-blue-700 mb-1">🏃 추천 운동</h3>
                  <p className="text-xs text-blue-600">{finalConstitution.exercises.join(', ')}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <h3 className="text-xs font-bold text-amber-700 mb-1">⚠️ 건강 주의</h3>
                  <p className="text-xs text-amber-600">{finalConstitution.healthTips[0]}</p>
                </div>
              </div>
            </div>

            {/* 공유 */}
            <div className="mb-6">
              <ShareCard
                name="나"
                constitution={adjustedConstitution!}
                balance={analysis.balance}
                subtitle={
                  matchedCelebs.length > 0
                    ? `${matchedCelebs[0].name}과 같은 ${finalConstitution.name}!`
                    : `${finalConstitution.name} - ${finalConstitution.nickname}`
                }
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pb-8">
              <Link
                to="/health/tmi/compare"
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-400 text-white font-bold rounded-xl text-center flex items-center justify-center gap-2"
              >
                <Heart className="w-5 h-5" />
                궁합 비교하러 가기
              </Link>
              <button
                onClick={handleReset}
                className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                다시 진단하기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
