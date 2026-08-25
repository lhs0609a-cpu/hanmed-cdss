import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useSEO, PAGE_SEO } from '@/hooks/useSEO'
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
  Zap,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createMyVisit } from '@/services/myPatients'
import {
  shareCase,
  toAgeRange,
  toGenderLabel,
  type CaseCategory,
} from '@/services/caseSharing'
import { MedicineSchool, SCHOOL_INFO } from '@/types'
import api from '@/services/api'
import { logError } from '@/lib/errors'
import { ErrorMessage } from '@/components/common'
import TourGuide, { TourRestartButton } from '@/components/common/TourGuide'
import { CaseMatchListItem } from '@/components/case-match'
import { SimilarCaseSuccessCard } from '@/components/diagnosis/SimilarCaseSuccessCard'
import type { MatchedCase } from '@/types/case-search'
import { transformCaseSearchResponse } from '@/types/case-search'
import { HanjaTooltip, useHanjaSettings } from '@/components/hanja'
import { RealTimeAssistant } from '@/components/assistant/RealTimeAssistant'
import { PrescriptionDocument } from '@/components/documentation/PrescriptionDocument'
import { AIResultDisclaimer, PrescriptionDisclaimer } from '@/components/common/MedicalDisclaimer'
import { printPrescription } from '@/lib/prescriptionPrint'
import { useAuthStore } from '@/stores/authStore'
import { Printer } from 'lucide-react'
import { Toss3DIcon } from '@/components/common/Toss3DIcon'

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
  /** 고전 출전 등 근거 출처 */
  source?: string
  /** 이 후보의 근거가 된 유사 치험례 id */
  caseRefs?: string[]
}

/** 추천의 1차 근거로 쓰인 실제 치험례. 비어 있으면 "근거 없이 나온 추천"이다. */
interface GroundingCase {
  caseId: string
  title: string
  summary: string
  formulaName: string
  outcome: string
  matchPercent?: number
}

/**
 * 적합도 등급.
 *
 * confidence_score 는 임상 성공률이 아니라 AI 가 스스로 매긴 확신도(출전 누락 시 감점)다.
 * "85%" 처럼 소수점 없는 백분율로 크게 띄우면 통계적 근거가 있는 수치로 읽히므로,
 * 3단계 등급으로 낮춰 표기하고 원 수치는 툴팁에서만 확인할 수 있게 한다.
 */
const CONFIDENCE_DEFINITION =
  'AI 가 근거 자료와의 일치도를 스스로 평가한 값입니다. 임상 성공률이나 치료 효과를 뜻하지 않습니다.'

