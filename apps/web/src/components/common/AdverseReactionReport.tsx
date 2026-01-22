import { useState } from 'react'
import {
  AlertTriangle,
  X,
  Send,
  CheckCircle,
  Clock,
  User,
  Pill,
  FileText,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 부작용/이상반응 보고 컴포넌트
 *
 * 의료 안전을 위한 부작용 보고 시스템
 * - AI 추천 처방 사용 후 이상 반응 보고
 * - 처방-부작용 데이터 수집으로 안전성 개선
 */

interface AdverseReactionReportProps {
  formulaName?: string
  recommendationId?: string
  patientId?: string
  onSubmit?: (report: AdverseReactionData) => Promise<void>
  onClose?: () => void
}

interface AdverseReactionData {
  formulaName: string
  patientAge?: number
  patientGender?: string
  reactionType: string
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening'
  symptoms: string[]
  onsetTime: string
  duration?: string
  outcome: string
  additionalInfo?: string
  reporterType: 'practitioner' | 'patient' | 'other'
}

const REACTION_TYPES = [
  { id: 'allergic', label: '알레르기 반응', description: '발진, 두드러기, 가려움 등' },
  { id: 'gastrointestinal', label: '소화기 이상', description: '구역, 구토, 설사, 복통 등' },
  { id: 'cardiovascular', label: '심혈관계 이상', description: '두근거림, 흉통, 혈압 변화 등' },
  { id: 'neurological', label: '신경계 이상', description: '두통, 어지러움, 떨림 등' },
  { id: 'hepatic', label: '간 기능 이상', description: '황달, 피로, 간 수치 상승 등' },
  { id: 'renal', label: '신장 기능 이상', description: '소변량 변화, 부종 등' },
  { id: 'unexpected', label: '예상치 못한 반응', description: '기존에 알려지지 않은 반응' },
  { id: 'other', label: '기타', description: '위에 해당하지 않는 경우' },
]

const SEVERITY_LEVELS = [
  { id: 'mild', label: '경미', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', description: '일상 활동에 지장 없음' },
  { id: 'moderate', label: '중등도', color: 'bg-orange-100 text-orange-700 border-orange-200', description: '일상 활동에 일부 지장' },
  { id: 'severe', label: '중증', color: 'bg-red-100 text-red-700 border-red-200', description: '즉각적 치료 필요' },
  { id: 'life_threatening', label: '생명 위협', color: 'bg-red-200 text-red-800 border-red-300', description: '응급 상황' },
]

const COMMON_SYMPTOMS = [
  '발진', '두드러기', '가려움', '부종', '호흡곤란',
  '구역', '구토', '설사', '복통', '변비',
  '두통', '어지러움', '졸음', '불면', '피로',
  '두근거림', '흉통', '혈압상승', '혈압저하',
]

const ONSET_TIMES = [
  { id: 'immediate', label: '즉시 (1시간 이내)' },
  { id: 'hours', label: '수 시간 후 (1-24시간)' },
  { id: 'days', label: '수 일 후 (1-7일)' },
  { id: 'weeks', label: '수 주 후 (1주 이상)' },
]

const OUTCOMES = [
  { id: 'recovered', label: '완전 회복' },
  { id: 'recovering', label: '회복 중' },
  { id: 'not_recovered', label: '미회복' },
  { id: 'sequelae', label: '후유증 있음' },
  { id: 'unknown', label: '알 수 없음' },
]

export function AdverseReactionReport({
  formulaName = '',
  recommendationId,
  patientId,
  onSubmit,
  onClose,
}: AdverseReactionReportProps) {
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<AdverseReactionData>>({
    formulaName,
    severity: 'mild',
    symptoms: [],
    reporterType: 'practitioner',
  })
  const [expandedSection, setExpandedSection] = useState<string | null>('basic')

  const handleSymptomToggle = (symptom: string) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms?.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...(prev.symptoms || []), symptom],
    }))
  }

  const handleSubmit = async () => {
    if (!formData.reactionType || !formData.onsetTime || !formData.outcome) {
      return
    }

    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(formData as AdverseReactionData)
      }
      setStep('success')
    } catch (error) {
      console.error('Failed to submit report:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  if (step === 'success') {
    return (
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">보고가 접수되었습니다</h2>
        <p className="text-gray-600 mb-6">
          부작용 보고에 참여해 주셔서 감사합니다.
          <br />
          귀하의 보고는 한의학 의료 안전성 향상에 기여합니다.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          보고 ID: {recommendationId || 'AR-' + Date.now().toString(36).toUpperCase()}
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
        >
          닫기
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">부작용 보고</h2>
            <p className="text-red-100 text-sm">Adverse Reaction Report</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* 안내 */}
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>중요:</strong> 이 보고는 의료 안전성 향상을 위해 수집됩니다.
          심각한 부작용의 경우 즉시 의료 조치를 취하고 관할 보건기관에 신고해 주세요.
        </p>
      </div>

      {/* 폼 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 기본 정보 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('basic')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">처방 정보</span>
            </div>
            <ChevronDown
              className={cn('h-5 w-5 text-gray-400 transition-transform', expandedSection === 'basic' && 'rotate-180')}
            />
          </button>
          {expandedSection === 'basic' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">처방명 *</label>
                <input
                  type="text"
                  value={formData.formulaName || ''}
                  onChange={(e) => setFormData({ ...formData, formulaName: e.target.value })}
                  placeholder="예: 이중탕, 보중익기탕"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">환자 연령</label>
                  <input
                    type="number"
                    value={formData.patientAge || ''}
                    onChange={(e) => setFormData({ ...formData, patientAge: parseInt(e.target.value) })}
                    placeholder="세"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                  <select
                    value={formData.patientGender || ''}
                    onChange={(e) => setFormData({ ...formData, patientGender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">선택</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 반응 유형 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('reaction')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">반응 유형 *</span>
            </div>
            <ChevronDown
              className={cn('h-5 w-5 text-gray-400 transition-transform', expandedSection === 'reaction' && 'rotate-180')}
            />
          </button>
          {expandedSection === 'reaction' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {REACTION_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setFormData({ ...formData, reactionType: type.id })}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      formData.reactionType === type.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <p className="font-medium text-gray-900 text-sm">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 심각도 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('severity')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">심각도 *</span>
            </div>
            <ChevronDown
              className={cn('h-5 w-5 text-gray-400 transition-transform', expandedSection === 'severity' && 'rotate-180')}
            />
          </button>
          {expandedSection === 'severity' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {SEVERITY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setFormData({ ...formData, severity: level.id as AdverseReactionData['severity'] })}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      formData.severity === level.id
                        ? `${level.color} border-current`
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <p className="font-medium text-sm">{level.label}</p>
                    <p className="text-xs opacity-70">{level.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 증상 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('symptoms')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">구체적 증상</span>
            </div>
            <ChevronDown
              className={cn('h-5 w-5 text-gray-400 transition-transform', expandedSection === 'symptoms' && 'rotate-180')}
            />
          </button>
          {expandedSection === 'symptoms' && (
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {COMMON_SYMPTOMS.map((symptom) => (
                  <button
                    key={symptom}
                    onClick={() => handleSymptomToggle(symptom)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                      formData.symptoms?.includes(symptom)
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {symptom}
                  </button>
                ))}
              </div>
              <textarea
                value={formData.additionalInfo || ''}
                onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                placeholder="추가 증상이나 상세 내용을 기술해 주세요..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* 시간 및 경과 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('timing')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">발현 시기 및 경과 *</span>
            </div>
            <ChevronDown
              className={cn('h-5 w-5 text-gray-400 transition-transform', expandedSection === 'timing' && 'rotate-180')}
            />
          </button>
          {expandedSection === 'timing' && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">발현 시기 *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ONSET_TIMES.map((time) => (
                    <button
                      key={time.id}
                      onClick={() => setFormData({ ...formData, onsetTime: time.id })}
                      className={cn(
                        'p-2 rounded-lg border-2 text-sm transition-all',
                        formData.onsetTime === time.id
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">결과 *</label>
                <div className="grid grid-cols-3 gap-2">
                  {OUTCOMES.map((outcome) => (
                    <button
                      key={outcome.id}
                      onClick={() => setFormData({ ...formData, outcome: outcome.id })}
                      className={cn(
                        'p-2 rounded-lg border-2 text-sm transition-all',
                        formData.outcome === outcome.id
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {outcome.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              취소
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.reactionType || !formData.onsetTime || !formData.outcome}
            className={cn(
              'flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
              isSubmitting || !formData.reactionType || !formData.onsetTime || !formData.outcome
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg hover:shadow-red-500/30'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                보고서 제출
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          이 보고는 익명으로 처리되며, 의료 안전성 개선 목적으로만 사용됩니다.
        </p>
      </div>
    </div>
  )
}

/**
 * 부작용 보고 버튼 (처방 카드에 추가)
 */
export function AdverseReactionButton({
  formulaName,
  onClick,
  className,
}: {
  formulaName: string
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
        'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200',
        className
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      부작용 보고
    </button>
  )
}

export default AdverseReactionReport
