/**
 * 셀럽 상세 페이지
 * 사주 팔자 + 오행 차트 + 체질 분석 + 재미 요소
 */
import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  Star,
  ChevronRight,
  Zap,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { getCelebrityById, CATEGORY_INFO, getCelebsByConstitution } from '@/data/celebrities'
import { CONSTITUTIONS } from '@/data/constitutions'
import {
  analyzeProfile,
  formatPillar,
  formatPillarHanja,
  getPillarColors,
  getAge,
  generateFunFacts,
  generateConstitutionEvidence,
  ELEMENT_EMOJI,
} from '@/lib/saju'
import ElementChart, { ElementBar } from '@/components/health/ElementChart'
import ShareCard from '@/components/health/ShareCard'

export default function CelebDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const celeb = useMemo(() => getCelebrityById(id || ''), [id])

  if (!celeb) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <span className="text-4xl block mb-4">😕</span>
        <h2 className="text-xl font-bold text-gray-800 mb-2">셀럽을 찾을 수 없어요</h2>
        <Link to="/health/tmi" className="text-orange-500 font-medium hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  const analysis = useMemo(
    () => analyzeProfile(celeb.birthDate, celeb.birthHour),
    [celeb.birthDate, celeb.birthHour]
  )

  const { saju, balance, health, risk } = analysis
  const constitution = CONSTITUTIONS[health.constitution]
  const funFacts = useMemo(
    () => generateFunFacts(health.constitution, balance, celeb.name),
    [health.constitution, balance, celeb.name]
  )
  const evidence = useMemo(
    () => generateConstitutionEvidence(health.constitution, balance, celeb.name),
    [health.constitution, balance, celeb.name]
  )

  // 같은 체질 셀럽 - O(1) precomputed index lookup
  const sameCelebs = useMemo(() => {
    return getCelebsByConstitution(health.constitution)
      .filter(c => c.id !== celeb.id)
      .slice(0, 8)
  }, [celeb.id, health.constitution])

  const catInfo = CATEGORY_INFO[celeb.category]

  // 사주 주(柱) 배열
  const pillars = [
    { label: '년주', pillar: saju.year },
    { label: '월주', pillar: saju.month },
    { label: '일주', pillar: saju.day },
    ...(saju.hour ? [{ label: '시주', pillar: saju.hour }] : []),
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-gray-500 hover:text-orange-500 mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        뒤로가기
      </button>

      {/* Profile Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        {celeb.imageUrl ? (
          <img
            src={celeb.imageUrl}
            alt={celeb.name}
            className="w-24 h-24 mx-auto rounded-full object-cover mb-1"
            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
          />
        ) : null}
        <div
          className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-1${celeb.imageUrl ? ' hidden' : ''}`}
          style={{ backgroundColor: constitution.bgColor }}
        >
          {celeb.emoji}
        </div>
        {celeb.imageUrl && (
          <p className="text-[10px] text-gray-300 mb-2">
            Photo: Wikimedia Commons (CC BY-SA)
          </p>
        )}
        <h1 className="text-2xl font-black text-gray-900">{celeb.name}</h1>
        {celeb.nameEn && (
          <p className="text-sm text-gray-400">{celeb.nameEn}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <span
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${constitution.gradientFrom}, ${constitution.gradientTo})` }}
          >
            {constitution.emoji} {constitution.name} - {constitution.nickname}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {catInfo.emoji} {catInfo.label}
          </span>
          {celeb.group && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {celeb.group}
            </span>
          )}
        </div>

        {/* Basic info */}
        <div className="flex justify-center gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {celeb.birthDate}
          </span>
          <span>{saju.zodiacEmoji} {saju.zodiac}띠</span>
          {getAge(celeb.birthDate) > 0 && getAge(celeb.birthDate) < 200 && (
            <span>만 {getAge(celeb.birthDate)}세</span>
          )}
        </div>
      </motion.section>

      {/* 사주 팔자 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 border border-gray-100 mb-4"
      >
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-orange-500" />
          사주 팔자
        </h2>
        <div className="flex justify-center gap-4">
          {pillars.map(({ label, pillar }) => {
            const [stemColor, branchColor] = getPillarColors(pillar)
            return (
              <div key={label} className="text-center">
                <span className="text-[10px] text-gray-400 block mb-1">{label}</span>
                <div className="flex flex-col gap-1">
                  <span
                    className="text-2xl font-black"
                    style={{ color: stemColor === '#f8fafc' ? '#64748b' : stemColor }}
                  >
                    {formatPillarHanja(pillar).charAt(0)}
                  </span>
                  <span
                    className="text-2xl font-black"
                    style={{ color: branchColor === '#f8fafc' ? '#64748b' : branchColor }}
                  >
                    {formatPillarHanja(pillar).charAt(1)}
                  </span>
                </div>
                <span className="text-xs text-gray-500 mt-1 block">{formatPillar(pillar)}</span>
              </div>
            )
          })}
        </div>
      </motion.section>

      {/* 오행 밸런스 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-5 border border-gray-100 mb-4"
      >
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          오행 밸런스
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="hidden md:block">
            <ElementChart balance={balance} size={200} />
          </div>
          <div className="md:hidden w-full">
            <ElementBar balance={balance} />
          </div>
          <div className="flex-1 space-y-2 text-sm">
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: constitution.bgColor }}>
              <ShieldCheck className="w-4 h-4" style={{ color: constitution.color }} />
              <span className="text-gray-700">
                <strong>강한 기운:</strong> {ELEMENT_EMOJI[health.dominantElement]} {health.dominantElement} → {health.strongOrgan} 발달
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-gray-700">
                <strong>약한 기운:</strong> {ELEMENT_EMOJI[health.weakElement]} {health.weakElement} → {health.weakOrgan} 관리 필요
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-gray-700">
                <strong>용신(보충 오행):</strong> {ELEMENT_EMOJI[health.luckyElement]} {health.luckyElement}
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 이래서 ○○인 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-5 border border-gray-100 mb-4"
      >
        <h2 className="text-lg font-bold text-gray-800 mb-3">
          이래서 {constitution.name}! {constitution.emoji}
        </h2>
        <ul className="space-y-2">
          {evidence.map((ev, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-orange-400 mt-0.5">•</span>
              {ev}
            </li>
          ))}
        </ul>
      </motion.section>

      {/* 체질이 준 선물 / 숙제 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-green-50 rounded-2xl p-4 border border-green-100"
        >
          <h3 className="text-sm font-bold text-green-700 mb-2">🎁 체질이 준 선물</h3>
          <ul className="space-y-1">
            {constitution.strengths.slice(0, 3).map((s, i) => (
              <li key={i} className="text-xs text-green-600">• {s}</li>
            ))}
          </ul>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-amber-50 rounded-2xl p-4 border border-amber-100"
        >
          <h3 className="text-sm font-bold text-amber-700 mb-2">📝 체질이 준 숙제</h3>
          <ul className="space-y-1">
            {constitution.weaknesses.slice(0, 3).map((w, i) => (
              <li key={i} className="text-xs text-amber-600">• {w}</li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* 재미 팩트 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-5 border border-gray-100 mb-4"
      >
        <h2 className="text-lg font-bold text-gray-800 mb-3">💡 TMI</h2>
        <div className="space-y-2">
          {funFacts.map((fact, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-xl text-sm text-gray-700">
              {fact}
            </div>
          ))}
        </div>
      </motion.section>

      {/* 올해 건강 운세 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl p-5 mb-4"
        style={{
          background: `linear-gradient(135deg, ${constitution.gradientFrom}15, ${constitution.gradientTo}15)`,
          border: `1px solid ${constitution.color}20`,
        }}
      >
        <h2 className="text-lg font-bold text-gray-800 mb-2">🔮 2026년 건강 운세</h2>
        <p className="text-sm text-gray-700 leading-relaxed">{health.yearFortune}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs px-2 py-1 bg-white/60 rounded-full text-gray-600">
            추천 음식: {constitution.goodFoods.slice(0, 3).join(', ')}
          </span>
          <span className="text-xs px-2 py-1 bg-white/60 rounded-full text-gray-600">
            추천 운동: {constitution.exercises.slice(0, 2).join(', ')}
          </span>
        </div>
      </motion.section>

      {/* 2026년 건강 위험도 분석 */}
      {risk.level !== 'safe' && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.37 }}
          className="rounded-2xl p-5 mb-4 border"
          style={{
            backgroundColor:
              risk.level === 'danger' ? '#fef2f2' :
              risk.level === 'warning' ? '#fff7ed' : '#fefce8',
            borderColor:
              risk.level === 'danger' ? '#fecaca' :
              risk.level === 'warning' ? '#fed7aa' : '#fef08a',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle
              className="w-5 h-5"
              style={{
                color:
                  risk.level === 'danger' ? '#ef4444' :
                  risk.level === 'warning' ? '#f97316' : '#eab308',
              }}
            />
            <h2 className="text-lg font-bold text-gray-800">2026년 건강 주의보</h2>
            <span
              className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold text-white"
              style={{
                backgroundColor:
                  risk.level === 'danger' ? '#ef4444' :
                  risk.level === 'warning' ? '#f97316' : '#eab308',
              }}
            >
              위험도 {risk.score}점
            </span>
          </div>

          {/* 충/형/파/해 뱃지 */}
          {risk.conflicts.length > 0 && (
            <div className="space-y-2 mb-3">
              {risk.conflicts.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 bg-white/70 rounded-xl text-sm"
                >
                  <span
                    className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{
                      backgroundColor:
                        c.type === '충' ? '#ef4444' :
                        c.type === '형' ? '#f97316' :
                        c.type === '파' ? '#eab308' : '#a855f7',
                    }}
                  >
                    {c.type}
                  </span>
                  <div>
                    <span className="text-gray-400 text-xs">{c.pillarLabel}</span>
                    <p className="text-gray-700">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 건강 주의사항 카드 */}
          {risk.healthRisks.length > 0 && (
            <div className="space-y-2 mb-3">
              {risk.healthRisks.map((hr, i) => (
                <div key={i} className="p-3 bg-white/70 rounded-xl">
                  <p className="text-sm font-bold text-gray-800 mb-1">{hr.organ}</p>
                  <p className="text-xs text-gray-600 mb-1">{hr.reason}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-green-500" />
                    {hr.advice}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-600 leading-relaxed">{risk.overallAdvice}</p>
        </motion.section>
      )}

      {/* 같은 체질 셀럽 */}
      {sameCelebs.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-4"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            {constitution.emoji} 같은 {constitution.name} 셀럽
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {sameCelebs.map(c => (
              <Link
                key={c.id}
                to={`/health/tmi/${c.id}`}
                className="flex-shrink-0 w-20 text-center"
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="w-14 h-14 mx-auto rounded-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
                  />
                ) : null}
                <div
                  className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl${c.imageUrl ? ' hidden' : ''}`}
                  style={{ backgroundColor: constitution.bgColor }}
                >
                  {c.emoji}
                </div>
                <span className="text-xs font-medium text-gray-700 mt-1 block truncate">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* 공유 카드 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mb-8"
      >
        <h2 className="text-lg font-bold text-gray-800 mb-3">📤 공유하기</h2>
        <ShareCard
          name={celeb.name}
          constitution={health.constitution}
          balance={balance}
          subtitle={`${celeb.name}은(는) ${constitution.name}! ${constitution.nickname} 타입`}
        />
      </motion.section>

      {/* 건강사주 프리미엄 CTA */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-6"
      >
        <Link
          to="/health/saju/input"
          className="block rounded-2xl p-5 md:p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7c3aed15, #f9731615, #f43f5e15)',
            border: '1px solid #7c3aed20',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-200/30 to-transparent rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                AI 프리미엄
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              나만의 건강사주 리포트
            </h3>
            <p className="text-sm text-gray-500 mb-3 leading-relaxed">
              한의학 x 사주 융합 분석으로 체질, 건강, 운세를 AI가 심층 분석해드려요
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-purple-600">
              리포트 받기
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </Link>
      </motion.section>

      {/* CTA */}
      <div className="text-center pb-8">
        <Link
          to="/health/tmi/my-type"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-400 text-white font-bold rounded-full shadow-lg shadow-orange-200 hover:shadow-xl transition-all"
        >
          <Sparkles className="w-5 h-5" />
          나도 같은 체질인지 확인하기
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
