import { useState } from 'react'
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  FileEdit,
  AlertTriangle,
  Info,
  ChevronRight,
  User,
  Calendar,
  Pill,
  Stethoscope,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentTemplate {
  id: string
  name: string
  category: string
  description: string
  icon: React.ElementType
  fields: string[]
}

const templates: DocumentTemplate[] = [
  {
    id: 'consent-treatment',
    name: '치료 동의서',
    category: '동의서',
    description: '한방 치료(침, 뜸, 부항, 추나 등) 전 환자 동의서',
    icon: Stethoscope,
    fields: ['환자명', '생년월일', '치료내용', '날짜'],
  },
  {
    id: 'consent-herbal',
    name: '한약 복용 동의서',
    category: '동의서',
    description: '한약 처방 및 복용에 대한 설명 및 동의서',
    icon: Pill,
    fields: ['환자명', '생년월일', '처방명', '복용기간', '날짜'],
  },
  {
    id: 'consent-chuna',
    name: '추나요법 동의서',
    category: '동의서',
    description: '추나요법 시술 전 동의서 (보험 청구용)',
    icon: User,
    fields: ['환자명', '생년월일', '진단명', '시술부위', '날짜'],
  },
  {
    id: 'info-herbal',
    name: '한약 복용 안내문',
    category: '안내문',
    description: '한약 복용 방법 및 주의사항 안내문',
    icon: FileText,
    fields: ['환자명', '처방명', '복용방법'],
  },
  {
    id: 'info-acupuncture',
    name: '침치료 후 안내문',
    category: '안내문',
    description: '침치료 후 주의사항 안내문',
    icon: FileText,
    fields: ['환자명'],
  },
  {
    id: 'progress-note',
    name: '경과기록지',
    category: '기록지',
    description: '진료 경과 기록 양식',
    icon: FileEdit,
    fields: ['환자명', '날짜', '증상', '치료내용', '경과'],
  },
]

const consentTreatmentContent = `
한방 치료 동의서

1. 본인은 아래 치료에 대한 설명을 충분히 듣고 이해하였습니다.

[치료 내용]
□ 침술 (체침, 전침)
□ 뜸술 (직접구, 간접구)
□ 부항술 (건식, 습식)
□ 추나요법
□ 약침

2. 치료 중 발생할 수 있는 부작용에 대해 설명을 들었습니다.
- 침술: 출혈, 멍, 통증, 드물게 기흉 등
- 뜸술: 화상, 수포, 반흔 등
- 부항: 멍, 수포, 피부 손상 등
- 추나: 일시적 통증 악화, 근육통 등

3. 치료 중 불편감이 있을 경우 즉시 알리겠습니다.

4. 본인은 위 내용을 충분히 이해하고 치료에 동의합니다.

날짜: ____________

환자명: ____________ (서명)

보호자명: ____________ (서명) (미성년자의 경우)

담당 한의사: ____________
`

const herbalConsentContent = `
한약 복용 동의서

환자명: ____________
생년월일: ____________

[처방 정보]
처방명: ____________
복용 기간: ____________

1. 본인은 위 한약 처방에 대한 설명을 충분히 들었습니다.

2. 복용 중 나타날 수 있는 반응에 대해 설명을 들었습니다.
- 소화장애 (속쓰림, 설사 등)
- 알레르기 반응 (발진, 가려움 등)
- 일시적 증상 악화 (명현반응)

3. 다음 사항을 숙지하였습니다.
- 복용 방법 및 시간
- 음식 주의사항
- 병용 금기 약물

4. 임신 여부: □ 해당없음  □ 임신 중  □ 임신 가능성 있음

5. 현재 복용 중인 약물:
____________

본인은 위 내용을 이해하고 한약 복용에 동의합니다.

날짜: ____________

환자명: ____________ (서명)

담당 한의사: ____________
`

