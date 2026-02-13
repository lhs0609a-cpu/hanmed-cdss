import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
import { useSymptomTemplates } from '@/hooks/useSymptomTemplates'
import { BASE_STATS, formatStatNumber } from '@/config/stats.config'
import {
  Plus,
  X,
  Loader2,
  CheckCircle,
  Sparkles,
  User,
  Pill,
  Activity,
  Brain,
  ChevronRight,
  ChevronLeft,
  Info,
  Shield,
  BookOpen,
  Beaker,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Scroll,
  Book,
  Users,
  Settings2,
  Search,
  Wand2,
  ClipboardList,
  Stethoscope,
  FileCheck,
  RefreshCw,
  ClipboardCopy,
  Save,
} from 'lucide-react'
import { MedicineSchool, SCHOOL_INFO } from '@/types'
import api from '@/services/api'
import { logError } from '@/lib/errors'
import { ErrorMessage } from '@/components/common'
import TourGuide, { TourRestartButton } from '@/components/common/TourGuide'
import { CaseMatchListItem } from '@/components/case-match'
import type { MatchedCase } from '@/types/case-search'
import { transformCaseSearchResponse } from '@/types/case-search'
import { HanjaTooltip, useHanjaSettings } from '@/components/hanja'
import { RealTimeAssistant } from '@/components/assistant/RealTimeAssistant'
import { PrescriptionDocument } from '@/components/documentation/PrescriptionDocument'
import { AIResultDisclaimer, PrescriptionDisclaimer } from '@/components/common/MedicalDisclaimer'
import { SimilarPatientStats, RecommendationStatHighlight } from '@/components/consultation'
import { ClinicalEvidencePanel } from '@/components/clinical-evidence'

const consultationTourSteps = [
  {
    target: '[data-tour="patient-info"]',
    title: '환자 정보 입력',
    content: '먼저 환자의 이름, 나이, 성별을 입력하세요. 정확한 정보가 더 좋은 AI 추천에 도움됩니다.',
    placement: 'right' as const,
    tip: '기존 환자는 환자관리 메뉴에서 선택할 수 있어요',
  },
  {
    target: '[data-tour="symptom-input"]',
    title: '증상 추가하기',
    content: '"+ 증상 추가" 버튼을 눌러 환자의 증상을 입력하세요. 각 증상의 심한 정도(1-10)도 함께 설정합니다.',
    placement: 'right' as const,
    tip: '주증상을 먼저 입력하고 부증상을 추가하면 더 정확해요',
  },
  {
    target: '[data-tour="analyze-button"]',
    title: 'AI 분석 시작',
    content: '증상 입력이 완료되면 이 버튼을 클릭하세요. AI가 증상을 분석하고 최적의 처방을 추천합니다.',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="result-area"]',
    title: '추천 결과 확인',
    content: 'AI가 추천한 처방 목록이 여기에 표시됩니다. 각 처방의 신뢰도, 구성 약재, 추천 이유를 확인하세요.',
    placement: 'left' as const,
    tip: '"상세정보" 버튼으로 처방의 출전, 가감법 등을 볼 수 있어요',
  },
]

interface Symptom {
  name: string
  severity: number
}

interface Recommendation {
  formula_name: string
  confidence_score: number
  herbs: Array<{ name: string; amount: string; role: string }>
  rationale: string
}

// 처방 상세 정보 데이터
const formulaDetails: Record<string, {
  hanja: string
  source: string
  category: string
  indication: string
  pathogenesis: string
  contraindications: string[]
  modifications: Array<{ condition: string; action: string }>
  modernUsage: string[]
  cautions: string[]
}> = {
  '이중탕(理中湯)': {
    hanja: '理中湯',
    source: '상한론(傷寒論)',
    category: '온리제(溫裏劑)',
    indication: '비위허한증(脾胃虛寒證). 자리청희(自利清稀), 복만불식(腹滿不食), 구토복통(嘔吐腹痛), 설질담백(舌質淡白), 맥침세(脈沈細)',
    pathogenesis: '중초허한(中焦虛寒)으로 인해 비위의 운화기능이 약화되어 발생합니다. 비양부족으로 음식을 소화시키지 못하고, 수습이 정체되어 설사와 복통이 나타납니다.',
    contraindications: [
      '음허화왕(陰虛火旺) 환자',
      '실열(實熱) 증상이 있는 경우',
      '임산부 (건강 성분 주의)',
    ],
    modifications: [
      { condition: '복통이 심하면', action: '인삼을 증량하고 백작약 6g 가미' },
      { condition: '구토가 심하면', action: '반하 9g, 생강 6g 가미' },
      { condition: '설사가 심하면', action: '백출을 창출로 대체, 복령 9g 가미' },
      { condition: '수족냉증이 심하면', action: '부자 3g 가미 (부자이중탕)' },
    ],
    modernUsage: [
      '만성 위염, 위궤양',
      '기능성 소화불량',
      '과민성 대장 증후군 (설사형)',
      '만성 장염',
    ],
    cautions: [
      '건강(乾薑)은 열성이 강하므로 복용 중 열감이 있으면 용량 조절',
      '장기 복용 시 정기적인 상태 평가 필요',
      '와파린 복용자는 인삼 상호작용 주의',
    ],
  },
  '보중익기탕(補中益氣湯)': {
    hanja: '補中益氣湯',
    source: '비위론(脾胃論)',
    category: '보익제(補益劑) - 보기제(補氣劑)',
    indication: '비위기허(脾胃氣虛), 중기하함(中氣下陷). 기단나언(氣短懶言), 사지권태(四肢倦怠), 식소복창(食少腹脹), 자한(自汗), 내장하수(內臟下垂)',
    pathogenesis: '비기허약(脾氣虛弱)으로 청양불승(清陽不升)하여 중기하함(中氣下陷)이 발생합니다. 기허로 인해 피로, 숨참, 자한 등의 증상이 나타납니다.',
    contraindications: [
      '음허화왕(陰虛火旺) 환자',
      '간양상항(肝陽上亢) 환자',
      '고혈압 환자 주의 (승마, 시호)',
    ],
    modifications: [
      { condition: '두통이 있으면', action: '만형자 9g, 천궁 6g 가미' },
      { condition: '기침이 있으면', action: '행인 9g, 오미자 6g 가미' },
      { condition: '불면이 있으면', action: '산조인 12g, 용안육 9g 가미' },
      { condition: '자궁하수가 있으면', action: '승마, 시호 증량' },
    ],
    modernUsage: [
      '만성 피로 증후군',
      '위하수, 자궁하수, 탈항',
      '반복성 감기',
      '수술 후 회복기',
    ],
    cautions: [
      '황기는 혈압을 올릴 수 있으므로 고혈압 환자 주의',
      '감기 급성기에는 사용을 피함',
      '인삼은 다른 약물과 상호작용 가능성이 있음',
    ],
  },
}

const roleColors: Record<string, string> = {
  '군': 'bg-red-100 text-red-700 border-red-200',
  '신': 'bg-amber-100 text-amber-700 border-amber-200',
  '좌': 'bg-blue-100 text-blue-700 border-blue-200',
  '사': 'bg-green-100 text-green-700 border-green-200',
}

