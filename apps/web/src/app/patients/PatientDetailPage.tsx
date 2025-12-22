import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Calendar,
  FileText,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Pill,
  Stethoscope,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VisitRecord {
  id: string
  date: string
  symptoms: string[]
  diagnosis: string
  prescription: string
  pulseNote: string
  painScore: number
  notes: string
}

interface ProgressData {
  date: string
  painScore: number
  symptomCount: number
}

const demoPatient = {
  id: '1',
  name: '김영희',
  birthDate: '1985-03-15',
  gender: 'F' as const,
  phone: '010-1234-5678',
  address: '서울시 강남구 역삼동',
  constitution: '소음인',
  allergies: ['페니실린'],
  medications: ['고혈압약 (아침)'],
  mainComplaint: '만성 소화불량, 피로',
  medicalHistory: '2020년 위염 진단',
}

const demoVisits: VisitRecord[] = [
  {
    id: '1',
    date: '2024-01-15',
    symptoms: ['소화불량', '식후 더부룩함', '피로', '수족냉'],
    diagnosis: '비기허(脾氣虛), 위한(胃寒)',
    prescription: '향사육군자탕 가미',
    pulseNote: '좌관: 세약, 우관: 허완',
    painScore: 6,
    notes: '식사량 줄이고 따뜻한 음식 권고. 2주 후 재진.',
  },
  {
    id: '2',
    date: '2024-01-01',
    symptoms: ['소화불량', '복부 팽만감', '피로', '수족냉', '변비'],
    diagnosis: '비기허(脾氣虛)',
    prescription: '육군자탕',
    pulseNote: '전체적으로 세약',
    painScore: 7,
    notes: '초진. 3개월 전부터 증상 시작.',
  },
  {
    id: '3',
    date: '2023-12-15',
    symptoms: ['소화불량', '복통', '피로', '수족냉'],
    diagnosis: '비위허한(脾胃虛寒)',
    prescription: '이중탕',
    pulseNote: '지맥, 세약',
    painScore: 8,
    notes: '급성 악화. 찬음식 섭취 후 증상 심화.',
  },
]

const progressData: ProgressData[] = [
  { date: '12/15', painScore: 8, symptomCount: 4 },
  { date: '01/01', painScore: 7, symptomCount: 5 },
  { date: '01/15', painScore: 6, symptomCount: 4 },
]

