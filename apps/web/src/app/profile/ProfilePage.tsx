import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Shield,
  Calendar,
  Award,
  Edit,
  Settings,
  BookOpen,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  MapPin,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import api from '@/services/api'
import { LevelBadge } from '@/components/community/LevelBadge'
import { PointsCard } from '@/components/community/PointsCard'
import { LevelProgressCard } from '@/components/community/LevelProgressCard'
import {
  LEVEL_REQUIREMENTS,
  getLevelInfo,
  calculateLevel,
} from '@/types/level'

interface ProfileResponse {
  id: string
  email: string
  name: string
  clinicName: string | null
  specialization: string | null
  bio: string | null
  isLicenseVerified: boolean
  contributionPoints: number
  postCount: number
  commentCount: number
  acceptedAnswerCount: number
  createdAt: string
}

const activityIcons = {
  post: BookOpen,
  comment: MessageSquare,
  accepted: Award,
}

const activityLabels = {
  post: '게시글 작성',
  comment: '댓글 작성',
  accepted: '답변 채택됨',
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await api.get<ProfileResponse>('/users/me')
      return res.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        프로필을 불러오는 중...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="max-w-5xl mx-auto py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="text-neutral-600">프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    )
  }

  // API 응답 → 화면 모델
  const profile = {
    name: data.name,
    email: data.email,
    bio: data.bio ?? '',
    specialization: data.specialization ?? '',
    clinicName: data.clinicName ?? '',
    isLicenseVerified: data.isLicenseVerified,
    memberSince: data.createdAt,
    stats: {
      contributionPoints: data.contributionPoints ?? 0,
      postCount: data.postCount ?? 0,
      commentCount: data.commentCount ?? 0,
      acceptedAnswerCount: data.acceptedAnswerCount ?? 0,
    },
  }

  // 최근 활동 전용 API가 아직 없으므로 빈 상태로 표시한다.
  const recentActivity: Array<{ id: string; type: string; title: string; date: string }> = []

  // 레벨 계산
  const currentLevel = calculateLevel(
    profile.stats.contributionPoints,
    profile.stats.acceptedAnswerCount
  )
  const levelInfo = getLevelInfo(currentLevel)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">
            프로필
          </h1>
          <p className="mt-1 text-[14px] text-neutral-500">
            커뮤니티 활동 현황과 레벨을 확인합니다.
          </p>
        </div>
        <Link
          to="/dashboard/settings"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <Settings className="h-5 w-5" />
          설정
        </Link>
      </div>

      {/* Profile Card */}
      <div className="surface-card rounded-2xl overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-500" />

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
              {profile.name[0]}
            </div>

            {/* Info */}
            <div className="flex-1 pt-4 md:pt-0">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile.name}
                </h2>
                {profile.isLicenseVerified && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm font-medium">면허 인증됨</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <LevelBadge level={currentLevel} size="lg" variant="gradient" />
                <span className="text-gray-400">|</span>
                <span className="flex items-center gap-1 text-gray-600">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  기여도 {profile.stats.contributionPoints.toLocaleString()}P
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {profile.specialization && (
                  <span className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    {profile.specialization} 전문
                  </span>
                )}
                {profile.clinicName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.clinicName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(profile.memberSince).toLocaleDateString('ko-KR')} 가입
                </span>
              </div>
            </div>

            {/* Edit Button */}
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              <Edit className="h-4 w-4" />
              프로필 수정
            </button>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-700">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'overview', label: '개요' },
          { id: 'activity', label: '활동' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LevelProgressCard
            currentLevel={levelInfo}
            currentPoints={profile.stats.contributionPoints}
            currentAccepted={profile.stats.acceptedAnswerCount}
          />
          <PointsCard stats={profile.stats} />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="surface-card rounded-2xl">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">최근 활동</h3>
          </div>
          {recentActivity.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">
              최근 활동 내역이 없습니다.
            </div>
          )}
          <div className="divide-y divide-gray-100">
            {recentActivity.map((activity) => {
              const Icon = activityIcons[activity.type as keyof typeof activityIcons]
              const label = activityLabels[activity.type as keyof typeof activityLabels]

              return (
                <Link
                  key={activity.id}
                  to={`/community/post/${activity.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {label} · {activity.date}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </Link>
              )
            })}
          </div>
          <div className="p-4 border-t border-gray-100">
            <Link
              to="/dashboard/community/my/posts"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              모든 활동 보기 →
            </Link>
          </div>
        </div>
      )}

      {/* Level Perks */}
      <div className="surface-card rounded-2xl">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">레벨별 혜택</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEVEL_REQUIREMENTS.map((req) => {
              const isCurrentOrPast =
                LEVEL_REQUIREMENTS.findIndex((r) => r.level === currentLevel) >=
                LEVEL_REQUIREMENTS.findIndex((r) => r.level === req.level)

              return (
                <div
                  key={req.level}
                  className={`p-4 rounded-xl border ${
                    isCurrentOrPast
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <LevelBadge
                      level={req.level}
                      size="sm"
                      variant={isCurrentOrPast ? 'gradient' : 'outline'}
                    />
                    {req.level === currentLevel && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded-full">
                        현재
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {req.requiredPoints.toLocaleString()}P · 채택 {req.requiredAcceptedAnswers}개
                  </div>
                  <ul className="space-y-1">
                    {req.perks.map((perk) => (
                      <li
                        key={perk}
                        className={`text-sm ${
                          isCurrentOrPast ? 'text-blue-700' : 'text-gray-500'
                        }`}
                      >
                        • {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