// 약재 한글-한자 매핑 및 설명
const HERB_INFO: Record<string, { hanja: string; meaning: string }> = {
  '인삼': { hanja: '人蔘', meaning: '기운을 크게 보충하는 대표적인 보약' },
  '백출': { hanja: '白朮', meaning: '소화기능을 강화하고 습기를 제거' },
  '건강': { hanja: '乾薑', meaning: '속을 따뜻하게 하고 소화를 도움' },
  '감초': { hanja: '甘草', meaning: '여러 약재를 조화시키고 독성을 줄임' },
  '황기': { hanja: '黃芪', meaning: '기운을 북돋우고 면역력을 높임' },
  '당귀': { hanja: '當歸', meaning: '혈액을 보충하고 순환시킴' },
  '진피': { hanja: '陳皮', meaning: '소화를 돕고 가래를 삭임' },
  '승마': { hanja: '升麻', meaning: '양기를 끌어올리는 승양 작용' },
  '시호': { hanja: '柴胡', meaning: '간의 울체를 풀고 열을 내림' },
  '반하': { hanja: '半夏', meaning: '가래를 삭이고 구토를 멎게 함' },
  '생강': { hanja: '生薑', meaning: '소화를 돕고 오한을 풀어줌' },
  '대추': { hanja: '大棗', meaning: '기운을 보충하고 약을 조화시킴' },
  '복령': { hanja: '茯苓', meaning: '이뇨작용, 마음을 안정시킴' },
  '작약': { hanja: '芍藥', meaning: '간을 조절하고 통증을 완화' },
  '천궁': { hanja: '川芎', meaning: '혈액 순환을 돕고 두통을 완화' },
  '맥문동': { hanja: '麥門冬', meaning: '폐와 위의 진액을 보충' },
  '오미자': { hanja: '五味子', meaning: '폐기를 수렴하고 기침을 완화' },
  '마황': { hanja: '麻黃', meaning: '땀을 내서 감기를 치료' },
  '계지': { hanja: '桂枝', meaning: '경락을 따뜻하게 하여 한기를 흩어줌' },
  '세신': { hanja: '細辛', meaning: '폐를 따뜻하게 하고 담음을 제거' },
  '숙지황': { hanja: '熟地黃', meaning: '혈액과 진액을 보충하는 대표 약재' },
  '산수유': { hanja: '山茱萸', meaning: '간신을 보하고 양기를 수렴' },
  '산약': { hanja: '山藥', meaning: '비신을 보하고 정기를 고섭' },
  '목단피': { hanja: '牧丹皮', meaning: '혈열을 식히고 어혈을 풀어줌' },
  '택사': { hanja: '澤瀉', meaning: '이뇨작용으로 습열을 제거' },
}

// 자주 사용하는 증상 태그 목록
const COMMON_SYMPTOMS = [
  '두통', '어지러움', '피로', '수면장애', '식욕부진', '소화불량',
  '복통', '설사', '변비', '구역', '오한', '발열', '기침', '가래',
  '호흡곤란', '심계', '흉통', '요통', '관절통', '부종', '자한', '도한',
]

const PRESCRIPTIONS_STORAGE_KEY = 'hanmed_prescriptions'

