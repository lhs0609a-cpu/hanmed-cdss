import { useState } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Trash2,
  Info,
  FileText,
  Calculator,
  Lightbulb,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiagnosisCode {
  code: string
  name: string
  category: string
}

interface ProcedureCode {
  code: string
  name: string
  point: number
  category: string
  restrictions?: string[]
}

interface ClaimItem {
  id: string
  type: 'diagnosis' | 'procedure'
  code: string
  name: string
  quantity?: number
}

interface ValidationResult {
  isValid: boolean
  riskLevel: 'low' | 'medium' | 'high'
  issues: {
    type: 'error' | 'warning' | 'info'
    message: string
    suggestion?: string
  }[]
  estimatedReduction: number
  recommendations: string[]
}

const diagnosisCodes: DiagnosisCode[] = [
  { code: 'U23.0', name: '경항통', category: '근골격' },
  { code: 'U23.3', name: '요통', category: '근골격' },
  { code: 'U23.4', name: '좌골신경통', category: '근골격' },
  { code: 'U30.0', name: '편두통', category: '신경계' },
  { code: 'U30.1', name: '긴장성 두통', category: '신경계' },
  { code: 'U20.4', name: '비증(팔다리 저림)', category: '순환기' },
  { code: 'U32.1', name: '불면증', category: '정신' },
  { code: 'U50.1', name: '만성소화불량', category: '소화기' },
  { code: 'U71.0', name: '월경통', category: '부인과' },
  { code: 'U55.0', name: '변비', category: '소화기' },
  { code: 'M54.5', name: '요통(양방)', category: '근골격' },
  { code: 'M54.2', name: '경추통(양방)', category: '근골격' },
  { code: 'G43.9', name: '편두통(양방)', category: '신경계' },
]

const procedureCodes: ProcedureCode[] = [
  {
    code: 'H7101',
    name: '침술-자침술(1회)',
    point: 7490,
    category: '침구',
    restrictions: ['1일 1회']
  },
  {
    code: 'H7102',
    name: '침술-전침술(1회)',
    point: 8790,
    category: '침구',
    restrictions: ['1일 1회', 'H7101과 동시 불가']
  },
  {
    code: 'H7201',
    name: '구술-직접구(1회)',
    point: 3970,
    category: '침구',
    restrictions: ['1일 3회 이내']
  },
  {
    code: 'H7202',
    name: '구술-간접구(1회)',
    point: 2990,
    category: '침구',
    restrictions: ['1일 3회 이내']
  },
  {
    code: 'H7301',
    name: '부항술-건식(1회)',
    point: 2900,
    category: '침구',
    restrictions: ['1일 2회 이내']
  },
  {
    code: 'H7302',
    name: '부항술-습식(1회)',
    point: 4200,
    category: '침구',
    restrictions: ['1일 1회', '적응증 필요']
  },
  {
    code: 'H7401',
    name: '추나요법-단순(1부위)',
    point: 18850,
    category: '추나',
    restrictions: ['1일 1회', '동의서 필수', 'X-ray 필요']
  },
  {
    code: 'H7402',
    name: '추나요법-복잡(1부위)',
    point: 25180,
    category: '추나',
    restrictions: ['1일 1회', '동의서 필수', 'X-ray 필요', '상병 제한']
  },
  {
    code: 'H7403',
    name: '추나요법-특수(1부위)',
    point: 31480,
    category: '추나',
    restrictions: ['1일 1회', '동의서 필수', 'X-ray/MRI 필요', '중증 상병']
  },
  {
    code: 'H7110',
    name: '약침술(1회)',
    point: 12540,
    category: '침구',
    restrictions: ['1일 1회', '약침액 별도']
  },
]

