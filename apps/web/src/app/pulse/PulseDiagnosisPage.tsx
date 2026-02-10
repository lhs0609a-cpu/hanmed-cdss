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
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
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
  { name: '위치', pulses: ['부', '침', '복'] },
  { name: '속도', pulses: ['지', '삭', '완', '질'] },
  { name: '강도', pulses: ['허', '실', '미', '약'] },
  { name: '형태', pulses: ['활', '삽', '현', '긴', '유', '혁', '뇌', '산', '동'] },
  { name: '폭', pulses: ['홍', '대', '세', '소'] },
  { name: '길이', pulses: ['장', '단'] },
  { name: '리듬', pulses: ['결', '대', '촉'] },
]

const pulseTypes: PulseType[] = [
  // ===== 위치 (Position) =====
  {
    id: 'fu',
    name: '부맥',
    hanja: '浮脈',
    category: '위치',
    description: '가볍게 눌러도 느껴지고, 강하게 누르면 약해지는 맥',
    characteristics: ['표층에서 촉지', '가볍게 누르면 명확', '강하게 누르면 감소', '피모(皮毛) 수준에서 촉지'],
    indications: ['표증', '외감', '기부(氣浮)'],
    relatedPatterns: ['태양병', '외감풍한', '기허', '양기외부'],
  },
  {
    id: 'chen',
    name: '침맥',
    hanja: '沈脈',
    category: '위치',
    description: '강하게 눌러야 느껴지는 맥',
    characteristics: ['심층에서 촉지', '가볍게 누르면 미약', '강하게 눌러야 명확', '근골(筋骨) 수준에서 촉지'],
    indications: ['리증', '장부병', '음허', '수습'],
    relatedPatterns: ['이증', '장부 내상', '음성병', '장부병변'],
  },
  {
    id: 'fu2',
    name: '복맥',
    hanja: '伏脈',
    category: '위치',
    description: '매우 깊이 눌러야 겨우 느껴지는 맥, 침맥보다 더 깊음',
    characteristics: ['침맥보다 더 깊은 위치', '골(骨) 수준까지 눌러야 촉지', '거의 만지기 어려움', '극심하게 누르면 겨우 느껴짐'],
    indications: ['사기폐색', '통증극심', '후궐', '양기쇠미'],
    relatedPatterns: ['담음폐색', '극심한 통증', '양기내함', '궐증'],
  },
  // ===== 속도 (Speed) =====
  {
    id: 'chi',
    name: '지맥',
    hanja: '遲脈',
    category: '속도',
    description: '1호흡에 3회 이하 (분당 60회 미만)',
    characteristics: ['맥박이 느림', '1분에 60회 미만', '호흡 1회에 맥박 3회 미만'],
    indications: ['한증', '양허', '음성'],
    relatedPatterns: ['한사내성', '양기부족', '음한내성', '비양허'],
  },
  {
    id: 'shuo',
    name: '삭맥',
    hanja: '數脈',
    category: '속도',
    description: '1호흡에 5회 이상 (분당 90회 이상)',
    characteristics: ['맥박이 빠름', '1분에 90회 이상', '호흡 1회에 맥박 5회 이상'],
    indications: ['열증', '화성', '음허화왕'],
    relatedPatterns: ['열사내성', '음허화동', '실열', '허열'],
  },
  {
    id: 'huan',
    name: '완맥',
    hanja: '緩脈',
    category: '속도',
    description: '1호흡에 4회, 느슨하고 부드러운 맥',
    characteristics: ['맥박이 느슨함', '분당 60-75회', '이완된 느낌', '긴장되지 않음'],
    indications: ['비위허약', '습병', '정상맥'],
    relatedPatterns: ['비허', '습사', '건강인의 위기충만 시'],
  },
  {
    id: 'ji',
    name: '질맥',
    hanja: '疾脈',
    category: '속도',
    description: '1호흡에 7-8회 이상 (분당 120회 이상), 삭맥보다 더 빠름',
    characteristics: ['맥박이 매우 빠름', '분당 120회 이상', '호흡 1회에 맥박 7회 이상', '삭맥보다 더 급함'],
    indications: ['양기외탈', '원기쇠갈', '음경양항'],
    relatedPatterns: ['음탈', '양탈', '위급증', '심장질환'],
  },
  // ===== 강도 (Strength) =====
  {
    id: 'xu',
    name: '허맥',
    hanja: '虛脈',
    category: '강도',
    description: '삼부 모두 무력한 맥',
    characteristics: ['전체적으로 힘이 없음', '눌러도 저항감이 적음', '삼부 모두 무력', '부취에서도 무력'],
    indications: ['기혈양허', '정기부족'],
    relatedPatterns: ['기허', '혈허', '기혈양허', '원기부족'],
  },
  {
    id: 'shi',
    name: '실맥',
    hanja: '實脈',
    category: '강도',
    description: '삼부 모두 유력한 맥',
    characteristics: ['전체적으로 힘이 있음', '강하게 눌러도 저항감이 있음', '삼부 모두 유력', '장대하고 힘참'],
    indications: ['실증', '사기성'],
    relatedPatterns: ['실열', '담음', '식적', '기체혈어'],
  },
  {
    id: 'wei',
    name: '미맥',
    hanja: '微脈',
    category: '강도',
    description: '극히 가늘고 연약하여 끊어질 듯한 맥',
    characteristics: ['극히 미약함', '가늘고 연약함', '거의 촉지되지 않음', '끊어질 듯함'],
    indications: ['양기쇠미', '기혈대허', '위독증'],
    relatedPatterns: ['양허', '양탈', '기혈양허', '위급증'],
  },
  {
    id: 'ruo',
    name: '약맥',
    hanja: '弱脈',
    category: '강도',
    description: '침세하면서 무력한 맥',
    characteristics: ['침취에서 촉지', '가늘고 무력함', '힘이 없고 부드러움', '세맥과 침맥의 복합'],
    indications: ['기혈부족', '양허', '음허'],
    relatedPatterns: ['기혈양허', '양허', '음허', '정허'],
  },
  // ===== 형태 (Form) =====
  {
    id: 'hua',
    name: '활맥',
    hanja: '滑脈',
    category: '형태',
    description: '구슬이 굴러가듯 유창한 맥',
    characteristics: ['왕래가 유창', '구슬 굴러가는 느낌', '원활함', '접시 위의 구슬처럼 매끄러움'],
    indications: ['담음', '식적', '임신', '실열'],
    relatedPatterns: ['담습', '식체', '열성병', '임신'],
  },
  {
    id: 'se',
    name: '삽맥',
    hanja: '澀脈',
    category: '형태',
    description: '칼로 대나무를 긁듯 거칠고 막히는 맥',
    characteristics: ['왕래가 어려움', '삽체하고 부드럽지 않음', '거칠고 막힘', '세사가 얽힌 듯함'],
    indications: ['혈허', '혈어', '진액고갈', '정상'],
    relatedPatterns: ['혈어', '혈허', '정혈부족', '음허진고'],
  },
  {
    id: 'xian',
    name: '현맥',
    hanja: '弦脈',
    category: '형태',
    description: '활시위처럼 팽팽한 맥',
    characteristics: ['팽팽함', '강직함', '눌러도 탄력적', '거문고 줄처럼 팽팽함'],
    indications: ['간담병', '통증', '담음', '학질'],
    relatedPatterns: ['간기울결', '간양상항', '통증', '담음병'],
  },
  {
    id: 'jin',
    name: '긴맥',
    hanja: '緊脈',
    category: '형태',
    description: '꼬인 밧줄처럼 팽팽하고 긴장된 맥',
    characteristics: ['긴장됨', '좌우로 흔들리는 느낌', '탄탄함', '밧줄을 꼰 것 같음'],
    indications: ['한사', '통증', '식적'],
    relatedPatterns: ['한사', '산통', '식적', '실한'],
  },
  {
    id: 'ru',
    name: '유맥',
    hanja: '濡脈',
    category: '형태',
    description: '물 위에 뜬 솜처럼 부드럽고 가는 맥',
    characteristics: ['부취에서 촉지', '세하고 연약함', '솜처럼 부드러움', '눌리면 사라짐'],
    indications: ['허증', '습병', '기혈양허'],
    relatedPatterns: ['습사', '기혈부족', '정허', '허증'],
  },
  {
    id: 'ge',
    name: '혁맥',
    hanja: '革脈',
    category: '형태',
    description: '북가죽을 두드리듯 겉은 딱딱하고 속은 빈 맥',
    characteristics: ['부취에서 현대', '중취에서 공허', '북가죽 같음', '외강중공'],
    indications: ['정혈대실', '반위', '붕루', '유산'],
    relatedPatterns: ['정혈모손', '대출혈', '유산', '반위'],
  },
  {
    id: 'lao',
    name: '뇌맥',
    hanja: '牢脈',
    category: '형태',
    description: '침취에서 현장실대하고 견고한 맥',
    characteristics: ['침취에서 촉지', '현하고 장하며 실대함', '견고하고 힘 있음', '강하게 눌러야 느껴짐'],
    indications: ['음한내성', '적취', '산기'],
    relatedPatterns: ['적취', '산기', '음한내성', '한사응체'],
  },
  {
    id: 'san',
    name: '산맥',
    hanja: '散脈',
    category: '형태',
    description: '부취에서 산만하고 무근(無根)한 맥',
    characteristics: ['부취에서 산만함', '중취에서 찾기 어려움', '뿌리가 없는 느낌', '흩어지는 맥'],
    indications: ['원기이산', '정기장탈', '위급증'],
    relatedPatterns: ['원기패절', '장부기쇠', '사망전조', '위급증'],
  },
  {
    id: 'dong',
    name: '동맥',
    hanja: '動脈',
    category: '형태',
    description: '관부에서 활삭하며 두근두근 뛰는 맥',
    characteristics: ['관부에서 촉지', '활하고 삭함', '두근거림', '콩처럼 뜀'],
    indications: ['통증', '경공', '음양상박'],
    relatedPatterns: ['통증', '놀람', '경공', '음양부조'],
  },
  // ===== 폭 (Width) =====
  {
    id: 'hong',
    name: '홍맥',
    hanja: '洪脈',
    category: '폭',
    description: '파도처럼 크게 밀려오다가 빠지는 맥',
    characteristics: ['맥체가 큼', '내강외약', '밀려왔다가 빠짐', '홍수처럼 밀려옴'],
    indications: ['열성', '기분열성', '음허화왕'],
    relatedPatterns: ['열증', '기분증', '양명병', '실열'],
  },
  {
    id: 'da',
    name: '대맥',
    hanja: '大脈',
    category: '폭',
    description: '맥체가 넓고 큰 맥',
    characteristics: ['맥폭이 넓음', '홍맥처럼 오르내림이 크지는 않음', '맥체가 넓고 큼', '충만감'],
    indications: ['병진', '정상인(장대)'],
    relatedPatterns: ['질병진행', '사기왕성', '체격장대인'],
  },
  {
    id: 'xi',
    name: '세맥',
    hanja: '細脈',
    category: '폭',
    description: '실처럼 가느다란 맥',
    characteristics: ['맥체가 가늘다', '분명하지만 작음', '실처럼 가늘다', '그러나 끊어지지는 않음'],
    indications: ['기혈양허', '음허', '습병'],
    relatedPatterns: ['기혈부족', '음허', '제습', '노허손상'],
  },
  {
    id: 'xiao',
    name: '소맥',
    hanja: '小脈',
    category: '폭',
    description: '맥체가 작고 세한 맥',
    characteristics: ['맥폭이 좁음', '작고 세함', '무력감 동반 가능'],
    indications: ['제허', '혈허', '기허'],
    relatedPatterns: ['기혈양허', '정기부족', '허손'],
  },
  // ===== 길이 (Length) =====
  {
    id: 'chang',
    name: '장맥',
    hanja: '長脈',
    category: '길이',
    description: '촌척 양 끝으로 길게 뻗은 맥',
    characteristics: ['본위를 넘어 촌척으로 뻗음', '길게 느껴짐', '맥세가 김', '여유가 있음'],
    indications: ['양성', '열성', '양증', '실증'],
    relatedPatterns: ['양기왕성', '열증', '간화항성', '사기충성'],
  },
  {
    id: 'duan',
    name: '단맥',
    hanja: '短脈',
    category: '길이',
    description: '촌척에 미치지 못하고 관부에만 응하는 맥',
    characteristics: ['관부에서만 촉지', '촌척에서 약함', '길이가 짧음', '양 끝이 부족'],
    indications: ['기허', '기울', '기체'],
    relatedPatterns: ['기병', '기허', '기울', '기체'],
  },
  // ===== 리듬 (Rhythm) =====
  {
    id: 'jie',
    name: '결맥',
    hanja: '結脈',
    category: '리듬',
    description: '느린 가운데 불규칙하게 멈추는 맥',
    characteristics: ['맥이 느림', '불규칙하게 멈춤', '멈추는 간격이 일정치 않음', '한랭한 느낌'],
    indications: ['음성한응', '기혈허체', '담음', '적취'],
    relatedPatterns: ['한사', '어혈', '담음', '기체'],
  },
  {
    id: 'dai',
    name: '대맥',
    hanja: '代脈',
    category: '리듬',
    description: '규칙적인 간격으로 멈추는 맥',
    characteristics: ['맥이 규칙적으로 멈춤', '정해진 박자마다 멈춤', '멈추는 간격이 일정', '약간 더 오래 멈춤'],
    indications: ['장기쇠패', '풍증', '통증', '칠정'],
    relatedPatterns: ['장기허손', '심기부족', '외상통증', '칠정손상'],
  },
  {
    id: 'cu',
    name: '촉맥',
    hanja: '促脈',
    category: '리듬',
    description: '빠른 가운데 불규칙하게 멈추는 맥',
    characteristics: ['맥이 빠름', '불규칙하게 멈춤', '삭맥이면서 결대함', '열한 느낌'],
    indications: ['양성열성', '기혈담식', '적취'],
    relatedPatterns: ['양항', '열성', '담화', '어혈', '기체'],
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

interface PulseAnalysis {
  overallPattern: string
  patternType: '표증' | '이증' | '허증' | '실증' | '한증' | '열증' | '복합'
  affectedOrgans: string[]
  recommendations: string[]
  relatedFormulas: string[]
  severity: 'mild' | 'moderate' | 'severe'
}

// 맥진 분석 함수
const analyzePulseRecords = (records: Record<string, PulseRecord>): PulseAnalysis | null => {
  const recordedPulses = Object.values(records)
  if (recordedPulses.length === 0) return null

  const pulseNames = recordedPulses.map(r => r.pulseType)
  const affectedOrgans: string[] = []
  const patterns: string[] = []
  const recommendations: string[] = []
  const relatedFormulas: string[] = []

  // 표리 분석
  const hasFloating = pulseNames.some(p => p.includes('부'))
  const hasSinking = pulseNames.some(p => p.includes('침') || p.includes('복'))

  // 한열 분석
  const hasSlow = pulseNames.some(p => p.includes('지') || p.includes('완'))
  const hasFast = pulseNames.some(p => p.includes('삭') || p.includes('질'))

  // 허실 분석
  const hasWeak = pulseNames.some(p => p.includes('허') || p.includes('미') || p.includes('약') || p.includes('세'))
  const hasStrong = pulseNames.some(p => p.includes('실') || p.includes('홍') || p.includes('대'))

  // 특수 맥상
  const hasWiry = pulseNames.some(p => p.includes('현'))
  const hasSlippery = pulseNames.some(p => p.includes('활'))
  const hasRough = pulseNames.some(p => p.includes('삽'))
  const hasTight = pulseNames.some(p => p.includes('긴'))
  const hasIrregular = pulseNames.some(p => p.includes('결') || p.includes('대') || p.includes('촉'))

  // 영향 받는 장부 분석
  Object.entries(records).forEach(([posId, record]) => {
    const pos = positions.find(p => p.id === posId)
    if (pos && record.strength <= 2) {
      affectedOrgans.push(`${pos.organ} (허약)`)
    } else if (pos && record.strength >= 4) {
      affectedOrgans.push(`${pos.organ} (항진)`)
    }
  })

  // 패턴 판단
  let patternType: PulseAnalysis['patternType'] = '복합'
  let overallPattern = ''

  if (hasFloating && hasFast) {
    patternType = '표증'
    overallPattern = '표열증 (表熱證)'
    patterns.push('외감풍열')
    recommendations.push('발한해표, 청열')
    relatedFormulas.push('은교산', '상국음')
  } else if (hasFloating && hasSlow) {
    patternType = '표증'
    overallPattern = '표한증 (表寒證)'
    patterns.push('외감풍한')
    recommendations.push('발한해표, 온산')
    relatedFormulas.push('마황탕', '계지탕')
  } else if (hasSinking && hasSlow && hasWeak) {
    patternType = '허증'
    overallPattern = '양허증 (陽虛證)'
    patterns.push('양기부족', '내한')
    recommendations.push('온양보기')
    relatedFormulas.push('부자이중환', '사역탕', '팔미지황환')
  } else if (hasSinking && hasFast && hasWeak) {
    patternType = '허증'
    overallPattern = '음허증 (陰虛證)'
    patterns.push('음액부족', '허열')
    recommendations.push('자음청열')
    relatedFormulas.push('육미지황환', '지백지황환', '대보음환')
  } else if (hasStrong && hasFast) {
    patternType = '열증'
    overallPattern = '실열증 (實熱證)'
    patterns.push('열사내성')
    recommendations.push('청열사화')
    relatedFormulas.push('백호탕', '황련해독탕')
  } else if (hasStrong && hasSlow && hasTight) {
    patternType = '한증'
    overallPattern = '실한증 (實寒證)'
    patterns.push('한사내성')
    recommendations.push('온중산한')
    relatedFormulas.push('이중환', '오수유탕')
  } else if (hasWiry) {
    patternType = '실증'
    overallPattern = '간기울결 (肝氣鬱結)'
    patterns.push('간담 문제', '기체')
    recommendations.push('소간해울, 이기')
    relatedFormulas.push('소요산', '시호소간산')
  } else if (hasSlippery && hasFast) {
    patternType = '실증'
    overallPattern = '담열증 (痰熱證)'
    patterns.push('담음', '열')
    recommendations.push('청열화담')
    relatedFormulas.push('청기화담환', '온담탕')
  } else if (hasRough) {
    patternType = '허증'
    overallPattern = '혈허/혈어 (血虛/血瘀)'
    patterns.push('혈액 문제')
    recommendations.push('보혈 또는 활혈거어')
    relatedFormulas.push('사물탕', '도홍사물탕', '혈부축어탕')
  } else if (hasIrregular) {
    patternType = '복합'
    overallPattern = '기혈어체 또는 장기허손'
    patterns.push('맥률 불규칙')
    recommendations.push('심장 기능 확인 필요', '기혈조화')
    relatedFormulas.push('자감초탕', '귀비탕')
  } else if (hasWeak) {
    patternType = '허증'
    overallPattern = '기혈양허 (氣血兩虛)'
    patterns.push('기허', '혈허')
    recommendations.push('보기양혈')
    relatedFormulas.push('팔물탕', '십전대보탕', '귀비탕')
  }

  // 중증도 판단
  const avgStrength = recordedPulses.reduce((sum, r) => sum + r.strength, 0) / recordedPulses.length
  let severity: PulseAnalysis['severity'] = 'mild'
  if (avgStrength <= 2 || hasIrregular) {
    severity = 'severe'
  } else if (avgStrength <= 3 || patterns.length >= 3) {
    severity = 'moderate'
  }

  return {
    overallPattern: overallPattern || '추가 진찰 필요',
    patternType,
    affectedOrgans: [...new Set(affectedOrgans)],
    recommendations: [...new Set(recommendations)],
    relatedFormulas: [...new Set(relatedFormulas)],
    severity,
  }
}

interface SavedPulseRecord {
  id: string
  timestamp: string
  records: Record<string, PulseRecord>
  overallNotes: string
  analysis: PulseAnalysis | null
}

export default function PulseDiagnosisPage() {
  const [records, setRecords] = useState<Record<string, PulseRecord>>({})
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [selectedPulseInfo, setSelectedPulseInfo] = useState<PulseType | null>(null)
  const [overallNotes, setOverallNotes] = useState('')
  const [analysis, setAnalysis] = useState<PulseAnalysis | null>(null)
  const [savedRecords, setSavedRecords] = useState<SavedPulseRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pulse_diagnosis_records')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return []
        }
      }
    }
    return []
  })
  const [showHistory, setShowHistory] = useState(false)

  // 맥진 기록이 변경될 때마다 자동 분석
  const handleAnalyze = () => {
    const result = analyzePulseRecords(records)
    setAnalysis(result)
  }

  // 복수 맥상 선택: 토글 방식으로 여러 맥 선택 가능
  const handlePulseSelect = (positionId: string, pulseName: string) => {
    const position = positions.find((p) => p.id === positionId)
    if (!position) return

    setRecords((prev) => {
      const existing = prev[positionId]
      if (existing) {
        // 이미 선택된 맥상 목록을 쉼표로 관리
        const currentPulses = existing.pulseType.split(', ').filter(Boolean)
        const idx = currentPulses.indexOf(pulseName)
        if (idx >= 0) {
          // 이미 있으면 제거
          currentPulses.splice(idx, 1)
          if (currentPulses.length === 0) {
            // 전부 제거되면 레코드 삭제
            const { [positionId]: _, ...rest } = prev
            return rest
          }
          return {
            ...prev,
            [positionId]: { ...existing, pulseType: currentPulses.join(', ') },
          }
        } else {
          // 없으면 추가 (최대 3개)
          if (currentPulses.length >= 3) return prev
          return {
            ...prev,
            [positionId]: { ...existing, pulseType: [...currentPulses, pulseName].join(', ') },
          }
        }
      }
      return {
        ...prev,
        [positionId]: {
          position: position.position,
          level: position.level,
          pulseType: pulseName,
          strength: 3,
          notes: '',
        },
      }
    })
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
    if (Object.keys(records).length === 0) {
      return
    }

    const pulseData: SavedPulseRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      records,
      overallNotes,
      analysis,
    }

    const newSavedRecords = [pulseData, ...savedRecords].slice(0, 30) // 최대 30개 유지
    setSavedRecords(newSavedRecords)
    localStorage.setItem('pulse_diagnosis_records', JSON.stringify(newSavedRecords))

    // 저장 후 초기화
    handleReset()
    setShowHistory(true) // 저장 후 히스토리 표시
  }

  const loadSavedRecord = (saved: SavedPulseRecord) => {
    setRecords(saved.records)
    setOverallNotes(saved.overallNotes)
    setAnalysis(saved.analysis)
    setShowHistory(false)
  }

  const deleteSavedRecord = (id: string) => {
    const newSavedRecords = savedRecords.filter(r => r.id !== id)
    setSavedRecords(newSavedRecords)
    localStorage.setItem('pulse_diagnosis_records', JSON.stringify(newSavedRecords))
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
          육부위 맥진 결과를 기록하세요. 확실하지 않은 부위는 건너뛸 수 있습니다.
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

              <p className="text-xs text-gray-400 mb-3">복수 선택 가능 (최대 3개) - 확실하지 않으면 여러 맥을 선택하세요</p>
              <div className="space-y-4">
                {pulseCategories.map((category) => (
                  <div key={category.name}>
                    <p className="text-sm font-medium text-gray-500 mb-2">{category.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.pulses.map((pulse) => {
                        const pulseInfo = pulseTypes.find((p) => p.name.startsWith(pulse))
                        const currentPulses = records[selectedPosition]?.pulseType?.split(', ') || []
                        const isSelected = currentPulses.includes(pulse + '맥')
                        return (
                          <button
                            key={pulse}
                            onClick={() => {
                              handlePulseSelect(selectedPosition, pulse + '맥')
                              if (pulseInfo) setSelectedPulseInfo(pulseInfo)
                            }}
                            className={cn(
                              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                              isSelected
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

          {/* Analyze Button - 1개만 입력해도 분석 가능 */}
          {Object.keys(records).length >= 1 && (
            <button
              onClick={handleAnalyze}
              className="w-full py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-slate-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Activity className="h-5 w-5" />
              AI 맥진 분석
            </button>
          )}

          {/* Analysis Result */}
          {analysis && (
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                맥진 분석 결과
              </h2>

              {/* Main Pattern */}
              <div className="p-4 bg-white rounded-xl mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">변증 패턴</span>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded',
                    analysis.severity === 'mild' && 'bg-green-100 text-green-700',
                    analysis.severity === 'moderate' && 'bg-yellow-100 text-yellow-700',
                    analysis.severity === 'severe' && 'bg-red-100 text-red-700'
                  )}>
                    {analysis.severity === 'mild' && '경증'}
                    {analysis.severity === 'moderate' && '중등도'}
                    {analysis.severity === 'severe' && '주의 필요'}
                  </span>
                </div>
                <p className="text-xl font-bold text-slate-900">{analysis.overallPattern}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">
                  {analysis.patternType}
                </span>
              </div>

              {/* Affected Organs */}
              {analysis.affectedOrgans.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-800 mb-2">관련 장부</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.affectedOrgans.map((organ, i) => (
                      <span key={i} className="px-2 py-1 bg-white text-slate-700 text-sm rounded-lg border border-slate-200">
                        {organ}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-800 mb-2">치료 방향</p>
                  <ul className="space-y-1">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-slate-600" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Formulas */}
              {analysis.relatedFormulas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-800 mb-2">추천 처방</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.relatedFormulas.map((formula, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg">
                        {formula}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* Saved Records History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-500" />
                저장된 기록 ({savedRecords.length})
              </h3>
              {showHistory ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {showHistory && (
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {savedRecords.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    저장된 맥진 기록이 없습니다
                  </p>
                ) : (
                  savedRecords.map((saved) => (
                    <div
                      key={saved.id}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-500">
                            {new Date(saved.timestamp).toLocaleString('ko-KR')}
                          </p>
                          {saved.analysis && (
                            <p className="text-sm font-medium text-indigo-700 mt-1">
                              {saved.analysis.overallPattern}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => loadSavedRecord(saved)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                            title="불러오기"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteSavedRecord(saved.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(saved.records).map(([posId, record]) => {
                          const pos = positions.find(p => p.id === posId)
                          return pos ? (
                            <span
                              key={posId}
                              className="px-2 py-0.5 bg-white text-xs text-gray-600 rounded border"
                            >
                              {pos.name}: {record.pulseType}
                            </span>
                          ) : null
                        })}
                      </div>
                      {saved.overallNotes && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                          {saved.overallNotes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