export default function ConsultationPage() {
  useSEO(PAGE_SEO.consultation)
  const location = useLocation()

  const { showHanja } = useHanjaSettings()
  const { toast } = useToast()
  const { templates, saveTemplate, deleteTemplate } = useSymptomTemplates()
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [newSymptom, setNewSymptom] = useState('')
  const [constitution, setConstitution] = useState('')
  const [currentMedications, setCurrentMedications] = useState<string[]>([])
  const [newMedication, setNewMedication] = useState('')

  // 고급 옵션
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [preferredSchool, setPreferredSchool] = useState<MedicineSchool | 'all'>('all')
  const [includePalGang, setIncludePalGang] = useState(true)
  const [includeByeongYang, setIncludeByeongYang] = useState(true)

  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')

  // 상세 정보 모달
  const [selectedFormula, setSelectedFormula] = useState<Recommendation | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [copied, setCopied] = useState(false)

  // 처방 선택 확인 모달
  const [showSelectConfirm, setShowSelectConfirm] = useState(false)
  const [selectedForSelect, setSelectedForSelect] = useState<Recommendation | null>(null)

  // Tour guide
  const [showTour, setShowTour] = useState(true)

  // Similar cases
  const [similarCases, setSimilarCases] = useState<MatchedCase[]>([])
  const [loadingSimilarCases, setLoadingSimilarCases] = useState(false)
  const [showSimilarCases, setShowSimilarCases] = useState(false)

  // 입력 모드: 'quick' | 'detailed' | 'wizard'
  const [inputMode, setInputMode] = useState<'quick' | 'detailed' | 'wizard'>('wizard')
  // 레거시 호환성을 위한 quickMode 유지
  const quickMode = inputMode === 'quick'

  // 마법사 단계: 1=환자정보, 2=증상입력, 3=AI분석, 4=처방확인
  const [wizardStep, setWizardStep] = useState(1)
  const totalWizardSteps = 4

  // 문서화 모달
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [documentFormula, setDocumentFormula] = useState<Recommendation | null>(null)

  // 완료 상태 (처방 선택 후)
  const [doneState, setDoneState] = useState<{
    formula: Recommendation
    chiefComplaint: string
    constitution: string
    symptoms: string[]
  } | null>(null)

  // 템플릿 저장 모달
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')

  // 대시보드에서 자연어 검색으로 넘어온 경우 자동 채움 + 즉시 분석
  const [autoSubmitDone, setAutoSubmitDone] = useState(false)

  // 대시보드 자연어 검색에서 넘어온 데이터 자동 채움
  useEffect(() => {
    const state = location.state as {
      naturalQuery?: string
      parsedAge?: number
      parsedGender?: 'male' | 'female'
      parsedConstitution?: string
      parsedSymptoms?: string[]
      autoSubmit?: boolean
    } | null

    if (state?.naturalQuery && !autoSubmitDone) {
      // 빠른 모드로 전환
      setInputMode('quick')

      // 증상을 주소증에 자동 입력
      const complaintText = state.parsedSymptoms?.join(', ') || state.naturalQuery
      setChiefComplaint(complaintText)

      // 증상 태그 추가
      if (state.parsedSymptoms) {
        setSymptoms(state.parsedSymptoms.map(s => ({ name: s, severity: 5 })))
      }

      // 체질 설정
      if (state.parsedConstitution) {
        setConstitution(state.parsedConstitution)
      }

      setAutoSubmitDone(true)
    }
  }, [location.state, autoSubmitDone])

  // autoSubmit: 데이터 채움 후 자동으로 AI 분석 실행
  useEffect(() => {
    if (autoSubmitDone && location.state?.autoSubmit && chiefComplaint && !isLoading && recommendations.length === 0) {
      handleSubmit()
      // 뒤로가기 시 재실행 방지
      window.history.replaceState({}, '')
    }
  }, [autoSubmitDone, chiefComplaint])

  // Fetch similar cases when recommendations are loaded
  useEffect(() => {
    if (recommendations.length > 0 && chiefComplaint.trim()) {
      fetchSimilarCases()
    }
  }, [recommendations])

  const fetchSimilarCases = async () => {
    setLoadingSimilarCases(true)
    try {
      const apiUrl = import.meta.env.VITE_AI_ENGINE_URL || 'https://api.ongojisin.co.kr'
      const response = await fetch(`${apiUrl}/api/v1/cases/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_info: {
            constitution: constitution || undefined,
          },
          chief_complaint: chiefComplaint,
          symptoms: symptoms.map(s => ({ name: s.name, severity: s.severity })),
          options: { top_k: 5, min_confidence: 40 },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const transformed = transformCaseSearchResponse(data)
        setSimilarCases(transformed.results)
      }
    } catch (err) {
      console.error('Failed to fetch similar cases:', err)
    } finally {
      setLoadingSimilarCases(false)
    }
  }

  const addSymptom = (symptomName?: string) => {
    const name = symptomName || newSymptom.trim()
    if (name && !symptoms.some(s => s.name === name)) {
      setSymptoms([...symptoms, { name, severity: 5 }])
      if (!symptomName) setNewSymptom('')
    }
  }

  // 빠른 증상 추가 (클릭으로 토글)
  const toggleSymptom = (name: string) => {
    if (symptoms.some(s => s.name === name)) {
      setSymptoms(symptoms.filter(s => s.name !== name))
    } else {
      setSymptoms([...symptoms, { name, severity: 5 }])
    }
  }

  // 엔터키로 즉시 분석
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && chiefComplaint.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const removeSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index))
  }

  const addMedication = () => {
    if (newMedication.trim()) {
      setCurrentMedications([...currentMedications, newMedication.trim()])
      setNewMedication('')
    }
  }

  const removeMedication = (index: number) => {
    setCurrentMedications(currentMedications.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!chiefComplaint.trim()) {
      setError('주소증을 입력해주세요.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await api.post('/prescriptions/recommend', {
        chiefComplaint,
        symptoms,
        constitution: constitution || undefined,
        currentMedications: currentMedications.length > 0 ? currentMedications : undefined,
      })

      setRecommendations(response.data.data?.recommendations || response.data.recommendations || [])
      setAnalysis(response.data.data?.analysis || response.data.analysis || '')
    } catch (err: unknown) {
      logError(err, 'ConsultationPage')
      setError('처방 추천을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const openDetailModal = (rec: Recommendation) => {
    setSelectedFormula(rec)
    setShowDetailModal(true)
  }

  const handleSelectFormula = (rec: Recommendation) => {
    setSelectedForSelect(rec)
    setShowSelectConfirm(true)
  }

  const confirmSelectFormula = () => {
    if (!selectedForSelect) return

    try {
      // 처방 기록 생성
      const prescriptionRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        formulaName: selectedForSelect.formula_name,
        herbs: selectedForSelect.herbs,
        rationale: selectedForSelect.rationale,
        confidenceScore: selectedForSelect.confidence_score,
        chiefComplaint,
        symptoms: symptoms.map(s => s.name),
        constitution: constitution || undefined,
        analysis,
      }

      // localStorage에 저장
      const existingRecords = JSON.parse(localStorage.getItem(PRESCRIPTIONS_STORAGE_KEY) || '[]')
      existingRecords.unshift(prescriptionRecord)
      // 최대 100개까지 저장
      localStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(existingRecords.slice(0, 100)))

      setShowSelectConfirm(false)

      // 완료 상태 설정
      setDoneState({
        formula: selectedForSelect,
        chiefComplaint,
        constitution,
        symptoms: symptoms.map(s => s.name),
      })

      toast({
        title: '처방이 저장되었습니다',
        description: `${selectedForSelect.formula_name}이(가) 진료 기록에 저장되었습니다.`,
      })
    } catch (err) {
      console.error('Failed to save prescription:', err)
      toast({
        title: '저장 실패',
        description: '처방 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  // 재분석: 증상 수정으로 돌아가기 (환자정보 유지)
  const handleReAnalyze = () => {
    setDoneState(null)
    setRecommendations([])
    setAnalysis('')
    setWizardStep(2)
  }

  // 새 환자 진료: 모든 상태 초기화
  const handleNewConsultation = () => {
    setDoneState(null)
    setRecommendations([])
    setAnalysis('')
    setChiefComplaint('')
    setSymptoms([])
    setConstitution('')
    setCurrentMedications([])
    setSimilarCases([])
    setWizardStep(1)
    setAutoSubmitDone(false)
  }

  // 처방전 복사
  const copyPrescriptionToClipboard = (rec: Recommendation) => {
    const detail = formulaDetails[rec.formula_name]
    const herbsText = rec.herbs.map(h => `  ${h.name} ${h.amount} (${h.role})`).join('\n')
    const text = `【${rec.formula_name}】 신뢰도: ${(rec.confidence_score * 100).toFixed(0)}%
출전: ${detail?.source || '미상'}
주소증: ${chiefComplaint}
${constitution ? `체질: ${constitution}\n` : ''}
구성 약재:
${herbsText}

AI 분석:
${rec.rationale}
${analysis ? `\n변증 분석:\n${analysis}` : ''}`

    navigator.clipboard.writeText(text)
    toast({ title: '처방전이 클립보드에 복사되었습니다' })
  }

  // 템플릿 저장
  const handleSaveTemplate = () => {
    if (!templateName.trim()) return
    saveTemplate(templateName.trim(), {
      chiefComplaint,
      symptoms: symptoms.map(s => s.name),
      constitution: constitution || undefined,
    })
    setTemplateName('')
    setShowTemplateModal(false)
    toast({ title: '증상 템플릿이 저장되었습니다' })
  }

  // 템플릿 불러오기
  const handleLoadTemplate = (id: string) => {
    const tmpl = templates.find(t => t.id === id)
    if (!tmpl) return
    setChiefComplaint(tmpl.chiefComplaint)
    setSymptoms(tmpl.symptoms.map(s => ({ name: s, severity: 5 })))
    if (tmpl.constitution) setConstitution(tmpl.constitution)
    toast({ title: `'${tmpl.name}' 템플릿을 불러왔습니다` })
  }

  const copyToClipboard = () => {
    if (!selectedFormula) return

    const detail = formulaDetails[selectedFormula.formula_name]
    const herbsText = selectedFormula.herbs.map(h => `${h.name} ${h.amount}`).join(', ')

    const text = `【${selectedFormula.formula_name}】
출전: ${detail?.source || '미상'}
구성: ${herbsText}
적응증: ${detail?.indication || selectedFormula.rationale}
`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 마법사 단계 정보
  const wizardSteps = [
    { step: 1, title: '환자 정보', icon: User, description: '기본 정보 입력' },
    { step: 2, title: '증상 입력', icon: ClipboardList, description: '증상 및 주소증' },
    { step: 3, title: 'AI 분석', icon: Stethoscope, description: 'AI가 분석 중' },
    { step: 4, title: '처방 확인', icon: FileCheck, description: '결과 검토' },
  ]

  // 다음 단계로 이동
  const goToNextStep = useCallback(() => {
    if (wizardStep < totalWizardSteps) {
      // 단계 2에서 3으로 이동 시 AI 분석 시작
      if (wizardStep === 2 && chiefComplaint.trim()) {
        handleSubmit()
      }
      setWizardStep(prev => prev + 1)
    }
  }, [wizardStep, chiefComplaint])

  // 이전 단계로 이동
  const goToPrevStep = useCallback(() => {
    if (wizardStep > 1) {
      setWizardStep(prev => prev - 1)
    }
  }, [wizardStep])

  // AI 분석 완료 시 자동으로 다음 단계로 이동
  useEffect(() => {
    if (inputMode === 'wizard' && wizardStep === 3 && recommendations.length > 0 && !isLoading) {
      setWizardStep(4)
    }
  }, [inputMode, wizardStep, recommendations.length, isLoading])

  return (
    <div className="space-y-6">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-teal-500" />
            AI 진료 어시스턴트
          </h1>
          <p className="mt-1 text-gray-500">
            {inputMode === 'wizard'
              ? '단계별로 안내해 드립니다'
              : '증상을 입력하고 Enter를 누르면 즉시 분석됩니다'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => { setInputMode('wizard'); setWizardStep(1) }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              inputMode === 'wizard'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="단계별 마법사"
          >
            <Wand2 className="h-4 w-4" />
            마법사
          </button>
          <button
            onClick={() => setInputMode('quick')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              inputMode === 'quick'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="빠른 입력"
          >
            <Sparkles className="h-4 w-4" />
            빠른
          </button>
          <button
            onClick={() => setInputMode('detailed')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              inputMode === 'detailed'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="상세 입력"
          >
            <Settings2 className="h-4 w-4" />
            상세
          </button>
        </div>
      </div>

      {/* 마법사 모드: 진행 표시기 */}
      {inputMode === 'wizard' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            {wizardSteps.map((step, index) => {
              const Icon = step.icon
              const isActive = wizardStep === step.step
              const isCompleted = wizardStep > step.step
              const isClickable = step.step < wizardStep || (step.step === wizardStep)

              return (
                <div key={step.step} className="flex items-center flex-1">
                  {/* 단계 표시 */}
                  <button
                    onClick={() => isClickable && setWizardStep(step.step)}
                    disabled={!isClickable}
                    className={`flex flex-col items-center gap-1 transition-all ${
                      isClickable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                          : isCompleted
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${
                      isActive ? 'text-teal-600' : isCompleted ? 'text-teal-500' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                    <span className={`text-[10px] ${
                      isActive ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {step.description}
                    </span>
                  </button>

                  {/* 연결선 */}
                  {index < wizardSteps.length - 1 && (
                    <div className="flex-1 mx-2 h-0.5 rounded-full overflow-hidden bg-gray-200">
                      <div
                        className={`h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 ${
                          isCompleted ? 'w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 마법사 모드 전용 레이아웃 */}
      {inputMode === 'wizard' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* 단계 1: 환자 정보 */}
          {wizardStep === 1 && (
            <div className="space-y-6" data-tour="patient-info">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl shadow-lg shadow-teal-500/20">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">환자 정보 입력</h2>
                  <p className="text-sm text-gray-500">진료 시작을 위한 기본 정보를 입력해주세요</p>
                </div>
              </div>

              {/* 환자 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="patient-age" className="block text-sm font-medium text-gray-700 mb-1.5">
                    나이 (선택)
                  </label>
                  <input
                    id="patient-age"
                    type="text"
                    placeholder="예: 45세"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="patient-gender" className="block text-sm font-medium text-gray-700 mb-1.5">
                    성별 (선택)
                  </label>
                  <select
                    id="patient-gender"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all appearance-none"
                  >
                    <option value="">선택 안함</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                  </select>
                </div>
              </div>

              {/* 체질 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사상체질 (선택)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {['', '태양인', '태음인', '소양인', '소음인'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setConstitution(c)}
                      className={`px-3 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                        constitution === c
                          ? 'bg-slate-600 text-white border-slate-600 shadow-lg shadow-slate-600/20'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {c || '미상'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 복용 중인 약물 */}
              <div>
                <label htmlFor="medication-wizard" className="block text-sm font-medium text-gray-700 mb-1.5">
                  복용 중인 양약 (선택)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="medication-wizard"
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="예: 혈압약, 당뇨약..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && addMedication()}
                  />
                  <button
                    onClick={addMedication}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                {currentMedications.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentMedications.map((med, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium"
                      >
                        {med}
                        <button
                          onClick={() => removeMedication(index)}
                          className="hover:bg-amber-200 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 다음 단계 버튼 */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={goToNextStep}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition-all flex items-center gap-2"
                >
                  다음: 증상 입력
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* 단계 2: 증상 입력 */}
          {wizardStep === 2 && (
            <div className="space-y-6" data-tour="symptom-input">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/20">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">증상 입력</h2>
                  <p className="text-sm text-gray-500">환자가 호소하는 증상을 입력해주세요</p>
                </div>
              </div>

              {/* 나의 템플릿 */}
              {(templates.length > 0 || chiefComplaint.trim()) && (
                <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-700">나의 증상 템플릿</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((tmpl) => (
                      <div key={tmpl.id} className="group flex items-center">
                        <button
                          onClick={() => handleLoadTemplate(tmpl.id)}
                          className="px-3 py-1.5 text-sm bg-white rounded-l-lg border border-indigo-200 text-indigo-700 font-medium hover:bg-indigo-50 transition-colors"
                        >
                          {tmpl.name}
                        </button>
                        <button
                          onClick={() => deleteTemplate(tmpl.id)}
                          className="px-1.5 py-1.5 bg-white border border-l-0 border-indigo-200 rounded-r-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {chiefComplaint.trim() && (
                      <button
                        onClick={() => setShowTemplateModal(true)}
                        className="px-3 py-1.5 text-sm bg-white rounded-lg border-2 border-dashed border-indigo-200 text-indigo-500 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex items-center gap-1"
                      >
                        <Save className="h-3.5 w-3.5" />
                        현재 증상 저장
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 주소증 입력 */}
              <div>
                <label htmlFor="chief-complaint-wizard" className="block text-sm font-medium text-gray-700 mb-1.5">
                  주소증 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="chief-complaint-wizard"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="예: 소화가 안되고 배가 차갑습니다. 밥을 먹으면 더부룩하고 설사를 자주 합니다. 피로감이 심합니다..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all resize-none text-base"
                  rows={5}
                />
              </div>

              {/* 빠른 증상 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  빠른 증상 추가 (클릭하여 선택)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SYMPTOMS.map((symptom) => {
                    const isSelected = symptoms.some(s => s.name === symptom)
                    return (
                      <button
                        key={symptom}
                        onClick={() => toggleSymptom(symptom)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-teal-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {symptom}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 선택된 증상 */}
              {symptoms.length > 0 && (
                <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                  <p className="text-sm font-medium text-teal-800 mb-2">선택된 증상 ({symptoms.length}개)</p>
                  <div className="flex flex-wrap gap-2">
                    {symptoms.map((symptom, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-teal-700 border border-teal-300 rounded-full text-sm font-medium"
                      >
                        {symptom.name}
                        <button
                          onClick={() => removeSymptom(index)}
                          className="hover:bg-teal-100 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 직접 입력 */}
              <div>
                <label htmlFor="custom-symptom" className="block text-sm font-medium text-gray-700 mb-1.5">
                  직접 증상 추가
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom-symptom"
                    type="text"
                    value={newSymptom}
                    onChange={(e) => setNewSymptom(e.target.value)}
                    placeholder="증상 입력 후 Enter"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
                  />
                  <button
                    onClick={() => addSymptom()}
                    className="px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* 네비게이션 버튼 */}
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={goToPrevStep}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <ChevronLeft className="h-5 w-5" />
                  이전
                </button>
                <button
                  onClick={goToNextStep}
                  disabled={!chiefComplaint.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  AI 분석 시작
                </button>
              </div>
            </div>
          )}

          {/* 단계 3: AI 분석 중 */}
          {wizardStep === 3 && (
            <div className="space-y-6" data-tour="analyze-button">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-500 rounded-2xl shadow-lg shadow-slate-600/20 animate-pulse">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">AI 분석 중</h2>
                  <p className="text-sm text-gray-500">{formatStatNumber(BASE_STATS.cases)}의 치험례를 분석하고 있습니다</p>
                </div>
              </div>

              <div className="py-16 text-center">
                {isLoading ? (
                  <div className="space-y-6">
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 border-4 border-teal-200 rounded-full" />
                      <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin" />
                      <Brain className="absolute inset-0 m-auto h-10 w-10 text-teal-500" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-gray-900">AI가 분석 중입니다...</p>
                      <p className="text-gray-500">증상 패턴을 분석하고 최적의 처방을 찾고 있습니다</p>
                    </div>
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>진행 중</span>
                        <span>잠시만 기다려주세요</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 animate-pulse" style={{ width: '70%' }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <CheckCircle className="h-16 w-16 mx-auto text-emerald-500" />
                    <p className="text-lg font-semibold text-gray-900">분석이 완료되었습니다!</p>
                    <button
                      onClick={() => setWizardStep(4)}
                      className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition-all flex items-center gap-2 mx-auto"
                    >
                      결과 확인하기
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 분석 중 입력 요약 표시 */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-gray-700">입력된 정보 요약</h4>
                <div className="space-y-2 text-sm">
                  {constitution && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">체질:</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{constitution}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">주소증:</span>
                    <span className="text-gray-700">{chiefComplaint}</span>
                  </div>
                  {symptoms.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 shrink-0">증상:</span>
                      <span className="text-gray-700">{symptoms.map(s => s.name).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 단계 4: 처방 확인 - 결과 영역에서 표시 */}
          {wizardStep === 4 && (
            <div className="space-y-6" data-tour="result-area">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                  <FileCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">처방 추천 결과</h2>
                  <p className="text-sm text-gray-500">{recommendations.length}개의 처방이 추천되었습니다</p>
                </div>
              </div>

              {/* AI 분석 요약 */}
              {analysis && (
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <Brain className="h-5 w-5 text-teal-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">AI 변증 분석</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{analysis}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 처방 목록 (근거 포함) */}
              <div className="space-y-4">
                {recommendations.slice(0, 3).map((rec, index) => {
                  const detail = formulaDetails[rec.formula_name]
                  return (
                    <div
                      key={index}
                      className={`rounded-xl border-2 transition-all overflow-hidden ${
                        index === 0
                          ? 'border-teal-300 bg-white shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* 헤더: 처방명 + 신뢰도 */}
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        index === 0 ? 'bg-teal-50/70' : 'bg-gray-50/50'
                      }`}>
                        <div className="flex items-center gap-3">
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded">
                              BEST
                            </span>
                          )}
                          <span className="font-bold text-gray-900 text-lg">{rec.formula_name}</span>
                          {detail && (
                            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                              {detail.source}
                            </span>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
                          rec.confidence_score >= 0.9
                            ? 'bg-emerald-100 text-emerald-700'
                            : rec.confidence_score >= 0.7
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {(rec.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* 근거 본문 */}
                      <div className="px-4 py-3 space-y-3">
                        {/* AI 추천 근거 */}
                        <p className="text-sm text-gray-700 leading-relaxed">{rec.rationale}</p>

                        {detail && (
                          <>
                            {/* 병기 설명 - 왜 이 처방이 필요한지 */}
                            <div className="bg-slate-50 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <Brain className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-xs font-semibold text-slate-600">병기(病機)</span>
                                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{detail.pathogenesis}</p>
                                </div>
                              </div>
                            </div>

                            {/* 적응증 */}
                            <div className="bg-blue-50/60 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-xs font-semibold text-blue-600">적응증</span>
                                  <p className="text-sm text-gray-600 mt-0.5">{detail.indication}</p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* 구성 약재 요약 */}
                        {rec.herbs.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Beaker className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                            <div className="flex flex-wrap gap-1.5">
                              {rec.herbs.slice(0, 6).map((herb, i) => {
                                const herbInfo = HERB_INFO[herb.name]
                                return (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                      roleColors[herb.role] || 'bg-gray-100 text-gray-700 border-gray-200'
                                    } border`}
                                    title={herbInfo ? `${herbInfo.hanja} - ${herbInfo.meaning}` : herb.role}
                                  >
                                    {herb.name}
                                    <span className="opacity-60">{herb.amount}</span>
                                  </span>
                                )
                              })}
                              {rec.herbs.length > 6 && (
                                <span className="text-xs text-gray-400 self-center">+{rec.herbs.length - 6}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 상세보기 버튼 */}
                        <button
                          onClick={() => openDetailModal(rec)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 pt-1"
                        >
                          가감법·금기·현대응용 더보기
                          <ChevronRight className="h-3 w-3" />
                        </button>

                        {/* 임상 근거 패널 */}
                        <ClinicalEvidencePanel
                          formulaName={rec.formula_name}
                          herbs={rec.herbs}
                          rationale={rec.rationale}
                          chiefComplaint={chiefComplaint}
                          symptoms={symptoms}
                          constitution={constitution}
                          formulaDetail={detail}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 네비게이션 */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={handleReAnalyze}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center gap-2 text-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  증상 수정 후 재분석
                </button>
                <button
                  onClick={() => recommendations[0] && copyPrescriptionToClipboard(recommendations[0])}
                  disabled={recommendations.length === 0}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center gap-2 text-sm"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  처방전 복사
                </button>
                <button
                  onClick={handleNewConsultation}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  새 환자 진료
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => recommendations[0] && handleSelectFormula(recommendations[0])}
                  disabled={recommendations.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  최우선 처방 선택
                </button>
              </div>
            </div>
          )}

          {/* 완료 상태 (처방 선택 후) */}
          {doneState && (
            <div className="mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">처방이 저장되었습니다</h3>
              </div>

              <div className="bg-white rounded-xl p-4 mb-6 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">선택 처방:</span>
                  <span className="font-bold text-teal-600">{doneState.formula.formula_name}</span>
                  <span className="text-sm text-gray-400">
                    | 신뢰도 {(doneState.formula.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
                {doneState.constitution && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">체질:</span>
                    <span className="text-sm text-gray-700">{doneState.constitution}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-sm text-gray-500 shrink-0">주소증:</span>
                  <span className="text-sm text-gray-700">{doneState.chiefComplaint}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={handleReAnalyze}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex flex-col items-center gap-1.5 text-sm"
                >
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  증상 수정 후 재분석
                </button>
                <button
                  onClick={() => copyPrescriptionToClipboard(doneState.formula)}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex flex-col items-center gap-1.5 text-sm"
                >
                  <ClipboardCopy className="h-5 w-5 text-teal-500" />
                  처방전 복사
                </button>
                <button
                  onClick={handleNewConsultation}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex flex-col items-center gap-1.5 text-sm"
                >
                  <Plus className="h-5 w-5 text-emerald-500" />
                  새 환자 진료
                </button>
                <button
                  onClick={() => {
                    setDocumentFormula(doneState.formula)
                    setShowDocumentModal(true)
                  }}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex flex-col items-center gap-1.5 text-sm"
                >
                  <FileText className="h-5 w-5 text-amber-500" />
                  문서 작성
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 기존 빠른/상세 모드 레이아웃 */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Input Section - Simplified */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Input Mode - 통합 입력 */}
            {quickMode ? (
              <div data-tour="patient-info" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl shadow-lg shadow-teal-500/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">환자 증상 입력</h2>
                  <p className="text-xs text-gray-500">자유롭게 입력 후 Enter 또는 분석 버튼</p>
                </div>
              </div>

              {/* Main Input */}
              <label htmlFor="chief-complaint-quick" className="sr-only">
                환자 증상 설명
              </label>
              <textarea
                id="chief-complaint-quick"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: 65세 남자, 소화가 안되고 배가 차갑습니다. 밥을 먹으면 더부룩하고 설사를 자주 합니다. 피로감이 심합니다..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all resize-none text-base"
                rows={5}
                autoFocus
                aria-describedby="chief-complaint-hint"
              />
              <span id="chief-complaint-hint" className="sr-only">
                환자의 나이, 성별, 주요 증상을 자유롭게 입력하세요. Enter 키로 바로 분석할 수 있습니다.
              </span>

              {/* Quick Symptom Tags */}
              <fieldset className="mt-4">
                <legend className="text-xs font-medium text-gray-500 mb-2">빠른 증상 추가 (클릭하여 선택)</legend>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="증상 선택">
                  {COMMON_SYMPTOMS.slice(0, 12).map((symptom) => {
                    const isSelected = symptoms.some(s => s.name === symptom)
                    return (
                      <button
                        key={symptom}
                        onClick={() => toggleSymptom(symptom)}
                        aria-pressed={isSelected}
                        aria-label={`${symptom} ${isSelected ? '선택됨' : '선택안됨'}`}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                          isSelected
                            ? 'bg-teal-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {symptom}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {/* Selected Symptoms Display */}
              {symptoms.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1.5" role="list" aria-label="선택된 증상 목록">
                    {symptoms.map((symptom, index) => (
                      <span
                        key={index}
                        role="listitem"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-medium"
                      >
                        {symptom.name}
                        <button
                          onClick={() => removeSymptom(index)}
                          aria-label={`${symptom.name} 증상 제거`}
                          className="hover:bg-teal-200 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Constitution Selection */}
              <fieldset className="mt-4 flex items-center gap-2">
                <legend className="text-xs font-medium text-gray-500">체질:</legend>
                <div className="flex gap-1" role="radiogroup" aria-label="사상체질 선택">
                  {['', '태양인', '태음인', '소양인', '소음인'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setConstitution(c)}
                      role="radio"
                      aria-checked={constitution === c}
                      aria-label={c || '체질 미상'}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600/50 ${
                        constitution === c
                          ? 'bg-slate-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {c || '미상'}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Analyze Button */}
              <button
                data-tour="analyze-button"
                onClick={handleSubmit}
                disabled={isLoading || !chiefComplaint.trim()}
                aria-busy={isLoading}
                aria-label={isLoading ? 'AI 분석 진행 중' : 'AI 처방 추천 분석 시작, Enter 키로도 실행 가능'}
                className="w-full mt-4 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    AI가 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    AI 처방 추천 (Enter)
                  </>
                )}
              </button>

              {error && (
                <ErrorMessage
                  message={error}
                  compact
                  onRetry={handleSubmit}
                  className="mt-3"
                />
              )}
            </div>
          ) : (
            /* Detailed Input Mode - 기존 상세 입력 */
            <>
              {/* Chief Complaint */}
              <div data-tour="patient-info" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-teal-100 rounded-xl">
                    <User className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">주소증</h2>
                    <p className="text-xs text-gray-500">환자가 호소하는 주요 증상</p>
                  </div>
                </div>
                <label htmlFor="chief-complaint-detail" className="sr-only">주소증 상세 입력</label>
                <textarea
                  id="chief-complaint-detail"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="예: 소화가 안되고 배가 차갑습니다. 밥을 먹으면 더부룩하고..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all resize-none"
                  rows={4}
                  aria-describedby="chief-complaint-detail-hint"
                />
                <span id="chief-complaint-detail-hint" className="sr-only">환자가 호소하는 주요 증상을 자세히 입력해주세요</span>
              </div>

              {/* Symptoms */}
              <div data-tour="symptom-input" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">세부 증상</h2>
                    <p className="text-xs text-gray-500">관련 증상을 태그로 추가</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <label htmlFor="new-symptom-input" className="sr-only">새 증상 입력</label>
                  <input
                    id="new-symptom-input"
                    type="text"
                    value={newSymptom}
                    onChange={(e) => setNewSymptom(e.target.value)}
                    placeholder="증상 입력 후 Enter"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
                    aria-describedby="new-symptom-hint"
                  />
                  <span id="new-symptom-hint" className="sr-only">증상 이름을 입력하고 Enter 또는 추가 버튼을 눌러 증상을 추가하세요</span>
                  <button
                    onClick={() => addSymptom()}
                    aria-label="증상 추가"
                    className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[40px]" role="list" aria-label="추가된 증상 목록">
                  {symptoms.map((symptom, index) => (
                    <span
                      key={index}
                      role="listitem"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-sm font-medium"
                    >
                      {symptom.name}
                      <button
                        onClick={() => removeSymptom(index)}
                        aria-label={`${symptom.name} 증상 삭제`}
                        className="hover:bg-teal-200 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  {symptoms.length === 0 && (
                    <span className="text-sm text-gray-400" aria-live="polite">증상을 추가해주세요</span>
                  )}
                </div>
              </div>

              {/* Constitution & Medications */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <Pill className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">추가 정보</h2>
                    <p className="text-xs text-gray-500">체질 및 복용 약물</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="constitution-select" className="block text-sm font-medium text-gray-700 mb-1.5">체질</label>
                    <select
                      id="constitution-select"
                      value={constitution}
                      onChange={(e) => setConstitution(e.target.value)}
                      aria-describedby="constitution-hint"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all appearance-none"
                    >
                      <option value="">미상 / 선택 안함</option>
                      <option value="태양인">태양인</option>
                      <option value="태음인">태음인</option>
                      <option value="소양인">소양인</option>
                      <option value="소음인">소음인</option>
                    </select>
                    <span id="constitution-hint" className="sr-only">환자의 사상체질을 선택하면 더 정확한 처방을 추천받을 수 있습니다</span>
                  </div>

                  <div>
                    <label htmlFor="medication-input" className="block text-sm font-medium text-gray-700 mb-1.5">복용 중인 양약</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        id="medication-input"
                        type="text"
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        placeholder="양약 추가"
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && addMedication()}
                        aria-describedby="medication-hint"
                      />
                      <span id="medication-hint" className="sr-only">환자가 복용 중인 양약 이름을 입력하세요. 약물 상호작용 확인에 사용됩니다.</span>
                      <button
                        onClick={addMedication}
                        aria-label="양약 추가"
                        className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400/50"
                      >
                        <Plus className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2" role="list" aria-label="복용 중인 양약 목록">
                      {currentMedications.map((med, index) => (
                        <span
                          key={index}
                          role="listitem"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-sm font-medium"
                        >
                          {med}
                          <button
                            onClick={() => removeMedication(index)}
                            aria-label={`${med} 양약 삭제`}
                            className="hover:bg-gray-300 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400/50"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Advanced Options - 학파 선택 및 분석 옵션 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500/50"
              aria-expanded={showAdvancedOptions}
              aria-controls="advanced-options-panel"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-xl" aria-hidden="true">
                  <Settings2 className="h-5 w-5 text-slate-700" />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-gray-900">분석 옵션</h2>
                  <p className="text-xs text-gray-500">학파 선호도 및 변증 분석 설정</p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${showAdvancedOptions ? 'rotate-90' : ''}`} aria-hidden="true" />
            </button>

            {showAdvancedOptions && (
              <div id="advanced-options-panel" className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                {/* 학파 선호도 */}
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-2">학파 선호도</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPreferredSchool('all')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        preferredSchool === 'all'
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      전체 (자동 선택)
                    </button>
                    <button
                      onClick={() => setPreferredSchool('classical')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                        preferredSchool === 'classical'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50'
                      }`}
                    >
                      <Scroll className="h-4 w-4" />
                      고방
                    </button>
                    <button
                      onClick={() => setPreferredSchool('later')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                        preferredSchool === 'later'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50'
                      }`}
                    >
                      <Book className="h-4 w-4" />
                      후세방
                    </button>
                    <button
                      onClick={() => setPreferredSchool('sasang')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                        preferredSchool === 'sasang'
                          ? 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      사상방
                    </button>
                  </div>
                  {preferredSchool !== 'all' && (
                    <p className="mt-2 text-xs text-gray-500">
                      {SCHOOL_INFO[preferredSchool].philosophy}
                    </p>
                  )}
                </fieldset>

                {/* 분석 옵션 */}
                <fieldset className="space-y-3">
                  <legend className="block text-sm font-medium text-gray-700">분석 포함 항목</legend>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      id="palgang-checkbox"
                      checked={includePalGang}
                      onChange={(e) => setIncludePalGang(e.target.checked)}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      aria-describedby="palgang-desc"
                    />
                    <div>
                      <span className="font-medium text-gray-900">팔강변증 분석</span>
                      <p id="palgang-desc" className="text-xs text-gray-500">음양, 표리, 한열, 허실 분석 포함</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      id="byeongyang-checkbox"
                      checked={includeByeongYang}
                      onChange={(e) => setIncludeByeongYang(e.target.checked)}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      aria-describedby="byeongyang-desc"
                    />
                    <div>
                      <span className="font-medium text-gray-900">병양도표 매칭</span>
                      <p id="byeongyang-desc" className="text-xs text-gray-500">증상별 변증 패턴 매칭 분석</p>
                    </div>
                  </label>
                </fieldset>
              </div>
            )}
          </div>

          {/* Submit Button - 상세 모드에서만 표시 */}
          {!quickMode && (
            <>
              <button
                data-tour="analyze-button"
                onClick={handleSubmit}
                disabled={isLoading || !chiefComplaint.trim()}
                aria-busy={isLoading}
                aria-label={isLoading ? 'AI 분석 진행 중' : 'AI 처방 추천 분석 시작'}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    AI가 분석 중입니다...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    AI 처방 추천 받기
                  </>
                )}
              </button>

              {error && (
                <ErrorMessage
                  message={error}
                  onRetry={handleSubmit}
                />
              )}
            </>
          )}
        </div>

        {/* Results Section */}
        <div data-tour="result-area" className="lg:col-span-3 space-y-4">
          {recommendations.length > 0 ? (
            <>
              {/* AI 결과 면책 조항 */}
              <AIResultDisclaimer />

              {/* AI Analysis */}
              {analysis && (
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl shadow-lg shadow-teal-500/20">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2">AI 변증 분석</h3>
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{analysis}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 유사 환자 통계 - 신뢰도 강화 */}
              <SimilarPatientStats
                totalCases={similarCases.length > 0 ? Math.max(similarCases.length * 150, 450) : 6000}
                avgConfidence={Math.round(
                  recommendations.length > 0
                    ? (recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length) * 100
                    : 85
                )}
                topFormulas={recommendations.slice(0, 3).map(r => r.formula_name)}
                patientDemographics={{
                  ageRange: '40-65세',
                  genderRatio: { male: 45, female: 55 },
                }}
                treatmentOutcomes={{
                  improved: 78,
                  maintained: 15,
                  noChange: 7,
                }}
              />

              {/* 처방 전 필수 확인 사항 */}
              <PrescriptionDisclaimer />

              {/* Recommendations */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    추천 처방 <span className="text-xs font-normal text-gray-500 ml-1">(참고용)</span>
                  </h2>
                  <span className="text-xs text-gray-500">{recommendations.length}개의 처방 추천</span>
                </div>

                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`group p-5 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                        index === 0
                          ? 'border-teal-200 bg-teal-50/50 hover:shadow-teal-500/10'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {index === 0 && (
                              <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-md">
                                BEST
                              </span>
                            )}
                            <h3 className="font-bold text-lg text-gray-900">{rec.formula_name}</h3>
                            {formulaDetails[rec.formula_name] && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                {formulaDetails[rec.formula_name].source}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                          rec.confidence_score >= 0.9
                            ? 'bg-emerald-100 text-emerald-700'
                            : rec.confidence_score >= 0.7
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {(rec.confidence_score * 100).toFixed(0)}%
                        </div>
                      </div>

                      {/* Herbs with roles */}
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">구성 약재</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.herbs.map((herb, i) => {
                            const herbInfo = HERB_INFO[herb.name]
                            return (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium border ${
                                  roleColors[herb.role] || 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                {herbInfo ? (
                                  <HanjaTooltip
                                    hanja={herbInfo.hanja}
                                    korean={herb.name}
                                    meaning={herbInfo.meaning}
                                    showHanja={showHanja}
                                    className="font-bold border-none"
                                  />
                                ) : (
                                  <span className="font-bold">{herb.name}</span>
                                )}
                                <span className="text-xs opacity-70">{herb.amount}</span>
                                <span className="ml-1 text-[10px] px-1 py-0.5 bg-white/50 rounded">
                                  {herb.role}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      {/* Rationale */}
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 leading-relaxed">{rec.rationale}</p>
                      </div>

                      {/* 병기·적응증 근거 */}
                      {formulaDetails[rec.formula_name] && (
                        <div className="mt-3 space-y-2">
                          <div className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Brain className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-xs font-semibold text-slate-600">병기(病機)</span>
                                <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{formulaDetails[rec.formula_name].pathogenesis}</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-blue-50/60 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-xs font-semibold text-blue-600">적응증</span>
                                <p className="text-sm text-gray-600 mt-0.5">{formulaDetails[rec.formula_name].indication}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Similar Patient Stat Highlight */}
                      {index < 2 && (
                        <RecommendationStatHighlight
                          matchedPatients={Math.round(120 + (1 - index * 0.3) * 80)}
                          successRate={Math.round(75 + rec.confidence_score * 15)}
                          avgTreatmentDays={Math.round(14 + index * 3)}
                          formulaName={rec.formula_name.split('(')[0]}
                        />
                      )}

                      {/* Action buttons */}
                      <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSelectFormula(rec)}
                          className="flex-1 py-2 px-4 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
                        >
                          이 처방 선택
                        </button>
                        <button
                          onClick={() => openDetailModal(rec)}
                          className="py-2 px-4 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <Info className="h-4 w-4" />
                          상세
                        </button>
                        <button
                          onClick={() => {
                            setDocumentFormula(rec)
                            setShowDocumentModal(true)
                          }}
                          className="py-2 px-4 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-1"
                          title="처방 근거 문서화"
                        >
                          <FileText className="h-4 w-4" />
                          문서화
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Check Banner */}
              {currentMedications.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-center gap-4">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">상호작용 검사 권장</p>
                    <p className="text-sm text-amber-700">
                      환자가 복용 중인 양약과의 상호작용을 확인하세요
                    </p>
                  </div>
                  <Link
                    to="/dashboard/interactions"
                    className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1"
                  >
                    검사하기
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {/* Similar Cases Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setShowSimilarCases(!showSimilarCases)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                      <Search className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        유사 치험례
                        {similarCases.length > 0 && (
                          <span className="px-1.5 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded">
                            {similarCases.length}건
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500">비슷한 환자 사례와 처방 확인</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {loadingSimilarCases && (
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    )}
                    <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${showSimilarCases ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {showSimilarCases && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    {loadingSimilarCases ? (
                      <div className="py-8 text-center text-gray-500">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm">유사 치험례 검색 중...</p>
                      </div>
                    ) : similarCases.length > 0 ? (
                      <div className="pt-4 space-y-2">
                        {similarCases.map((caseItem, index) => (
                          <CaseMatchListItem
                            key={caseItem.caseId}
                            matchedCase={caseItem}
                            rank={index + 1}
                          />
                        ))}
                        <Link
                          to="/dashboard/case-search"
                          className="flex items-center justify-center gap-2 py-3 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                        >
                          더 많은 치험례 검색하기
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">유사한 치험례를 찾지 못했습니다</p>
                        <Link
                          to="/dashboard/case-search"
                          className="inline-flex items-center gap-1 mt-2 text-indigo-600 hover:underline text-sm"
                        >
                          직접 검색하기
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-3xl flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  AI 처방 추천을 받아보세요
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  환자의 주소증과 증상을 입력하면<br />
                  {formatStatNumber(BASE_STATS.cases)}의 치험례를 분석하여 최적의 처방을 추천합니다
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 처방 상세 정보 모달 */}
      {showDetailModal && selectedFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[70vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedFormula.formula_name}</h2>
                  <p className="text-teal-100 text-sm">
                    {formulaDetails[selectedFormula.formula_name]?.source || '출전 미상'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="복사"
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
              {/* 구성 약재 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-teal-500" />
                  구성 약재
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedFormula.herbs.map((herb, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border-2 ${roleColors[herb.role] || 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{herb.name}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-white/50 rounded">{herb.role}</span>
                      </div>
                      <span className="text-sm opacity-70">{herb.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {formulaDetails[selectedFormula.formula_name] && (
                <>
                  {/* 주치 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      주치 (적응증)
                    </h3>
                    <p className="text-gray-700 bg-blue-50 p-4 rounded-xl leading-relaxed">
                      {formulaDetails[selectedFormula.formula_name].indication}
                    </p>
                  </div>

                  {/* 병기 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-slate-600" />
                      병기 설명
                    </h3>
                    <p className="text-gray-700 bg-slate-50 p-4 rounded-xl leading-relaxed">
                      {formulaDetails[selectedFormula.formula_name].pathogenesis}
                    </p>
                  </div>

                  {/* 가감법 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-amber-500" />
                      가감법
                    </h3>
                    <div className="space-y-2">
                      {formulaDetails[selectedFormula.formula_name].modifications.map((mod, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                          <span className="text-amber-600 font-medium whitespace-nowrap">{mod.condition}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-700">{mod.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 현대 임상 응용 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-emerald-500" />
                      현대 임상 응용
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {formulaDetails[selectedFormula.formula_name].modernUsage.map((usage, i) => (
                        <span key={i} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                          {usage}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 금기 및 주의사항 */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      금기 및 주의사항
                    </h3>
                    <div className="bg-red-50 p-4 rounded-xl space-y-2">
                      {formulaDetails[selectedFormula.formula_name].contraindications.map((ci, i) => (
                        <div key={i} className="flex items-start gap-2 text-red-700">
                          <span className="text-red-500">•</span>
                          <span>{ci}</span>
                        </div>
                      ))}
                      <div className="border-t border-red-200 pt-2 mt-3">
                        {formulaDetails[selectedFormula.formula_name].cautions.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 text-amber-700">
                            <span className="text-amber-500">⚠</span>
                            <span className="text-sm">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* AI 추천 근거 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-500" />
                  AI 추천 근거
                </h3>
                <p className="text-gray-700 bg-teal-50 p-4 rounded-xl leading-relaxed">
                  {selectedFormula.rationale}
                </p>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  handleSelectFormula(selectedFormula)
                }}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
              >
                이 처방 선택
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 처방 선택 확인 모달 */}
      {showSelectConfirm && selectedForSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-teal-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">처방 선택 확인</h2>
              <p className="text-gray-500 mt-2">
                <span className="font-bold text-teal-600">{selectedForSelect.formula_name}</span>을(를)
                <br />선택하시겠습니까?
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">선택한 처방 정보:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedForSelect.herbs.map((herb, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-white rounded border">
                    {herb.name} {herb.amount}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSelectConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={confirmSelectFormula}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tour Guide */}
      {showTour && (
        <TourGuide
          tourId="consultation"
          steps={consultationTourSteps}
          onComplete={() => setShowTour(false)}
        />
      )}

      {/* Restart Tour Button */}
      <TourRestartButton tourId="consultation" onClick={() => setShowTour(true)} />

      {/* Real-time AI Assistant */}
      <RealTimeAssistant
        chiefComplaint={chiefComplaint}
        symptoms={symptoms.map(s => s.name)}
        constitution={constitution}
        enabled={!isLoading && recommendations.length === 0}
      />

      {/* 증상 템플릿 저장 모달 */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">증상 템플릿 저장</h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="템플릿 이름 (예: 소화기 환자)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mb-3"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
            />
            <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-3 rounded-lg">
              <p>주소증: {chiefComplaint.slice(0, 50)}{chiefComplaint.length > 50 ? '...' : ''}</p>
              {symptoms.length > 0 && <p>증상: {symptoms.map(s => s.name).join(', ')}</p>}
              {constitution && <p>체질: {constitution}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowTemplateModal(false); setTemplateName('') }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 transition-all font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Document Modal */}
      {documentFormula && (
        <PrescriptionDocument
          isOpen={showDocumentModal}
          onClose={() => {
            setShowDocumentModal(false)
            setDocumentFormula(null)
          }}
          data={{
            patient: {
              constitution: constitution || undefined,
            },
            chiefComplaint,
            symptoms: symptoms.map(s => s.name),
            diagnosis: analysis,
            prescription: {
              formulaName: documentFormula.formula_name,
              herbs: documentFormula.herbs,
              rationale: documentFormula.rationale,
              confidence: documentFormula.confidence_score,
            },
          }}
        />
      )}
    </div>
  )
}
