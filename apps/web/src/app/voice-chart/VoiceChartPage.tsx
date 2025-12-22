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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

// Simulated AI processing - in real implementation, this would call an API
const processTranscriptToSOAP = (transcript: string): SOAPNote => {
  // Extract patterns from transcript
  const subjective: string[] = []
  const objective: string[] = []
  const assessment: string[] = []
  const plan: string[] = []

  // Simple keyword-based extraction for demo
  const lines = transcript.split(/[,\.]/);

  lines.forEach(line => {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.includes('아프') || trimmed.includes('호소') || trimmed.includes('주소증') ||
        trimmed.includes('증상') || trimmed.includes('불편') || trimmed.includes('통증')) {
      subjective.push(line.trim());
    }
    if (trimmed.includes('맥') || trimmed.includes('설') || trimmed.includes('혈압') ||
        trimmed.includes('체온') || trimmed.includes('압통') || trimmed.includes('관찰')) {
      objective.push(line.trim());
    }
    if (trimmed.includes('의심') || trimmed.includes('변증') || trimmed.includes('진단') ||
        trimmed.includes('증후')) {
      assessment.push(line.trim());
    }
    if (trimmed.includes('처방') || trimmed.includes('탕') || trimmed.includes('침') ||
        trimmed.includes('뜸') || trimmed.includes('추나') || trimmed.includes('치료')) {
      plan.push(line.trim());
    }
  });

  // If no patterns matched, try to intelligently split
  if (subjective.length === 0 && objective.length === 0) {
    const parts = transcript.split(/[,\.]/);
    const third = Math.ceil(parts.length / 3);
    subjective.push(...parts.slice(0, third).map(p => p.trim()).filter(Boolean));
    objective.push(...parts.slice(third, third * 2).map(p => p.trim()).filter(Boolean));
    assessment.push('추가 분석 필요');
    plan.push(...parts.slice(third * 2).map(p => p.trim()).filter(Boolean));
  }

  return {
    subjective: subjective.join('\n') || '환자 호소 내용을 정리해주세요.',
    objective: objective.join('\n') || '객관적 소견을 기록해주세요.',
    assessment: assessment.join('\n') || '변증/진단을 입력해주세요.',
    plan: plan.join('\n') || '치료 계획을 입력해주세요.',
  };
};

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
  const [savedSessions, setSavedSessions] = useState<RecordingSession[]>([])
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')

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
            setTranscript((prev) => prev + finalTranscript)
          }
        }

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
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
      console.error('Error starting recording:', error)
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

  const saveSession = () => {
    if (!transcript || !soapNote) return

    const session: RecordingSession = {
      id: Date.now().toString(),
      timestamp: new Date(),
      duration: recordingTime,
      transcript,
      soapNote,
    }

    setSavedSessions((prev) => [session, ...prev])
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