function confidenceBand(score: number): { label: string; tone: string } {
  if (score >= 0.8) return { label: '높음', tone: 'text-blue-700 bg-blue-50 border-blue-200' }
  if (score >= 0.6) return { label: '보통', tone: 'text-neutral-700 bg-neutral-100 border-neutral-200' }
  return { label: '낮음', tone: 'text-amber-800 bg-amber-50 border-amber-200' }
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


// 신규 사용자 "30초 체험"용 예시 케이스 — 비위기허 소화불량 (아하 경로가 잘 살아나는 대표 증례)
const EXAMPLE_CASE = {
  age: '45세',
  gender: 'male',
  constitution: '태음인',
  chiefComplaint: '3개월 전부터 소화가 잘 안 되고 식후 더부룩하며 오후만 되면 기력이 없습니다.',
  symptoms: [
    { name: '소화불량', severity: 6 },
    { name: '피로', severity: 6 },
    { name: '식욕부진', severity: 5 },
  ] as Symptom[],
}

export default function ConsultationPage() {
  useSEO(PAGE_SEO.consultation)

  const { showHanja } = useHanjaSettings()
  const { toast } = useToast()
  const currentUser = useAuthStore((state) => state.user)
  const [searchParams] = useSearchParams()
  // 대시보드 입력창에서 넘어온 주소증(?cc=). 마법사 1단계가 주소증 입력이라
  // 값만 채워 두면 바로 다음으로 넘어갈 수 있다.
  const [chiefComplaint, setChiefComplaint] = useState(() => searchParams.get('cc') ?? '')
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [newSymptom, setNewSymptom] = useState('')
  const [constitution, setConstitution] = useState('')
  const [currentMedications, setCurrentMedications] = useState<string[]>([])
  const [newMedication, setNewMedication] = useState('')
  // 환자 기본 정보 — 이전엔 input이 state에 연결돼 있지 않아 값이 유실되던 버그. 이제 캡처한다.
  const [patientAge, setPatientAge] = useState('')
  const [patientGender, setPatientGender] = useState('')

  // 고급 옵션
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [preferredSchool, setPreferredSchool] = useState<MedicineSchool | 'all'>('all')
  const [includePalGang, setIncludePalGang] = useState(true)
  const [includeByeongYang, setIncludeByeongYang] = useState(true)

  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  // 백엔드가 폴백 추론(그라운딩·임산부 금기 가드 우회)으로 응답했을 때 붙여 보내는 경고.
  // 이 값이 있으면 결과를 "검증된 추천"처럼 보여줘선 안 된다.
  const [safetyWarning, setSafetyWarning] = useState('')
  const [isSavingVisit, setIsSavingVisit] = useState(false)
  // 이번 추천에 실제로 근거로 들어간 치험례 — "왜 이 처방인지" 를 화면에서 대는 데 쓴다.
  const [groundingCases, setGroundingCases] = useState<GroundingCase[]>([])
  // 치험례 공유 — 내 처방을 동료에게 올린다. 이게 쌓여야 추천 근거도 좋아진다.
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareNote, setShareNote] = useState('')
  const [shareOutcome, setShareOutcome] = useState<'진행중' | '호전' | '완치' | '무효'>('진행중')
  const [isSharing, setIsSharing] = useState(false)

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
  const totalWizardSteps = 3

  // 예시(데모)로 진입했는지 — 결과 화면에서 "내 환자로 입력" 핸드오프 배너를 띄우는 플래그
  const [isDemoRun, setIsDemoRun] = useState(searchParams.get('demo') === '1')

  // 문서화 모달
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [documentFormula, setDocumentFormula] = useState<Recommendation | null>(null)

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

  const runRecommend = async (payload: {
    chiefComplaint: string
    symptoms: Symptom[]
    constitution?: string
    currentMedications?: string[]
  }) => {
    setError('')
    setSafetyWarning('')
    setGroundingCases([])
    setIsLoading(true)

    try {
      const response = await api.post('/prescriptions/recommend', {
        chiefComplaint: payload.chiefComplaint,
        symptoms: payload.symptoms,
        constitution: payload.constitution || undefined,
        currentMedications:
          payload.currentMedications && payload.currentMedications.length > 0
            ? payload.currentMedications
            : undefined,
      })

      const body = response.data.data ?? response.data
      setRecommendations(body?.recommendations || [])
      setAnalysis(body?.analysis || '')
      // AI Engine 장애 시 백엔드가 안전 가드 없는 폴백으로 답한다. 반드시 화면에 드러내야 한다.
      setSafetyWarning(body?.warning || '')
      setGroundingCases(Array.isArray(body?.groundingCases) ? body.groundingCases : [])
    } catch (err: unknown) {
      logError(err, 'ConsultationPage')
      setError('처방 추천을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!chiefComplaint.trim()) {
      setError('주소증을 입력해주세요.')
      return
    }
    await runRecommend({ chiefComplaint, symptoms, constitution, currentMedications })
  }

  /**
   * 예시 케이스 30초 체험 — 신규 사용자가 자기 데이터를 입력하지 않아도
   * 첫 아하 모먼트(변증 → 처방 후보 → 유사환자 통계 → 설명자료)를 즉시 경험하게 한다.
   */
  const runExampleCase = () => {
    setInputMode('wizard')
    setPatientAge(EXAMPLE_CASE.age)
    setPatientGender(EXAMPLE_CASE.gender)
    setConstitution(EXAMPLE_CASE.constitution)
    setChiefComplaint(EXAMPLE_CASE.chiefComplaint)
    setSymptoms(EXAMPLE_CASE.symptoms)
    setCurrentMedications([])
    setWizardStep(2)
    void runRecommend({
      chiefComplaint: EXAMPLE_CASE.chiefComplaint,
      symptoms: EXAMPLE_CASE.symptoms,
      constitution: EXAMPLE_CASE.constitution,
    })
  }

  // ?demo=1 로 진입하면 예시 진료를 자동 실행 (신규 사용자 첫 화면 = 이미 풀린 결과)
  useEffect(() => {
    if (searchParams.get('demo') === '1') {
      runExampleCase()
    }
    // 최초 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 예시 결과를 본 뒤 자신의 환자로 새 진료 시작 — 입력을 비우고 1단계로 되돌린다.
   * 아하(예시) → 액티베이션(내 환자 입력)으로 넘어가는 핵심 핸드오프.
   */
  const startMyPatient = () => {
    setIsDemoRun(false)
    setWizardStep(1)
    setRecommendations([])
    setAnalysis('')
    setChiefComplaint('')
    setSymptoms([])
    setConstitution('')
    setCurrentMedications([])
    setPatientAge('')
    setPatientGender('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openDetailModal = (rec: Recommendation) => {
    setSelectedFormula(rec)
    setShowDetailModal(true)
  }

  /**
   * 처방전 인쇄 — apps/web/src/lib/prescriptionPrint.ts 의 iframe 격리 인쇄.
   * 한의사 면허번호와 한의원명은 로그인 사용자 정보에서 가져온다.
   */
  const handlePrintPrescription = useCallback(
    (rec: Recommendation) => {
      const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      printPrescription({
        clinicName: currentUser?.clinicName || '한의원',
        doctorName: currentUser?.name || '담당 한의사',
        doctorLicense: currentUser?.licenseNumber,
        patientName: '환자',
        visitDate: today,
        diagnosis: analysis || chiefComplaint || '-',
        prescription: rec.formula_name,
        herbs: rec.herbs,
        dosage: '1일 2회, 식후 30분',
        duration: '7일분 (1주)',
        instructions: rec.rationale,
        cautions: 'AI 추천은 참고용입니다. 처방 전 환자의 알레르기·복용약·기저질환을 반드시 확인하세요.',
      })
    },
    [currentUser, analysis, chiefComplaint],
  )

  const handleSelectFormula = (rec: Recommendation) => {
    setSelectedForSelect(rec)
    setShowSelectConfirm(true)
  }

  /**
   * 처방 채택 → 서버에 진료 기록으로 저장.
   *
   * 예전에는 localStorage('hanmed_prescriptions')에만 넣고 "진료 기록에 저장되었습니다"
   * 라고 알렸다. 다른 PC 에서는 존재하지 않는 기록이었다. 이제는 서버에 남기고,
   * 저장에 실패하면 성공했다고 말하지 않는다.
   */
  const confirmSelectFormula = async () => {
    if (!selectedForSelect || isSavingVisit) return

    // 예시 진료(demo)는 실제 환자 기록이 아니므로 저장하지 않는다.
    if (isDemoRun) {
      setShowSelectConfirm(false)
      toast({
        title: '예시 진료입니다',
        description: '이 결과는 저장되지 않습니다. 내 환자로 입력하면 기록에 남습니다.',
      })
      return
    }

    setIsSavingVisit(true)
    try {
      await createMyVisit({
        visitedAt: new Date().toISOString(),
        chiefComplaint: chiefComplaint || null,
        symptoms: symptoms.map((s) => ({ name: s.name, severity: s.severity })),
        diagnosis: analysis || null,
        formulaName: selectedForSelect.formula_name,
        herbs: selectedForSelect.herbs,
        aiConfidence: selectedForSelect.confidence_score ?? null,
        // 안전 가드가 우회된 폴백 결과였는지 함께 남긴다 — 사후 감사에서 걸러내려면 필요하다.
        aiDegraded: !!safetyWarning,
        notes: selectedForSelect.rationale || null,
      })

      setShowSelectConfirm(false)
      toast({
        title: '진료 기록에 저장되었습니다',
        description: `${selectedForSelect.formula_name} · 환자 메뉴에서 확인할 수 있습니다.`,
      })
    } catch (err) {
      logError(err, 'ConsultationPage.saveVisit')
      toast({
        title: '저장 실패',
        description: '진료 기록을 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingVisit(false)
    }
  }


  /**
   * 이 진료를 익명 치험례로 공유.
   * 환자 식별정보는 보내지 않는다 — 나이는 연령대로 뭉개고 이름·연락처는 아예 담지 않는다.
   */
  const submitShareCase = async () => {
    const top = recommendations[0]
    if (!top || isSharing) return

    setIsSharing(true)
    try {
      await shareCase({
        title: `${chiefComplaint.slice(0, 60)} — ${top.formula_name}`,
        content: [
          `주소증: ${chiefComplaint}`,
          symptoms.length > 0 ? `증상: ${symptoms.map((x) => x.name).join(', ')}` : '',
          analysis ? `변증: ${analysis}` : '',
          `처방: ${top.formula_name}`,
          top.herbs?.length
            ? `구성: ${top.herbs.map((h) => `${h.name} ${h.amount}`).join(', ')}`
            : '',
          `경과: ${shareOutcome}`,
          shareNote ? `한의사 메모: ${shareNote}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        category: 'prescription' as CaseCategory,
        patientInfo: {
          ageRange: toAgeRange(patientAge),
          gender: toGenderLabel(patientGender),
          constitution: constitution || undefined,
          mainSymptoms: symptoms.map((x) => x.name).filter(Boolean),
        },
      })
      setShowShareModal(false)
      setShareNote('')
      toast({
        title: '치험례를 공유했습니다',
        description: '커뮤니티에서 동료 한의사들이 볼 수 있습니다.',
      })
    } catch (err) {
      logError(err, 'ConsultationPage.shareCase')
      toast({
        title: '공유 실패',
        description: '치험례를 올리지 못했습니다. 잠시 후 다시 시도해 주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSharing(false)
    }
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
  // 3단계 — 증상만 넣으면 결과까지 간다.
  // '환자 정보' 를 별도 1단계로 두던 구조를 없앴다(전부 선택 항목인 통행료였다).
  const wizardSteps = [
    { step: 1, title: '증상 입력', icon: ClipboardList, description: '주소증 및 동반 증상' },
    { step: 2, title: '분석', icon: Stethoscope, description: '변증·처방 후보 도출' },
    { step: 3, title: '처방 확인', icon: FileCheck, description: '결과 검토' },
  ]

  // 다음 단계로 이동
  const goToNextStep = useCallback(() => {
    if (wizardStep < totalWizardSteps) {
      // 증상 입력(1) → 분석(2) 로 넘어갈 때 실제 추천 호출
      if (wizardStep === 1 && chiefComplaint.trim()) {
        handleSubmit()
      }
      setWizardStep(prev => prev + 1)
    }
  }, [wizardStep, chiefComplaint])

  // AI 분석 완료 시 자동으로 다음 단계로 이동
  useEffect(() => {
    if (inputMode === 'wizard' && wizardStep === 2 && recommendations.length > 0 && !isLoading) {
      setWizardStep(3)
    }
  }, [inputMode, wizardStep, recommendations.length, isLoading])

  return (
    <div className="space-y-6">
      {/* Demo Data Warning 제거 — 실제 백엔드 호출 흐름이라 항상 떠 있으면 안 됨.
          진짜 데모 모드(API 실패 fallback)일 때만 별도로 노출되어야 함. */}

      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">
            새 진료
          </h1>
          <p className="mt-1 text-[14px] text-neutral-500">
            {inputMode === 'wizard'
              ? '단계별로 안내해 드릴게요.'
              : '증상을 입력하고 Enter를 누르면 즉시 분석됩니다.'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md">
          <button
            onClick={() => { setInputMode('wizard'); setWizardStep(1) }}
            className={`h-9 px-3 rounded-sm text-[13px] font-semibold transition-colors flex items-center gap-1.5 ${
              inputMode === 'wizard'
                ? 'bg-white text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            title="단계별 마법사"
          >
            <Wand2 className="h-4 w-4" />
            마법사
          </button>
          <button
            onClick={() => setInputMode('quick')}
            className={`h-9 px-3 rounded-sm text-[13px] font-semibold transition-colors flex items-center gap-1.5 ${
              inputMode === 'quick'
                ? 'bg-white text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            title="빠른 입력"
          >
            <Zap className="h-4 w-4" />
            빠른
          </button>
          <button
            onClick={() => setInputMode('detailed')}
            className={`h-9 px-3 rounded-sm text-[13px] font-semibold transition-colors flex items-center gap-1.5 ${
              inputMode === 'detailed'
                ? 'bg-white text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            title="상세 입력"
          >
            <Settings2 className="h-4 w-4" />
            상세
          </button>
        </div>
      </div>

      {/* 마법사 모드: 진행 표시기 — 결과(step4)에선 숨긴다.
          이미 끝난 단계를 보여주는 건 첫 화면에서 소음이라, 입력 중(1~3)에만 노출. */}
      {inputMode === 'wizard' && wizardStep < 3 && (
        <div className="glass-surface rounded-2xl border p-4 shadow-[var(--shadow-2)]">
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
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : isCompleted
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-blue-500' : 'text-neutral-400'
                    }`}>
                      {step.title}
                    </span>
                    <span className={`text-[10px] ${
                      isActive ? 'text-neutral-600' : 'text-neutral-400'
                    }`}>
                      {step.description}
                    </span>
                  </button>

                  {/* 연결선 */}
                  {index < wizardSteps.length - 1 && (
                    <div className="flex-1 mx-2 h-0.5 rounded-full overflow-hidden bg-neutral-200">
                      <div
                        className={`h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ${
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
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
          {/* 단계 1: 증상 입력 */}
          {wizardStep === 1 && (
            <div className="space-y-6" data-tour="symptom-input">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/20">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">증상 입력</h2>
                  <p className="text-sm text-neutral-500">환자가 호소하는 증상을 입력해주세요</p>
                </div>
              </div>

              {/* 환자 정보 — 전부 선택 항목이라 기본은 접어 둔다.
                  예전에는 이 항목들만 있는 1단계를 따로 두고 "다음" 을 눌러야 증상 입력으로
                  넘어갔다. 하루 40명을 보는 원장에겐 아무것도 입력하지 않는 화면을
                  40번 통과하는 셈이라, 증상 입력을 첫 화면으로 올리고 여기로 접어 넣었다. */}
              <details className="rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-neutral-700 marker:hidden">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    환자 정보 추가 (선택) — 나이 · 성별 · 체질 · 복용 약
                  </span>
                </summary>
                <div className="mt-4 space-y-6" data-tour="patient-info">
              {/* 환자 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="patient-age" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    나이 (선택)
                  </label>
                  <input
                    id="patient-age"
                    type="text"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="예: 45세"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="patient-gender" className="block text-sm font-medium text-neutral-700 mb-1.5">
                    성별 (선택)
                  </label>
                  <select
                    id="patient-gender"
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all appearance-none"
                  >
                    <option value="">선택 안함</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                  </select>
                </div>
              </div>

              {/* 체질 선택 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  사상체질 (선택)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {['', '태양인', '태음인', '소양인', '소음인'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setConstitution(c)}
                      className={`px-3 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                        constitution === c
                          ? 'bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/20'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-violet-300 hover:bg-violet-50'
                      }`}
                    >
                      {c || '미상'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 복용 중인 약물 */}
              <div>
                <label htmlFor="medication-wizard" className="block text-sm font-medium text-neutral-700 mb-1.5">
                  복용 중인 양약 (선택)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    id="medication-wizard"
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="예: 혈압약, 당뇨약..."
                    className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && addMedication()}
                  />
                  <button
                    onClick={addMedication}
                    className="px-4 py-3 bg-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-300 transition-colors"
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
                </div>
              </details>

              {/* 주소증 입력 */}
              <div>
                <label htmlFor="chief-complaint-wizard" className="block text-sm font-medium text-neutral-700 mb-1.5">
                  주소증 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="chief-complaint-wizard"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="예: 소화가 안되고 배가 차갑습니다. 밥을 먹으면 더부룩하고 설사를 자주 합니다. 피로감이 심합니다..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none text-base"
                  rows={5}
                />
              </div>

              {/* 빠른 증상 선택 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
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
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-2">선택된 증상 ({symptoms.length}개)</p>
                  <div className="flex flex-wrap gap-2">
                    {symptoms.map((symptom, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-blue-700 border border-blue-300 rounded-full text-sm font-medium"
                      >
                        {symptom.name}
                        <button
                          onClick={() => removeSymptom(index)}
                          className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
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
                <label htmlFor="custom-symptom" className="block text-sm font-medium text-neutral-700 mb-1.5">
                  직접 증상 추가
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom-symptom"
                    type="text"
                    value={newSymptom}
                    onChange={(e) => setNewSymptom(e.target.value)}
                    placeholder="증상 입력 후 Enter"
                    className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
                  />
                  <button
                    onClick={() => addSymptom()}
                    className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* 네비게이션 — 증상 입력이 첫 단계라 '이전' 은 없다.
                  대신 데이터를 넣기 전에 결과부터 보고 싶은 사람을 위해 예시 진료를 옆에 둔다. */}
              <div className="flex flex-col-reverse gap-3 pt-4 border-t border-neutral-100 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={runExampleCase}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <Zap className="h-4 w-4" aria-hidden="true" />
                  예시로 30초 체험
                </button>
                <button
                  onClick={goToNextStep}
                  disabled={!chiefComplaint.trim()}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl accent-gradient accent-glow px-6 py-3 font-semibold text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-5 w-5" />
                  분석 시작
                </button>
              </div>
            </div>
          )}

          {/* 단계 2: AI 분석 중 */}
          {wizardStep === 2 && (
            <div className="space-y-6" data-tour="analyze-button">
              <div className="flex items-center gap-3 mb-6">
                <Toss3DIcon icon={Stethoscope} tone="purple" size="xl" className="animate-pulse" />
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">AI 분석 중</h2>
                  <p className="text-sm text-neutral-500">등록된 치험례를 분석하고 있습니다</p>
                </div>
              </div>

              <div className="py-16 text-center">
                {isLoading ? (
                  <div className="space-y-6">
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
                      <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
                      <Brain className="absolute inset-0 m-auto h-10 w-10 text-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-neutral-900">AI가 분석 중입니다...</p>
                      <p className="text-neutral-500">증상 패턴을 분석하고 최적의 처방을 찾고 있습니다</p>
                    </div>
                    {/* 실제 진행률을 알 수 없는 요청이라 퍼센트를 표시하지 않는다.
                        (이전엔 70% 고정 바를 pulse 시켜 진행 중인 척했다 — 사실이 아니고, 멈춘 것처럼 보였다) */}
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="flex items-center justify-between text-sm text-neutral-600">
                        <span>분석 중</span>
                        <span>잠시만 기다려주세요</span>
                      </div>
                      <div
                        className="progress-indeterminate h-2 rounded-full bg-neutral-200"
                        role="progressbar"
                        aria-label="AI 분석 진행 중"
                      />
                    </div>
                  </div>
                ) : error ? (
                  /* 실패(타임아웃 포함)를 "분석 완료"로 위장하지 않는다.
                     여기서 초록 체크가 뜨면 결과 0건인 4단계로 사용자를 밀어넣게 된다. */
                  <div className="max-w-md mx-auto">
                    <ErrorMessage message={error} onRetry={handleSubmit} />
                    <button
                      onClick={() => setWizardStep(1)}
                      className="mt-3 text-sm font-medium text-neutral-500 hover:text-neutral-900"
                    >
                      증상 다시 입력하기
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                    <p className="text-lg font-semibold text-neutral-900">분석이 완료되었습니다!</p>
                    <button
                      onClick={() => setWizardStep(3)}
                      className="px-6 py-3 accent-gradient accent-glow text-white rounded-xl font-semibold hover:brightness-105 transition-all flex items-center gap-2 mx-auto"
                    >
                      결과 확인하기
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 분석 중 입력 요약 표시 */}
              <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-neutral-700">입력된 정보 요약</h4>
                <div className="space-y-2 text-sm">
                  {constitution && (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">체질:</span>
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded">{constitution}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-neutral-500 shrink-0">주소증:</span>
                    <span className="text-neutral-700">{chiefComplaint}</span>
                  </div>
                  {symptoms.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-neutral-500 shrink-0">증상:</span>
                      <span className="text-neutral-700">{symptoms.map(s => s.name).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 단계 3: 처방 확인 - 결과 영역에서 표시 */}
          {wizardStep === 3 && (
            <div className="space-y-6" data-tour="result-area">
              {/* ① 컨텍스트 바 — 이 결과가 "누구의" 것인지 한 줄로. 데모면 예시임을 명시하고
                  곧바로 내 환자 입력으로 넘길 CTA 를 함께 둔다. */}
              {isDemoRun && recommendations.length > 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Zap className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-blue-900">예시 진료 · 실제 AI 분석 결과</p>
                      <p className="text-[13px] text-blue-800 mt-0.5 truncate">
                        {[
                          patientAge,
                          patientGender === 'male' ? '남성' : patientGender === 'female' ? '여성' : '',
                          constitution,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        {symptoms.length > 0 && ` · ${symptoms.map((s) => s.name).join('·')}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={startMyPatient}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white accent-gradient accent-glow hover:brightness-105 transition-all"
                  >
                    내 환자 증상 입력
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* ② 답(히어로) — 최우선 처방을 크게. 변증 근거·약재 구성까지 한 카드에 담아
                  "무엇을 / 왜 / 무엇으로" 를 3초 안에 읽히게 한다. */}
              {/* 안전 가드가 우회된 폴백 응답 — 결과보다 먼저, 결과보다 크게 알린다. */}
              {safetyWarning && (
                <div
                  role="alert"
                  className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-amber-900">
                        안전 검증을 거치지 않은 임시 추론입니다
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-amber-800">{safetyWarning}</p>
                      <p className="mt-2 text-[13px] leading-relaxed text-amber-800">
                        <strong>임산부·수유부·고령 환자에게는 이 결과를 그대로 사용하지 마십시오.</strong>{' '}
                        금기 본초 자동 제외와 출전 검증이 적용되지 않았습니다. 잠시 후 다시 시도하면
                        정상 경로로 재분석됩니다.
                      </p>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-amber-700"
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        정상 경로로 다시 분석
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {recommendations.length > 0 && (
                <div
                  className={cn(
                    'rounded-2xl border p-5 sm:p-6',
                    safetyWarning
                      ? 'border-neutral-200 bg-neutral-50'
                      : 'border-blue-200 bg-gradient-to-br from-blue-50/60 to-white',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-white',
                          safetyWarning ? 'bg-neutral-500' : 'bg-blue-500',
                        )}
                      >
                        <CheckCircle className="h-3 w-3" />
                        {safetyWarning ? '검증 전 후보' : '최우선 처방'}
                      </span>
                      <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-neutral-900">
                        {recommendations[0].formula_name}
                      </h2>
                    </div>
                    {/* 폴백일 때는 적합도를 아예 표시하지 않는다 — 검증 안 된 값에 숫자를 붙이면 신뢰를 오도한다. */}
                    {!safetyWarning && (
                      <div className="shrink-0 text-right">
                        <span
                          className={cn(
                            'inline-block rounded-lg border px-2.5 py-1 text-[15px] font-bold',
                            confidenceBand(recommendations[0].confidence_score).tone,
                          )}
                          title={`${CONFIDENCE_DEFINITION} (원 수치 ${(recommendations[0].confidence_score * 100).toFixed(0)})`}
                        >
                          {confidenceBand(recommendations[0].confidence_score).label}
                        </span>
                        <p className="mt-1 text-[11px] text-neutral-500">AI 적합도</p>
                      </div>
                    )}
                  </div>

                  {/* 왜 — AI 변증 분석 */}
                  {analysis && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-white/70 p-3.5 border border-neutral-100">
                      <Brain className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-[13.5px] leading-relaxed text-neutral-700">{analysis}</p>
                    </div>
                  )}

                  {/* 무엇으로 — 약재 구성(그라운딩 검증 통과분). 온전한 구성이 신뢰의 핵심. */}
                  {recommendations[0].herbs?.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500">
                        <Pill className="h-3.5 w-3.5" /> 구성 {recommendations[0].herbs.length}味
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {recommendations[0].herbs.map((h, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[12px] text-neutral-700 border border-neutral-200"
                          >
                            <span className="font-medium">{h.name}</span>
                            {h.amount && <span className="text-neutral-400">{h.amount}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 근거 요약 스트립 — 입력 대비 무엇이 반영됐는지(지어내지 않고 실제 입력 기준) */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-[12px] text-neutral-500">
                    {symptoms.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5 text-neutral-400" />
                        주소증·증상 {symptoms.length}개 반영
                      </span>
                    )}
                    {constitution && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-neutral-400" />
                        체질({constitution}) 고려
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-neutral-400" />
                      본초 안전성 검증
                    </span>
                  </div>
                </div>
              )}

              {/* 처방 0개 — 명확한 안내. 입력은 정상이지만 AI 가 빈 응답 줄 때 */}
              {recommendations.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <p className="text-[14px] font-semibold text-amber-900 mb-2">
                    추천 결과를 받지 못했어요
                  </p>
                  <p className="text-[13px] text-amber-800 leading-relaxed">
                    AI 분석은 끝났지만 그라운딩 검증을 통과한 처방이 없습니다.
                    아래 가능성을 확인해 보세요:
                  </p>
                  <ul className="mt-2 text-[13px] text-amber-700 list-disc list-inside space-y-1">
                    <li>입력 증상이 너무 짧거나 모호한 경우 → "주소증 + 동반 증상 2~3개" 권장</li>
                    <li>임산부 환자 + 임산부 금기 본초가 들어간 처방은 자동 제외됨</li>
                    <li>AI 엔진/API 키 일시 장애 — 잠시 후 재시도</li>
                  </ul>
                  {analysis && (
                    <p className="mt-3 text-[12px] text-amber-600">
                      참고 — AI 분석 메모: {analysis.slice(0, 200)}
                    </p>
                  )}
                </div>
              )}

              {/* ③ 근거 — 왜 이 처방인가.
                  결론만 있고 근거가 없으면 한의사는 이 화면을 신뢰하지 않는다.
                  실제 치험례를 그대로 펼쳐 보여주고, 근거가 없으면 없다고 말한다. */}
              {recommendations.length > 0 && (
                <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    <h3 className="text-[15px] font-bold text-neutral-900">
                      이 처방을 고른 근거
                    </h3>
                  </div>

                  {recommendations[0]?.source && (
                    <p className="mb-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-neutral-700">
                      <span className="font-semibold text-neutral-900">출전 </span>
                      {recommendations[0].source}
                    </p>
                  )}

                  {groundingCases.length > 0 ? (
                    <>
                      <p className="mb-2 text-[12.5px] text-neutral-500">
                        이번 주소증과 닮은 실제 치험례 {groundingCases.length}건을 근거로 함께
                        넣어 분석했습니다.
                      </p>
                      <ul className="space-y-2">
                        {groundingCases.slice(0, 4).map((c) => {
                          const cited = recommendations[0]?.caseRefs?.includes(c.caseId)
                          return (
                            <li
                              key={c.caseId}
                              className={cn(
                                'rounded-xl border p-3.5',
                                cited
                                  ? 'border-blue-200 bg-blue-50/50'
                                  : 'border-neutral-200 bg-white',
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-neutral-900">
                                  {c.title || '(제목 없음)'}
                                </p>
                                <span className="flex shrink-0 items-center gap-1.5">
                                  {cited && (
                                    <span className="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                      직접 인용
                                    </span>
                                  )}
                                  {typeof c.matchPercent === 'number' && (
                                    <span className="text-[12px] font-bold text-neutral-500">
                                      {c.matchPercent}%
                                    </span>
                                  )}
                                </span>
                              </div>
                              {/* 요약이 제목을 그대로 되풀이하는 경우가 많다
                                  (제목이 주소증으로 채워지고 요약도 주소증으로 시작).
                                  같은 문장을 두 번 보여주면 근거가 빈약해 보인다. */}
                              {c.summary && !c.summary.startsWith(c.title.slice(0, 20)) && (
                                <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-neutral-600">
                                  {c.summary}
                                </p>
                              )}
                              {(c.formulaName || c.outcome) && (
                                <p className="mt-1.5 text-[12px] text-neutral-500">
                                  {c.formulaName && <span>처방 {c.formulaName}</span>}
                                  {c.formulaName && c.outcome && <span> · </span>}
                                  {c.outcome && <span>경과 {c.outcome}</span>}
                                </p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      <Link
                        to="/dashboard/cases"
                        className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        치험례 전체에서 더 찾아보기
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </>
                  ) : (
                    <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-800">
                      <strong>이번 추천에는 유사 치험례 근거가 붙지 않았습니다.</strong> 주소증과
                      충분히 닮은 사례를 찾지 못했거나 조회에 실패한 경우입니다. 아래 결과는
                      치험례 대조 없이 나온 후보이므로 더 신중히 검토해 주세요.
                    </p>
                  )}
                </div>
              )}

              {/* ④ 유사 환자 통계 — "그래서 결과는?" 에 대한 실데이터 답.
                  (매칭 치험례 없으면 컴포넌트가 스스로 숨는다) */}
              {recommendations.length > 0 && (
                <SimilarCaseSuccessCard
                  chiefComplaint={chiefComplaint}
                  symptoms={symptoms}
                  diagnosis={analysis || undefined}
                />
              )}

              {/* ④ 다른 후보 — 최우선 외 대안. 비교/상세는 클릭. */}
              {recommendations.length > 1 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500">
                    <Beaker className="h-4 w-4" /> 다른 후보 {recommendations.length - 1}개
                  </p>
                  <div className="space-y-2">
                    {recommendations.slice(1).map((rec, index) => (
                      <button
                        key={index}
                        onClick={() => openDetailModal(rec)}
                        className="w-full rounded-xl border border-neutral-200 bg-white p-3.5 text-left transition-all hover:border-neutral-300 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-neutral-900">{rec.formula_name}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                'rounded-md border px-1.5 py-0.5 text-[12px] font-bold',
                                confidenceBand(rec.confidence_score).tone,
                              )}
                              title={CONFIDENCE_DEFINITION}
                            >
                              {confidenceBand(rec.confidence_score).label}
                            </span>
                            <ChevronRight className="h-4 w-4 text-neutral-300" />
                          </span>
                        </div>
                        {rec.rationale && (
                          <p className="mt-1 line-clamp-1 text-[12.5px] text-neutral-500">{rec.rationale}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 환자 설명자료 · 진료 근거서 — 최우선 처방 기준으로 즉시 생성 */}
              {recommendations.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      setDocumentFormula(recommendations[0])
                      setShowDocumentModal(true)
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-6 py-3.5 font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-50"
                  >
                    <FileText className="h-5 w-5" />
                    환자 설명자료 · 근거서
                  </button>
                  {/* 치험례 공유 — 추천 근거는 치험례에서 나온다.
                      한의사가 자기 처방을 올릴수록 다음 진료의 근거가 두꺼워진다. */}
                  <button
                    onClick={() => setShowShareModal(true)}
                    disabled={isDemoRun}
                    title={isDemoRun ? '예시 진료는 공유할 수 없습니다' : undefined}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 bg-white px-6 py-3.5 font-semibold text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Users className="h-5 w-5" />
                    치험례로 공유하기
                  </button>
                </div>
              )}

              {/* 네비게이션 — 390px 에서 버튼 라벨이 "최우선 처방 선 / 택" 으로 쪼개지던 문제.
                  좁은 화면에서는 세로로 쌓고, 라벨은 whitespace-nowrap 으로 묶는다. */}
              <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:justify-between">
                <button
                  onClick={startMyPatient}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-neutral-100 px-6 py-3 font-semibold text-neutral-700 transition-all hover:bg-neutral-200"
                >
                  <Plus className="h-5 w-5" />
                  새 진료 시작
                </button>
                <button
                  onClick={() => recommendations[0] && handleSelectFormula(recommendations[0])}
                  disabled={recommendations.length === 0}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl accent-gradient accent-glow px-6 py-3 font-semibold text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle className="h-5 w-5" />
                  최우선 처방 선택
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
              <div data-tour="patient-info" className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-neutral-900">환자 증상 입력</h2>
                  <p className="text-xs text-neutral-500">자유롭게 입력 후 Enter 또는 분석 버튼</p>
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
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none text-base"
                rows={5}
                autoFocus
                aria-describedby="chief-complaint-hint"
              />
              <span id="chief-complaint-hint" className="sr-only">
                환자의 나이, 성별, 주요 증상을 자유롭게 입력하세요. Enter 키로 바로 분석할 수 있습니다.
              </span>

              {/* Quick Symptom Tags */}
              <fieldset className="mt-4">
                <legend className="text-xs font-medium text-neutral-500 mb-2">빠른 증상 추가 (클릭하여 선택)</legend>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="증상 선택">
                  {COMMON_SYMPTOMS.slice(0, 12).map((symptom) => {
                    const isSelected = symptoms.some(s => s.name === symptom)
                    return (
                      <button
                        key={symptom}
                        onClick={() => toggleSymptom(symptom)}
                        aria-pressed={isSelected}
                        aria-label={`${symptom} ${isSelected ? '선택됨' : '선택안됨'}`}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                          isSelected
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
                <div className="mt-3 pt-3 border-t border-neutral-100">
                  <div className="flex flex-wrap gap-1.5" role="list" aria-label="선택된 증상 목록">
                    {symptoms.map((symptom, index) => (
                      <span
                        key={index}
                        role="listitem"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium"
                      >
                        {symptom.name}
                        <button
                          onClick={() => removeSymptom(index)}
                          aria-label={`${symptom.name} 증상 제거`}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                <legend className="text-xs font-medium text-neutral-500">체질:</legend>
                <div className="flex gap-1" role="radiogroup" aria-label="사상체질 선택">
                  {['', '태양인', '태음인', '소양인', '소음인'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setConstitution(c)}
                      role="radio"
                      aria-checked={constitution === c}
                      aria-label={c || '체질 미상'}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                        constitution === c
                          ? 'bg-violet-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
                className="w-full mt-4 py-4 accent-gradient accent-glow text-white rounded-xl font-semibold hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
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
              <div data-tour="patient-info" className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-neutral-900">주소증</h2>
                    <p className="text-xs text-neutral-500">환자가 호소하는 주요 증상</p>
                  </div>
                </div>
                <label htmlFor="chief-complaint-detail" className="sr-only">주소증 상세 입력</label>
                <textarea
                  id="chief-complaint-detail"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="예: 소화가 안되고 배가 차갑습니다. 밥을 먹으면 더부룩하고..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none"
                  rows={4}
                  aria-describedby="chief-complaint-detail-hint"
                />
                <span id="chief-complaint-detail-hint" className="sr-only">환자가 호소하는 주요 증상을 자세히 입력해주세요</span>
              </div>

              {/* Symptoms */}
              <div data-tour="symptom-input" className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-neutral-900">세부 증상</h2>
                    <p className="text-xs text-neutral-500">관련 증상을 태그로 추가</p>
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
                    className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
                    aria-describedby="new-symptom-hint"
                  />
                  <span id="new-symptom-hint" className="sr-only">증상 이름을 입력하고 Enter 또는 추가 버튼을 눌러 증상을 추가하세요</span>
                  <button
                    onClick={() => addSymptom()}
                    aria-label="증상 추가"
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[40px]" role="list" aria-label="추가된 증상 목록">
                  {symptoms.map((symptom, index) => (
                    <span
                      key={index}
                      role="listitem"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium"
                    >
                      {symptom.name}
                      <button
                        onClick={() => removeSymptom(index)}
                        aria-label={`${symptom.name} 증상 삭제`}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  {symptoms.length === 0 && (
                    <span className="text-sm text-neutral-400" aria-live="polite">증상을 추가해주세요</span>
                  )}
                </div>
              </div>

              {/* Constitution & Medications */}
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <Pill className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-neutral-900">추가 정보</h2>
                    <p className="text-xs text-neutral-500">체질 및 복용 약물</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="constitution-select" className="block text-sm font-medium text-neutral-700 mb-1.5">체질</label>
                    <select
                      id="constitution-select"
                      value={constitution}
                      onChange={(e) => setConstitution(e.target.value)}
                      aria-describedby="constitution-hint"
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all appearance-none"
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
                    <label htmlFor="medication-input" className="block text-sm font-medium text-neutral-700 mb-1.5">복용 중인 양약</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        id="medication-input"
                        type="text"
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        placeholder="양약 추가"
                        className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && addMedication()}
                        aria-describedby="medication-hint"
                      />
                      <span id="medication-hint" className="sr-only">환자가 복용 중인 양약 이름을 입력하세요. 약물 상호작용 확인에 사용됩니다.</span>
                      <button
                        onClick={addMedication}
                        aria-label="양약 추가"
                        className="px-4 py-2.5 bg-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-300 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
                      >
                        <Plus className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2" role="list" aria-label="복용 중인 양약 목록">
                      {currentMedications.map((med, index) => (
                        <span
                          key={index}
                          role="listitem"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-full text-sm font-medium"
                        >
                          {med}
                          <button
                            onClick={() => removeMedication(index)}
                            aria-label={`${med} 양약 삭제`}
                            className="hover:bg-neutral-300 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400/50"
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
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/50"
              aria-expanded={showAdvancedOptions}
              aria-controls="advanced-options-panel"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-xl" aria-hidden="true">
                  <Settings2 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h2 className="font-bold text-neutral-900">분석 옵션</h2>
                  <p className="text-xs text-neutral-500">학파 선호도 및 변증 분석 설정</p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-neutral-400 transition-transform ${showAdvancedOptions ? 'rotate-90' : ''}`} aria-hidden="true" />
            </button>

            {showAdvancedOptions && (
              <div id="advanced-options-panel" className="px-6 pb-6 space-y-4 border-t border-neutral-100 pt-4">
                {/* 학파 선호도 */}
                <fieldset>
                  <legend className="block text-sm font-medium text-neutral-700 mb-2">학파 선호도</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPreferredSchool('all')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        preferredSchool === 'all'
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      전체 (자동 선택)
                    </button>
                    <button
                      onClick={() => setPreferredSchool('classical')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                        preferredSchool === 'classical'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-amber-50'
                      }`}
                    >
                      <Scroll className="h-4 w-4" />
                      고방
                    </button>
                    <button
                      onClick={() => setPreferredSchool('later')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                        preferredSchool === 'later'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-blue-50'
                      }`}
                    >
                      <Book className="h-4 w-4" />
                      후세방
                    </button>
                    <button
                      onClick={() => setPreferredSchool('sasang')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                        preferredSchool === 'sasang'
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:bg-violet-50'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      사상방
                    </button>
                  </div>
                  {preferredSchool !== 'all' && (
                    <p className="mt-2 text-xs text-neutral-500">
                      {SCHOOL_INFO[preferredSchool].philosophy}
                    </p>
                  )}
                </fieldset>

                {/* 분석 옵션 */}
                <fieldset className="space-y-3">
                  <legend className="block text-sm font-medium text-neutral-700">분석 포함 항목</legend>
                  <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
                    <input
                      type="checkbox"
                      id="palgang-checkbox"
                      checked={includePalGang}
                      onChange={(e) => setIncludePalGang(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-neutral-300 rounded focus:ring-blue-500"
                      aria-describedby="palgang-desc"
                    />
                    <div>
                      <span className="font-medium text-neutral-900">팔강변증 분석</span>
                      <p id="palgang-desc" className="text-xs text-neutral-500">음양, 표리, 한열, 허실 분석 포함</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
                    <input
                      type="checkbox"
                      id="byeongyang-checkbox"
                      checked={includeByeongYang}
                      onChange={(e) => setIncludeByeongYang(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-neutral-300 rounded focus:ring-blue-500"
                      aria-describedby="byeongyang-desc"
                    />
                    <div>
                      <span className="font-medium text-neutral-900">병양도표 매칭</span>
                      <p id="byeongyang-desc" className="text-xs text-neutral-500">증상별 변증 패턴 매칭 분석</p>
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
                className="w-full py-4 accent-gradient accent-glow text-white rounded-2xl font-semibold hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
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
        <div data-tour="result-area" data-print-area className="lg:col-span-3 space-y-4">
          {recommendations.length > 0 ? (
            <>
              {/* 의료기기/면책 고지 — 결과 영역 최상단에 노란 배너 (요청대로 하단 X) */}
              <div
                role="note"
                className="flex items-start gap-3 px-4 py-3 bg-amber-50 border-2 border-amber-300 rounded-lg"
              >
                <AlertTriangle
                  className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="text-[13px] text-amber-900 leading-relaxed">
                  <p className="font-semibold">
                    본 서비스는 임상 보조 도구이며 의료기기가 아닙니다.
                  </p>
                  <p className="mt-0.5">
                    AI 추천은 참고용이며, 최종 진단 · 처방은 한의사의 판단에 따릅니다.
                  </p>
                </div>
              </div>

              {/* AI 결과 면책 조항 (세부) */}
              <AIResultDisclaimer />

              {/* AI Analysis */}
              {analysis && (
                <div className="bg-gradient-to-br from-slate-50 to-neutral-50 rounded-2xl border border-neutral-200 p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-neutral-900 mb-2">AI 변증 분석</h3>
                      <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">{analysis}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 유사 환자 통계 블록 제거:
                  치료결과(호전 78% 등)·인구통계·총건수가 모두 하드코딩/공식 생성값이라
                  실제 집계 데이터가 아니었음. 한의사가 실측 아웃컴으로 오인할 위험이 커서
                  실 데이터 파이프라인 연동 전까지 노출하지 않음. */}

              {/* 처방 전 필수 확인 사항 */}
              <PrescriptionDisclaimer />

              {/* Recommendations */}
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    추천 처방 <span className="text-xs font-normal text-neutral-500 ml-1">(참고용)</span>
                  </h2>
                  <span className="text-xs text-neutral-500">{recommendations.length}개의 처방 추천</span>
                </div>

                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`group p-5 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                        index === 0
                          ? 'border-blue-200 bg-blue-50/50 hover:shadow-blue-500/10'
                          : 'border-neutral-100 hover:border-neutral-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {index === 0 && (
                              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-md">
                                BEST
                              </span>
                            )}
                            <h3 className="font-bold text-lg text-neutral-900">{rec.formula_name}</h3>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-bold',
                            confidenceBand(rec.confidence_score).tone,
                          )}
                          title={CONFIDENCE_DEFINITION}
                        >
                          적합도 {confidenceBand(rec.confidence_score).label}
                        </div>
                      </div>

                      {/* Herbs with roles */}
                      <div className="mb-4">
                        <p className="text-xs font-medium text-neutral-500 mb-2">구성 약재</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.herbs.map((herb, i) => {
                            const herbInfo = HERB_INFO[herb.name]
                            return (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium border ${
                                  roleColors[herb.role] || 'bg-neutral-100 text-neutral-700 border-neutral-200'
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
                      <div className="pt-3 border-t border-neutral-100">
                        <p className="text-sm text-neutral-600 leading-relaxed">{rec.rationale}</p>
                      </div>

                      {/* 유사환자 성공률/치료일 통계는 실제 아웃컴 데이터가 확보되기 전까지
                          제거함 — confidence_score 로부터 공식으로 생성한 수치라 임상 근거가 없고,
                          한의사가 실측 성과로 오인할 위험이 있음. 실 데이터 연동 시 복원. */}

                      {/* Action buttons — 처방 카드 위에 마우스 올리면 노출 */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSelectFormula(rec)}
                          className="flex-1 min-w-[120px] py-2 px-4 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          이 처방 선택
                        </button>
                        <button
                          onClick={() => openDetailModal(rec)}
                          className="py-2 px-4 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1"
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
                        <button
                          onClick={() => handlePrintPrescription(rec)}
                          className="py-2 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1"
                          title="처방전을 A4 용지로 인쇄합니다"
                          data-print-hide
                        >
                          <Printer className="h-4 w-4" aria-hidden="true" />
                          처방전 인쇄
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
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
                <button
                  onClick={() => setShowSimilarCases(!showSimilarCases)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                      <Search className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                        유사 치험례
                        {similarCases.length > 0 && (
                          <span className="px-1.5 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded">
                            {similarCases.length}건
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-neutral-500">비슷한 환자 사례와 처방 확인</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {loadingSimilarCases && (
                      <Loader2 className="h-4 w-4 text-neutral-400 animate-spin" />
                    )}
                    <ChevronRight className={`h-5 w-5 text-neutral-400 transition-transform ${showSimilarCases ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {showSimilarCases && (
                  <div className="px-6 pb-6 border-t border-neutral-100">
                    {loadingSimilarCases ? (
                      <div className="py-8 text-center text-neutral-500">
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
                      <div className="py-8 text-center text-neutral-500">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
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
                <div className="w-20 h-20 mx-auto mb-6 bg-neutral-100 rounded-3xl flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-neutral-300" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  AI 처방 추천을 받아보세요
                </h3>
                <p className="text-neutral-500 max-w-sm mx-auto">
                  환자의 주소증과 증상을 입력하면<br />
                  등록된 치험례를 분석하여 처방 후보를 추천합니다
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
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedFormula.formula_name}</h2>
                  <p className="text-blue-100 text-sm">
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
                <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-blue-500" />
                  구성 약재
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedFormula.herbs.map((herb, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border-2 ${roleColors[herb.role] || 'bg-neutral-50 border-neutral-200'}`}
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
                    <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      주치 (적응증)
                    </h3>
                    <p className="text-neutral-700 bg-blue-50 p-4 rounded-xl leading-relaxed">
                      {formulaDetails[selectedFormula.formula_name].indication}
                    </p>
                  </div>

                  {/* 병기 */}
                  <div>
                    <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      병기 설명
                    </h3>
                    <p className="text-neutral-700 bg-purple-50 p-4 rounded-xl leading-relaxed">
                      {formulaDetails[selectedFormula.formula_name].pathogenesis}
                    </p>
                  </div>

                  {/* 가감법 */}
                  <div>
                    <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-amber-500" />
                      가감법
                    </h3>
                    <div className="space-y-2">
                      {formulaDetails[selectedFormula.formula_name].modifications.map((mod, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                          <span className="text-amber-600 font-medium whitespace-nowrap">{mod.condition}</span>
                          <span className="text-neutral-400">→</span>
                          <span className="text-neutral-700">{mod.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 현대 임상 응용 */}
                  <div>
                    <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                      현대 임상 응용
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {formulaDetails[selectedFormula.formula_name].modernUsage.map((usage, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {usage}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 금기 및 주의사항 */}
                  <div>
                    <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
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
                <h3 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  AI 추천 근거
                </h3>
                <p className="text-neutral-700 bg-blue-50 p-4 rounded-xl leading-relaxed">
                  {selectedFormula.rationale}
                </p>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-neutral-100 flex gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-medium"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  handleSelectFormula(selectedFormula)
                }}
                className="flex-1 py-3 accent-gradient accent-glow text-white rounded-xl hover:brightness-105 transition-all font-medium"
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
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">처방 선택 확인</h2>
              <p className="text-neutral-500 mt-2">
                <span className="font-bold text-blue-600">{selectedForSelect.formula_name}</span>을(를)
                <br />선택하시겠습니까?
              </p>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-neutral-600 mb-2">선택한 처방 정보:</p>
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
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={() => void confirmSelectFormula()}
                disabled={isSavingVisit}
                className="flex-1 py-3 accent-gradient accent-glow text-white rounded-xl hover:brightness-105 transition-all font-medium disabled:opacity-50"
              >
                {isSavingVisit ? '저장 중…' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 치험례 공유 모달 — 익명화 범위를 화면에서 먼저 보여준다.
          한의사가 "환자 정보가 나가나?" 를 걱정하면 아무도 안 올린다. */}
      {showShareModal && recommendations.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[18px] font-bold text-neutral-900">치험례로 공유하기</h3>
                <p className="mt-1 text-[13px] text-neutral-500">
                  동료 한의사들이 이 사례를 참고할 수 있게 커뮤니티에 올립니다.
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
              <p className="text-[12px] font-semibold text-neutral-500">올라가는 내용</p>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-700">
                {toAgeRange(patientAge)} {toGenderLabel(patientGender)}
                {constitution ? ` · ${constitution}` : ''} · {chiefComplaint.slice(0, 40)}
                {chiefComplaint.length > 40 ? '…' : ''} · {recommendations[0].formula_name}
              </p>
              <p className="mt-2 text-[12px] text-neutral-500">
                환자 이름·연락처·생년월일은 <strong>보내지 않습니다</strong>. 나이는 연령대로만
                올라갑니다.
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-[13px] font-medium text-neutral-700">
                현재 경과
              </label>
              <div className="flex flex-wrap gap-2">
                {(['진행중', '호전', '완치', '무효'] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => setShareOutcome(o)}
                    className={cn(
                      'rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors',
                      shareOutcome === o
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="share-note"
                className="mb-1.5 block text-[13px] font-medium text-neutral-700"
              >
                한의사 메모 (선택)
              </label>
              <textarea
                id="share-note"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                rows={3}
                placeholder="가감한 이유, 반응, 다음 진료 계획 등 동료에게 도움이 될 내용"
                className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[14px] transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 rounded-xl bg-neutral-100 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
              >
                취소
              </button>
              <button
                onClick={() => void submitShareCase()}
                disabled={isSharing}
                className="flex-1 rounded-xl accent-gradient accent-glow py-3 font-semibold text-white transition-all hover:brightness-105 disabled:opacity-50"
              >
                {isSharing ? '올리는 중…' : '공유하기'}
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
              age: patientAge ? parseInt(patientAge, 10) || undefined : undefined,
              gender: patientGender === 'male' ? 'M' : patientGender === 'female' ? 'F' : undefined,
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
