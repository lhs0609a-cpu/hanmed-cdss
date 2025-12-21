import { useState } from 'react'
import { Search, BookOpen } from 'lucide-react'

// 더미 치험례 데이터
const dummyCases = [
  {
    id: 'LEE-1995-0001',
    chiefComplaint: '소화불량, 복부 냉증',
    symptoms: '식욕부진, 복부팽만, 수족냉증, 설사',
    constitution: '소음인',
    formulaName: '이중탕',
    outcome: '호전',
    year: 1995,
  },
  {
    id: 'LEE-1997-0342',
    chiefComplaint: '두통, 어지러움',
    symptoms: '편두통, 현훈, 이명, 구역감',
    constitution: '소양인',
    formulaName: '반하백출천마탕',
    outcome: '완치',
    year: 1997,
  },
  {
    id: 'LEE-2001-0128',
    chiefComplaint: '만성 피로, 기력 저하',
    symptoms: '권태감, 식욕부진, 자한, 숨참',
    constitution: '태음인',
    formulaName: '보중익기탕',
    outcome: '호전',
    year: 2001,
  },
  {
    id: 'LEE-2005-0456',
    chiefComplaint: '불면, 심계',
    symptoms: '입면장애, 가슴 두근거림, 불안, 다몽',
    constitution: '소음인',
    formulaName: '귀비탕',
    outcome: '완치',
    year: 2005,
  },
]

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConstitution, setSelectedConstitution] = useState('')

  const filteredCases = dummyCases.filter((c) => {
    const matchesQuery =
      !searchQuery ||
      c.chiefComplaint.includes(searchQuery) ||
      c.symptoms.includes(searchQuery) ||
      c.formulaName.includes(searchQuery)
    const matchesConstitution =
      !selectedConstitution || c.constitution === selectedConstitution
    return matchesQuery && matchesConstitution
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">치험례 검색</h1>
        <p className="mt-1 text-gray-600">
          이종대 선생님의 6,000건 치험례 데이터를 검색합니다.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="증상, 처방명으로 검색..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={selectedConstitution}
            onChange={(e) => setSelectedConstitution(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">전체 체질</option>
            <option value="태양인">태양인</option>
            <option value="태음인">태음인</option>
            <option value="소양인">소양인</option>
            <option value="소음인">소음인</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {filteredCases.length}건의 치험례를 찾았습니다.
        </p>

        {filteredCases.map((caseItem) => (
          <div
            key={caseItem.id}
            className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {caseItem.chiefComplaint}
                  </h3>
                  <p className="text-sm text-gray-500">
                    케이스 ID: {caseItem.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {caseItem.constitution}
                </span>
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    caseItem.outcome === '완치'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {caseItem.outcome}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-500">증상:</span>
                <span className="text-sm text-gray-700 ml-2">
                  {caseItem.symptoms}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">처방:</span>
                <span className="text-sm text-primary font-medium ml-2">
                  {caseItem.formulaName}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">기록 연도:</span>
                <span className="text-sm text-gray-700 ml-2">
                  {caseItem.year}년
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
