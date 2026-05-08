import { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Copy,
  Check,
  Sparkles,
  Edit3,
  Save,
  Clock,
  User,
  Stethoscope,
  ClipboardList,
  Pill,
  ChevronDown,
  ChevronUp,
  Volume2,
  AlertCircle,
  Printer,
  FileOutput,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { applyCorrections } from '@/lib/sttDictionary'

interface SOAPNote {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

interface RecordingSession {
  id: string
  timestamp: Date
  duration: number
  transcript: string
  soapNote: SOAPNote
  patientInfo?: {
    name: string
    age: number
    gender: string
  }
}

interface PrescriptionData {
  patientName: string
  patientAge: string
  patientGender: string
  diagnosis: string
  prescription: string
  dosage: string
  duration: string
  instructions: string
  doctorName: string
  clinicName: string
  date: string
}

// 한의학 용어 기반 SOAP 분석
const processTranscriptToSOAP = (transcript: string): SOAPNote => {
  const subjective: string[] = []
  const objective: string[] = []
  const assessment: string[] = []
  const plan: string[] = []

  // 문장 단위로 분리 (마침표, 쉼표, 그리고/하고 등)
  const sentences = transcript.split(/[,\.。\n]|그리고|하고|또한/).map(s => s.trim()).filter(Boolean)

  // Subjective (주관적 호소) 키워드
  const subjectiveKeywords = [
    '아프', '아파', '통증', '쑤시', '저리', '뻐근', '뻣뻣', '결리',
    '호소', '주소증', '주증', '증상', '불편', '힘들', '괴롭', '피곤',
    '어지럽', '두통', '소화불량', '속쓰림', '변비', '설사', '불면',
    '땀이', '식욕', '갈증', '오심', '구토', '기침', '가래', '호흡',
    '언제부터', '며칠', '일주일', '한달', '오래', '악화', '호전',
    '환자가', '환자는', '본인이', '말씀', '얘기', '느끼'
  ]

  // Objective (객관적 소견) 키워드
  const objectiveKeywords = [
    '맥', '맥상', '부맥', '침맥', '현맥', '삭맥', '지맥', '활맥', '삽맥',
    '설', '설태', '설질', '홍설', '담홍설', '백태', '황태', '박태', '후태',
    '복진', '압통', '긴장', '이완', '종괴', '관찰', '소견',
    '혈압', '체온', '맥박', '호흡수', '산소', '체중', '키',
    '안색', '면색', '창백', '홍조', '황달', '부종', '수종',
    '청진', '타진', '촉진', '시진', '확인', '발견', '나타나'
  ]

  // Assessment (평가/변증) 키워드
  const assessmentKeywords = [
    '변증', '진단', '의심', '추정', '소견상', '판단', '사료',
    '기허', '혈허', '음허', '양허', '담음', '어혈', '습열', '풍한',
    '간기울결', '심화', '비기허', '신양허', '폐음허', '위열',
    '태양병', '소양병', '양명병', '태음병', '소음병', '궐음병',
    '표증', '이증', '한증', '열증', '허증', '실증',
    '해당', '일치', '부합', '맞다', '보인다', '생각'
  ]

  // Plan (치료 계획) 키워드
  const planKeywords = [
    '처방', '투약', '탕', '산', '환', '고', '약', '복용',
    '침', '자침', '전침', '유침', '발침', '뜸', '구', '부항',
    '추나', '수기', '도인', '안마', '물리치료',
    '주', '일', '회', '번', '첩', '포', '제',
    '치료', '시술', '적용', '사용', '투여', '권고', '교육',
    '식이', '운동', '생활', '주의', '금기', '예후', '경과'
  ]

  // 각 문장 분류
  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase()
    let classified = false

    // Subjective 체크
    if (subjectiveKeywords.some(kw => lower.includes(kw))) {
      subjective.push(sentence)
      classified = true
    }

    // Objective 체크
    if (objectiveKeywords.some(kw => lower.includes(kw))) {
      objective.push(sentence)
      classified = true
    }

    // Assessment 체크
    if (assessmentKeywords.some(kw => lower.includes(kw))) {
      assessment.push(sentence)
      classified = true
    }

    // Plan 체크
    if (planKeywords.some(kw => lower.includes(kw))) {
      plan.push(sentence)
      classified = true
    }

    // 분류되지 않은 문장은 문맥으로 추정
    if (!classified && sentence.length > 5) {
      // 숫자가 많으면 Objective (수치)
      if (/\d+/.test(sentence) && (lower.includes('cm') || lower.includes('kg') || lower.includes('mmhg'))) {
        objective.push(sentence)
      }
      // "~다고" 로 끝나면 Subjective (환자 진술)
      else if (lower.endsWith('다고') || lower.endsWith('래요') || lower.endsWith('답니다')) {
        subjective.push(sentence)
      }
      // "~하겠습니다" 로 끝나면 Plan
      else if (lower.includes('하겠') || lower.includes('예정') || lower.includes('계획')) {
        plan.push(sentence)
      }
    }
  })

  // 분류 결과가 너무 적으면 fallback
  if (subjective.length === 0 && sentences.length > 0) {
    subjective.push(sentences[0])
  }

  // 중복 제거 및 정리
  const uniqueSubjective = [...new Set(subjective)]
  const uniqueObjective = [...new Set(objective)]
  const uniqueAssessment = [...new Set(assessment)]
  const uniquePlan = [...new Set(plan)]

  return {
    subjective: uniqueSubjective.length > 0
      ? '• ' + uniqueSubjective.join('\n• ')
      : '환자 호소 내용을 정리해주세요.',
    objective: uniqueObjective.length > 0
      ? '• ' + uniqueObjective.join('\n• ')
      : '객관적 소견을 기록해주세요.\n(맥상, 설진, 복진, 활력징후 등)',
    assessment: uniqueAssessment.length > 0
      ? '• ' + uniqueAssessment.join('\n• ')
      : '변증/진단을 입력해주세요.',
    plan: uniquePlan.length > 0
      ? '• ' + uniquePlan.join('\n• ')
      : '치료 계획을 입력해주세요.\n(처방, 침구, 추나, 생활지도 등)',
  }
}

export default function VoiceChartPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingSection, setEditingSection] = useState<keyof SOAPNote | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['subjective', 'objective', 'assessment', 'plan'])
  const [savedSessions, setSavedSessions] = useState<RecordingSession[]>(() => {
    // localStorage에서 저장된 세션 불러오기
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('voice_chart_sessions')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return parsed.map((s: RecordingSession) => ({
            ...s,
            timestamp: new Date(s.timestamp)
          }))
        } catch {
          return []
        }
      }
    }
    return []
  })
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>({
    patientName: '',
    patientAge: '',
    patientGender: '남',
    diagnosis: '',
    prescription: '',
    dosage: '',
    duration: '7일',
    instructions: '',
    doctorName: '',
    clinicName: '',
    date: new Date().toISOString().split('T')[0],
  })

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Check microphone permission
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
        result.onchange = () => {
          setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
        }
      }).catch(() => {
        // Permissions API not fully supported
      })
    }
  }, [])

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'ko-KR'

        recognition.onresult = (event) => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscript += result[0].transcript + ' '
            } else {
              interimTranscript += result[0].transcript
            }
          }

          if (finalTranscript) {
            // 한의 용어 사전 후처리 — '기흐'→'기허', '보충익기탕'→'보중익기탕' 등.
            // 적용 결과는 transcript 에 자동 반영된다 (사용자가 화면에서 즉시 확인 가능).
            const corrected = applyCorrections(finalTranscript)
            setTranscript((prev) => prev + corrected.text)
          }
        }

        recognition.onerror = (event) => {
          // 음성 인식 오류 처리 (사용자에게는 UI로 표시)
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.error('Speech recognition error:', event.error)
          }
          if (event.error === 'not-allowed') {
            setMicPermission('denied')
          }
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicPermission('granted')

      setIsRecording(true)
      setIsPaused(false)
      setTranscript('')
      setSoapNote(null)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
    } catch (error) {
      // 마이크 접근 오류 (사용자에게는 UI로 권한 거부 표시)
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('Error starting recording:', error)
      }
      setMicPermission('denied')
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    setIsPaused(false)

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const togglePause = () => {
    if (isPaused) {
      // Resume
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
    } else {
      // Pause
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
    setIsPaused(!isPaused)
  }

  const resetRecording = () => {
    stopRecording()
    setRecordingTime(0)
    setTranscript('')
    setSoapNote(null)
  }

  const processToSOAP = () => {
    if (!transcript.trim()) return

    setIsProcessing(true)

    // Simulate AI processing delay
    setTimeout(() => {
      const result = processTranscriptToSOAP(transcript)
      setSoapNote(result)
      setIsProcessing(false)
    }, 1500)
  }

  const updateSOAPSection = (section: keyof SOAPNote, value: string) => {
    if (soapNote) {
      setSoapNote({ ...soapNote, [section]: value })
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  const copySOAP = () => {
    if (!soapNote) return

    const text = `[S - Subjective (주관적 호소)]
${soapNote.subjective}

[O - Objective (객관적 소견)]
${soapNote.objective}

[A - Assessment (평가/변증)]
${soapNote.assessment}

[P - Plan (치료 계획)]
${soapNote.plan}
`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // SOAP에서 처방전 데이터 추출
  const extractPrescriptionFromSOAP = () => {
    if (!soapNote) return

    // Assessment에서 진단명 추출
    const diagnosisMatch = soapNote.assessment.match(/(기허증|혈허증|음허증|양허증|담음증|어혈증|습열증|풍한증|간기울결|심화|비기허|신양허|폐음허|위열|[가-힣]+증)/g)
    const diagnosis = diagnosisMatch ? diagnosisMatch.join(', ') : ''

    // Plan에서 처방명 추출
    const prescriptionMatch = soapNote.plan.match(/([\w가-힣]+탕|[\w가-힣]+산|[\w가-힣]+환|[\w가-힣]+고)/g)
    const prescription = prescriptionMatch ? prescriptionMatch.join(', ') : ''

    // 용량 추출
    const dosageMatch = soapNote.plan.match(/(\d+첩|\d+포|\d+제|\d+g)/g)
    const dosage = dosageMatch ? dosageMatch.join(', ') : '1일 3회, 식후 30분'

    // 기간 추출
    const durationMatch = soapNote.plan.match(/(\d+일|\d+주)/g)
    const duration = durationMatch ? durationMatch[0] : '7일'

    // 주의사항 추출 (생활지도 관련)
    const instructionsMatch = soapNote.plan.match(/(식이|운동|생활|주의|금기)[^•\n]*/g)
    const instructions = instructionsMatch ? instructionsMatch.join('\n') : ''

    setPrescriptionData(prev => ({
      ...prev,
      diagnosis,
      prescription,
      dosage,
      duration,
      instructions,
      date: new Date().toISOString().split('T')[0],
    }))

    setShowPrescriptionModal(true)
  }

  // 처방전 출력
  const printPrescription = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>처방전</title>
        <style>
          @page { size: A5; margin: 15mm; }
          body { font-family: 'Malgun Gothic', sans-serif; font-size: 12px; line-height: 1.6; }
          .prescription { max-width: 148mm; margin: 0 auto; padding: 20px; border: 2px solid #000; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
          .header h1 { font-size: 24px; margin: 0 0 5px 0; }
          .header p { margin: 0; color: #666; font-size: 10px; }
          .section { margin-bottom: 12px; }
          .section-title { font-weight: bold; background: #f5f5f5; padding: 5px 10px; margin-bottom: 8px; }
          .row { display: flex; margin-bottom: 6px; }
          .label { width: 80px; font-weight: bold; flex-shrink: 0; }
          .value { flex: 1; border-bottom: 1px dotted #ccc; padding-left: 5px; }
          .prescription-box { border: 1px solid #ddd; padding: 15px; background: #fafafa; min-height: 80px; }
          .footer { margin-top: 20px; text-align: right; border-top: 1px solid #ccc; padding-top: 15px; }
          .stamp { width: 60px; height: 60px; border: 2px solid #c00; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #c00; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="prescription">
          <div class="header">
            <h1>한 방 처 방 전</h1>
            <p>${prescriptionData.clinicName || '온고지신 한의원'}</p>
          </div>

          <div class="section">
            <div class="section-title">환자 정보</div>
            <div class="row"><span class="label">성명</span><span class="value">${prescriptionData.patientName || '　'}</span></div>
            <div class="row"><span class="label">나이</span><span class="value">${prescriptionData.patientAge || '　'}세 (${prescriptionData.patientGender})</span></div>
          </div>

          <div class="section">
            <div class="section-title">진단 (변증)</div>
            <div class="prescription-box">${prescriptionData.diagnosis || '　'}</div>
          </div>

          <div class="section">
            <div class="section-title">처방</div>
            <div class="prescription-box" style="min-height: 100px;">${prescriptionData.prescription || '　'}</div>
          </div>

          <div class="section">
            <div class="row"><span class="label">용법용량</span><span class="value">${prescriptionData.dosage || '1일 3회, 식후 30분'}</span></div>
            <div class="row"><span class="label">투약일수</span><span class="value">${prescriptionData.duration || '7일'}</span></div>
          </div>

          ${prescriptionData.instructions ? `
          <div class="section">
            <div class="section-title">주의사항 / 생활지도</div>
            <div style="padding: 0 10px; font-size: 11px;">${prescriptionData.instructions}</div>
          </div>
          ` : ''}

          <div class="footer">
            <p>처방일: ${prescriptionData.date}</p>
            <p>한의사: ${prescriptionData.doctorName || '　　　　'} <span class="stamp">印</span></p>
          </div>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  const saveSession = () => {
    if (!transcript || !soapNote) return

    const session: RecordingSession = {
      id: Date.now().toString(),
      timestamp: new Date(),
      duration: recordingTime,
      transcript,
      soapNote,
    }

    const newSessions = [session, ...savedSessions].slice(0, 50) // 최대 50개 유지
    setSavedSessions(newSessions)

    // localStorage에 저장
    localStorage.setItem('voice_chart_sessions', JSON.stringify(newSessions))

    resetRecording()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const soapSections = [
    { key: 'subjective' as const, label: 'S - Subjective', icon: User, description: '환자가 호소하는 주관적 증상' },
    { key: 'objective' as const, label: 'O - Objective', icon: Stethoscope, description: '관찰 및 검사 소견 (맥, 설, 복진 등)' },
    { key: 'assessment' as const, label: 'A - Assessment', icon: ClipboardList, description: '변증/진단' },
    { key: 'plan' as const, label: 'P - Plan', icon: Pill, description: '치료 계획 (처방, 침구 등)' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mic className="h-7 w-7 text-teal-500" />
          음성 차트 기록
        </h1>
        <p className="mt-1 text-gray-500">
          진료 내용을 말하면 AI가 SOAP 형식으로 정리해드립니다
        </p>
      </div>

      {/* Microphone Permission Warning */}
      {micPermission === 'denied' && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900">마이크 권한 필요</h3>
              <p className="text-amber-700 text-sm mt-1">
                음성 인식을 사용하려면 브라우저 설정에서 마이크 권한을 허용해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recording Section */}
        <div className="space-y-4">
          {/* Recording Controls */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="text-center">
              {/* Timer Display */}
              <div className="mb-6">
                <div className={cn(
                  'text-5xl font-mono font-bold',
                  isRecording && !isPaused ? 'text-red-500' : 'text-gray-900'
                )}>
                  {formatTime(recordingTime)}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {isRecording ? (isPaused ? '일시정지됨' : '녹음 중...') : '대기 중'}
                </p>
              </div>

              {/* Waveform Animation */}
              {isRecording && !isPaused && (
                <div className="flex items-center justify-center gap-1 mb-6">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-teal-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 30 + 10}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={micPermission === 'denied'}
                    className={cn(
                      'w-20 h-20 rounded-full flex items-center justify-center transition-all',
                      micPermission === 'denied'
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-500/30'
                    )}
                  >
                    <Mic className="h-8 w-8" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={togglePause}
                      className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      {isPaused ? (
                        <Play className="h-6 w-6 text-gray-700" />
                      ) : (
                        <Pause className="h-6 w-6 text-gray-700" />
                      )}
                    </button>
                    <button
                      onClick={stopRecording}
                      className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                    >
                      <MicOff className="h-8 w-8" />
                    </button>
                    <button
                      onClick={resetRecording}
                      className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <RotateCcw className="h-6 w-6 text-gray-700" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-gray-400" />
                음성 인식 결과
              </h3>
              {transcript && (
                <span className="text-sm text-gray-500">
                  {transcript.length}자
                </span>
              )}
            </div>
            <div className="min-h-[150px] max-h-[300px] overflow-y-auto">
              {transcript ? (
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {transcript}
                </p>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  녹음을 시작하면 음성이 텍스트로 변환됩니다
                </p>
              )}
            </div>
            {transcript && !isRecording && (
              <button
                onClick={processToSOAP}
                disabled={isProcessing}
                className="w-full mt-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    SOAP 형식으로 변환
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* SOAP Note Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-500" />
                SOAP 차트
              </h3>
              {soapNote && (
                <div className="flex gap-2">
                  <button
                    onClick={copySOAP}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    복사
                  </button>
                  <button
                    onClick={extractPrescriptionFromSOAP}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <FileOutput className="h-4 w-4" />
                    처방전
                  </button>
                  <button
                    onClick={saveSession}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    저장
                  </button>
                </div>
              )}
            </div>

            {soapNote ? (
              <div className="divide-y divide-gray-100">
                {soapSections.map((section) => (
                  <div key={section.key}>
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <section.icon className="h-4 w-4 text-teal-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{section.label}</p>
                          <p className="text-xs text-gray-500">{section.description}</p>
                        </div>
                      </div>
                      {expandedSections.includes(section.key) ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {expandedSections.includes(section.key) && (
                      <div className="px-4 pb-4">
                        {editingSection === section.key ? (
                          <div className="space-y-2">
                            <textarea
                              value={soapNote[section.key]}
                              onChange={(e) => updateSOAPSection(section.key, e.target.value)}
                              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[100px] resize-none"
                            />
                            <button
                              onClick={() => setEditingSection(null)}
                              className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 transition-colors"
                            >
                              완료
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingSection(section.key)}
                            className="p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group"
                          >
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {soapNote[section.key]}
                            </p>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit3 className="h-3 w-3" />
                              클릭하여 수정
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>음성을 녹음하고 SOAP 변환을 실행하세요</p>
              </div>
            )}
          </div>

          {/* Saved Sessions */}
          {savedSessions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                최근 기록
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {savedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {session.timestamp.toLocaleTimeString('ko-KR')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(session.duration)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {session.transcript.slice(0, 50)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-teal-50 rounded-2xl border border-teal-100 p-6">
        <h3 className="font-bold text-teal-900 mb-3">💡 효과적인 음성 기록 팁</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-teal-800">
          <div>
            <p className="font-medium mb-2">명확하게 말하기</p>
            <ul className="space-y-1 text-teal-700">
              <li>• "주소증은 두통입니다"</li>
              <li>• "맥은 현맥이고 설은 홍설입니다"</li>
              <li>• "처방은 소시호탕으로 합니다"</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">키워드 사용</p>
            <ul className="space-y-1 text-teal-700">
              <li>• 주소증, 증상, 호소 (S)</li>
              <li>• 맥, 설, 복진, 관찰 (O)</li>
              <li>• 변증, 진단, 의심 (A)</li>
              <li>• 처방, 침, 뜸, 치료 (P)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileOutput className="h-5 w-5 text-purple-500" />
                처방전 생성
              </h3>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              {/* 환자 정보 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">환자 정보</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">성명</label>
                    <input
                      type="text"
                      value={prescriptionData.patientName}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, patientName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      placeholder="환자 이름"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">나이</label>
                      <input
                        type="text"
                        value={prescriptionData.patientAge}
                        onChange={(e) => setPrescriptionData({ ...prescriptionData, patientAge: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        placeholder="세"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">성별</label>
                      <select
                        value={prescriptionData.patientGender}
                        onChange={(e) => setPrescriptionData({ ...prescriptionData, patientGender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      >
                        <option value="남">남</option>
                        <option value="여">여</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 진단 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">진단 (변증)</label>
                <input
                  type="text"
                  value={prescriptionData.diagnosis}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="기허증, 혈허증 등"
                />
              </div>

              {/* 처방 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">처방</label>
                <textarea
                  value={prescriptionData.prescription}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, prescription: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-[80px] resize-none"
                  placeholder="처방명 또는 약재 구성"
                />
              </div>

              {/* 용법 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">용법용량</label>
                  <input
                    type="text"
                    value={prescriptionData.dosage}
                    onChange={(e) => setPrescriptionData({ ...prescriptionData, dosage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    placeholder="1일 3회, 식후 30분"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">투약일수</label>
                  <input
                    type="text"
                    value={prescriptionData.duration}
                    onChange={(e) => setPrescriptionData({ ...prescriptionData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    placeholder="7일"
                  />
                </div>
              </div>

              {/* 주의사항 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">주의사항 / 생활지도</label>
                <textarea
                  value={prescriptionData.instructions}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-[60px] resize-none"
                  placeholder="식이, 운동, 생활 주의사항"
                />
              </div>

              {/* 의료기관 정보 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">의료기관 정보</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">한의사명</label>
                    <input
                      type="text"
                      value={prescriptionData.doctorName}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, doctorName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      placeholder="홍길동"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">한의원명</label>
                    <input
                      type="text"
                      value={prescriptionData.clinicName}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, clinicName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      placeholder="온고지신 한의원"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-500 mb-1 block">처방일</label>
                  <input
                    type="date"
                    value={prescriptionData.date}
                    onChange={(e) => setPrescriptionData({ ...prescriptionData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={printPrescription}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                인쇄하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}