export default function PatientDetailPage() {
  const { id: _id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'progress'>('overview')
  const [showNewVisitModal, setShowNewVisitModal] = useState(false)

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getTrend = (current: number, previous: number) => {
    if (current < previous) return { icon: TrendingDown, color: 'text-green-500', label: '호전' }
    if (current > previous) return { icon: TrendingUp, color: 'text-red-500', label: '악화' }
    return { icon: Minus, color: 'text-gray-500', label: '유지' }
  }

  const latestVisit = demoVisits[0]
  const previousVisit = demoVisits[1]
  const trend = getTrend(latestVisit.painScore, previousVisit?.painScore || latestVisit.painScore)
  const TrendIcon = trend.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              demoPatient.gender === 'F' ? 'bg-pink-100' : 'bg-blue-100'
            )}>
              <User className={cn(
                'h-6 w-6',
                demoPatient.gender === 'F' ? 'text-pink-500' : 'text-blue-500'
              )} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{demoPatient.name}</h1>
              <p className="text-gray-500">
                {demoPatient.gender === 'F' ? '여' : '남'}, 만 {calculateAge(demoPatient.birthDate)}세
                {demoPatient.constitution && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    {demoPatient.constitution}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowNewVisitModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-5 w-5" />
          새 진료 기록
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">총 내원 횟수</p>
          <p className="text-2xl font-bold text-gray-900">{demoVisits.length}회</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">현재 통증 점수</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900">{latestVisit.painScore}/10</p>
            <TrendIcon className={cn('h-5 w-5', trend.color)} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">최근 처방</p>
          <p className="text-lg font-bold text-gray-900 truncate">{latestVisit.prescription}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">다음 예약</p>
          <p className="text-lg font-bold text-blue-600">01/29 (월) 14:00</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
            activeTab === 'overview'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          )}
        >
          환자 정보
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={cn(
            'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
            activeTab === 'visits'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          )}
        >
          진료 기록
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={cn(
            'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
            activeTab === 'progress'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          )}
        >
          경과 추이
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              기본 정보
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">생년월일</span>
                <span className="font-medium">{demoPatient.birthDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">연락처</span>
                <span className="font-medium">{demoPatient.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">주소</span>
                <span className="font-medium">{demoPatient.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">체질</span>
                <span className="font-medium">{demoPatient.constitution || '미진단'}</span>
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-gray-500" />
              의료 정보
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">주소증</p>
                <p className="text-gray-900">{demoPatient.mainComplaint}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">과거력</p>
                <p className="text-gray-900">{demoPatient.medicalHistory}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">알레르기</p>
                <div className="flex flex-wrap gap-2">
                  {demoPatient.allergies.map((allergy, i) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-lg">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">복용 약물</p>
                <div className="flex flex-wrap gap-2">
                  {demoPatient.medications.map((med, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg">
                      {med}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="space-y-4">
          {demoVisits.map((visit, index) => (
            <div key={visit.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{visit.date}</p>
                    <p className="text-sm text-gray-500">
                      {index === 0 ? '최근 진료' : `${index + 1}번째 전`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">통증 점수</span>
                  <span className={cn(
                    'px-3 py-1 rounded-full font-bold',
                    visit.painScore <= 3 ? 'bg-green-100 text-green-700' :
                    visit.painScore <= 6 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {visit.painScore}/10
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">증상</p>
                  <div className="flex flex-wrap gap-2">
                    {visit.symptoms.map((symptom, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">진단</p>
                  <p className="text-gray-900">{visit.diagnosis}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">처방</p>
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-teal-500" />
                    <span className="text-gray-900 font-medium">{visit.prescription}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">맥진</p>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-red-500" />
                    <span className="text-gray-900">{visit.pulseNote}</span>
                  </div>
                </div>
              </div>

              {visit.notes && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">
                    <FileText className="inline h-4 w-4 mr-1 text-gray-400" />
                    {visit.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Pain Score Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-6">통증 점수 추이</h3>
            <div className="h-64 flex items-end justify-around gap-4">
              {progressData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-sm font-bold text-gray-900 mb-2">{data.painScore}</span>
                    <div
                      className={cn(
                        'w-full max-w-16 rounded-t-lg transition-all',
                        data.painScore <= 3 ? 'bg-green-400' :
                        data.painScore <= 6 ? 'bg-yellow-400' :
                        'bg-red-400'
                      )}
                      style={{ height: `${data.painScore * 20}px` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 mt-2">{data.date}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded" />
                <span className="text-gray-600">양호 (1-3)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded" />
                <span className="text-gray-600">중간 (4-6)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded" />
                <span className="text-gray-600">심함 (7-10)</span>
              </div>
            </div>
          </div>

          {/* Symptom Count Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-6">증상 개수 추이</h3>
            <div className="h-48 flex items-end justify-around gap-4">
              {progressData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-sm font-bold text-gray-900 mb-2">{data.symptomCount}개</span>
                    <div
                      className="w-full max-w-16 bg-blue-400 rounded-t-lg transition-all"
                      style={{ height: `${data.symptomCount * 25}px` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 mt-2">{data.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Summary */}
          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl border border-green-100 p-6">
            <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              경과 요약
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/70 rounded-xl p-4">
                <p className="text-sm text-gray-600">통증 점수 변화</p>
                <p className="text-2xl font-bold text-green-600">
                  -2점 <span className="text-sm font-normal">(25% 감소)</span>
                </p>
              </div>
              <div className="bg-white/70 rounded-xl p-4">
                <p className="text-sm text-gray-600">치료 기간</p>
                <p className="text-2xl font-bold text-gray-900">1개월</p>
              </div>
              <div className="bg-white/70 rounded-xl p-4">
                <p className="text-sm text-gray-600">총 진료 횟수</p>
                <p className="text-2xl font-bold text-gray-900">{demoVisits.length}회</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Visit Modal */}
      {showNewVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">새 진료 기록</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">증상 (쉼표로 구분)</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="소화불량, 피로, 두통..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">진단</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="비기허(脾氣虛)..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">처방</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="육군자탕 가미..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">맥진 소견</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="좌촌: 부삭, 우관: 허완..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  통증 점수 (0-10)
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
                <textarea
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none h-24"
                  placeholder="추가 메모..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewVisitModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  alert('진료 기록이 저장되었습니다.')
                  setShowNewVisitModal(false)
                }}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="h-5 w-5" />
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
