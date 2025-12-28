import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Leaf,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Plus,
  Shield,
} from 'lucide-react'
import api from '@/services/api'
import { MedicineSchool } from '@/types'
import { SchoolBadge, SchoolInfoCard } from '@/components/formula/SchoolBadge'
import { HanjaTooltip, HanjaText, useHanjaSettings } from '@/components/hanja'
import { HERB_DICTIONARY, MEDICAL_TERM_DICTIONARY } from '@/data/hanja-dictionary'

interface FormulaHerb {
  id: string
  name: string
  hanja?: string
  amount: string
  role: string
  efficacy?: string
}

interface Modification {
  condition: string
  action: string
}

interface FormulaDetail {
  id: string
  name: string
  hanja: string
  category: string
  source: string
  indication: string
  pathogenesis?: string
  contraindications?: string[]
  modifications?: Modification[]
  herbs: FormulaHerb[]
  school?: MedicineSchool
  schoolNotes?: string
}

const roleColors: Record<string, { bg: string; text: string; label: string }> = {
  '군': { bg: 'bg-red-100', text: 'text-red-700', label: '君' },
  '신': { bg: 'bg-orange-100', text: 'text-orange-700', label: '臣' },
  '좌': { bg: 'bg-blue-100', text: 'text-blue-700', label: '佐' },
  '사': { bg: 'bg-green-100', text: 'text-green-700', label: '使' },
}

// 약재 한자에 대한 뜻풀이 (자주 쓰이는 것들)
const HERB_MEANINGS: Record<string, string> = {
  '麻黃': '땀을 내서 감기를 치료하는 약',
  '桂枝': '경락을 따뜻하게 하여 한기를 흩어줌',
  '芍藥': '간을 조절하고 통증을 완화',
  '細辛': '폐를 따뜻하게 하고 담음을 제거',
  '乾薑': '속을 따뜻하게 하고 소화를 도움',
  '半夏': '가래를 삭이고 구토를 멎게 함',
  '五味子': '폐기를 수렴하고 기침을 완화',
  '甘草': '여러 약재를 조화시키고 독성을 줄임',
  '黃芪': '기운을 북돋우고 면역력을 높임',
  '人蔘': '기운을 크게 보충하는 대표적인 보약',
  '白朮': '소화기능을 강화하고 습기를 제거',
  '當歸': '혈액을 보충하고 순환시킴',
  '陳皮': '소화를 돕고 가래를 삭임',
  '升麻': '양기를 끌어올리는 승양 작용',
  '柴胡': '간의 울체를 풀고 열을 내림',
  '茯神': '마음을 안정시키고 정신을 맑게 함',
  '酸棗仁': '마음을 안정시키고 잠을 잘 오게 함',
  '龍眼肉': '혈액을 보충하고 마음을 편안하게 함',
  '遠志': '마음을 안정시키고 기억력을 높임',
  '木香': '기의 순환을 돕고 복통을 완화',
}