// Validation rules
const validateClaim = (items: ClaimItem[]): ValidationResult => {
  const issues: ValidationResult['issues'] = []
  const recommendations: string[] = []
  let estimatedReduction = 0

  const diagnoses = items.filter((i) => i.type === 'diagnosis')
  const procedures = items.filter((i) => i.type === 'procedure')

  // Check: No diagnosis
  if (diagnoses.length === 0) {
    issues.push({
      type: 'error',
      message: '상병코드가 없습니다',
      suggestion: '최소 1개의 상병코드를 추가하세요',
    })
    estimatedReduction = 100
  }

  // Check: No procedures
  if (procedures.length === 0 && diagnoses.length > 0) {
    issues.push({
      type: 'warning',
      message: '처치 코드가 없습니다',
    })
  }

  // Check: H7101 and H7102 together
  const hasH7101 = procedures.some((p) => p.code === 'H7101')
  const hasH7102 = procedures.some((p) => p.code === 'H7102')
  if (hasH7101 && hasH7102) {
    issues.push({
      type: 'error',
      message: '자침술(H7101)과 전침술(H7102)은 동시 청구 불가',
      suggestion: '둘 중 하나만 선택하세요. 전침술이 수가가 더 높습니다.',
    })
    estimatedReduction += 50
  }

  // Check: 추나 without appropriate diagnosis
  const hasChuna = procedures.some((p) => p.code.startsWith('H740'))
  const hasMSKDiagnosis = diagnoses.some((d) =>
    ['U23.0', 'U23.3', 'U23.4', 'M54.5', 'M54.2'].includes(d.code)
  )
  if (hasChuna && !hasMSKDiagnosis) {
    issues.push({
      type: 'warning',
      message: '추나요법에 적합한 근골격계 상병코드가 없습니다',
      suggestion: '경항통(U23.0), 요통(U23.3) 등의 상병코드 추가를 권장합니다',
    })
    estimatedReduction += 30
    recommendations.push('추나요법 청구 시 근골격계 상병코드 필수')
  }

  // Check: 추나 복잡/특수 requirements
  const hasComplexChuna = procedures.some((p) => ['H7402', 'H7403'].includes(p.code))
  if (hasComplexChuna) {
    issues.push({
      type: 'info',
      message: '추나요법(복잡/특수)은 X-ray 또는 MRI 검사가 필요합니다',
      suggestion: '영상검사 결과를 차트에 기록해두세요',
    })
    recommendations.push('동의서 및 영상검사 결과 첨부 필수')
  }

  // Check: Multiple 구술
  const guCount = procedures.filter((p) => p.code.startsWith('H720')).reduce((sum, p) => sum + (p.quantity || 1), 0)
  if (guCount > 3) {
    issues.push({
      type: 'error',
      message: `구술은 1일 3회까지만 청구 가능합니다 (현재 ${guCount}회)`,
      suggestion: '3회 이내로 조정하세요',
    })
    estimatedReduction += 40
  }

  // Check: 부항 건식 횟수
  const buhangCount = procedures.filter((p) => p.code === 'H7301').reduce((sum, p) => sum + (p.quantity || 1), 0)
  if (buhangCount > 2) {
    issues.push({
      type: 'error',
      message: `건식부항은 1일 2회까지만 청구 가능합니다 (현재 ${buhangCount}회)`,
      suggestion: '2회 이내로 조정하세요',
    })
    estimatedReduction += 30
  }

  // Check: 편두통 with 침
  const hasMigraine = diagnoses.some((d) => ['U30.0', 'G43.9'].includes(d.code))
  const hasAcupuncture = procedures.some((p) => p.code.startsWith('H710'))
  if (hasMigraine && hasAcupuncture) {
    issues.push({
      type: 'info',
      message: '편두통 + 침술 조합은 안전한 청구입니다',
    })
  }

  // General recommendations
  if (hasChuna) {
    recommendations.push('추나요법 동의서 작성 확인')
    recommendations.push('치료 전후 ROM 측정 기록')
  }

  // Calculate risk level
  let riskLevel: ValidationResult['riskLevel'] = 'low'
  if (estimatedReduction >= 50 || issues.some((i) => i.type === 'error')) {
    riskLevel = 'high'
  } else if (estimatedReduction >= 20 || issues.some((i) => i.type === 'warning')) {
    riskLevel = 'medium'
  }

  return {
    isValid: !issues.some((i) => i.type === 'error'),
    riskLevel,
    issues,
    estimatedReduction: Math.min(estimatedReduction, 100),
    recommendations,
  }
}

