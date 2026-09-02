import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSEO, PAGE_SEO } from '@/hooks/useSEO';
import { BASE_STATS, formatStatNumber } from '@/config/stats.config';
import {
  usePlans,
  usePlansAndAddons,
  useSubscriptionInfo,
  useUsage,
  useRegisterCard,
  useSubscribe,
  useCancelSubscription,
  useCancelSubscriptionImmediately,
  useTrialStatus,
  useStartFreeTrial,
  useAddons,
  useSubscribeAddon,
  useCancelAddon,
} from '@/hooks/useSubscription';
import { Card, CardContent } from '@/components/ui/card';
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, Zap, Crown, Building2, Sparkles, CreditCard, ExternalLink, Gift, Clock, Loader2, AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { ROICalculator } from '@/components/dashboard';
import { SkeletonSubscriptionPage } from '@/components/common/Skeleton';
import { formatKRW, formatKRDate, withVat } from '@/lib/format';
import { hasBusinessInfo, TOSS_BILLING_CONTRACT_ACTIVE } from '@/config/company.config';
import api from '@/services/api';
import { getErrorMessage } from '@/lib/errors';

const planIcons: Record<string, React.ElementType> = {
  free: Sparkles,
  basic: Zap,
  professional: Crown,
  clinic: Building2,
};

// 모든 플랜 시각은 단일 톤(neutral) 통일 — 별도 색상 매핑 불필요.

/**
 * 체험으로 열어 주는 플랜.
 *
 * 체험이 끝나면 이 플랜으로 결제된다. 백엔드 TRIAL_CONFIG.TRIAL_TIER 와
 * 같은 값이어야 한다.
 */
const TRIAL_TIER = 'professional'

