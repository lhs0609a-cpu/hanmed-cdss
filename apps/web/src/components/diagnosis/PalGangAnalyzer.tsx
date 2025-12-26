import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  PalGangAnalysis,
  InteriorExteriorType,
  ColdHeatType,
  DeficiencyExcessType,
} from '@/types'
import { Activity, Thermometer, Layers, Scale, Info, ChevronDown, ChevronUp } from 'lucide-react'

// 팔강변증 결과 라벨
const PALGANG_LABELS = {
  yinYang: {
    yang: '양증(陽證)',
    yin: '음증(陰證)',
    yang_deficiency: '허양(虛陽)',
    true_yin: '진음(眞陰)',
  },
  interiorExterior: {
    exterior: '표증(表證)',
    interior: '이증(裏證)',
    half_exterior_half_interior: '반표반이(半表半裏)',
  },
  coldHeat: {
    heat: '열증(熱證)',
    cold: '한증(寒證)',
    deficiency_heat: '허열(虛熱)',
    deficiency_cold: '허한(虛寒)',
  },
  deficiencyExcess: {
    excess: '실증(實證)',
    deficiency: '허증(虛證)',
    mixed: '허실협잡(虛實挾雜)',
  },
}

// 팔강별 설명
const PALGANG_DESCRIPTIONS = {
  yinYang: {
    title: '음양(陰陽)',
    description: '질병의 총체적 성질을 파악합니다.',
    options: [
      { value: 'yang', label: '양증', desc: '발열, 안면홍조, 성질 급함, 맥삭' },
      { value: 'yin', label: '음증', desc: '오한, 안면창백, 무기력, 맥지' },
      { value: 'yang_deficiency', label: '허양', desc: '음허로 인한 상화항진' },
      { value: 'true_yin', label: '진음', desc: '진음 부족, 음액 손상' },
    ],
  },
  interiorExterior: {
    title: '표리(表裏)',
    description: '병위(病位)의 깊이를 파악합니다.',
    options: [
      { value: 'exterior', label: '표증', desc: '오한발열, 두통, 맥부' },
      { value: 'interior', label: '이증', desc: '장부병변, 고열, 복통' },
      { value: 'half_exterior_half_interior', label: '반표반이', desc: '왕래한열, 흉협고만' },
    ],
  },
  coldHeat: {
    title: '한열(寒熱)',
    description: '질병의 한열 성질을 파악합니다.',
    options: [
      { value: 'heat', label: '열증', desc: '발열, 구갈, 면적, 맥삭' },
      { value: 'cold', label: '한증', desc: '오한, 지냉, 면백, 맥지' },
      { value: 'deficiency_heat', label: '허열', desc: '조열, 도한, 음허화왕' },
      { value: 'deficiency_cold', label: '허한', desc: '자한, 소변청장, 양허' },
    ],
  },
  deficiencyExcess: {
    title: '허실(虛實)',
    description: '정기와 사기의 상태를 파악합니다.',
    options: [
      { value: 'excess', label: '실증', desc: '사기왕성, 복통거안, 맥유력' },
      { value: 'deficiency', label: '허증', desc: '정기허약, 권태, 맥무력' },
      { value: 'mixed', label: '허실협잡', desc: '허증과 실증이 혼재' },
    ],
  },
}

interface PalGangAnalyzerProps {
  initialAnalysis?: PalGangAnalysis
  onAnalysisChange?: (analysis: PalGangAnalysis) => void
  readOnly?: boolean
  className?: string
}

