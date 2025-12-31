import { useState, useRef } from 'react'
import {
  FileText,
  Download,
  Copy,
  Check,
  Printer,
  X,
  Calendar,
  User,
  Stethoscope,
  Pill,
  ClipboardList,
  Sparkles,
} from 'lucide-react'

interface PatientInfo {
  name?: string
  age?: number
  gender?: 'M' | 'F'
  constitution?: string
}

interface PrescriptionInfo {
  formulaName: string
  formulaHanja?: string
  herbs: Array<{ name: string; amount: string; role: string }>
  rationale: string
  confidence?: number
}

interface DocumentData {
  patient: PatientInfo
  chiefComplaint: string
  symptoms: string[]
  diagnosis?: string
  prescription: PrescriptionInfo
  notes?: string
  date?: Date
}

interface PrescriptionDocumentProps {
  isOpen: boolean
  onClose: () => void
  data: DocumentData
}

export function PrescriptionDocument({ isOpen, onClose, data }: PrescriptionDocumentProps) {
  const [copied, setCopied] = useState(false)
  const documentRef = useRef<HTMLDivElement>(null)
  const currentDate = data.date || new Date()

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const generateTextDocument = (): string => {
    const lines = [
      '=' .repeat(50),
      '              진료 기록 및 처방 근거서',
      '=' .repeat(50),
      '',
      `작성일: ${formatDate(currentDate)}`,
      '',
      '-'.repeat(50),
      '[ 환자 정보 ]',
      '-'.repeat(50),
      `성명: ${data.patient.name || '(미입력)'}`,
      `연령: ${data.patient.age ? `${data.patient.age}세` : '(미입력)'}`,
      `성별: ${data.patient.gender === 'M' ? '남성' : data.patient.gender === 'F' ? '여성' : '(미입력)'}`,
      `체질: ${data.patient.constitution || '(미상)'}`,
      '',
      '-'.repeat(50),
      '[ 주소증 및 증상 ]',
      '-'.repeat(50),
      `주소증: ${data.chiefComplaint}`,
      '',
      '동반 증상:',
      ...data.symptoms.map((s, i) => `  ${i + 1}. ${s}`),
      '',
      '-'.repeat(50),
      '[ 진단 및 변증 ]',
      '-'.repeat(50),
      data.diagnosis || '(AI 분석 기반 변증 참조)',
      '',
      '-'.repeat(50),
      '[ 처방 ]',
      '-'.repeat(50),
      `처방명: ${data.prescription.formulaName}${data.prescription.formulaHanja ? ` (${data.prescription.formulaHanja})` : ''}`,
      `신뢰도: ${data.prescription.confidence ? `${(data.prescription.confidence * 100).toFixed(0)}%` : '-'}`,
      '',
      '구성 약재:',
      ...data.prescription.herbs.map(h => `  - ${h.name} ${h.amount} (${h.role})`),
      '',
      '-'.repeat(50),
      '[ 처방 근거 ]',
      '-'.repeat(50),
      data.prescription.rationale,
      '',
      data.notes ? [
        '-'.repeat(50),
        '[ 특이사항 / 추가 소견 ]',
        '-'.repeat(50),
        data.notes,
        '',
      ].join('\n') : '',
      '-'.repeat(50),
      '',
      '* 본 문서는 AI 진료 보조 시스템을 통해 생성되었으며,',
      '  최종 진료 판단은 담당 한의사의 소견을 따릅니다.',
      '',
      '=' .repeat(50),
    ]

    return lines.filter(Boolean).join('\n')
  }

  const handleCopy = async () => {
    const text = generateTextDocument()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    if (documentRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>처방 근거서 - ${data.prescription.formulaName}</title>
            <style>
              body {
                font-family: 'Nanum Gothic', 'Malgun Gothic', sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.6;
              }
              h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { color: #333; margin-top: 20px; border-left: 4px solid #0d9488; padding-left: 10px; }
              .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
              .info-item { padding: 5px 0; }
              .label { font-weight: bold; color: #666; }
              .herb-list { list-style: none; padding: 0; }
              .herb-list li { padding: 5px 10px; background: #f5f5f5; margin: 5px 0; border-radius: 4px; }
              .rationale { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
              @media print {
                body { padding: 20px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>진료 기록 및 처방 근거서</h1>
            <p style="text-align: right; color: #666;">작성일: ${formatDate(currentDate)}</p>

            <h2>환자 정보</h2>
            <div class="info-grid">
              <div class="info-item"><span class="label">성명:</span> ${data.patient.name || '(미입력)'}</div>
              <div class="info-item"><span class="label">연령:</span> ${data.patient.age ? `${data.patient.age}세` : '(미입력)'}</div>
              <div class="info-item"><span class="label">성별:</span> ${data.patient.gender === 'M' ? '남성' : data.patient.gender === 'F' ? '여성' : '(미입력)'}</div>
              <div class="info-item"><span class="label">체질:</span> ${data.patient.constitution || '(미상)'}</div>
            </div>

            <h2>주소증 및 증상</h2>
            <p><strong>주소증:</strong> ${data.chiefComplaint}</p>
            <p><strong>동반 증상:</strong></p>
            <ul>
              ${data.symptoms.map(s => `<li>${s}</li>`).join('')}
            </ul>

            <h2>진단 및 변증</h2>
            <p>${data.diagnosis || '(AI 분석 기반 변증 참조)'}</p>

            <h2>처방</h2>
            <p><strong>${data.prescription.formulaName}</strong>${data.prescription.formulaHanja ? ` (${data.prescription.formulaHanja})` : ''}</p>
            ${data.prescription.confidence ? `<p>AI 추천 신뢰도: ${(data.prescription.confidence * 100).toFixed(0)}%</p>` : ''}

            <p><strong>구성 약재:</strong></p>
            <ul class="herb-list">
              ${data.prescription.herbs.map(h => `<li>${h.name} ${h.amount} - ${h.role}</li>`).join('')}
            </ul>

            <h2>처방 근거</h2>
            <div class="rationale">
              ${data.prescription.rationale}
            </div>

            ${data.notes ? `
              <h2>특이사항 / 추가 소견</h2>
              <p>${data.notes}</p>
            ` : ''}

            <div class="footer">
              <p>* 본 문서는 AI 진료 보조 시스템(온고지신 CDSS)을 통해 생성되었으며, 최종 진료 판단은 담당 한의사의 소견을 따릅니다.</p>
            </div>
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-teal-500 to-emerald-500">
          <div className="flex items-center gap-3 text-white">
            <FileText className="h-6 w-6" />
            <div>
              <h2 className="font-bold text-lg">처방 근거 문서화</h2>
              <p className="text-sm text-teal-100">진료 기록 및 처방 근거서</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              title="텍스트 복사"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              title="인쇄"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div ref={documentRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>작성일: {formatDate(currentDate)}</span>
            </div>
            <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
              AI 자동 생성
            </span>
          </div>

          {/* Patient Info */}
          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              환자 정보
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">성명</span>
                <p className="font-medium">{data.patient.name || '(미입력)'}</p>
              </div>
              <div>
                <span className="text-gray-500">연령</span>
                <p className="font-medium">{data.patient.age ? `${data.patient.age}세` : '(미입력)'}</p>
              </div>
              <div>
                <span className="text-gray-500">성별</span>
                <p className="font-medium">
                  {data.patient.gender === 'M' ? '남성' : data.patient.gender === 'F' ? '여성' : '(미입력)'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">체질</span>
                <p className="font-medium">{data.patient.constitution || '(미상)'}</p>
              </div>
            </div>
          </div>

          {/* Chief Complaint & Symptoms */}
          <div className="bg-blue-50 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-blue-500" />
              주소증 및 증상
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-blue-600 font-medium">주소증</span>
                <p className="text-gray-800 mt-1">{data.chiefComplaint}</p>
              </div>
              {data.symptoms.length > 0 && (
                <div>
                  <span className="text-sm text-blue-600 font-medium">동반 증상</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.symptoms.map((symptom, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-white text-blue-700 rounded-lg text-sm border border-blue-200"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Diagnosis */}
          {data.diagnosis && (
            <div className="bg-purple-50 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-purple-500" />
                진단 및 변증
              </h3>
              <p className="text-gray-800 whitespace-pre-wrap">{data.diagnosis}</p>
            </div>
          )}

          {/* Prescription */}
          <div className="bg-teal-50 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Pill className="h-5 w-5 text-teal-500" />
              처방
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-lg text-teal-800">
                    {data.prescription.formulaName}
                  </span>
                  {data.prescription.formulaHanja && (
                    <span className="ml-2 text-teal-600">
                      ({data.prescription.formulaHanja})
                    </span>
                  )}
                </div>
                {data.prescription.confidence && (
                  <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                    신뢰도 {(data.prescription.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              <div>
                <span className="text-sm text-teal-600 font-medium">구성 약재</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {data.prescription.herbs.map((herb, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-white rounded-lg border border-teal-200 text-sm"
                    >
                      <span className="font-medium text-gray-800">{herb.name}</span>
                      <span className="text-gray-500 ml-1">{herb.amount}</span>
                      <span className="block text-xs text-teal-600 mt-0.5">{herb.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rationale */}
          <div className="bg-amber-50 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              처방 근거
            </h3>
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {data.prescription.rationale}
            </p>
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="bg-gray-100 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-3">특이사항 / 추가 소견</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-xs text-gray-400 text-center py-4 border-t border-gray-100">
            본 문서는 AI 진료 보조 시스템(온고지신 CDSS)을 통해 생성되었으며,
            <br />
            최종 진료 판단은 담당 한의사의 소견을 따릅니다.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            닫기
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied ? '복사됨' : '텍스트 복사'}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="h-5 w-5" />
            인쇄하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrescriptionDocument
