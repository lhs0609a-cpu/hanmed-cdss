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
  Mail,
  Phone,
  MapPin,
  Building,
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
  });

  // 알림 설정
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    marketing: false,
    updates: true,
  });

  const { data: plans } = usePlans();
  const { data: subscriptionInfo } = useSubscriptionInfo();
  const { data: usage } = useUsage();

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
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">보안</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-6">
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
              </div>
            </CardContent>
          </Card>

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
              <Button>저장</Button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans?.map((plan) => {
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>알림 수신 방법을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>이메일 알림</Label>
                  <p className="text-sm text-gray-500">중요 알림을 이메일로 받습니다</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>푸시 알림</Label>
                  <p className="text-sm text-gray-500">브라우저 푸시 알림을 받습니다</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                />
              </div>
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
              <Button>저장</Button>
            </CardContent>
          </Card>
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