export default function FormulaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [formula, setFormula] = useState<FormulaDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { showHanja } = useHanjaSettings()

  useEffect(() => {
    fetchFormula()
  }, [id])

  const fetchFormula = async () => {
    setIsLoading(true)
    try {
      const response = await api.get(`/formulas/${id}`)
      setFormula(response.data)
    } catch (error) {
      // 데모용 더미 데이터
      setFormula(getDemoFormula(id || '1'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!formula) {
    return (
      <div className="text-center py-20">
        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">처방을 찾을 수 없습니다</p>
        <button
          onClick={() => navigate('/formulas')}
          className="mt-4 text-blue-500 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  // 군신좌사별로 그룹화
  const herbsByRole = formula.herbs.reduce((acc, herb) => {
    const role = herb.role || '기타'
    if (!acc[role]) acc[role] = []
    acc[role].push(herb)
    return acc
  }, {} as Record<string, FormulaHerb[]>)

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {showHanja ? (
              <>
                {formula.name}
                <span className="text-lg font-normal text-gray-500">{formula.hanja}</span>
              </>
            ) : (
              formula.name
            )}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {formula.source && (
              <span className="text-sm text-gray-500">출전: {formula.source}</span>
            )}
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
              {formula.category}
            </span>
            {formula.school && (
              <SchoolBadge school={formula.school} size="md" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* 주치 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              주치 (적응증)
            </h2>
            <p className="text-gray-700 leading-relaxed">{formula.indication}</p>

            {formula.pathogenesis && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">병기:</span> {formula.pathogenesis}
                </p>
              </div>
            )}
          </div>

          {/* 구성 약재 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Leaf className="h-5 w-5 text-teal-500" />
              구성 약재
            </h2>

            <div className="space-y-4">
              {['군', '신', '좌', '사'].map((role) => {
                const herbs = herbsByRole[role]
                if (!herbs?.length) return null

                const roleStyle = roleColors[role] || { bg: 'bg-gray-100', text: 'text-gray-700', label: role }

                return (
                  <div key={role} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2.5 py-1 ${roleStyle.bg} ${roleStyle.text} text-xs font-bold rounded-md`}>
                        {roleStyle.label}藥
                      </span>
                      <span className="text-sm text-gray-500">
                        {role === '군' && '주된 효능을 담당하는 약재'}
                        {role === '신' && '군약을 보조하는 약재'}
                        {role === '좌' && '군신을 도와 조화를 이루는 약재'}
                        {role === '사' && '약재들을 조화롭게 이끄는 약재'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {herbs.map((herb) => (
                        <div
                          key={herb.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${roleStyle.bg.replace('100', '500')}`} />
                            <div>
                              <Link
                                to={`/herbs/${herb.id}`}
                                className="font-medium text-gray-900 hover:text-teal-600"
                              >
                                {herb.hanja ? (
                                  <HanjaTooltip
                                    hanja={herb.hanja}
                                    korean={herb.name}
                                    meaning={HERB_MEANINGS[herb.hanja] || herb.efficacy}
                                    showHanja={showHanja}
                                  />
                                ) : (
                                  herb.name
                                )}
                              </Link>
                              {herb.efficacy && (
                                <p className="text-xs text-gray-500 mt-0.5">{herb.efficacy}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-600">{herb.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 가감법 */}
          {formula.modifications && formula.modifications.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-amber-500" />
                가감법
              </h2>

              <div className="space-y-3">
                {formula.modifications.map((mod, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <div>
                      <span className="text-gray-700">{mod.condition}</span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="font-medium text-amber-700">{mod.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* 학파 정보 */}
          {formula.school && (
            <SchoolInfoCard school={formula.school} />
          )}

          {/* 금기 */}
          {formula.contraindications && formula.contraindications.length > 0 && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
              <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                금기사항
              </h3>
              <ul className="space-y-2">
                {formula.contraindications.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="text-red-400 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
            <Link
              to={`/combo?formula=${encodeURIComponent(formula.id)}`}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              합방 계산기에 추가
            </Link>

            <Link
              to="/interactions"
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Shield className="h-5 w-5" />
              상호작용 검사
            </Link>
          </div>

          {/* 약재 목록 요약 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-3">약재 요약</h3>
            <div className="flex flex-wrap gap-2">
              {formula.herbs.map((herb) => {
                const roleStyle = roleColors[herb.role] || { bg: 'bg-gray-100', text: 'text-gray-700' }
                return (
                  <span
                    key={herb.id}
                    className={`px-2.5 py-1 ${roleStyle.bg} ${roleStyle.text} text-xs font-medium rounded-full`}
                  >
                    {showHanja && herb.hanja ? herb.hanja : herb.name} {herb.amount}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getDemoFormula(id: string): FormulaDetail {
  const formulas: Record<string, FormulaDetail> = {
    '1': {
      id: '1',
      name: '소청룡탕',
      hanja: '小靑龍湯',
      category: '해표제',
      source: '상한론',
      school: 'classical',
      indication: '외한내음(外寒內飮). 오한발열, 무한, 수양성 콧물, 천해기급, 흉만, 설백활, 맥부 등의 증상을 치료한다.',
      pathogenesis: '외감풍한으로 표가 막히고, 한음이 폐에 정체되어 발생하는 증상',
      contraindications: [
        '음허화왕 환자 금기',
        '출혈 경향 환자 주의',
        '고혈압 환자 신중 투여',
      ],
      modifications: [
        { condition: '열이 있으면', action: '석고 가미' },
        { condition: '구역질이 심하면', action: '반하 증량' },
        { condition: '갈증이 있으면', action: '천화분 가미' },
        { condition: '소변불리', action: '복령 가미' },
      ],
      herbs: [
        { id: '1', name: '마황', hanja: '麻黃', amount: '9g', role: '군', efficacy: '발한해표, 선폐평천' },
        { id: '2', name: '계지', hanja: '桂枝', amount: '6g', role: '신', efficacy: '온경산한' },
        { id: '3', name: '작약', hanja: '芍藥', amount: '6g', role: '신', efficacy: '화영지통' },
        { id: '4', name: '세신', hanja: '細辛', amount: '3g', role: '좌', efficacy: '온폐화음' },
        { id: '5', name: '건강', hanja: '乾薑', amount: '3g', role: '좌', efficacy: '온중지구' },
        { id: '6', name: '반하', hanja: '半夏', amount: '6g', role: '좌', efficacy: '조습화담' },
        { id: '7', name: '오미자', hanja: '五味子', amount: '3g', role: '좌', efficacy: '수렴폐기' },
        { id: '8', name: '감초', hanja: '甘草', amount: '3g', role: '사', efficacy: '조화제약' },
      ],
    },
    '19': {
      id: '19',
      name: '보중익기탕',
      hanja: '補中益氣湯',
      category: '보익제',
      source: '비위론',
      school: 'later',
      indication: '비위기허, 중기하함. 권태무력, 식욕부진, 자한, 내장하수, 구설화담, 탈항, 자궁탈수 등의 증상을 치료한다.',
      pathogenesis: '비위기허로 중기가 하함하여 발생하는 제반 증상. 과로, 음식부절 등으로 비위가 손상된 경우.',
      contraindications: [
        '외감병 초기 환자 금기',
        '음허화왕 환자 주의',
        '실열증 환자 금기',
      ],
      modifications: [
        { condition: '두통이 있으면', action: '만형자 가미' },
        { condition: '습담이 있으면', action: '반하, 진피 증량' },
        { condition: '자궁하수', action: '오미자, 녹용 가미' },
        { condition: '탈항', action: '오배자 가미' },
      ],
      herbs: [
        { id: '1', name: '황기', hanja: '黃芪', amount: '15g', role: '군', efficacy: '보기승양' },
        { id: '2', name: '인삼', hanja: '人蔘', amount: '9g', role: '신', efficacy: '대보원기' },
        { id: '3', name: '백출', hanja: '白朮', amount: '9g', role: '신', efficacy: '건비익기' },
        { id: '4', name: '당귀', hanja: '當歸', amount: '6g', role: '좌', efficacy: '보혈화영' },
        { id: '5', name: '진피', hanja: '陳皮', amount: '6g', role: '좌', efficacy: '이기조중' },
        { id: '6', name: '승마', hanja: '升麻', amount: '3g', role: '좌', efficacy: '승거양기' },
        { id: '7', name: '시호', hanja: '柴胡', amount: '3g', role: '좌', efficacy: '승양해울' },
        { id: '8', name: '감초', hanja: '甘草', amount: '6g', role: '사', efficacy: '조화제약' },
      ],
    },
    '21': {
      id: '21',
      name: '귀비탕',
      hanja: '歸脾湯',
      category: '보익제',
      source: '제생방',
      school: 'later',
      indication: '심비양허, 사려과도, 노상심비, 건망, 심계, 도한, 불면, 자한, 권태무력, 식욕부진 등의 증상을 치료한다.',
      pathogenesis: '심비양허로 기혈이 부족하고 심신이 실양되어 발생하는 제반 증상.',
      contraindications: [
        '외감병 환자 금기',
        '실열증 환자 금기',
        '담습이 심한 환자 주의',
      ],
      modifications: [
        { condition: '불면이 심하면', action: '산조인, 원지 증량' },
        { condition: '출혈 경향', action: '아교, 삼칠 가미' },
        { condition: '식욕부진이 심하면', action: '사인, 곽향 가미' },
      ],
      herbs: [
        { id: '1', name: '인삼', hanja: '人蔘', amount: '9g', role: '군', efficacy: '대보원기' },
        { id: '2', name: '황기', hanja: '黃芪', amount: '12g', role: '군', efficacy: '보기고표' },
        { id: '3', name: '백출', hanja: '白朮', amount: '9g', role: '신', efficacy: '건비익기' },
        { id: '4', name: '복신', hanja: '茯神', amount: '9g', role: '신', efficacy: '영심안신' },
        { id: '5', name: '산조인', hanja: '酸棗仁', amount: '9g', role: '좌', efficacy: '양심안신' },
        { id: '6', name: '용안육', hanja: '龍眼肉', amount: '9g', role: '좌', efficacy: '보심익비' },
        { id: '7', name: '당귀', hanja: '當歸', amount: '6g', role: '좌', efficacy: '보혈화영' },
        { id: '8', name: '원지', hanja: '遠志', amount: '6g', role: '좌', efficacy: '안신익지' },
        { id: '9', name: '목향', hanja: '木香', amount: '3g', role: '좌', efficacy: '이기조중' },
        { id: '10', name: '감초', hanja: '甘草', amount: '3g', role: '사', efficacy: '조화제약' },
      ],
    },
  }

  return formulas[id] || formulas['1']
}
