import { useState } from 'react';
import {
  Users,
  Mail,
  MessageSquare,
  TrendingUp,
  Target,
  Play,
  Pause,
  Plus,
  Settings,
  Calendar,
  RefreshCw,
  ChevronRight,
  Zap,
  Filter,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useCrmDashboard,
  useCampaigns,
  useAutoMessages,
  useSegments,
  useStartCampaign,
  usePauseCampaign,
  useToggleAutoMessage,
} from '@/hooks/useCrm';

const campaignTypeLabels: Record<string, string> = {
  seasonal: '계절 캠페인',
  followup: '팔로업',
  reactivation: '재활성화',
  birthday: '생일 축하',
  wellness: '건강정보',
  promotion: '프로모션',
  custom: '커스텀',
};

const channelLabels: Record<string, { icon: React.ReactNode; label: string }> = {
  sms: { icon: <MessageSquare className="w-4 h-4" />, label: 'SMS' },
  kakao: { icon: <MessageSquare className="w-4 h-4" />, label: '카카오톡' },
  push: { icon: <Zap className="w-4 h-4" />, label: '푸시' },
  email: { icon: <Mail className="w-4 h-4" />, label: '이메일' },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700' },
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  completed: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'automation' | 'segments'>('campaigns');
  const [campaignFilter, setCampaignFilter] = useState<string | undefined>();

  const { data: dashboard, isLoading: dashboardLoading } = useCrmDashboard();
  const { data: campaigns } = useCampaigns(campaignFilter);
  const { data: autoMessages } = useAutoMessages();
  const { data: segments } = useSegments();

  const startCampaignMutation = useStartCampaign();
  const pauseCampaignMutation = usePauseCampaign();
  const toggleAutoMessageMutation = useToggleAutoMessage();

  const formatNumber = (num: number) => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
    return num.toString();
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">환자 CRM</h1>
          <p className="text-gray-500 mt-1">자동 리텐션 마케팅 & 환자 관리</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="w-4 h-4" />
          새 캠페인
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">활성 캠페인</p>
            <Target className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{dashboard?.activeCampaigns || 0}개</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">총 발송 메시지</p>
            <Mail className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatNumber(dashboard?.totalMessages || 0)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">전환율</p>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{(dashboard?.conversionRate || 0).toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">등록 세그먼트</p>
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{segments?.length || 0}개</p>
        </div>
      </div>

      {/* Top Segments */}
      {dashboard?.topSegments && dashboard.topSegments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">주요 세그먼트</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {dashboard.topSegments.map((segment, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary-600">{segment.count}</p>
                <p className="text-sm text-gray-600 mt-1">{segment.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-8">
          {[
            { key: 'campaigns', label: '캠페인 관리', icon: Target },
            { key: 'automation', label: '자동 메시지', icon: Zap },
            { key: 'segments', label: '환자 세그먼트', icon: Users },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={campaignFilter || ''}
                onChange={(e) => setCampaignFilter(e.target.value || undefined)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">전체 상태</option>
                <option value="draft">초안</option>
                <option value="scheduled">예약됨</option>
                <option value="active">활성</option>
                <option value="paused">일시정지</option>
                <option value="completed">완료</option>
              </select>
            </div>
          </div>

          <div className="divide-y">
            {campaigns?.map((campaign) => (
              <div key={campaign.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{campaign.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            statusColors[campaign.status]?.bg
                          } ${statusColors[campaign.status]?.text}`}
                        >
                          {campaign.status === 'draft'
                            ? '초안'
                            : campaign.status === 'scheduled'
                            ? '예약됨'
                            : campaign.status === 'active'
                            ? '활성'
                            : campaign.status === 'paused'
                            ? '일시정지'
                            : '완료'}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {campaignTypeLabels[campaign.type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">타겟</p>
                      <p className="font-medium">{campaign.statistics.targetCount}명</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">발송</p>
                      <p className="font-medium">{campaign.statistics.sentCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">전환</p>
                      <p className="font-medium text-green-600">{campaign.statistics.convertedCount}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.status === 'active' ? (
                        <button
                          onClick={() => pauseCampaignMutation.mutate(campaign.id)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          title="일시정지"
                        >
                          <Pause className="w-5 h-5" />
                        </button>
                      ) : campaign.status === 'paused' || campaign.status === 'draft' ? (
                        <button
                          onClick={() => startCampaignMutation.mutate(campaign.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="시작"
                        >
                          <Play className="w-5 h-5" />
                        </button>
                      ) : null}
                      <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                        <Settings className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automation Tab */}
      {activeTab === 'automation' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium">자동 메시지 설정</h3>
            <button className="flex items-center gap-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg">
              <Plus className="w-4 h-4" />
              새 자동 메시지
            </button>
          </div>

          <div className="divide-y">
            {autoMessages?.map((msg) => (
              <div key={msg.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        msg.isActive ? 'bg-green-100' : 'bg-gray-100'
                      }`}
                    >
                      <Zap
                        className={`w-5 h-5 ${msg.isActive ? 'text-green-600' : 'text-gray-400'}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{msg.name}</h4>
                        <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {channelLabels[msg.channel]?.icon}
                          {channelLabels[msg.channel]?.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        트리거:{' '}
                        {msg.triggerType === 'treatment_complete'
                          ? '치료 완료 후'
                          : msg.triggerType === 'medication_end'
                          ? '복약 종료 시'
                          : msg.triggerType === 'no_visit'
                          ? '미방문 시'
                          : msg.triggerType === 'birthday'
                          ? '생일'
                          : msg.triggerType === 'symptom_season'
                          ? '계절 증상'
                          : msg.triggerType === 'health_score_drop'
                          ? '건강점수 하락'
                          : msg.triggerType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">발송</p>
                      <p className="font-medium">{msg.statistics.sentCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">전환</p>
                      <p className="font-medium text-green-600">{msg.statistics.convertedCount}</p>
                    </div>
                    <button
                      onClick={() => toggleAutoMessageMutation.mutate(msg.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        msg.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          msg.isActive ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Segments Tab */}
      {activeTab === 'segments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium">환자 세그먼트</h3>
            <button className="flex items-center gap-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg">
              <Plus className="w-4 h-4" />
              새 세그먼트
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {segments?.map((segment) => (
              <div
                key={segment.id}
                className="p-4 border rounded-lg hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{segment.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{segment.description}</p>
                  </div>
                  {segment.autoUpdate && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                      자동 업데이트
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{segment.patientCount}명</span>
                  </div>
                  {segment.lastUpdatedAt && (
                    <span className="text-xs text-gray-400">
                      {new Date(segment.lastUpdatedAt).toLocaleDateString('ko-KR')} 업데이트
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {dashboard?.recentActivity && dashboard.recentActivity.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">최근 활동</h3>
          <div className="space-y-3">
            {dashboard.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-white rounded-lg">
                  {channelLabels[activity.channel]?.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.patient?.name || '환자'}</p>
                  <p className="text-sm text-gray-500">
                    {channelLabels[activity.channel]?.label} 발송 - {activity.status}
                  </p>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(activity.sentAt).toLocaleString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
