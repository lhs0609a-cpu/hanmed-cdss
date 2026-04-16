import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CreditCard, ShieldCheck, AlertCircle } from 'lucide-react'
import { useSajuStore } from '@/stores/sajuStore'
import { useCreateSajuOrder, useConfirmSajuPayment } from '@/hooks/useSaju'
import { useAuthStore } from '@/stores/authStore'
import { getSajuName, getSajuPrice } from '@/lib/saju-products'

export default function SajuPaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inputData = useSajuStore((s) => s.inputData)
  const orderInfo = useSajuStore((s) => s.orderInfo)
  const resetSaju = useSajuStore((s) => s.reset)
  const user = useAuthStore((s) => s.user)

  const createOrder = useCreateSajuOrder()
  const confirmPayment = useConfirmSajuPayment()
  const paymentWidgetRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const callbackHandledRef = useRef(false)

  const paymentStatus = searchParams.get('status')
  const isCallback = paymentStatus === 'success' || paymentStatus === 'fail'

  // 입력 데이터 없으면 리다이렉트 (결제 콜백 복귀 중에는 skip)
  useEffect(() => {
    if (!inputData && !isCallback) {
      navigate('/health/saju/input')
    }
  }, [inputData, isCallback, navigate])

  // 주문 생성 + Payment Widget 초기화 (결제 콜백 복귀 중에는 skip)
  useEffect(() => {
    if (isCallback) return
    if (!inputData || orderInfo) return

    let cancelled = false
    const initPayment = async () => {
      try {
        // 주문 생성
        const result = await createOrder.mutateAsync({
          name: inputData.name,
          birthDate: inputData.birthDate,
          birthHour: inputData.birthHour,
          gender: inputData.gender,
          tier: inputData.tier,
          email: inputData.email,
          userId: user?.id,
        })

        if (cancelled) return

        // Toss Payment Widget 로드
        const { loadPaymentWidget } = await import('@tosspayments/payment-widget-sdk')
        const widget = await loadPaymentWidget(
          result.clientKey,
          `ANONYMOUS_${Date.now()}`,
        )

        if (cancelled) return

        paymentWidgetRef.current = widget
        widget.renderPaymentMethods(
          '#payment-method',
          { value: result.amount },
          { variantKey: 'DEFAULT' },
        )

        setIsReady(true)
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '주문 생성에 실패했습니다.')
        }
      }
    }

    initPayment()

    return () => {
      cancelled = true
    }
    // createOrder/user 는 의도적으로 deps 제외 (재주문 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputData, orderInfo, isCallback])

  // 기존 주문이 있을 때 widget만 재초기화 (새 주문 생성 없이)
  useEffect(() => {
    if (isCallback) return
    if (!orderInfo || paymentWidgetRef.current) return

    let cancelled = false
    const reinit = async () => {
      try {
        const { loadPaymentWidget } = await import('@tosspayments/payment-widget-sdk')
        const widget = await loadPaymentWidget(
          orderInfo.clientKey,
          `ANONYMOUS_${Date.now()}`,
        )
        if (cancelled) return
        paymentWidgetRef.current = widget
        widget.renderPaymentMethods(
          '#payment-method',
          { value: orderInfo.amount },
          { variantKey: 'DEFAULT' },
        )
        setIsReady(true)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Payment Widget 로드 실패')
      }
    }
    reinit()

    return () => {
      cancelled = true
    }
  }, [orderInfo, isCallback])

  // 결제 요청
  const handlePayment = async () => {
    if (!paymentWidgetRef.current || !orderInfo || isProcessing) return

    setIsProcessing(true)
    setError(null)

    try {
      await paymentWidgetRef.current.requestPayment({
        orderId: orderInfo.orderId,
        orderName: orderInfo.orderName,
        successUrl: `${window.location.origin}/health/saju/payment?status=success`,
        failUrl: `${window.location.origin}/health/saju/payment?status=fail`,
      })
    } catch (err: any) {
      if (err.code === 'USER_CANCEL') {
        setIsProcessing(false)
        return
      }
      setError(err.message || '결제 요청에 실패했습니다.')
      setIsProcessing(false)
    }
  }

  // 결제 성공/실패 콜백 처리 (중복 호출 방지)
  useEffect(() => {
    if (callbackHandledRef.current) return
    const status = searchParams.get('status')
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (status === 'success' && paymentKey && orderId && amount) {
      callbackHandledRef.current = true
      setIsProcessing(true)
      confirmPayment
        .mutateAsync({
          paymentKey,
          orderId,
          amount: Number(amount),
        })
        .then((result) => {
          if (result.success && result.reportId && result.accessToken) {
            // token 기반 뷰어 경로로 이동 (결제 주문 데이터 초기화)
            resetSaju()
            navigate(
              `/health/saju/report/view/${result.accessToken}`,
              { replace: true },
            )
          } else if (result.success && result.reportId) {
            // accessToken이 없으면 id+token 쿼리 fallback (호환용)
            navigate(
              `/health/saju/report/${result.reportId}`,
              { replace: true },
            )
          }
        })
        .catch((err) => {
          setError(err.message || '결제 승인에 실패했습니다.')
          setIsProcessing(false)
        })
    } else if (status === 'fail') {
      callbackHandledRef.current = true
      const code = searchParams.get('code')
      const message = searchParams.get('message')
      setError(message || `결제에 실패했습니다. (${code})`)
    }
  }, [searchParams, confirmPayment, navigate, resetSaju])

  // Widget cleanup
  useEffect(() => {
    return () => {
      paymentWidgetRef.current = null
    }
  }, [])

  // 결제 성공/실패 콜백 처리 중: 로딩 UI
  if (isCallback) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {error ? (
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => navigate('/health/saju/input')}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm"
            >
              다시 시도하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-gray-500">결제를 확인하고 있어요...</p>
          </div>
        )}
      </div>
    )
  }

  if (!inputData) return null

  const tierName = getSajuName(inputData.tier)
  const tierPrice = getSajuPrice(inputData.tier)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => navigate('/health/saju/input')}
        className="flex items-center gap-1 text-gray-500 hover:text-orange-500 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        입력 수정
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-gray-900 mb-2">결제</h1>
        <p className="text-gray-500 mb-6">안전한 토스페이먼츠 결제</p>

        {/* 주문 요약 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">주문 요약</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">
              건강사주 {tierName} 리포트
            </span>
            <span className="font-bold text-gray-900">
              {tierPrice.toLocaleString()}원
            </span>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>이름: {inputData.name}</p>
            <p>생년월일: {inputData.birthDate}</p>
            {inputData.birthHour != null && <p>출생시간: {inputData.birthHour}시</p>}
          </div>
        </div>

        {/* Payment Widget 영역 */}
        <div id="payment-method" className="mb-6 min-h-[200px]" />

        {/* 에러 */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">결제 실패</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 결제 버튼 */}
        <button
          onClick={handlePayment}
          disabled={!isReady || isProcessing}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            isReady && !isProcessing
              ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              처리 중...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              {tierPrice.toLocaleString()}원 결제하기
            </>
          )}
        </button>

        {/* 안전 결제 안내 */}
        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          토스페이먼츠 안전결제 | 개인정보 암호화
        </div>
      </motion.div>
    </div>
  )
}
