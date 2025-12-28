import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
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
} from 'lucide-react'
import { LevelBadge } from '@/components/community/LevelBadge'
import { PointsCard } from '@/components/community/PointsCard'
import { LevelProgressCard } from '@/components/community/LevelProgressCard'
import {
  CommunityLevel,
  LEVEL_REQUIREMENTS,
  getLevelInfo,
  calculateLevel,
} from '@/types/level'

// 더미 프로필 데이터 (실제로는 API에서 가져옴)
const dummyProfile = {
  id: '1',
  name: '김한의',
  email: 'kim.hanui@example.com',
  bio: '20년 경력의 한의사입니다. 주로 소화기 질환과 만성 피로 치료를 전문으로 합니다. 상한론과 후세방을 함께 활용한 치료를 추구합니다.',
  specialization: '소화기 질환',
  clinicName: '보인당한의원',
  isLicenseVerified: true,
  memberSince: '2023-01-15',
  lastActivity: '2024-01-15',
  stats: {
    contributionPoints: 1234,
    postCount: 45,
    commentCount: 128,
    acceptedAnswerCount: 23,
    caseCount: 12,
    likeReceived: 89,
  },
}

// 더미 최근 활동
const dummyRecentActivity = [
  {
    id: '1',
    type: 'post',
    title: '이중탕 처방 시 복통이 심해지는 환자, 어떻게 대처하시나요?',
    date: '2024-01-15',
  },
  {
    id: '2',
    type: 'comment',
    title: '반하사심탕 vs 반하백출천마탕, 현훈 치료 시 선택 기준',
    date: '2024-01-14',
  },
  {
    id: '3',
    type: 'accepted',
    title: '만성 피로 환자 보중익기탕 처방 경험',
    date: '2024-01-13',
  },
]

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
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'achievements'>('overview')

  // 레벨 계산
  const currentLevel = calculateLevel(
    dummyProfile.stats.contributionPoints,
    dummyProfile.stats.acceptedAnswerCount
  )
  const levelInfo = getLevelInfo(currentLevel)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="h-7 w-7 text-teal-500" />
            내 프로필
          </h1>
          <p className="mt-1 text-gray-600">
            커뮤니티 활동 현황과 레벨을 확인하세요
          </p>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <Settings className="h-5 w-5" />
          설정
        </Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-teal-500 to-emerald-500" />

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
              {dummyProfile.name[0]}
            </div>

            {/* Info */}
            <div className="flex-1 pt-4 md:pt-0">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {dummyProfile.name}
                </h2>
                {dummyProfile.isLicenseVerified && (
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
                  <TrendingUp className="h-4 w-4 text-teal-500" />
                  기여도 {dummyProfile.stats.contributionPoints.toLocaleString()}P
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {dummyProfile.specialization && (
                  <span className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    {dummyProfile.specialization} 전문
                  </span>
                )}
                {dummyProfile.clinicName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {dummyProfile.clinicName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(dummyProfile.memberSince).toLocaleDateString('ko-KR')} 가입
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
          {dummyProfile.bio && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-700">{dummyProfile.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'overview', label: '개요' },
          { id: 'activity', label: '활동' },
          { id: 'achievements', label: '업적' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-teal-500 text-teal-600'
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
            currentPoints={dummyProfile.stats.contributionPoints}
            currentAccepted={dummyProfile.stats.acceptedAnswerCount}
          />
          <PointsCard stats={dummyProfile.stats} />
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">최근 활동</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {dummyRecentActivity.map((activity) => {
              const Icon = activityIcons[activity.type as keyof typeof activityIcons]
              const label = activityLabels[activity.type as keyof typeof activityLabels]

              return (
                <Link
                  key={activity.id}
                  to={`/community/post/${activity.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-1">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {label} · {activity.date}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-teal-500 transition-colors" />
                </Link>
              )
            })}
          </div>
          <div className="p-4 border-t border-gray-100">
            <Link
              to="/community/my/posts"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              모든 활동 보기 →
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-center py-12">
            <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">업적 시스템 준비 중입니다</p>
            <p className="text-sm text-gray-400 mt-1">
              곧 다양한 업적과 배지를 획득할 수 있습니다
            </p>
          </div>
        </div>
      )}

      {/* Level Perks */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
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
                      ? 'bg-teal-50 border-teal-200'
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
                      <span className="text-xs px-2 py-0.5 bg-teal-500 text-white rounded-full">
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
                          isCurrentOrPast ? 'text-teal-700' : 'text-gray-500'
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