export function PalGangAnalyzer({
  initialAnalysis,
  onAnalysisChange,
  readOnly = false,
  className,
}: PalGangAnalyzerProps) {
  const [analysis, setAnalysis] = useState<Partial<PalGangAnalysis>>({
    yinYang: initialAnalysis?.yinYang || { type: 'yang', label: '양증', confidence: 0, indicators: [] },
    interiorExterior: initialAnalysis?.interiorExterior || { type: 'exterior', label: '표증', confidence: 0, indicators: [] },
    coldHeat: initialAnalysis?.coldHeat || { type: 'heat', label: '열증', confidence: 0, indicators: [] },
    deficiencyExcess: initialAnalysis?.deficiencyExcess || { type: 'excess', label: '실증', confidence: 0, indicators: [] },
  })

  const [expandedSection, setExpandedSection] = useState<string | null>('yinYang')

  const handleOptionSelect = (
    category: 'yinYang' | 'interiorExterior' | 'coldHeat' | 'deficiencyExcess',
    value: string
  ) => {
    if (readOnly) return

    const label = PALGANG_LABELS[category][value as keyof typeof PALGANG_LABELS[typeof category]] || value

    const newAnalysis = {
      ...analysis,
      [category]: {
        type: value,
        label,
        confidence: 80,
        indicators: [],
      },
    }

    setAnalysis(newAnalysis)
    onAnalysisChange?.(newAnalysis as PalGangAnalysis)
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'yinYang':
        return <Scale className="h-5 w-5" />
      case 'interiorExterior':
        return <Layers className="h-5 w-5" />
      case 'coldHeat':
        return <Thermometer className="h-5 w-5" />
      case 'deficiencyExcess':
        return <Activity className="h-5 w-5" />
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'yinYang':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'interiorExterior':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'coldHeat':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'deficiencyExcess':
        return 'text-teal-600 bg-teal-50 border-teal-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const renderCategory = (
    category: 'yinYang' | 'interiorExterior' | 'coldHeat' | 'deficiencyExcess'
  ) => {
    const config = PALGANG_DESCRIPTIONS[category]
    const currentValue = analysis[category]?.type
    const isExpanded = expandedSection === category

    return (
      <div
        key={category}
        className={cn(
          'border rounded-xl overflow-hidden transition-all',
          getCategoryColor(category)
        )}
      >
        {/* Header */}
        <button
          onClick={() => toggleSection(category)}
          className="w-full px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {getCategoryIcon(category)}
            <div className="text-left">
              <h3 className="font-bold">{config.title}</h3>
              <p className="text-xs opacity-70">{config.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentValue && (
              <span className="text-sm font-medium px-2 py-1 bg-white/50 rounded-lg">
                {PALGANG_LABELS[category][currentValue as keyof typeof PALGANG_LABELS[typeof category]]}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {/* Options */}
        {isExpanded && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {config.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(category, option.value)}
                  disabled={readOnly}
                  className={cn(
                    'p-3 rounded-lg text-left transition-all border',
                    currentValue === option.value
                      ? 'bg-white border-current shadow-sm'
                      : 'bg-white/30 border-transparent hover:bg-white/50',
                    readOnly && 'cursor-default'
                  )}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 종합 분석 결과
  const getSummary = () => {
    const parts = []
    if (analysis.interiorExterior?.type) {
      parts.push(PALGANG_LABELS.interiorExterior[analysis.interiorExterior.type as InteriorExteriorType] || '')
    }
    if (analysis.coldHeat?.type) {
      parts.push(PALGANG_LABELS.coldHeat[analysis.coldHeat.type as ColdHeatType] || '')
    }
    if (analysis.deficiencyExcess?.type) {
      parts.push(PALGANG_LABELS.deficiencyExcess[analysis.deficiencyExcess.type as DeficiencyExcessType] || '')
    }
    return parts.join(' + ')
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Title */}
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-bold text-gray-900">팔강변증 분석</h2>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {renderCategory('yinYang')}
        {renderCategory('interiorExterior')}
        {renderCategory('coldHeat')}
        {renderCategory('deficiencyExcess')}
      </div>

      {/* Summary */}
      <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">종합 변증</h3>
        <p className="text-lg font-bold text-gray-900">{getSummary() || '변증을 선택해주세요'}</p>
      </div>
    </div>
  )
}

// 읽기 전용 요약 뷰
interface PalGangSummaryProps {
  analysis: PalGangAnalysis
  className?: string
}

export function PalGangSummary({ analysis, className }: PalGangSummaryProps) {
  const items = [
    { label: '음양', value: analysis.yinYang?.label, color: 'bg-purple-100 text-purple-800' },
    { label: '표리', value: analysis.interiorExterior?.label, color: 'bg-blue-100 text-blue-800' },
    { label: '한열', value: analysis.coldHeat?.label, color: 'bg-orange-100 text-orange-800' },
    { label: '허실', value: analysis.deficiencyExcess?.label, color: 'bg-teal-100 text-teal-800' },
  ]

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => (
        item.value && (
          <span
            key={item.label}
            className={cn('px-3 py-1.5 rounded-full text-sm font-medium', item.color)}
          >
            {item.label}: {item.value}
          </span>
        )
      ))}
    </div>
  )
}

// 팔강변증 다이어그램
interface PalGangDiagramProps {
  analysis: PalGangAnalysis
  className?: string
}

export function PalGangDiagram({ analysis, className }: PalGangDiagramProps) {
  return (
    <div className={cn('relative w-full max-w-md mx-auto', className)}>
      <svg viewBox="0 0 200 200" className="w-full h-auto">
        {/* Background circle */}
        <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="2" />

        {/* Quadrants */}
        {/* 음양 (top) */}
        <path
          d="M 100 10 A 90 90 0 0 1 190 100 L 100 100 Z"
          fill={analysis.yinYang?.type === 'yang' ? '#f3e8ff' : '#f5f5f5'}
          stroke="#a855f7"
          strokeWidth="2"
        />
        <text x="140" y="60" textAnchor="middle" className="text-xs font-medium fill-purple-700">
          {analysis.yinYang?.label || '음양'}
        </text>

        {/* 표리 (right) */}
        <path
          d="M 190 100 A 90 90 0 0 1 100 190 L 100 100 Z"
          fill={analysis.interiorExterior?.type === 'exterior' ? '#dbeafe' : '#f5f5f5'}
          stroke="#3b82f6"
          strokeWidth="2"
        />
        <text x="150" y="150" textAnchor="middle" className="text-xs font-medium fill-blue-700">
          {analysis.interiorExterior?.label || '표리'}
        </text>

        {/* 한열 (bottom) */}
        <path
          d="M 100 190 A 90 90 0 0 1 10 100 L 100 100 Z"
          fill={analysis.coldHeat?.type === 'heat' ? '#ffedd5' : '#f5f5f5'}
          stroke="#f97316"
          strokeWidth="2"
        />
        <text x="50" y="150" textAnchor="middle" className="text-xs font-medium fill-orange-700">
          {analysis.coldHeat?.label || '한열'}
        </text>

        {/* 허실 (left) */}
        <path
          d="M 10 100 A 90 90 0 0 1 100 10 L 100 100 Z"
          fill={analysis.deficiencyExcess?.type === 'excess' ? '#ccfbf1' : '#f5f5f5'}
          stroke="#14b8a6"
          strokeWidth="2"
        />
        <text x="50" y="60" textAnchor="middle" className="text-xs font-medium fill-teal-700">
          {analysis.deficiencyExcess?.label || '허실'}
        </text>

        {/* Center */}
        <circle cx="100" cy="100" r="20" fill="white" stroke="#6b7280" strokeWidth="1" />
        <text x="100" y="105" textAnchor="middle" className="text-xs font-bold fill-gray-700">
          팔강
        </text>
      </svg>
    </div>
  )
}

export default PalGangAnalyzer
