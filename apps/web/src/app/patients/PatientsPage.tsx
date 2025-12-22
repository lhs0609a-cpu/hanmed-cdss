import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  Plus,
  Phone,
  ChevronRight,
  User,
  Clock,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Patient {
  id: string
  name: string
  birthDate: string
  gender: 'M' | 'F'
  phone: string
  constitution?: string
  lastVisit: string
  totalVisits: number
  mainComplaint: string
  status: 'active' | 'inactive'
}

const demoPatients: Patient[] = [
  {
    id: '1',
    name: '김영희',
    birthDate: '1985-03-15',
    gender: 'F',
    phone: '010-1234-5678',
    constitution: '소음인',
    lastVisit: '2024-01-15',
    totalVisits: 8,
    mainComplaint: '만성 소화불량, 피로',
    status: 'active',
  },
  {
    id: '2',
    name: '박철수',
    birthDate: '1972-07-22',
    gender: 'M',
    phone: '010-2345-6789',
    constitution: '태음인',
    lastVisit: '2024-01-10',
    totalVisits: 12,
    mainComplaint: '요통, 무릎 관절통',
    status: 'active',
  },
  {
    id: '3',
    name: '이민지',
    birthDate: '1990-11-08',
    gender: 'F',
    phone: '010-3456-7890',
    constitution: '소양인',
    lastVisit: '2024-01-08',
    totalVisits: 5,
    mainComplaint: '월경불순, 두통',
    status: 'active',
  },
  {
    id: '4',
    name: '정대호',
    birthDate: '1968-05-30',
    gender: 'M',
    phone: '010-4567-8901',
    lastVisit: '2023-12-20',
    totalVisits: 3,
    mainComplaint: '불면, 어깨 통증',
    status: 'inactive',
  },
  {
    id: '5',
    name: '최수진',
    birthDate: '1995-09-12',
    gender: 'F',
    phone: '010-5678-9012',
    constitution: '태양인',
    lastVisit: '2024-01-18',
    totalVisits: 2,
    mainComplaint: '스트레스성 두통',
    status: 'active',
  },
]

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showNewPatientModal, setShowNewPatientModal] = useState(false)

  const filteredPatients = demoPatients.filter((patient) => {
    const matchesSearch =
      patient.name.includes(searchQuery) ||
      patient.phone.includes(searchQuery) ||
      patient.mainComplaint.includes(searchQuery)

    const matchesStatus =
      filterStatus === 'all' || patient.status === filterStatus

    return matchesSearch && matchesStatus
  })

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-500" />
            환자 관리
          </h1>
          <p className="mt-1 text-gray-500">
            환자 차트와 진료 기록을 관리합니다
          </p>
        </div>
        <button
          onClick={() => setShowNewPatientModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-5 w-5" />
          새 환자 등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">전체 환자</p>
          <p className="text-2xl font-bold text-gray-900">{demoPatients.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">활성 환자</p>
          <p className="text-2xl font-bold text-green-600">
            {demoPatients.filter((p) => p.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">이번 달 방문</p>
          <p className="text-2xl font-bold text-blue-600">24</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">오늘 예약</p>
          <p className="text-2xl font-bold text-purple-600">5</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="환자명, 전화번호, 주소증으로 검색..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filterStatus === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              전체
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filterStatus === 'active'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              활성
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filterStatus === 'inactive'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              비활성
            </button>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  환자 정보
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  연락처
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  체질
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  주소증
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  최근 방문
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">

                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        patient.gender === 'F' ? 'bg-pink-100' : 'bg-blue-100'
                      )}>
                        <User className={cn(
                          'h-5 w-5',
                          patient.gender === 'F' ? 'text-pink-500' : 'text-blue-500'
                        )} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{patient.name}</p>
                        <p className="text-sm text-gray-500">
                          {patient.gender === 'F' ? '여' : '남'}, 만 {calculateAge(patient.birthDate)}세
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {patient.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {patient.constitution ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg">
                        {patient.constitution}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">미진단</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-700 max-w-xs truncate">{patient.mainComplaint}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-700">{formatDate(patient.lastVisit)}</p>
                        <p className="text-xs text-gray-500">총 {patient.totalVisits}회</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      차트 보기
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">검색 결과가 없습니다</p>
          </div>
        )}
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">새 환자 등록</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="환자 이름"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">생년월일</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
                  <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    <option value="F">여성</option>
                    <option value="M">남성</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="010-0000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">주소증</label>
                <textarea
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none h-24"
                  placeholder="주요 증상을 입력하세요"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewPatientModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  alert('환자가 등록되었습니다.')
                  setShowNewPatientModal(false)
                }}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
