import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  Pill,
  Activity,
  Calendar,
  ChevronDown,
  BookOpen,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react'

// 개인 치험례 스토리지 키
const MY_CASES_STORAGE_KEY = 'ongojishin_my_cases'

interface MyCase {
  id: string
  createdAt: Date
  updatedAt: Date
  patientAge?: number
  patientGender?: 'M' | 'F'
  patientConstitution?: string
  chiefComplaint: string
  symptoms: string[]
  diagnosis?: string
  byeonjeung?: string
  formulaName: string
  herbs: Array<{ name: string; amount: string }>
  treatmentDuration?: string
  outcome?: '완치' | '호전' | '무효' | '진행중'
  notes?: string
}

interface StatCard {
  label: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: string
}

export default function StatisticsDashboardPage() {
  const [cases, setCases] = useState<MyCase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'all' | 'year' | 'month' | 'week'>('all')

  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = () => {
    setIsLoading(true)
    try {
      const saved = localStorage.getItem(MY_CASES_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setCases(parsed.map((c: MyCase) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })))
      }
    } catch (error) {
      console.error('Failed to load cases:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 기간 필터링
  const filteredCases = cases.filter(c => {
    const now = new Date()
    const caseDate = new Date(c.createdAt)

    switch (timeRange) {
      case 'week':
        return (now.getTime() - caseDate.getTime()) <= 7 * 24 * 60 * 60 * 1000
      case 'month':
        return (now.getTime() - caseDate.getTime()) <= 30 * 24 * 60 * 60 * 1000
      case 'year':
        return (now.getTime() - caseDate.getTime()) <= 365 * 24 * 60 * 60 * 1000
      default:
        return true
    }
  })

  // 통계 계산
  const stats = {
    totalCases: filteredCases.length,
    completedCases: filteredCases.filter(c => c.outcome === '완치' || c.outcome === '호전').length,
    successRate: filteredCases.length > 0
      ? Math.round((filteredCases.filter(c => c.outcome === '완치' || c.outcome === '호전').length / filteredCases.length) * 100)
      : 0,
    uniqueFormulas: new Set(filteredCases.map(c => c.formulaName)).size,
    malePatients: filteredCases.filter(c => c.patientGender === 'M').length,
    femalePatients: filteredCases.filter(c => c.patientGender === 'F').length,
    avgAge: filteredCases.filter(c => c.patientAge).length > 0
      ? Math.round(filteredCases.filter(c => c.patientAge).reduce((acc, c) => acc + (c.patientAge || 0), 0) / filteredCases.filter(c => c.patientAge).length)
      : 0,
  }

  // 처방 빈도
  const formulaFrequency = filteredCases.reduce((acc, c) => {
    acc[c.formulaName] = (acc[c.formulaName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topFormulas = Object.entries(formulaFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // 증상 빈도
  const symptomFrequency: Record<string, number> = {}
  filteredCases.forEach(c => {
    c.symptoms.forEach(s => {
      symptomFrequency[s] = (symptomFrequency[s] || 0) + 1
    })
  })

  const topSymptoms = Object.entries(symptomFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // 체질별 분포
  const constitutionDistribution = filteredCases.reduce((acc, c) => {
    const const_name = c.patientConstitution || '미상'
    acc[const_name] = (acc[const_name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 결과 분포
  const outcomeDistribution = filteredCases.reduce((acc, c) => {
    const outcome = c.outcome || '미정'
    acc[outcome] = (acc[outcome] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 월별 추이
  const monthlyTrend = filteredCases.reduce((acc, c) => {
    const month = c.createdAt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' })
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statCards: StatCard[] = [
    {
      label: '총 치험례',
      value: stats.totalCases,
      icon: <BookOpen className="h-5 w-5" />,
      color: 'bg-blue-500',
    },
    {
      label: '호전/완치',
      value: stats.completedCases,
      icon: <Target className="h-5 w-5" />,
      color: 'bg-green-500',
    },
    {
      label: '성공률',
      value: `${stats.successRate}%`,
      icon: <Award className="h-5 w-5" />,
      color: 'bg-amber-500',
    },
    {
      label: '사용 처방',
      value: stats.uniqueFormulas,
      icon: <Pill className="h-5 w-5" />,
      color: 'bg-purple-500',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-500" />
            진료 통계 대시보드
          </h1>
          <p className="mt-1 text-gray-500">
            내 진료 데이터를 한눈에 분석하세요
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1">
          {[
            { value: 'all', label: '전체' },
            { value: 'year', label: '1년' },
            { value: 'month', label: '1개월' },
            { value: 'week', label: '1주' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value as typeof timeRange)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === option.value
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* No Data State */}
      {cases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            아직 통계 데이터가 없습니다
          </h3>
          <p className="text-gray-500 mb-6">
            "내 치험례"에서 치험례를 추가하면 통계가 자동으로 생성됩니다
          </p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 ${stat.color} rounded-xl text-white`}>
                    {stat.icon}
                  </div>
                  {stat.change !== undefined && (
                    <span className={`flex items-center text-sm font-medium ${
                      stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      {Math.abs(stat.change)}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Formulas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Pill className="h-5 w-5 text-purple-500" />
                자주 사용한 처방
              </h2>
              {topFormulas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {topFormulas.map(([formula, count], idx) => (
                    <div key={formula} className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{formula}</span>
                          <span className="text-sm text-gray-500">{count}회</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                            style={{ width: `${(count / topFormulas[0][1]) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Symptoms */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                주요 호소 증상
              </h2>
              {topSymptoms.length === 0 ? (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {topSymptoms.map(([symptom, count], idx) => (
                    <div key={symptom} className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        idx === 0 ? 'bg-blue-100 text-blue-700' :
                        idx === 1 ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{symptom}</span>
                          <span className="text-sm text-gray-500">{count}회</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                            style={{ width: `${(count / topSymptoms[0][1]) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outcome Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                치료 결과 분포
              </h2>
              <div className="space-y-3">
                {Object.entries(outcomeDistribution).map(([outcome, count]) => {
                  const colors: Record<string, string> = {
                    '완치': 'bg-green-500',
                    '호전': 'bg-emerald-400',
                    '진행중': 'bg-blue-400',
                    '무효': 'bg-gray-400',
                    '미정': 'bg-gray-300',
                  }
                  return (
                    <div key={outcome} className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${colors[outcome] || 'bg-gray-400'}`} />
                      <span className="flex-1 font-medium text-gray-700">{outcome}</span>
                      <span className="text-sm text-gray-500">{count}건</span>
                      <span className="text-sm font-medium text-gray-900">
                        {Math.round((count / filteredCases.length) * 100)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Patient Demographics */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                환자 분포
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Gender */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-2">성별</p>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.malePatients}</p>
                      <p className="text-xs text-gray-500">남성</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-pink-500">{stats.femalePatients}</p>
                      <p className="text-xs text-gray-500">여성</p>
                    </div>
                  </div>
                </div>

                {/* Average Age */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-2">평균 연령</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgAge}세</p>
                </div>

                {/* Constitution */}
                <div className="col-span-2 bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-3">체질 분포</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(constitutionDistribution).map(([const_name, count]) => (
                      <span
                        key={const_name}
                        className="px-3 py-1.5 bg-white rounded-lg text-sm border border-gray-200"
                      >
                        {const_name} <span className="font-bold text-indigo-600">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Trend */}
          {Object.keys(monthlyTrend).length > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-500" />
                월별 추이
              </h2>
              <div className="flex items-end gap-2 h-40">
                {Object.entries(monthlyTrend).slice(-12).map(([month, count]) => {
                  const maxCount = Math.max(...Object.values(monthlyTrend))
                  const heightPercent = (count / maxCount) * 100
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-900">{count}</span>
                      <div
                        className="w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-lg transition-all"
                        style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                      />
                      <span className="text-[10px] text-gray-500 truncate w-full text-center">
                        {month.split(' ')[1] || month}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
