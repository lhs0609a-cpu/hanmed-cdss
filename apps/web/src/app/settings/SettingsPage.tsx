import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  usePlans,
  useSubscriptionInfo,
  useUsage,
  useRegisterCard,
  useSubscribe,
  useCancelSubscription,
  useCancelSubscriptionImmediately,
} from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Check,
  Zap,
  Crown,
  Building2,
  Sparkles,
  Loader2,
  Camera,
  Upload,
  Accessibility,
  Moon,
  Type,
  Eye,
  Keyboard,
  Volume2,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';

const planIcons: Record<string, React.ElementType> = {
  free: Sparkles,
  basic: Zap,
  professional: Crown,
  clinic: Building2,
};

const planColors: Record<string, string> = {
  free: 'from-gray-500 to-gray-600',
  basic: 'from-blue-500 to-indigo-500',
  professional: 'from-purple-500 to-pink-500',
  clinic: 'from-amber-500 to-orange-500',
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'basic' | 'professional' | 'clinic' | null>(null);

  // 카드 정보 폼
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expirationYear: '',
    expirationMonth: '',
    cardPassword: '',
    customerIdentityNumber: '',
  });

  // 프로필 폼
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    clinicName: '',
    clinicAddress: '',
    licenseNumber: '',
    specialty: '',
    bio: '',
  });

  // 프로필 이미지
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('파일 크기는 5MB 이하여야 합니다.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    // TODO: API 호출로 프로필 저장
    toast.success('프로필이 저장되었습니다.');
  };

  // 알림 설정
  const [notifications, setNotifications] = useState({
    // 이메일 알림
    emailEnabled: true,
    emailDigest: 'daily' as 'none' | 'daily' | 'weekly',
    emailConsultation: true,
    emailPrescription: true,
    emailBilling: true,
    // 푸시 알림
    pushEnabled: true,
    pushConsultation: true,
    pushReminder: true,
    // 마케팅
    marketing: false,
    updates: true,
  });

  // 접근성 설정
  const [accessibility, setAccessibility] = useState({
    // 시각적 설정
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium' as 'small' | 'medium' | 'large' | 'xlarge',
    darkMode: false,
    // 키보드 설정
    keyboardNavigation: true,
    showKeyboardShortcuts: true,
    // 스크린 리더
    screenReaderAnnouncements: true,
    verboseDescriptions: false,
    // 기타
    autoFocusFirstElement: true,
    confirmBeforeAction: true,
  });

  const { data: plans, isLoading: plansLoading, error: plansError } = usePlans();
  const { data: subscriptionInfo } = useSubscriptionInfo();
  const { data: usage } = useUsage();

  // 디버깅용 콘솔 로그
  console.log('Plans data:', plans, 'Loading:', plansLoading, 'Error:', plansError);

  const registerCard = useRegisterCard();
  const subscribe = useSubscribe();
  const cancelSubscription = useCancelSubscription();
  const cancelImmediately = useCancelSubscriptionImmediately();

  const currentTier = subscriptionInfo?.tier || user?.subscriptionTier || 'free';
  const hasBillingKey = subscriptionInfo?.hasBillingKey || false;

  const handleSubscribe = (tier: string) => {
    if (tier === 'free') return;

    if (!hasBillingKey) {
      setSelectedTier(tier as 'basic' | 'professional' | 'clinic');
      setShowCardModal(true);
    } else {
      subscribe.mutate(
        { tier: tier as 'basic' | 'professional' | 'clinic', interval: billingInterval },
        {
          onSuccess: () => toast.success('구독이 시작되었습니다!'),
          onError: (error: Error) => toast.error(error.message || '구독 처리 중 오류가 발생했습니다.'),
        }
      );
    }
  };

  const handleRegisterCard = () => {
    registerCard.mutate(cardForm, {
      onSuccess: (data) => {
        toast.success(`카드가 등록되었습니다. (${data.cardNumber})`);
        setShowCardModal(false);
        setCardForm({
          cardNumber: '',
          expirationYear: '',
          expirationMonth: '',
          cardPassword: '',
          customerIdentityNumber: '',
        });

        if (selectedTier) {
          subscribe.mutate(
            { tier: selectedTier, interval: billingInterval },
            {
              onSuccess: () => {
                toast.success('구독이 시작되었습니다!');
                setSelectedTier(null);
              },
              onError: (error: Error) => toast.error(error.message),
            }
          );
        }
      },
      onError: (error: Error) => toast.error(error.message || '카드 등록에 실패했습니다.'),
    });
  };

  const handleCancelSubscription = () => {
    cancelSubscription.mutate(undefined, {
      onSuccess: () => {
        toast.success('구독이 현재 기간 종료 시 취소됩니다.');
        setShowCancelDialog(false);
      },
      onError: (error: Error) => toast.error(error.message),
    });
  };

  const handleCancelImmediately = () => {
    cancelImmediately.mutate(undefined, {
      onSuccess: () => {
        toast.success('구독이 즉시 취소되었습니다.');
        setShowCancelDialog(false);
      },
      onError: (error: Error) => toast.error(error.message),
    });
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-500 mt-1">계정 및 구독 설정을 관리합니다</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">프로필</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">구독</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">알림</span>
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            <span className="hidden sm:inline">접근성</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">보안</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-6">
          {/* 프로필 사진 */}
          <Card>
            <CardHeader>
              <CardTitle>프로필 사진</CardTitle>
              <CardDescription>프로필 사진을 변경합니다 (최대 5MB)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="프로필" className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0) || 'U'
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <Camera className="h-4 w-4 text-gray-600" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{user?.name || '사용자'}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <div className="flex gap-2">
                    <label
                      htmlFor="avatar-upload-btn"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      사진 변경
                      <input
                        id="avatar-upload-btn"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                    {avatarPreview && (
                      <button
                        onClick={() => setAvatarPreview(null)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>프로필 정보를 수정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="email@example.com"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="010-1234-5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">한의사 면허번호</Label>
                  <Input
                    id="licenseNumber"
                    value={profileForm.licenseNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, licenseNumber: e.target.value })}
                    placeholder="면허번호"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">전문 분야</Label>
                <Input
                  id="specialty"
                  value={profileForm.specialty}
                  onChange={(e) => setProfileForm({ ...profileForm, specialty: e.target.value })}
                  placeholder="예: 침구과, 내과, 부인과 등"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">소개</Label>
                <textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="간단한 자기소개를 작성해주세요"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 한의원 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>한의원 정보</CardTitle>
              <CardDescription>소속 한의원 정보를 입력합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicName">한의원명</Label>
                  <Input
                    id="clinicName"
                    value={profileForm.clinicName}
                    onChange={(e) => setProfileForm({ ...profileForm, clinicName: e.target.value })}
                    placeholder="OO한의원"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicAddress">주소</Label>
                  <Input
                    id="clinicAddress"
                    value={profileForm.clinicAddress}
                    onChange={(e) => setProfileForm({ ...profileForm, clinicAddress: e.target.value })}
                    placeholder="서울시 강남구..."
                  />
                </div>
              </div>
              <Button onClick={handleSaveProfile}>프로필 저장</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4 mt-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle>현재 구독</CardTitle>
              <CardDescription>현재 이용 중인 요금제 정보입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-100">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white ${planColors[currentTier]}`}>
                    {(() => {
                      const Icon = planIcons[currentTier] || Sparkles;
                      return <Icon className="h-6 w-6" />;
                    })()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{currentTier} 플랜</p>
                    {subscriptionInfo?.subscription && (
                      <p className="text-sm text-gray-500">
                        다음 결제일: {new Date(subscriptionInfo.subscription.currentPeriodEnd).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                </div>
                {currentTier !== 'free' && (
                  <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
                    구독 관리
                  </Button>
                )}
              </div>

              {/* Usage */}
              {usage && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">이번 달 AI 쿼리</span>
                    <span className="text-sm font-medium">
                      {usage.aiQuery.used} / {usage.aiQuery.limit === -1 ? '무제한' : usage.aiQuery.limit}
                    </span>
                  </div>
                  {usage.aiQuery.limit !== -1 && (
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${Math.min((usage.aiQuery.used / usage.aiQuery.limit) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Billing Key Status */}
              {hasBillingKey && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard className="h-4 w-4" />
                  <span>결제 카드가 등록되어 있습니다</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>요금제 변경</CardTitle>
                  <CardDescription>다른 요금제로 변경할 수 있습니다</CardDescription>
                </div>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setBillingInterval('monthly')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      billingInterval === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    월간
                  </button>
                  <button
                    onClick={() => setBillingInterval('yearly')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${
                      billingInterval === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    연간
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">2개월 무료</Badge>
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                  <span className="ml-2 text-gray-500">요금제 정보를 불러오는 중...</span>
                </div>
              ) : plansError ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-2">요금제 정보를 불러오지 못했습니다.</p>
                  <p className="text-sm text-gray-500">{(plansError as Error).message}</p>
                </div>
              ) : !plans || plans.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">표시할 요금제가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map((plan) => {
                    const Icon = planIcons[plan.tier] || Sparkles;
                    const isCurrentPlan = currentTier === plan.tier;
                    const monthlyEquivalent = billingInterval === 'yearly' ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;

                    return (
                      <div
                        key={plan.tier}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isCurrentPlan ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br text-white mb-3 ${planColors[plan.tier]}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                        <p className="mt-3">
                          <span className="text-xl font-bold text-gray-900">{formatPrice(monthlyEquivalent)}원</span>
                          <span className="text-gray-500 text-sm">/월</span>
                        </p>
                        <ul className="mt-3 space-y-1">
                          {plan.features.slice(0, 2).map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Check className="h-3 w-3 text-teal-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button
                          size="sm"
                          className={`w-full mt-4 ${isCurrentPlan ? 'bg-gray-200 text-gray-600' : ''}`}
                          disabled={isCurrentPlan || plan.tier === 'free' || subscribe.isPending}
                          onClick={() => handleSubscribe(plan.tier)}
                        >
                          {isCurrentPlan ? '현재 플랜' : plan.tier === 'free' ? '무료' : '선택'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          {/* 이메일 알림 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                이메일 알림
              </CardTitle>
              <CardDescription>이메일로 받을 알림을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>이메일 알림 활성화</Label>
                  <p className="text-sm text-gray-500">이메일 알림을 받습니다</p>
                </div>
                <Switch
                  checked={notifications.emailEnabled}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailEnabled: checked })}
                />
              </div>

              {notifications.emailEnabled && (
                <>
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium">이메일 요약 빈도</Label>
                    <div className="flex gap-2 mt-2">
                      {[
                        { value: 'none', label: '받지 않음' },
                        { value: 'daily', label: '매일' },
                        { value: 'weekly', label: '매주' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setNotifications({ ...notifications, emailDigest: option.value as 'none' | 'daily' | 'weekly' })}
                          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                            notifications.emailDigest === option.value
                              ? 'bg-teal-50 border-teal-500 text-teal-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <Label className="text-sm font-medium">알림 유형</Label>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">진료 알림</Label>
                        <p className="text-xs text-gray-500">진료 완료, AI 분석 결과 알림</p>
                      </div>
                      <Switch
                        checked={notifications.emailConsultation}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailConsultation: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">처방 알림</Label>
                        <p className="text-xs text-gray-500">처방 생성, 수정 알림</p>
                      </div>
                      <Switch
                        checked={notifications.emailPrescription}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailPrescription: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">결제 알림</Label>
                        <p className="text-xs text-gray-500">결제 완료, 구독 갱신 알림</p>
                      </div>
                      <Switch
                        checked={notifications.emailBilling}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailBilling: checked })}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 푸시 알림 */}
          <Card>
            <CardHeader>
              <CardTitle>푸시 알림</CardTitle>
              <CardDescription>브라우저 푸시 알림을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>푸시 알림 활성화</Label>
                  <p className="text-sm text-gray-500">브라우저 푸시 알림을 받습니다</p>
                </div>
                <Switch
                  checked={notifications.pushEnabled}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, pushEnabled: checked })}
                />
              </div>

              {notifications.pushEnabled && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">진료 알림</Label>
                      <p className="text-xs text-gray-500">AI 분석 완료 시 알림</p>
                    </div>
                    <Switch
                      checked={notifications.pushConsultation}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushConsultation: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">리마인더</Label>
                      <p className="text-xs text-gray-500">예약 환자, 일정 리마인더</p>
                    </div>
                    <Switch
                      checked={notifications.pushReminder}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, pushReminder: checked })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 마케팅 및 업데이트 */}
          <Card>
            <CardHeader>
              <CardTitle>마케팅 및 소식</CardTitle>
              <CardDescription>프로모션 및 업데이트 알림을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>마케팅 정보</Label>
                  <p className="text-sm text-gray-500">이벤트 및 프로모션 정보를 받습니다</p>
                </div>
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>서비스 업데이트</Label>
                  <p className="text-sm text-gray-500">새로운 기능 및 업데이트 소식을 받습니다</p>
                </div>
                <Switch
                  checked={notifications.updates}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, updates: checked })}
                />
              </div>
              <Button className="mt-4">알림 설정 저장</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility Tab */}
        <TabsContent value="accessibility" className="space-y-4 mt-6">
          {/* 시각적 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                시각적 설정
              </CardTitle>
              <CardDescription>화면 표시 및 시각적 요소를 조정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    다크 모드
                  </Label>
                  <p className="text-sm text-gray-500">어두운 배경의 인터페이스를 사용합니다</p>
                </div>
                <Switch
                  checked={accessibility.darkMode}
                  onCheckedChange={(checked) => setAccessibility({ ...accessibility, darkMode: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    고대비 모드
                  </Label>
                  <p className="text-sm text-gray-500">텍스트와 배경의 대비를 높여 가독성을 개선합니다</p>
                </div>
                <Switch
                  checked={accessibility.highContrast}
                  onCheckedChange={(checked) => setAccessibility({ ...accessibility, highContrast: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>애니메이션 줄이기</Label>
                  <p className="text-sm text-gray-500">화면 전환 및 애니메이션 효과를 최소화합니다</p>
                </div>
                <Switch
                  checked={accessibility.reducedMotion}
                  onCheckedChange={(checked) => setAccessibility({ ...accessibility, reducedMotion: checked })}
                />
              </div>

              <div className="border-t pt-4">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Type className="h-4 w-4" />
                  글꼴 크기
                </Label>
                <div className="flex gap-2 mt-2">
                  {[
                    { value: 'small', label: '작게', size: 'text-sm' },
                    { value: 'medium', label: '보통', size: 'text-base' },
                    { value: 'large', label: '크게', size: 'text-lg' },
                    { value: 'xlarge', label: '매우 크게', size: 'text-xl' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAccessibility({ ...accessibility, fontSize: option.value as 'small' | 'medium' | 'large' | 'xlarge' })}
                      className={`px-4 py-2 rounded-lg border transition-colors ${option.size} ${
                        accessibility.fontSize === option.value
                          ? 'bg-teal-50 border-teal-500 text-teal-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 키보드 내비게이션 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                키보드 내비게이션
              </CardTitle>
              <CardDescription>키보드로 앱을 탐색하는 방법을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>키보드 탐색 활성화</Label>
                  <p className="text-sm text-gray-500">Tab 키로 요소 간 이동을 개선합니다</p>
                </div>
                <Switch
                  checked={accessibility.keyboardNavigation}
                  onCheckedChange={(checked) => setAccessibility({ ...accessibility, keyboardNavigation: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>단축키 힌트 표시</Label>
                  <p className="text-sm text-gray-500">버튼에 키보드 단축키를 표시합니다 (⌘K 등)</p>
                </div>
                <Switch
                  checked={accessibility.showKeyboardShortcuts}
                  onCheckedChange={(checked) => setAccessibility({ ...accessibility, showKeyboardShortcuts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>첫 번째 요소 자동 포커스</Label>
                  <p className="text-sm text-gray-500">페이지 로드 시 첫 번째 요소에 자동 포커스</p>
                </div>
                <Switch
                  checked={accessibility.autoFocusFirstElement}
                  onCheckedChange={(checked) => setAccessibility({ ...accessibility, autoFocusFirstElement: checked })}
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">주요 단축키</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">검색 열기</span>
                    <kbd className="px-2 py-1 bg-white border rounded text-xs">⌘ K</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">새 진료</span>
                    <kbd className="px-2 py-1 bg-white border rounded text-xs">⌘ N</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">대시보드</span>
                    <kbd className="px-2 py-1 bg-white border rounded text-xs">⌘ D</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">도움말</span>
                    <kbd className="px-2 py-1 bg-white border rounded text-xs">?</kbd>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 스크린 리더 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                스크린 리더
              </CardTitle>
              <CardDescription>스크린 리더 사용자를 위한 설정입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>화면 변경 알림</Label>
                  <p className="text-sm text-gray-500">페이지 로딩, 완료 등을 음성으로 안내합니다</p>
                </div>
                <Switch
                  checked={accessibility.screenReaderAnnouncements}
                  onCheckedChange={(checked) => setAccessibility({ ...accessibility, screenReaderAnnouncements: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>자세한 설명</Label>
                  <p className="text-sm text-gray-500">버튼과 링크에 더 자세한 설명을 제공합니다</p>
                </div>
                <Switch
                  checked={accessibility.verboseDescriptions}
                  onCheckedChange={(checked) => setAccessibility({ ...accessibility, verboseDescriptions: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>작업 전 확인</Label>
                  <p className="text-sm text-gray-500">중요한 작업 전에 확인 메시지를 표시합니다</p>
                </div>
                <Switch
                  checked={accessibility.confirmBeforeAction}
                  onCheckedChange={(checked) => setAccessibility({ ...accessibility, confirmBeforeAction: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full">접근성 설정 저장</Button>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
              <CardDescription>계정 비밀번호를 변경합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>비밀번호 변경</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>계정 삭제</CardTitle>
              <CardDescription>계정을 영구적으로 삭제합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
              </p>
              <Button variant="destructive">계정 삭제</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Card Registration Modal */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              결제 카드 등록
            </DialogTitle>
            <DialogDescription>
              구독 결제에 사용할 카드 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">카드번호</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardForm.cardNumber}
                onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value.replace(/\D/g, '') })}
                maxLength={16}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>유효기간</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="MM"
                    value={cardForm.expirationMonth}
                    onChange={(e) => setCardForm({ ...cardForm, expirationMonth: e.target.value.replace(/\D/g, '') })}
                    maxLength={2}
                  />
                  <Input
                    placeholder="YY"
                    value={cardForm.expirationYear}
                    onChange={(e) => setCardForm({ ...cardForm, expirationYear: e.target.value.replace(/\D/g, '') })}
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardPassword">비밀번호 앞 2자리</Label>
                <Input
                  id="cardPassword"
                  type="password"
                  placeholder="**"
                  value={cardForm.cardPassword}
                  onChange={(e) => setCardForm({ ...cardForm, cardPassword: e.target.value.replace(/\D/g, '') })}
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identity">생년월일 (6자리) 또는 사업자번호 (10자리)</Label>
              <Input
                id="identity"
                placeholder="YYMMDD 또는 사업자번호"
                value={cardForm.customerIdentityNumber}
                onChange={(e) => setCardForm({ ...cardForm, customerIdentityNumber: e.target.value.replace(/\D/g, '') })}
                maxLength={10}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCardModal(false)}>
              취소
            </Button>
            <Button
              onClick={handleRegisterCard}
              disabled={registerCard.isPending || !cardForm.cardNumber || !cardForm.expirationMonth || !cardForm.expirationYear || !cardForm.cardPassword || !cardForm.customerIdentityNumber}
            >
              {registerCard.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              등록 및 결제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구독을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              구독을 취소하면 현재 결제 기간이 끝난 후 Free 플랜으로 전환됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleCancelSubscription}
              disabled={cancelSubscription.isPending}
            >
              {cancelSubscription.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              기간 종료 후 취소
            </Button>
            <AlertDialogAction
              onClick={handleCancelImmediately}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelImmediately.isPending}
            >
              {cancelImmediately.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              즉시 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
