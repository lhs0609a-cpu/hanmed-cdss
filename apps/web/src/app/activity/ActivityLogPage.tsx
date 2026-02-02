import { useState } from 'react'
import {
  Activity,
  Search,
  Stethoscope,
  LogIn,
  Settings,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pill,
  BookOpen,
  CreditCard,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

// 활동 유형 정의
type ActivityType =
  | 'login'
  | 'consultation'
  | 'prescription'
  | 'search'
  | 'case_view'
  | 'settings'
  | 'export'
  | 'payment'

interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: Date
  metadata?: Record<string, string>
}

// 활동 유형별 아이콘 및 색상
const activityConfig: Record<ActivityType, { icon: typeof Activity; color: string; bgColor: string }> = {
  login: { icon: LogIn, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  consultation: { icon: Stethoscope, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  prescription: { icon: Pill, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  search: { icon: Search, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  case_view: { icon: BookOpen, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  settings: { icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  export: { icon: Download, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  payment: { icon: CreditCard, color: 'text-rose-600', bgColor: 'bg-rose-100' },
}

// 샘플 활동 데이터
const sampleActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'consultation',
    title: 'AI 진료 상담',
    description: '환자 김OO님 두통 증상 상담',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
    metadata: { patient: '김OO', symptom: '두통' },
  },
  {
    id: '2',
    type: 'prescription',
    title: '처방 생성',
    description: '보중익기탕 처방 생성',
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45분 전
    metadata: { formula: '보중익기탕' },
  },
  {
    id: '3',
    type: 'search',
    title: '치험례 검색',
    description: '"소화불량" 키워드로 검색',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
    metadata: { keyword: '소화불량', results: '23' },
  },
  {
    id: '4',
    type: 'case_view',
    title: '치험례 조회',
    description: '사례 #1234: 만성 두통 치료 사례',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3시간 전
  },
  {
    id: '5',
    type: 'login',
    title: '로그인',
    description: '웹 브라우저에서 로그인',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5시간 전
    metadata: { device: 'Chrome / Windows' },
  },
  {
    id: '6',
    type: 'export',
    title: '데이터 내보내기',
    description: '진료 기록 CSV 다운로드',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 어제
  },
  {
    id: '7',
    type: 'settings',
    title: '설정 변경',
    description: '알림 설정 수정',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2일 전
  },
  {
    id: '8',
    type: 'payment',
    title: '구독 결제',
    description: 'Professional 플랜 월간 결제',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7일 전
    metadata: { amount: '49,000원' },
  },
]

// 상대 시간 포맷
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR')
}

// 활동 유형별 필터 옵션
const filterOptions = [
  { value: 'all', label: '전체', icon: Activity },
  { value: 'consultation', label: 'AI 진료', icon: Stethoscope },
  { value: 'prescription', label: '처방', icon: Pill },
  { value: 'search', label: '검색', icon: Search },
  { value: 'case_view', label: '치험례', icon: BookOpen },
  { value: 'login', label: '로그인', icon: LogIn },
]

export default function ActivityLogPage() {
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // 필터링된 활동 목록
  const filteredActivities = sampleActivities.filter((activity) => {
    if (filter !== 'all' && activity.type !== filter) return false
    if (searchQuery && !activity.title.includes(searchQuery) && !activity.description.includes(searchQuery)) {
      return false
    }
    return true
  })

  // 페이지네이션
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // 날짜별 그룹화
  const groupedByDate = paginatedActivities.reduce((acc, activity) => {
    const dateKey = activity.timestamp.toLocaleDateString('ko-KR')
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(activity)
    return acc
  }, {} as Record<string, ActivityItem[]>)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">활동 기록</h1>
          <p className="text-gray-500 mt-1">최근 활동 내역을 확인합니다</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          내보내기
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 검색 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="활동 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 필터 버튼 */}
            <div className="flex gap-2 flex-wrap">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    filter === option.value
                      ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-900/30 dark:border-teal-500 dark:text-teal-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  <option.icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardContent className="p-0">
          {Object.entries(groupedByDate).length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">활동 기록이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {Object.entries(groupedByDate).map(([date, activities]) => (
                <div key={date}>
                  {/* 날짜 헤더 */}
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      {date}
                    </div>
                  </div>

                  {/* 활동 목록 */}
                  {activities.map((activity) => {
                    const config = activityConfig[activity.type]
                    const Icon = config.icon

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${config.bgColor} dark:bg-opacity-20`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {activity.title}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {activity.description}
                              </p>
                              {activity.metadata && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.entries(activity.metadata).map(([key, value]) => (
                                    <Badge key={key} variant="secondary" className="text-xs">
                                      {value}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-400 whitespace-nowrap">
                              <Clock className="h-3.5 w-3.5" />
                              {formatRelativeTime(activity.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500">
                총 {filteredActivities.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredActivities.length)}개
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">24</p>
            <p className="text-sm text-gray-500">이번 주 진료</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">18</p>
            <p className="text-sm text-gray-500">생성된 처방</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">45</p>
            <p className="text-sm text-gray-500">검색 횟수</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">7</p>
            <p className="text-sm text-gray-500">로그인 횟수</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
