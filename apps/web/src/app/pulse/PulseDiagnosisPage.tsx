import { useState } from 'react'
import {
  Activity,
  Save,
  RotateCcw,
  Info,
  CheckCircle2,
  Clock,
  User,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PulseType {
  id: string
  name: string
  hanja: string
  category: string
  description: string
  characteristics: string[]
  indications: string[]
  relatedPatterns: string[]
}

interface PulseRecord {
  position: 'left' | 'right'
  level: 'cun' | 'guan' | 'chi'
  pulseType: string
  strength: number
  notes: string
}

const pulseCategories = [
  { name: '위치', pulses: ['부', '침'] },
  { name: '속도', pulses: ['지', '삭', '완'] },
  { name: '강도', pulses: ['허', '실', '미', '약'] },
  { name: '형태', pulses: ['활', '삽', '현', '긴', '유', '혁', '뇌', '산'] },
  { name: '폭', pulses: ['홍', '대', '세', '소'] },
  { name: '리듬', pulses: ['결', '대', '촉'] },
]

const pulseTypes: PulseType[] = [
  {
    id: 'fu',
    name: '부맥',
    hanja: '浮脈',
    category: '위치',
    description: '가볍게 눌러도 느껴지고, 강하게 누르면 약해지는 맥',
    characteristics: ['표층에서 촉지', '가볍게 누르면 명확', '강하게 누르면 감소'],
    indications: ['표증', '외감', '기부(氣浮)'],
    relatedPatterns: ['태양병', '외감풍한', '기허'],
  },
  {
    id: 'chen',
    name: '침맥',
    hanja: '沈脈',
    category: '위치',
    description: '강하게 눌러야 느껴지는 맥',
    characteristics: ['심층에서 촉지', '가볍게 누르면 미약', '강하게 눌러야 명확'],
    indications: ['리증', '장부병', '음허', '수습'],
    relatedPatterns: ['이증', '장부 내상', '음성병'],
  },
  {
    id: 'chi',
    name: '지맥',
    hanja: '遲脈',
    category: '속도',
    description: '1호흡에 3회 이하 (분당 60회 미만)',
    characteristics: ['맥박이 느림', '1분에 60회 미만'],
    indications: ['한증', '양허', '음성'],
    relatedPatterns: ['한사내성', '양기부족', '음한내성'],
  },
  {
    id: 'shuo',
    name: '삭맥',
    hanja: '數脈',
    category: '속도',
    description: '1호흡에 5회 이상 (분당 90회 이상)',
    characteristics: ['맥박이 빠름', '1분에 90회 이상'],
    indications: ['열증', '화성', '음허화왕'],
    relatedPatterns: ['열사내성', '음허화동', '실열'],
  },
  {
    id: 'xu',
    name: '허맥',
    hanja: '虛脈',
    category: '강도',
    description: '삼부 모두 무력한 맥',
    characteristics: ['전체적으로 힘이 없음', '눌러도 저항감이 적음'],
    indications: ['기혈양허', '정기부족'],
    relatedPatterns: ['기허', '혈허', '기혈양허'],
  },
  {
    id: 'shi',
    name: '실맥',
    hanja: '實脈',
    category: '강도',
    description: '삼부 모두 유력한 맥',
    characteristics: ['전체적으로 힘이 있음', '강하게 눌러도 저항감이 있음'],
    indications: ['실증', '사기성'],
    relatedPatterns: ['실열', '담음', '식적'],
  },
  {
    id: 'hua',
    name: '활맥',
    hanja: '滑脈',
    category: '형태',
    description: '구슬이 굴러가듯 유창한 맥',
    characteristics: ['왕래가 유창', '구슬 굴러가는 느낌', '원활함'],
    indications: ['담음', '식적', '임신', '실열'],
    relatedPatterns: ['담습', '식체', '열성병'],
  },
  {
    id: 'se',
    name: '삽맥',
    hanja: '澀脈',
    category: '형태',
    description: '칼로 대나무를 긁듯 거칠고 막히는 맥',
    characteristics: ['왕래가 어려움', '삽체하고 부드럽지 않음'],
    indications: ['혈허', '혈어', '진액고갈', '정상'],
    relatedPatterns: ['혈어', '혈허', '정혈부족'],
  },
  {
    id: 'xian',
    name: '현맥',
    hanja: '弦脈',
    category: '형태',
    description: '활시위처럼 팽팽한 맥',
    characteristics: ['팽팽함', '강직함', '눌러도 탄력적'],
    indications: ['간담병', '통증', '담음', '학질'],
    relatedPatterns: ['간기울결', '간양상항', '통증'],
  },
  {
    id: 'jin',
    name: '긴맥',
    hanja: '緊脈',
    category: '형태',
    description: '꼬인 밧줄처럼 팽팽하고 긴장된 맥',
    characteristics: ['긴장됨', '좌우로 흔들리는 느낌'],
    indications: ['한사', '통증', '식적'],
    relatedPatterns: ['한사', '산통', '식적'],
  },
  {
    id: 'hong',
    name: '홍맥',
    hanja: '洪脈',
    category: '폭',
    description: '파도처럼 크게 밀려오다가 빠지는 맥',
    characteristics: ['맥체가 큼', '내강외약', '밀려왔다가 빠짐'],
    indications: ['열성', '기분열성', '음허화왕'],
    relatedPatterns: ['열증', '기분증', '양명병'],
  },
  {
    id: 'xi',
    name: '세맥',
    hanja: '細脈',
    category: '폭',
    description: '실처럼 가느다란 맥',
    characteristics: ['맥체가 가늘다', '분명하지만 작음'],
    indications: ['기혈양허', '음허', '습병'],
    relatedPatterns: ['기혈부족', '음허', '제습'],
  },
]

const positions = [
  { id: 'left-cun', position: 'left' as const, level: 'cun' as const, name: '좌촌', organ: '심/소장' },
  { id: 'left-guan', position: 'left' as const, level: 'guan' as const, name: '좌관', organ: '간/담' },
  { id: 'left-chi', position: 'left' as const, level: 'chi' as const, name: '좌척', organ: '신(수)/방광' },
  { id: 'right-cun', position: 'right' as const, level: 'cun' as const, name: '우촌', organ: '폐/대장' },
  { id: 'right-guan', position: 'right' as const, level: 'guan' as const, name: '우관', organ: '비/위' },
  { id: 'right-chi', position: 'right' as const, level: 'chi' as const, name: '우척', organ: '신(화)/명문' },
]

export default function PulseDiagnosisPage() {
  const [records, setRecords] = useState<Record<string, PulseRecord>>({})
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [selectedPulseInfo, setSelectedPulseInfo] = useState<PulseType | null>(null)
  const [overallNotes, setOverallNotes] = useState('')

  const handlePulseSelect = (positionId: string, pulseName: string) => {
    const position = positions.find((p) => p.id === positionId)
    if (!position) return

    setRecords((prev) => ({
      ...prev,
      [positionId]: {
        position: position.position,
        level: position.level,
        pulseType: pulseName,
        strength: prev[positionId]?.strength || 3,
        notes: prev[positionId]?.notes || '',
      },
    }))
  }

  const handleStrengthChange = (positionId: string, strength: number) => {
    setRecords((prev) => ({
      ...prev,
      [positionId]: {
        ...prev[positionId],
        strength,
      },
    }))
  }

  const handleReset = () => {
    setRecords({})
    setOverallNotes('')
    setSelectedPosition(null)
  }

  const handleSave = () => {
    const pulseData = {
      timestamp: new Date().toISOString(),
      records,
      overallNotes,
    }
    console.log('Saving pulse diagnosis:', pulseData)
    alert('맥진 기록이 저장되었습니다.')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-7 w-7 text-red-500" />
          맥진 기록
        </h1>
        <p className="mt-1 text-gray-500">
          육부위 맥진 결과를 기록하세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Pulse Positions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pulse Position Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              육부위 맥진
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Left Hand */}
              <div>
                <p className="text-center text-sm font-medium text-gray-500 mb-3">좌수 (左手)</p>
                <div className="space-y-3">
                  {positions.filter((p) => p.position === 'left').map((pos) => (
                    <div
                      key={pos.id}
                      className={cn(
                        'p-4 rounded-xl border-2 cursor-pointer transition-all',
                        selectedPosition === pos.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-red-200'
                      )}
                      onClick={() => setSelectedPosition(pos.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{pos.name}</span>
                        <span className="text-xs text-gray-500">{pos.organ}</span>
                      </div>
                      {records[pos.id] ? (
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-sm font-medium rounded">
                            {records[pos.id].pulseType}
                          </span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={cn(
                                  'w-2 h-4 rounded-sm',
                                  i <= records[pos.id].strength ? 'bg-red-500' : 'bg-gray-200'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">맥상 선택</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Hand */}
              <div>
                <p className="text-center text-sm font-medium text-gray-500 mb-3">우수 (右手)</p>
                <div className="space-y-3">
                  {positions.filter((p) => p.position === 'right').map((pos) => (
                    <div
                      key={pos.id}
                      className={cn(
                        'p-4 rounded-xl border-2 cursor-pointer transition-all',
                        selectedPosition === pos.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-red-200'
                      )}
                      onClick={() => setSelectedPosition(pos.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{pos.name}</span>
                        <span className="text-xs text-gray-500">{pos.organ}</span>
                      </div>
                      {records[pos.id] ? (
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-sm font-medium rounded">
                            {records[pos.id].pulseType}
                          </span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={cn(
                                  'w-2 h-4 rounded-sm',
                                  i <= records[pos.id].strength ? 'bg-red-500' : 'bg-gray-200'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">맥상 선택</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pulse Type Selection */}
          {selectedPosition && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">
                {positions.find((p) => p.id === selectedPosition)?.name} 맥상 선택
              </h2>

              <div className="space-y-4">
                {pulseCategories.map((category) => (
                  <div key={category.name}>
                    <p className="text-sm font-medium text-gray-500 mb-2">{category.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.pulses.map((pulse) => {
                        const pulseInfo = pulseTypes.find((p) => p.name.startsWith(pulse))
                        return (
                          <button
                            key={pulse}
                            onClick={() => {
                              handlePulseSelect(selectedPosition, pulse + '맥')
                              if (pulseInfo) setSelectedPulseInfo(pulseInfo)
                            }}
                            className={cn(
                              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                              records[selectedPosition]?.pulseType === pulse + '맥'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
                            )}
                          >
                            {pulse}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {records[selectedPosition] && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">맥력 (강도)</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          onClick={() => handleStrengthChange(selectedPosition, i)}
                          className={cn(
                            'w-10 h-10 rounded-lg font-medium transition-all',
                            i <= (records[selectedPosition]?.strength || 0)
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          )}
                        >
                          {i}
                        </button>
                      ))}
                      <span className="text-sm text-gray-500 ml-2">
                        {records[selectedPosition]?.strength === 1 && '매우 약함'}
                        {records[selectedPosition]?.strength === 2 && '약함'}
                        {records[selectedPosition]?.strength === 3 && '보통'}
                        {records[selectedPosition]?.strength === 4 && '강함'}
                        {records[selectedPosition]?.strength === 5 && '매우 강함'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Overall Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              종합 소견
            </h2>
            <textarea
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              placeholder="맥진 종합 소견을 입력하세요..."
              className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
              초기화
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              <Save className="h-5 w-5" />
              저장
            </button>
          </div>
        </div>

        {/* Right Column - Pulse Info */}
        <div className="space-y-4">
          {/* Quick Reference */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              맥상 정보
            </h3>

            {selectedPulseInfo ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl font-bold text-gray-900">{selectedPulseInfo.name}</span>
                    <span className="text-gray-500">{selectedPulseInfo.hanja}</span>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {selectedPulseInfo.category}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">설명</p>
                  <p className="text-sm text-gray-600">{selectedPulseInfo.description}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">특징</p>
                  <ul className="space-y-1">
                    {selectedPulseInfo.characteristics.map((c, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">주치 (시사하는 바)</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPulseInfo.indications.map((ind, i) => (
                      <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">관련 병증</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPulseInfo.relatedPatterns.map((pattern, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                맥상을 선택하면 상세 정보가 표시됩니다
              </p>
            )}
          </div>

          {/* Recorded Summary */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 p-6">
            <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              기록된 맥진
            </h3>
            {Object.keys(records).length === 0 ? (
              <p className="text-sm text-red-700/60">아직 기록된 맥진이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {positions.map((pos) => (
                  records[pos.id] && (
                    <div key={pos.id} className="flex items-center justify-between text-sm">
                      <span className="text-red-900">{pos.name}</span>
                      <span className="font-medium text-red-700">{records[pos.id].pulseType}</span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
