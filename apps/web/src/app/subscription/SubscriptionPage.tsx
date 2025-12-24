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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Check, Zap, Crown, Building2, Sparkles, Loader2, CreditCard, X } from 'lucide-react';
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

export default function SubscriptionPage() {
  const user = useAuthStore((state) => state.user);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'basic' | 'professional' | 'clinic' | null>(null);

  // 카드 정보 폼 상태
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expirationYear: '',
    expirationMonth: '',
    cardPassword: '',
    customerIdentityNumber: '',
  });

  const { data: plans, isLoading: plansLoading } = usePlans();
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
      // 바로 구독 처리
      subscribe.mutate(
        { tier: tier as 'basic' | 'professional' | 'clinic', interval: billingInterval },
        {
          onSuccess: () => {
            toast.success('구독이 시작되었습니다!');
          },
          onError: (error: Error) => {
            toast.error(error.message || '구독 처리 중 오류가 발생했습니다.');
          },
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

        // 카드 등록 후 바로 구독 진행
        if (selectedTier) {
          subscribe.mutate(
            { tier: selectedTier, interval: billingInterval },
            {
              onSuccess: () => {
                toast.success('구독이 시작되었습니다!');
                setSelectedTier(null);
              },
              onError: (error: Error) => {
                toast.error(error.message || '구독 처리 중 오류가 발생했습니다.');
              },
            }
          );
        }
      },
      onError: (error: Error) => {
        toast.error(error.message || '카드 등록에 실패했습니다.');
      },
    });
  };

  const handleCancelSubscription = () => {
    cancelSubscription.mutate(undefined, {
      onSuccess: () => {
        toast.success('구독이 현재 기간 종료 시 취소됩니다.');
        setShowCancelDialog(false);
      },
      onError: (error: Error) => {
        toast.error(error.message || '구독 취소에 실패했습니다.');
      },
    });
  };

  const handleCancelImmediately = () => {
    cancelImmediately.mutate(undefined, {
      onSuccess: () => {
        toast.success('구독이 즉시 취소되었습니다.');
        setShowCancelDialog(false);
      },
      onError: (error: Error) => {
        toast.error(error.message || '구독 취소에 실패했습니다.');
      },
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">요금제 선택</h1>
        <p className="mt-2 text-gray-600">
          당신의 임상에 맞는 플랜을 선택하세요
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingInterval === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            월간 결제
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              billingInterval === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            연간 결제
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              2개월 무료
            </Badge>
          </button>
        </div>
      </div>

      {/* Current Usage */}
      {usage && (
        <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-100">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              이번 달 사용량
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/60 rounded-lg p-4">
                <p className="text-sm text-gray-600">AI 쿼리</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usage.aiQuery.used}
                  <span className="text-sm font-normal text-gray-500">
                    {' '}
                    / {usage.aiQuery.limit === -1 ? '무제한' : usage.aiQuery.limit}
                  </span>
                </p>
                {usage.aiQuery.limit !== -1 && (
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (usage.aiQuery.used / usage.aiQuery.limit) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="bg-white/60 rounded-lg p-4">
                <p className="text-sm text-gray-600">치험례 검색</p>
                <p className="text-2xl font-bold text-gray-900">무제한</p>
              </div>
              <div className="bg-white/60 rounded-lg p-4">
                <p className="text-sm text-gray-600">다음 갱신일</p>
                <p className="text-lg font-bold text-gray-900">
                  {new Date(usage.resetDate).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans?.map((plan) => {
          const Icon = planIcons[plan.tier] || Sparkles;
          const isCurrentPlan = currentTier === plan.tier;
          const price =
            billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          const monthlyEquivalent =
            billingInterval === 'yearly'
              ? Math.round(plan.yearlyPrice / 12)
              : plan.monthlyPrice;

          return (
            <Card
              key={plan.tier}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                isCurrentPlan ? 'ring-2 ring-teal-500' : ''
              } ${plan.tier === 'professional' ? 'border-purple-200' : ''}`}
            >
              {plan.tier === 'professional' && (
                <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  인기
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute top-0 left-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                  현재 플랜
                </div>
              )}

              <CardContent className="pt-8 space-y-6">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white ${
                    planColors[plan.tier]
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.description}
                  </p>
                </div>

                <div>
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(monthlyEquivalent)}원
                  </span>
                  <span className="text-gray-500">/월</span>
                  {billingInterval === 'yearly' && plan.tier !== 'free' && (
                    <p className="text-sm text-emerald-600 mt-1">
                      연 {formatPrice(price)}원 (2개월 무료)
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan && plan.tier !== 'free' ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    구독 관리
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${
                      plan.tier === 'professional'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : ''
                    }`}
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={subscribe.isPending || plan.tier === 'free' || isCurrentPlan}
                  >
                    {subscribe.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {plan.tier === 'free' ? '무료' : isCurrentPlan ? '현재 플랜' : '구독하기'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Subscription Info */}
      {subscriptionInfo?.subscription && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              현재 구독 정보
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">플랜</p>
                <p className="font-medium capitalize">
                  {subscriptionInfo.tier}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">결제 주기</p>
                <p className="font-medium">
                  {subscriptionInfo.subscription.billingInterval === 'yearly'
                    ? '연간'
                    : '월간'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">상태</p>
                <Badge
                  variant={
                    subscriptionInfo.subscription.status === 'active'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {subscriptionInfo.subscription.status === 'active'
                    ? '활성'
                    : subscriptionInfo.subscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">다음 결제일</p>
                <p className="font-medium">
                  {new Date(
                    subscriptionInfo.subscription.currentPeriodEnd
                  ).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
            {subscriptionInfo.subscription.cancelAt && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  {new Date(
                    subscriptionInfo.subscription.cancelAt
                  ).toLocaleDateString('ko-KR')}
                  에 취소 예정입니다.
                </p>
              </div>
            )}
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowCancelDialog(true)}
            >
              구독 취소
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Billing Key Info */}
      {hasBillingKey && (
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-600">결제 카드가 등록되어 있습니다.</span>
          </CardContent>
        </Card>
      )}

      {/* FAQ or Contact */}
      <div className="text-center text-sm text-gray-500">
        <p>
          구독에 대한 문의사항이 있으시면{' '}
          <a href="mailto:support@ongojisin.ai" className="text-teal-600 hover:underline">
            support@ongojisin.ai
          </a>
          로 연락해주세요.
        </p>
      </div>

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
                onChange={(e) =>
                  setCardForm({ ...cardForm, cardNumber: e.target.value.replace(/\D/g, '') })
                }
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
                    onChange={(e) =>
                      setCardForm({ ...cardForm, expirationMonth: e.target.value.replace(/\D/g, '') })
                    }
                    maxLength={2}
                  />
                  <Input
                    placeholder="YY"
                    value={cardForm.expirationYear}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, expirationYear: e.target.value.replace(/\D/g, '') })
                    }
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
                  onChange={(e) =>
                    setCardForm({ ...cardForm, cardPassword: e.target.value.replace(/\D/g, '') })
                  }
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
                onChange={(e) =>
                  setCardForm({ ...cardForm, customerIdentityNumber: e.target.value.replace(/\D/g, '') })
                }
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
              {registerCard.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
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
              {cancelSubscription.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              기간 종료 후 취소
            </Button>
            <AlertDialogAction
              onClick={handleCancelImmediately}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelImmediately.isPending}
            >
              {cancelImmediately.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              즉시 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