export default function SubscriptionPage() {
  useSEO(PAGE_SEO.subscription);

  const user = useAuthStore((state) => state.user);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentErrorDialog, setShowPaymentErrorDialog] = useState(false);
  const [paymentError, setPaymentError] = useState<{
    message: string;
    action: string;
    code: string;
    retryable: boolean;
    category?: string;
  } | null>(null);
  const [selectedTier, setSelectedTier] = useState<'basic' | 'professional' | 'clinic' | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 카드 정보 폼 상태
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expirationYear: '',
    expirationMonth: '',
    cardPassword: '',
    customerIdentityNumber: '',
  });

  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: plansAndAddons } = usePlansAndAddons();
  const { data: subscriptionInfo } = useSubscriptionInfo();
  const { data: usage } = useUsage();
  const { data: trialStatus } = useTrialStatus();
  const { data: userAddons } = useAddons();
  const subscribeAddon = useSubscribeAddon();
  const cancelAddon = useCancelAddon();

  const registerCard = useRegisterCard();
  const subscribe = useSubscribe();
  const cancelSubscription = useCancelSubscription();
  const cancelImmediately = useCancelSubscriptionImmediately();
  const startTrial = useStartFreeTrial();

  /**
   * 무료 체험 시작.
   *
   * 카드를 먼저 받는다. 예전에는 카드 없이 시작하고 14일 뒤 조용히 Free 로
   * 내려갔는데, 그러면 써 보고 마음에 들어도 결제 화면을 다시 찾아 들어와야
   * 한다. 그 사이에 대부분은 돌아오지 않는다.
   *
   * 카드가 없으면 결제창을 먼저 띄운다. 돌아와서 체험이 시작된다.
   */
  const handleStartTrial = () => {
    if (!hasBillingKey) {
      sessionStorage.setItem('pendingTrialTier', TRIAL_TIER)
      void openBillingWindow(TRIAL_TIER)
      return
    }
    startTrial.mutate(
      { tier: TRIAL_TIER, interval: billingInterval },
      {
        onSuccess: (data) => {
          toast.success(data.message);
        },
        onError: (error: Error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  const currentTier = subscriptionInfo?.tier || user?.subscriptionTier || 'free';
  const hasBillingKey = subscriptionInfo?.hasBillingKey || false;

  /**
   * 결제 실패를 사람이 읽을 말로 바꾼다.
   *
   * 예전에는 error.message 를 봤는데, 그건 axios 가 만든
   * "Request failed with status code 400" 이다. 서버가 보낸 말은
   * error.response.data 에 있다. 그래서 카드 한도든 분실 신고든 화면에는
   * 늘 "결제 처리 중 오류가 발생했습니다" 만 떴다.
   *
   * 서버는 전역 예외 필터를 지나며 statusCode·error·message 만 남긴다.
   * 식별자는 error, 사람이 읽을 말은 message 에 실려 온다.
   */
  const parsePaymentError = (error: any) => {
    const body = error?.response?.data;
    const raw = body?.message;
    // 필터가 message 를 배열로 감싼다.
    const message = Array.isArray(raw) ? raw.join(' ') : raw;
    const code = body?.error;

    // 카드 자체 문제는 다시 눌러도 같은 결과다. 재시도를 권하면 안 된다.
    const notRetryable = [
      'EXCEED_MAX_CARD_INSTALLMENT_PLAN',
      'INVALID_CARD_EXPIRATION',
      'INVALID_STOPPED_CARD',
      'EXCEED_MAX_DAILY_PAYMENT_COUNT',
      'NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT',
      'INVALID_CARD_INSTALLMENT_PLAN',
      'NOT_AVAILABLE_BANK',
      'INVALID_PASSWORD',
      'INCORRECT_BASIC_AUTH_FORMAT',
      'EXCEED_MAX_PAYMENT_AMOUNT',
      'CARD_LIMIT_EXCEEDED',
      'STOLEN_OR_LOST_CARD',
      'RESTRICTED_TRANSFER_ACCOUNT',
    ];

    return {
      message: message || '결제 처리 중 오류가 발생했습니다.',
      action: code && notRetryable.includes(code)
        ? '다른 카드로 등록해 주세요.'
        : '잠시 후 다시 시도해 주세요.',
      code: code || 'UNKNOWN_ERROR',
      retryable: !(code && notRetryable.includes(code)),
      category: 'unknown' as const,
    };
  };

  /**
   * 사업자 정보가 없으면 결제를 받지 않는다.
   *
   * 전자상거래법 제13조는 상호·대표자·사업자등록번호·통신판매업신고번호·
   * 주소·연락처를 표시하도록 정한다. 지금 company.config.ts 가 비어 있어
   * 약관과 환불정책 페이지에 그 자리가 채워지지 않는다.
   *
   * 그 상태로 돈을 받으면 안 된다. 환불 분쟁이 생겼을 때 이용자가 누구에게
   * 무엇을 근거로 요구해야 하는지 알 수 없다. 법 위반이면서 동시에 서비스가
   * 감당할 수 없는 약속이다.
   *
   * 값이 채워지는 순간 이 잠금은 저절로 풀린다. 따로 지울 코드가 없다.
   */
  const businessInfoMissing = !hasBusinessInfo()

  // 자동결제 계약이 없으면 카드 등록이 반드시 실패한다. 눌러도 안 되는
  // 버튼을 열어 두지 않는다.
  const billingUnavailable = !TOSS_BILLING_CONTRACT_ACTIVE
  const paymentBlocked = businessInfoMissing || billingUnavailable

  /**
   * 결제창으로 카드를 등록한다.
   *
   * 예전에는 우리 화면에서 카드번호를 직접 받아 서버가 빌링키를 발급했다.
   * 그런데 실제 카드로도 계속 INVALID_BILL_KEY_REQUEST 가 났다 — 그 방식은
   * 본인인증을 우리가 구현해야 하는데 안 했기 때문이다. 토스 문서가 못박는다:
   * "API로 자동결제를 연동하면 본인인증은 직접 구현해야 합니다."
   *
   * 결제창을 쓰면 토스가 휴대폰 본인인증까지 처리하고 authKey 를 돌려준다.
   * 덤으로 카드번호가 우리 서버를 지나가지 않는다 — 지키지 않아도 되는
   * 책임은 애초에 지지 않는 편이 낫다.
   */
  const openBillingWindow = async (tier: string) => {
    if (!user?.id) {
      toast.error('로그인이 필요합니다.')
      return
    }
    try {
      const { data } = await api.get<{ clientKey: string }>(
        '/subscription/client-key',
      )
      const { loadTossPayments } = await import('@tosspayments/payment-sdk')
      const toss = await loadTossPayments(data.clientKey)

      // 돌아왔을 때 어느 플랜을 고르던 중이었는지 알아야 이어서 결제한다.
      sessionStorage.setItem('pendingTier', tier)
      sessionStorage.setItem('pendingInterval', billingInterval)

      const base = `${window.location.origin}/dashboard/subscription`
      await toss.requestBillingAuth('카드', {
        customerKey: `customer_${user.id}`,
        successUrl: `${base}/billing-success`,
        failUrl: `${base}?billing=fail`,
      })
    } catch (error) {
      // 사용자가 창을 닫은 것은 실패가 아니다.
      const err = error as { code?: string; message?: string }
      if (err?.code === 'USER_CANCEL') return

      // 토스가 보낸 말을 그대로 보여준다.
      //
      // 우리 문구로 감싸면 "일시적인 오류가 발생했습니다" 가 되는데, 그건
      // 사실이 아닐뿐더러 다시 시도하면 될 것처럼 들린다. 실제로 토스는
      // "자동 결제(빌링) 계약이 안 되어 있습니다" 라고 정확히 알려 준다.
      // 그 말이 있어야 무엇을 해야 하는지 알 수 있다.
      toast.error(err?.message || getErrorMessage(error))
    }
  }

  const handleSubscribe = (tier: string) => {
    if (paymentBlocked) {
      toast.error(
        billingUnavailable
          ? '정기결제 준비 중입니다. 결제사 심사가 끝나는 대로 열겠습니다.'
          : '결제 준비 중입니다. 사업자 정보 등록이 완료된 뒤 이용하실 수 있습니다.',
      )
      return
    }

    if (tier === 'free') return;

    if (!hasBillingKey) {
      setSelectedTier(tier as 'basic' | 'professional' | 'clinic');
      void openBillingWindow(tier);
    } else {
      // 바로 구독 처리
      subscribe.mutate(
        { tier: tier as 'basic' | 'professional' | 'clinic', interval: billingInterval },
        {
          onSuccess: () => {
            toast.success('구독이 시작되었습니다!');
          },
          onError: (error: Error) => {
            const parsedError = parsePaymentError(error);
            setPaymentError(parsedError);
            setShowPaymentErrorDialog(true);
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
        setAgreedToTerms(false);
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
                const parsedError = parsePaymentError(error);
                setPaymentError(parsedError);
                setShowPaymentErrorDialog(true);
                setSelectedTier(null);
              },
            }
          );
        }
      },
      onError: (error: Error) => {
        const parsedError = parsePaymentError(error);
        setPaymentError(parsedError);
        setShowPaymentErrorDialog(true);
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

  // 가격은 모두 공급가(부가세 별도). 표시는 formatKRW 로 통일됨 (lib/format).

  if (plansLoading) {
    return <SkeletonSubscriptionPage />;
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

      {/* Free Trial Banner */}
      {trialStatus?.canStartTrial && currentTier === 'free' && (
        <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Gift className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">14일 무료 체험</h3>
                  <p className="text-purple-100 text-sm">
                    Professional 플랜을 14일간 AI 쿼리 30건과 함께 체험해보세요. 카드를 먼저 등록하지만 체험 기간에는 결제되지 않고, 끝나는 날 자동으로 결제됩니다. 그전에 취소하면 청구되지 않습니다.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleStartTrial}
                disabled={startTrial.isPending}
                className="bg-white text-purple-600 hover:bg-purple-50 font-semibold px-8"
              >
                {startTrial.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                무료 체험 시작
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial Status Banner */}
      {trialStatus?.isTrialing && (
        <Card className="bg-gradient-to-r from-blue-500 to-blue-500 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Clock className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">무료 체험 중</h3>
                  <p className="text-blue-100 text-sm">
                    Professional 플랜 체험 중입니다.
                    <span className="font-semibold ml-1">
                      {trialStatus.daysRemaining}일 남음
                    </span>
                    {trialStatus.aiLimit && (
                      <span className="ml-2">
                        · AI {trialStatus.aiUsed || 0}/{trialStatus.aiLimit}건
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">체험 종료일</p>
                <p className="font-semibold">
                  {trialStatus.trialEndsAt
                    ? formatKRDate(trialStatus.trialEndsAt)
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              2개월 무료
            </Badge>
          </button>
        </div>
      </div>

      {/* Current Usage */}
      {usage && (
        <Card className="bg-gradient-to-r from-blue-50 to-blue-50 border-blue-100">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              이번 달 사용량
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/60 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">AI 쿼리</p>
                  {usage.aiQuery.isTrial && (
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">
                      체험
                    </Badge>
                  )}
                </div>
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
                      className="h-full bg-blue-500 rounded-full transition-all"
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
                  {formatKRDate(usage.resetDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ROI Calculator */}
      {/* 이 버튼이 곧 결제 시작이다. 예전에는 요금제 페이지로 가는 Link 였는데
          이 계산기가 그 페이지 안에만 있어서, 지금 보고 있는 화면으로 다시 가는
          링크였다 — 눌러도 아무 일이 없었다. */}
      {/* 결제를 못 받는 상태라면 먼저 알린다. 눌러 보고 에러를 만나는 것보다
          이유를 먼저 아는 쪽이 낫다. */}
      {paymentBlocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">정기결제 준비 중입니다</p>
          <p className="mt-1 leading-relaxed text-amber-800">
            {billingUnavailable
              ? '결제사 자동결제 심사가 진행 중입니다. 끝나는 대로 열겠습니다. 그때까지 무료 기능은 그대로 쓰실 수 있습니다.'
              : '사업자 정보 등록이 끝나면 결제를 열겠습니다. 그때까지 무료 기능은 그대로 쓰실 수 있습니다.'}
          </p>
        </div>
      )}

      <ROICalculator onSelectPlan={handleSubscribe} />

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

          const isRecommended = plan.recommended || plan.tier === 'professional';

          return (
            <Card
              key={plan.tier}
              variant={isRecommended && !isCurrentPlan ? 'tile' : 'default'}
              className={
                'relative overflow-hidden rounded-2xl transition-colors ' +
                (isCurrentPlan
                  ? 'border-primary'
                  : isRecommended
                    ? 'border-neutral-900 ring-1 ring-neutral-900/10'
                    : '')
              }
            >
              {isRecommended && !isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-neutral-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-bl-md">
                  추천
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute top-0 left-0 bg-primary text-white text-[11px] font-semibold px-2.5 py-1 rounded-br-md">
                  현재 플랜
                </div>
              )}

              <CardContent className="pt-8 space-y-6">
                <div className="w-10 h-10 rounded-md flex items-center justify-center bg-neutral-900 text-white">
                  <Icon className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-neutral-900">
                    {plan.name}
                  </h3>
                  <p className="text-[13px] text-neutral-500 mt-1">
                    {plan.description}
                  </p>
                  {plan.tagline && (
                    <p className="text-[12px] text-blue-700 mt-1 font-medium">
                      {plan.tagline}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[32px] font-extrabold tabular text-neutral-900 tracking-tight">
                      {formatKRW(monthlyEquivalent)}
                    </span>
                    <span className="text-[14px] text-neutral-500">/월</span>
                  </div>
                  {plan.tier !== 'free' && (
                    <p className="mt-2 text-[12px] text-neutral-500">
                      부가세 별도 · 결제액 월{' '}
                      <span className="font-semibold text-neutral-700 tabular">
                        {formatKRW(withVat(monthlyEquivalent))}
                      </span>
                    </p>
                  )}
                  {billingInterval === 'yearly' && plan.tier !== 'free' && (
                    <p className="text-[13px] text-primary mt-1 font-medium">
                      연 {formatKRW(price)} · 2개월 무료
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
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
                    variant={isRecommended && !isCurrentPlan && plan.tier !== 'free' ? 'gradient' : 'default'}
                    className="w-full"
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={subscribe.isPending || plan.tier === 'free' || isCurrentPlan || paymentBlocked}
                  >
                    {subscribe.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {plan.tier === 'free' ? '무료 이용' : isCurrentPlan ? '현재 플랜' : '구독하기'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add-on 섹션 — 보험청구 등 부가서비스 */}
      {plansAndAddons?.addons && plansAndAddons.addons.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">부가서비스</h2>
            <p className="text-sm text-neutral-500 mt-1">
              구독에 얹어 추가할 수 있는 운영 부가 도구
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plansAndAddons.addons.map((addon) => {
              const includedInCurrentTier = addon.includedInTiers.includes(currentTier);
              const userHasAddon = !!userAddons?.find(
                (a) => a.addonKey === addon.key && a.status === 'active'
              );
              const monthly =
                billingInterval === 'yearly'
                  ? Math.round(addon.yearlyPrice / 12)
                  : addon.monthlyPrice;

              return (
                <Card
                  key={addon.key}
                  className={
                    'relative overflow-hidden ' +
                    (includedInCurrentTier || userHasAddon ? 'border-primary' : '')
                  }
                >
                  {includedInCurrentTier && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-[11px] font-semibold px-2.5 py-1 rounded-bl-md">
                      현재 플랜 포함
                    </div>
                  )}
                  {!includedInCurrentTier && userHasAddon && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-[11px] font-semibold px-2.5 py-1 rounded-bl-md">
                      이용 중
                    </div>
                  )}
                  <CardContent className="pt-8 space-y-5">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 mb-2">
                        <Sparkles className="h-3 w-3" />
                        Add-on
                      </div>
                      <h3 className="text-lg font-bold text-neutral-900">
                        {addon.name}
                      </h3>
                      <p className="text-[13px] text-neutral-500 mt-1">
                        {addon.description}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[28px] font-extrabold tabular text-neutral-900 tracking-tight">
                          {formatKRW(monthly)}
                        </span>
                        <span className="text-[14px] text-neutral-500">/월</span>
                      </div>
                      <p className="mt-1 text-[12px] text-neutral-500">
                        부가세 별도 · 결제액 월{' '}
                        <span className="font-semibold text-neutral-700 tabular">
                          {formatKRW(withVat(monthly))}
                        </span>
                      </p>
                      {billingInterval === 'yearly' && (
                        <p className="text-[13px] text-primary mt-1 font-medium">
                          연 {formatKRW(addon.yearlyPrice)} · 2개월 무료
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {addon.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {includedInCurrentTier ? (
                      <Button variant="outline" className="w-full" disabled>
                        현재 플랜에 포함되어 있습니다
                      </Button>
                    ) : userHasAddon ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          cancelAddon.mutate(
                            { addonKey: addon.key },
                            {
                              onSuccess: () =>
                                toast.success('부가서비스 해지 예약이 완료되었습니다.'),
                              onError: (e: Error) =>
                                toast.error(e.message || '해지에 실패했습니다.'),
                            }
                          )
                        }
                        disabled={cancelAddon.isPending}
                      >
                        해지하기
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => {
                          if (!hasBillingKey) {
                            toast.error(
                              '먼저 결제 카드를 등록해 주세요. (요금제 하단)'
                            );
                            return;
                          }
                          subscribeAddon.mutate(
                            { addonKey: addon.key, interval: billingInterval },
                            {
                              onSuccess: () =>
                                toast.success('부가서비스가 추가되었습니다.'),
                              onError: (e: Error) =>
                                toast.error(e.message || '구독에 실패했습니다.'),
                            }
                          );
                        }}
                        disabled={subscribeAddon.isPending}
                      >
                        {subscribeAddon.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        구독에 추가
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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
                  {formatKRDate(subscriptionInfo.subscription.currentPeriodEnd)}
                </p>
              </div>
            </div>
            {subscriptionInfo.subscription.cancelAt && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  {formatKRDate(subscriptionInfo.subscription.cancelAt)}
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
          <a href="mailto:lhs0609c@naver.com" className="text-blue-600 hover:underline">
            lhs0609c@naver.com
          </a>
          로 연락해주세요.
        </p>
      </div>

      {/* Legal Links */}
      <div className="border-t pt-6">
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <Link to="/terms" className="hover:text-blue-600 flex items-center gap-1">
            이용약관
            <ExternalLink className="h-3 w-3" />
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/privacy" className="hover:text-blue-600 flex items-center gap-1">
            개인정보처리방침
            <ExternalLink className="h-3 w-3" />
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/subscription-terms" className="hover:text-blue-600 flex items-center gap-1">
            정기결제 약관
            <ExternalLink className="h-3 w-3" />
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/refund-policy" className="hover:text-blue-600 flex items-center gap-1">
            환불정책
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
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

            {/* Terms Agreement */}
            <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked: boolean | 'indeterminate') => setAgreedToTerms(checked === true)}
              />
              <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                <Link to="/subscription-terms" target="_blank" className="text-blue-600 hover:underline">
                  정기결제 약관
                </Link>
                ,{' '}
                <Link to="/refund-policy" target="_blank" className="text-blue-600 hover:underline">
                  환불정책
                </Link>
                ,{' '}
                <Link to="/privacy" target="_blank" className="text-blue-600 hover:underline">
                  개인정보처리방침
                </Link>
                에 동의합니다.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCardModal(false)}>
              취소
            </Button>
            <Button
              onClick={handleRegisterCard}
              disabled={registerCard.isPending || !cardForm.cardNumber || !cardForm.expirationMonth || !cardForm.expirationYear || !cardForm.cardPassword || !cardForm.customerIdentityNumber || !agreedToTerms}
            >
              {registerCard.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              등록 및 결제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Error Dialog */}
      <AlertDialog open={showPaymentErrorDialog} onOpenChange={setShowPaymentErrorDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl">결제에 실패했습니다</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {/* 에러 메시지 */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">{paymentError?.message}</p>
                  {paymentError?.code && paymentError.code !== 'UNKNOWN_ERROR' && (
                    <p className="text-red-600 text-xs mt-1">에러 코드: {paymentError.code}</p>
                  )}
                </div>

                {/* 해결 방법 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 mb-1">해결 방법</p>
                  <p className="text-sm text-blue-700">{paymentError?.action}</p>
                </div>

                {/* 카테고리별 추가 안내 */}
                {paymentError?.category === 'card_issue' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">카드 문제 해결 체크리스트</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        카드 유효기간 확인
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        결제 한도 확인
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        카드사 앱에서 온라인 결제 차단 여부 확인
                      </li>
                    </ul>
                  </div>
                )}

                {paymentError?.category === 'user_input' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">입력 정보 확인</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        카드번호 16자리 확인
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        유효기간 (월/년) 확인
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        비밀번호 앞 2자리 확인
                      </li>
                    </ul>
                  </div>
                )}

                {/* 고객 지원 안내 */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">문제가 계속되면 고객센터로 문의해 주세요.</p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="mailto:lhs0609c@naver.com"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Mail className="h-4 w-4" />
                      lhs0609c@naver.com
                    </a>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="sm:flex-1">닫기</AlertDialogCancel>
            {paymentError?.retryable && (
              <Button
                className="sm:flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setShowPaymentErrorDialog(false);
                  if (selectedTier) {
                    handleSubscribe(selectedTier);
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            )}
            {!paymentError?.retryable && paymentError?.category === 'card_issue' && (
              <Button
                className="sm:flex-1"
                onClick={() => {
                  setShowPaymentErrorDialog(false);
                  setShowCardModal(true);
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                다른 카드 등록
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Dialog - Retention Screen */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">정말 떠나시나요?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {/* Usage Statistics */}
                {usage && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-4 border border-blue-100 mt-4">
                    <p className="text-sm font-medium text-blue-800 mb-3">
                      지금까지 온고지신 AI와 함께한 성과
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/60 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{usage.aiQuery.used}건</p>
                        <p className="text-xs text-gray-600">AI 분석 수행</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.round((usage.aiQuery.used || 0) * 5 / 60)}시간
                        </p>
                        <p className="text-xs text-gray-600">예상 절약 시간</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-3 text-center">
                      * AI 분석 1건당 평균 5분 절약 기준
                    </p>
                  </div>
                )}

                {/* Special Offer */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Gift className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-purple-900">잠깐, 특별 제안이 있어요!</p>
                      <p className="text-sm text-purple-700 mt-1">
                        지금 유지하시면 다음 결제 시 <span className="font-bold">30% 할인</span>을 적용해 드립니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* What you'll lose */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">취소 시 잃게 되는 것:</p>
                  <ul className="space-y-1.5">
                    <li className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                      AI 처방 추천 대량 사용
                    </li>
                    <li className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                      {formatStatNumber(BASE_STATS.cases)} 치험례 고급 검색
                    </li>
                    <li className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                      약물 상호작용 상세 분석
                    </li>
                    <li className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                      우선 고객 지원
                    </li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogCancel className="w-full bg-gradient-to-r from-blue-500 to-blue-500 text-white hover:from-blue-600 hover:to-blue-600 border-0">
              30% 할인 받고 유지하기
            </AlertDialogCancel>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancelSubscription}
                disabled={cancelSubscription.isPending}
              >
                {cancelSubscription.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                기간 종료 후 취소
              </Button>
              <Button
                variant="ghost"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleCancelImmediately}
                disabled={cancelImmediately.isPending}
              >
                {cancelImmediately.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                즉시 취소
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