const herbalInfoContent = `
한약 복용 안내문

환자명: ____________
처방명: ____________

[복용 방법]
1. 복용 시간
   - 식후 30분 ~ 1시간 (기본)
   - 공복 시 복용하면 효과가 좋으나 속이 쓰릴 수 있음

2. 복용량
   - 1회 1포 (또는 1첩)
   - 1일 2~3회

3. 보관 방법
   - 냉장 보관 (탕약의 경우)
   - 서늘하고 건조한 곳 (환제, 산제의 경우)

[주의사항]
1. 복용 중 피해야 할 음식
   - 밀가루 음식, 찬 음식, 날음식
   - 기름진 음식, 자극적인 음식
   - 녹두, 무 (일부 처방의 경우)

2. 복용 중 피해야 할 약물
   - 양약과 최소 1~2시간 간격 유지
   - 복용 중인 약물은 반드시 알릴 것

3. 이상 반응 시 대처
   - 심한 설사, 구토 시 복용 중단 후 내원
   - 피부 발진, 가려움 시 복용 중단 후 내원
   - 기타 불편감 시 상담

문의: ○○한의원 (☎ 000-0000-0000)
`

export default function DocumentsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const getPreviewContent = () => {
    if (!selectedTemplate) return ''

    let content = ''
    switch (selectedTemplate.id) {
      case 'consent-treatment':
        content = consentTreatmentContent
        break
      case 'consent-herbal':
        content = herbalConsentContent
        break
      case 'info-herbal':
        content = herbalInfoContent
        break
      default:
        content = `${selectedTemplate.name}\n\n[내용이 준비 중입니다]`
    }

    // Replace placeholders with form data
    Object.entries(formData).forEach(([key, value]) => {
      const placeholder = `____________`
      if (value) {
        content = content.replace(placeholder, value)
      }
    })

    return content
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getPreviewContent())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${selectedTemplate?.name}</title>
            <style>
              body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; line-height: 1.8; }
              h1 { text-align: center; margin-bottom: 30px; }
              pre { white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <pre>${getPreviewContent()}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const categories = ['전체', '동의서', '안내문', '기록지']
  const [selectedCategory, setSelectedCategory] = useState('전체')

  const filteredTemplates = templates.filter(
    (t) => selectedCategory === '전체' || t.category === selectedCategory
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-7 w-7 text-violet-500" />
          문서 템플릿
        </h1>
        <p className="mt-1 text-gray-500">
          동의서, 안내문, 기록지 템플릿을 생성하세요
        </p>
      </div>

      {selectedTemplate ? (
        // Template Editor
        <div className="space-y-6">
          <button
            onClick={() => {
              setSelectedTemplate(null)
              setFormData({})
              setShowPreview(false)
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            ← 목록으로
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-violet-100 rounded-xl">
                  <selectedTemplate.icon className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                  <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {selectedTemplate.fields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field}
                    </label>
                    {field === '치료내용' || field === '경과' || field === '증상' ? (
                      <textarea
                        value={formData[field] || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none h-24"
                        placeholder={`${field} 입력`}
                      />
                    ) : field === '날짜' ? (
                      <input
                        type="date"
                        value={formData[field] || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData[field] || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        placeholder={`${field} 입력`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowPreview(true)}
                className="w-full mt-6 py-3 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors font-medium"
              >
                미리보기
              </button>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">미리보기</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    복사
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    인쇄
                  </button>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 min-h-[400px] max-h-[600px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                  {getPreviewContent()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Template List
        <>
          {/* Category Filter */}
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  selectedCategory === category
                    ? 'bg-violet-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const Icon = template.icon
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-lg hover:border-violet-200 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-violet-100 rounded-xl group-hover:bg-violet-200 transition-colors">
                      <Icon className="h-6 w-6 text-violet-600" />
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      {template.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-violet-600 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {template.description}
                  </p>

                  <div className="flex items-center text-sm font-medium text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    템플릿 사용
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Info */}
          <div className="bg-violet-50 rounded-2xl border border-violet-100 p-6">
            <div className="flex items-start gap-4">
              <Info className="h-6 w-6 text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-violet-900 mb-2">문서 템플릿 사용 안내</h3>
                <ul className="space-y-1 text-sm text-violet-700">
                  <li>• 모든 템플릿은 일반적인 양식으로, 기관 상황에 맞게 수정하여 사용하세요</li>
                  <li>• 법적 효력이 필요한 문서는 전문가 검토를 권장합니다</li>
                  <li>• 환자 개인정보는 관련 법규에 따라 안전하게 관리하세요</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
