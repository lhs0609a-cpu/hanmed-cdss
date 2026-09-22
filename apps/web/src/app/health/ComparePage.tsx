/**
 * 궁합 비교 페이지
 * 두 사람의 체질/오행 궁합 분석
 */
import { useSEO } from '@/hooks/useSEO'
import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Heart,
  Search,
  X,
  RotateCcw,
  Users,
} from 'lucide-react'
import { searchCelebrities, type CelebrityRaw } from '@/data/celebrities'
import { CONSTITUTIONS, getCompatibilityFunPoints } from '@/data/constitutions'
import {
  analyzeProfile,
  calculateCompatibility,
  ELEMENT_EMOJI,
  ELEMENTS,
} from '@/lib/saju'

type PersonMode = 'celeb' | 'manual'
interface PersonData {
  mode: PersonMode
  celeb?: CelebrityRaw
  name?: string
  birthDate?: string
}

export default function ComparePage() {
  useSEO({
    title: '체질 궁합 비교',
    description: '두 사람의 생년월일로 오행 궁합과 체질 조합을 비교해 봅니다.',
    keywords: ['체질궁합', '오행', '사주궁합'],
  })

  const [person1, setPerson1] = useState<PersonData | null>(null)
  const [person2, setPerson2] = useState<PersonData | null>(null)
  const [showResult, setShowResult] = useState(false)

  const analysis1 = useMemo(() => {
    if (!person1) return null
    const bd = person1.celeb?.birthDate || person1.birthDate
    if (!bd) return null
    return analyzeProfile(bd, person1.celeb?.birthHour)
  }, [person1])

  const analysis2 = useMemo(() => {
    if (!person2) return null
    const bd = person2.celeb?.birthDate || person2.birthDate
    if (!bd) return null
    return analyzeProfile(bd, person2.celeb?.birthHour)
  }, [person2])

  const compatibility = useMemo(() => {
    if (!analysis1 || !analysis2) return null
    return calculateCompatibility(analysis1.balance, analysis2.balance)
  }, [analysis1, analysis2])

  const con1 = analysis1 ? CONSTITUTIONS[analysis1.health.constitution] : null
  const con2 = analysis2 ? CONSTITUTIONS[analysis2.health.constitution] : null

  const funPoints = useMemo(() => {
    if (!analysis1 || !analysis2) return []
    return getCompatibilityFunPoints(analysis1.health.constitution, analysis2.health.constitution)
  }, [analysis1, analysis2])

  const name1 = person1?.celeb?.name || person1?.name || '사람 1'
  const name2 = person2?.celeb?.name || person2?.name || '사람 2'

  const handleCompare = useCallback(() => {
    if (person1 && person2) setShowResult(true)
  }, [person1, person2])

  const handleReset = useCallback(() => {
    setPerson1(null)
    setPerson2(null)
    setShowResult(false)
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link
        to="/health/tmi"
        className="flex items-center gap-1 text-gray-500 hover:text-orange-500 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        체질 TMI
      </Link>

      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">💕</span>
        <h1 className="text-2xl font-black text-gray-900 mb-2">체질 궁합 비교</h1>
        <p className="text-gray-500 text-sm">두 사람의 오행 궁합을 분석해보세요</p>
      </div>

      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Person 1 */}
            <PersonInput
              label="첫 번째 사람"
              person={person1}
              onChange={setPerson1}
              emoji="👤"
            />

            {/* VS divider */}
            <div className="flex items-center justify-center my-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="mx-4 text-2xl">💕</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Person 2 */}
            <PersonInput
              label="두 번째 사람"
              person={person2}
              onChange={setPerson2}
              emoji="👤"
            />

            {/* Compare button */}
            <button
              onClick={handleCompare}
              disabled={!person1 || !person2}
              className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-xl shadow-lg shadow-pink-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Heart className="w-5 h-5" />
              궁합 분석하기
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Score */}
            {compatibility && (
              <>
                <div className="text-center bg-gradient-to-r from-pink-50 to-rose-50 rounded-3xl p-8 mb-6">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="text-center">
                      <div
                        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl"
                        style={{ backgroundColor: con1?.bgColor }}
                      >
                        {person1?.celeb?.emoji || '👤'}
                      </div>
                      <span className="text-sm font-bold text-gray-700 mt-1 block">{name1}</span>
                      {con1 && (
                        <span className="text-[10px] text-gray-500">{con1.name}</span>
                      )}
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.3 }}
                      className="text-3xl"
                    >
                      💕
                    </motion.div>
                    <div className="text-center">
                      <div
                        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl"
                        style={{ backgroundColor: con2?.bgColor }}
                      >
                        {person2?.celeb?.emoji || '👤'}
                      </div>
                      <span className="text-sm font-bold text-gray-700 mt-1 block">{name2}</span>
                      {con2 && (
                        <span className="text-[10px] text-gray-500">{con2.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Score circle */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
                    className="w-24 h-24 mx-auto rounded-full bg-white shadow-lg flex items-center justify-center mb-3"
                  >
                    <span className="text-3xl font-black bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
                      {compatibility.score}점
                    </span>
                  </motion.div>
                  <p className="text-sm text-gray-700 font-medium">{compatibility.description}</p>
                </div>

                {/* 상세 분석 */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-3">🔍 궁합 상세 분석</h2>
                  <div className="space-y-2">
                    {compatibility.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-xl text-sm text-gray-700">
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 오행 비교 */}
                {analysis1 && analysis2 && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">⚖️ 오행 비교</h2>
                    <div className="space-y-3">
                      {ELEMENTS.map(el => (
                        <div key={el} className="flex items-center gap-2">
                          <span className="text-sm w-6">{ELEMENT_EMOJI[el]}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                              <span>{name1}: {analysis1.balance[el]}%</span>
                              <span>{name2}: {analysis2.balance[el]}%</span>
                            </div>
                            <div className="flex h-3 gap-0.5">
                              <div
                                className="h-full rounded-l-full bg-pink-300"
                                style={{ width: `${analysis1.balance[el]}%` }}
                              />
                              <div
                                className="h-full rounded-r-full bg-blue-300"
                                style={{ width: `${analysis2.balance[el]}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 재미 포인트 */}
                {funPoints.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">😂 재미 포인트</h2>
                    <div className="space-y-2">
                      {funPoints.map((point, i) => (
                        <div key={i} className="p-3 bg-yellow-50 rounded-xl text-sm text-gray-700 border border-yellow-100">
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 체질별 팁 */}
                {con1 && con2 && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: con1.bgColor }}>
                      <h3 className="text-xs font-bold mb-1" style={{ color: con1.color }}>
                        {con1.emoji} {name1}에게 추천
                      </h3>
                      <p className="text-[10px] text-gray-600">
                        음식: {con1.goodFoods.slice(0, 3).join(', ')}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: con2.bgColor }}>
                      <h3 className="text-xs font-bold mb-1" style={{ color: con2.color }}>
                        {con2.emoji} {name2}에게 추천
                      </h3>
                      <p className="text-[10px] text-gray-600">
                        음식: {con2.goodFoods.slice(0, 3).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3 pb-8">
                  <button
                    onClick={handleReset}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    다른 궁합 보기
                  </button>
                  <Link
                    to="/health/tmi/my-type"
                    className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl text-center"
                  >
                    내 체질 진단하러 가기
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 개인 입력 컴포넌트 */
function PersonInput({
  label,
  person,
  onChange,
  emoji,
}: {
  label: string
  person: PersonData | null
  onChange: (p: PersonData | null) => void
  emoji: string
}) {
  const [mode, setMode] = useState<PersonMode>('celeb')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualDate, setManualDate] = useState('')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return searchCelebrities(searchQuery).slice(0, 8)
  }, [searchQuery])

  const handleSelectCeleb = useCallback((celeb: CelebrityRaw) => {
    onChange({ mode: 'celeb', celeb })
    setShowSearch(false)
    setSearchQuery('')
  }, [onChange])

  const handleManualSubmit = useCallback(() => {
    if (manualName && manualDate) {
      onChange({ mode: 'manual', name: manualName, birthDate: manualDate })
    }
  }, [manualName, manualDate, onChange])

  // 선택된 경우
  if (person) {
    const analysis = analyzeProfile(
      person.celeb?.birthDate || person.birthDate!,
      person.celeb?.birthHour
    )
    const con = CONSTITUTIONS[analysis.health.constitution]
    return (
      <div className="relative bg-white rounded-xl p-4 border border-gray-200">
        <button
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: con.bgColor }}
          >
            {person.celeb?.emoji || emoji}
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{person.celeb?.name || person.name}</h3>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${con.gradientFrom}, ${con.gradientTo})` }}
            >
              {con.emoji} {con.name}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <h3 className="text-sm font-bold text-gray-700 mb-3">{label}</h3>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('celeb')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === 'celeb'
              ? 'bg-orange-100 text-orange-600'
              : 'bg-gray-50 text-gray-500'
          }`}
        >
          <Users className="w-3 h-3 inline mr-1" />
          셀럽 선택
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === 'manual'
              ? 'bg-orange-100 text-orange-600'
              : 'bg-gray-50 text-gray-500'
          }`}
        >
          ✏️ 직접 입력
        </button>
      </div>

      {mode === 'celeb' ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="셀럽 이름 검색..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true) }}
              onFocus={() => setShowSearch(true)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCeleb(c)}
                  className="w-full px-3 py-2 text-left hover:bg-orange-50 flex items-center gap-2 text-sm"
                >
                  <span className="text-lg">{c.emoji}</span>
                  <div>
                    <span className="font-medium text-gray-800">{c.name}</span>
                    {c.group && <span className="text-xs text-gray-400 ml-1">{c.group}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="이름"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <input
            type="date"
            value={manualDate}
            onChange={e => setManualDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          {manualName && manualDate && (
            <button
              onClick={handleManualSubmit}
              className="w-full py-2 bg-orange-100 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
            >
              확인
            </button>
          )}
        </div>
      )}
    </div>
  )
}