export default function ClaimCheckPage() {
  const [claimItems, setClaimItems] = useState<ClaimItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'diagnosis' | 'procedure'>('diagnosis')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [copied, setCopied] = useState(false)

  const filteredCodes = searchType === 'diagnosis'
    ? diagnosisCodes.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.includes(searchQuery)
      )
    : procedureCodes.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.includes(searchQuery)
      )

  const addItem = (code: DiagnosisCode | ProcedureCode) => {
    const newItem: ClaimItem = {
      id: Date.now().toString(),
      type: searchType,
      code: code.code,
      name: code.name,
      quantity: searchType === 'procedure' ? 1 : undefined,
    }
    setClaimItems((prev) => [...prev, newItem])
    setSearchQuery('')
    setValidationResult(null)
  }

  const removeItem = (id: string) => {
    setClaimItems((prev) => prev.filter((item) => item.id !== id))
    setValidationResult(null)
  }

  const updateQuantity = (id: string, quantity: number) => {
    setClaimItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    )
    setValidationResult(null)
  }

  const runValidation = () => {
    const result = validateClaim(claimItems)
    setValidationResult(result)
  }

  const copyClaimSummary = () => {
    const diagnoses = claimItems.filter((i) => i.type === 'diagnosis')
    const procedures = claimItems.filter((i) => i.type === 'procedure')

    let summary = '=== 청구 내역 ===\n\n'
    summary += '[상병코드]\n'
    diagnoses.forEach((d) => {
      summary += `${d.code} - ${d.name}\n`
    })
    summary += '\n[처치코드]\n'
    procedures.forEach((p) => {
      summary += `${p.code} - ${p.name} x${p.quantity || 1}\n`
    })

    if (validationResult) {
      summary += '\n[검증 결과]\n'
      summary += `위험도: ${validationResult.riskLevel === 'low' ? '낮음' : validationResult.riskLevel === 'medium' ? '중간' : '높음'}\n`
      if (validationResult.issues.length > 0) {
        summary += '\n주의사항:\n'
        validationResult.issues.forEach((issue) => {
          summary += `- ${issue.message}\n`
        })
      }
    }

    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalPoints = claimItems
    .filter((i) => i.type === 'procedure')
    .reduce((sum, item) => {
      const proc = procedureCodes.find((p) => p.code === item.code)
      return sum + (proc?.point || 0) * (item.quantity || 1)
    }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-7 w-7 text-blue-500" />
          보험 삭감 예측
        </h1>
        <p className="mt-1 text-gray-500">
          청구 전 삭감 위험을 미리 확인하고 안전하게 청구하세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Code Search */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSearchType('diagnosis')}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium transition-all',
                  searchType === 'diagnosis'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                상병코드
              </button>
              <button
                onClick={() => setSearchType('procedure')}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium transition-all',
                  searchType === 'procedure'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                처치코드
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchType === 'diagnosis' ? '상병코드 검색...' : '처치코드 검색...'}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredCodes.slice(0, 10).map((code) => (
                <button
                  key={code.code}
                  onClick={() => addItem(code)}
                  className="w-full p-3 bg-gray-50 hover:bg-blue-50 rounded-xl text-left transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm text-blue-600">{code.code}</span>
                      <p className="text-sm text-gray-900">{code.name}</p>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                  {'point' in code && (
                    <p className="text-xs text-gray-500 mt-1">
                      {code.point.toLocaleString()}점
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Claim Items & Validation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Claim Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">청구 내역</h3>
              {claimItems.length > 0 && (
                <button
                  onClick={copyClaimSummary}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  복사
                </button>
              )}
            </div>

            {claimItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>왼쪽에서 코드를 검색하여 추가하세요</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Diagnoses */}
                {claimItems.filter((i) => i.type === 'diagnosis').length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">상병코드</p>
                    <div className="space-y-2">
                      {claimItems
                        .filter((i) => i.type === 'diagnosis')
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-blue-50 rounded-xl"
                          >
                            <div>
                              <span className="font-mono text-sm text-blue-600">{item.code}</span>
                              <span className="text-gray-700 ml-2">{item.name}</span>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Procedures */}
                {claimItems.filter((i) => i.type === 'procedure').length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">처치코드</p>
                    <div className="space-y-2">
                      {claimItems
                        .filter((i) => i.type === 'procedure')
                        .map((item) => {
                          const proc = procedureCodes.find((p) => p.code === item.code)
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 bg-green-50 rounded-xl"
                            >
                              <div className="flex-1">
                                <span className="font-mono text-sm text-green-600">{item.code}</span>
                                <span className="text-gray-700 ml-2">{item.name}</span>
                                {proc?.restrictions && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    ⚠️ {proc.restrictions.join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                                    className="w-6 h-6 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center font-medium">{item.quantity || 1}</span>
                                  <button
                                    onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                                    className="w-6 h-6 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">예상 청구 점수</span>
                    <span className="text-xl font-bold text-gray-900">
                      {totalPoints.toLocaleString()}점
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    예상 금액: 약 {Math.round(totalPoints * 8.1).toLocaleString()}원 (환산지수 8.1 기준)
                  </p>
                </div>
              </div>
            )}

            {claimItems.length > 0 && (
              <button
                onClick={runValidation}
                className="w-full mt-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                삭감 위험 검사
              </button>
            )}
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Risk Header */}
              <div
                className={cn(
                  'p-6',
                  validationResult.riskLevel === 'low'
                    ? 'bg-green-500'
                    : validationResult.riskLevel === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                )}
              >
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    {validationResult.riskLevel === 'low' ? (
                      <CheckCircle2 className="h-8 w-8" />
                    ) : validationResult.riskLevel === 'medium' ? (
                      <AlertTriangle className="h-8 w-8" />
                    ) : (
                      <XCircle className="h-8 w-8" />
                    )}
                    <div>
                      <h3 className="text-xl font-bold">
                        {validationResult.riskLevel === 'low'
                          ? '삭감 위험 낮음'
                          : validationResult.riskLevel === 'medium'
                          ? '주의 필요'
                          : '삭감 위험 높음'}
                      </h3>
                      <p className="text-white/80">
                        예상 삭감률: {validationResult.estimatedReduction}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issues */}
              {validationResult.issues.length > 0 && (
                <div className="p-6 border-b border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-4">검토 사항</h4>
                  <div className="space-y-3">
                    {validationResult.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={cn(
                          'p-4 rounded-xl',
                          issue.type === 'error'
                            ? 'bg-red-50 border border-red-200'
                            : issue.type === 'warning'
                            ? 'bg-amber-50 border border-amber-200'
                            : 'bg-blue-50 border border-blue-200'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {issue.type === 'error' ? (
                            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                          ) : issue.type === 'warning' ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p
                              className={cn(
                                'font-medium',
                                issue.type === 'error'
                                  ? 'text-red-700'
                                  : issue.type === 'warning'
                                  ? 'text-amber-700'
                                  : 'text-blue-700'
                              )}
                            >
                              {issue.message}
                            </p>
                            {issue.suggestion && (
                              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                {issue.suggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {validationResult.recommendations.length > 0 && (
                <div className="p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    권장 사항
                  </h4>
                  <ul className="space-y-2">
                    {validationResult.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
        <div className="flex items-start gap-4">
          <Info className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">삭감 예측 시스템 안내</h3>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• 본 시스템은 참고용이며, 실제 심사 결과와 다를 수 있습니다</li>
              <li>• 심평원 심사 기준은 수시로 변경될 수 있으니 최신 기준을 확인하세요</li>
              <li>• 복잡한 케이스는 전문 청구 담당자와 상의하시기 바랍니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
