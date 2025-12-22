import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Leaf,
  Beaker,
  BookOpen,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Shield,
} from 'lucide-react'
import api from '@/services/api'

interface Compound {
  id: string
  compoundName: string
  compoundNameKo?: string
  category: string
  pharmacology: string
  contentPercent?: number
  pubmedIds?: string[]
}

interface ContainedFormula {
  id: string
  name: string
  hanja?: string
  category: string
}

interface HerbDetail {
  id: string
  standardName: string
  hanjaName: string
  aliases?: string[]
  category: string
  properties: {
    nature?: string
    flavor?: string
  }
  meridianTropism: string[]
  efficacy: string
  contraindications?: string
  compounds: Compound[]
  containedIn: ContainedFormula[]
}

export default function HerbDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [herb, setHerb] = useState<HerbDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchHerb()
  }, [id])

  const fetchHerb = async () => {
    setIsLoading(true)
    try {
      const response = await api.get(`/herbs/${id}`)
      setHerb(response.data)
    } catch (error) {
      setHerb(getDemoHerb(id || '1'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!herb) {
    return (
      <div className="text-center py-20">
        <Leaf className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">약재를 찾을 수 없습니다</p>
        <button
          onClick={() => navigate('/herbs')}
          className="mt-4 text-teal-500 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

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
            <Leaf className="h-6 w-6 text-teal-500" />
            {herb.standardName}
            <span className="text-lg font-normal text-gray-500">{herb.hanjaName}</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="px-3 py-1 bg-teal-50 text-teal-600 text-xs font-medium rounded-lg">
              {herb.category}
            </span>
            {herb.aliases && herb.aliases.length > 0 && (
              <span className="text-sm text-gray-500">
                이명: {herb.aliases.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* 성미귀경 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">성미귀경</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 mb-1">성질</p>
                <p className="text-lg font-bold text-amber-900">
                  {herb.properties?.nature || '-'}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <p className="text-xs text-purple-600 mb-1">맛</p>
                <p className="text-lg font-bold text-purple-900">
                  {herb.properties?.flavor || '-'}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 mb-1">귀경</p>
                <p className="text-lg font-bold text-blue-900">
                  {herb.meridianTropism?.join(', ') || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* 효능 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">💪</span>
              효능
            </h2>
            <p className="text-gray-700 leading-relaxed">{herb.efficacy}</p>
          </div>

          {/* 주요 성분 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Beaker className="h-5 w-5 text-indigo-500" />
              주요 성분
            </h2>

            {herb.compounds.length === 0 ? (
              <p className="text-gray-500 text-sm">등록된 성분 정보가 없습니다</p>
            ) : (
              <div className="space-y-4">
                {herb.compounds.map((compound) => (
                  <div
                    key={compound.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {compound.compoundName}
                        </h3>
                        {compound.compoundNameKo && (
                          <p className="text-sm text-gray-500">{compound.compoundNameKo}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {compound.category && (
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-md">
                            {compound.category}
                          </span>
                        )}
                        {compound.contentPercent && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-md">
                            ~{compound.contentPercent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {compound.pharmacology && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">약리작용:</span> {compound.pharmacology}
                      </p>
                    )}

                    {compound.pubmedIds && compound.pubmedIds.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">관련 논문:</span>
                        {compound.pubmedIds.slice(0, 3).map((pmid) => (
                          <a
                            key={pmid}
                            href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-xs text-blue-600 rounded hover:bg-blue-50"
                          >
                            PMID: {pmid}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 포함된 처방 */}
          {herb.containedIn.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                포함된 처방
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {herb.containedIn.map((formula) => (
                  <Link
                    key={formula.id}
                    to={`/formulas/${formula.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-blue-600">
                        {formula.name}
                      </p>
                      {formula.hanja && (
                        <p className="text-xs text-gray-500">{formula.hanja}</p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-white text-gray-500 text-xs rounded-md">
                      {formula.category}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* 금기/주의 */}
          {herb.contraindications && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
              <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                금기 / 주의
              </h3>
              <p className="text-sm text-red-700 leading-relaxed">
                {herb.contraindications}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Link
              to="/interactions"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Shield className="h-5 w-5" />
              상호작용 검사
            </Link>
          </div>

          {/* 성미귀경 요약 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-3">한눈에 보기</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">성질</span>
                <span className="font-medium text-gray-900">
                  {herb.properties?.nature || '-'}(溫)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">맛</span>
                <span className="font-medium text-gray-900">
                  {herb.properties?.flavor || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">귀경</span>
                <span className="font-medium text-gray-900">
                  {herb.meridianTropism?.join(', ') || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">주요 성분 수</span>
                <span className="font-medium text-gray-900">
                  {herb.compounds.length}개
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">포함된 처방 수</span>
                <span className="font-medium text-gray-900">
                  {herb.containedIn.length}개
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getDemoHerb(_id: string): HerbDetail {
  return {
    id: '1',
    standardName: '당귀',
    hanjaName: '當歸',
    aliases: ['건귀', '당귀신', '당귀미'],
    category: '보혈약',
    properties: { nature: '온', flavor: '감, 신' },
    meridianTropism: ['심', '간', '비'],
    efficacy: '보혈활혈(補血活血), 조경지통(調經止痛), 윤장통변(潤腸通便). 혈허로 인한 면색창백, 두훈목현, 심계, 월경부조, 경폐통경, 허한복통, 장조변비, 풍습비통, 질타손상 등을 치료한다.',
    contraindications: '습성설사 환자 주의. 와파린 복용자 주의 (출혈 위험 증가). 임신 중 대량 복용 금지.',
    compounds: [
      {
        id: '1',
        compoundName: 'Decursin',
        compoundNameKo: '데커신',
        category: '쿠마린',
        pharmacology: '항암, 항염증, 혈류개선, 신경보호 작용',
        contentPercent: 2.5,
        pubmedIds: ['12345678', '23456789', '34567890'],
      },
      {
        id: '2',
        compoundName: 'Ferulic acid',
        compoundNameKo: '페룰산',
        category: '페놀산',
        pharmacology: '항산화, 혈관확장, 항염, 자외선 차단',
        contentPercent: 0.8,
        pubmedIds: ['45678901', '56789012'],
      },
      {
        id: '3',
        compoundName: 'Ligustilide',
        compoundNameKo: '리구스틸라이드',
        category: '프탈라이드',
        pharmacology: '진경, 진통, 혈류개선, 항혈전',
        contentPercent: 1.2,
        pubmedIds: ['67890123'],
      },
    ],
    containedIn: [
      { id: '1', name: '사물탕', hanja: '四物湯', category: '보익제' },
      { id: '2', name: '당귀작약산', hanja: '當歸芍藥散', category: '이수제' },
      { id: '3', name: '보중익기탕', hanja: '補中益氣湯', category: '보익제' },
      { id: '4', name: '십전대보탕', hanja: '十全大補湯', category: '보익제' },
      { id: '5', name: '궁귀교애탕', hanja: '芎歸膠艾湯', category: '이혈제' },
    ],
  }
}
