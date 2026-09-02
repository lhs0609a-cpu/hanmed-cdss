import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import api from '@/services/api'
import { getErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'

/**
 * 토스 결제창에서 카드 인증을 마치고 돌아오는 자리.
 *
 * 결제창이 customerKey 와 authKey 를 쿼리로 붙여 보낸다. 그것으로 빌링키를
 * 발급받고, 고르던 플랜이 있으면 이어서 결제한다.
 *
 * 이 화면이 하는 일이 두 단계라 중간에 끊길 수 있다. 빌링키까지만 되고
 * 구독이 실패하면 카드는 등록된 상태이므로, 요금제 화면으로 보내면 거기서
 * 바로 다시 결제할 수 있다 — 카드를 다시 넣을 필요는 없다.
 */
export default function BillingSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  // React 18 StrictMode 는 개발 중 effect 를 두 번 돌린다. 결제를 두 번
  // 보내면 안 되므로 한 번만 돌게 막는다.
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const customerKey = params.get('customerKey')
    const authKey = params.get('authKey')

    if (!customerKey || !authKey) {
      setError('인증 정보가 없습니다. 요금제 화면에서 다시 시도해 주세요.')
      return
    }

    const run = async () => {
      try {
        await api.post('/subscription/billing-auth', { customerKey, authKey })

        const tier = sessionStorage.getItem('pendingTier')
        const interval = sessionStorage.getItem('pendingInterval') || 'monthly'
        const trialTier = sessionStorage.getItem('pendingTrialTier')
        sessionStorage.removeItem('pendingTier')
        sessionStorage.removeItem('pendingInterval')
        sessionStorage.removeItem('pendingTrialTier')

        // 체험을 시작하려고 카드를 등록한 경우. 지금 결제하지 않는다.
        if (trialTier) {
          const { data } = await api.post<{ message: string }>(
            '/subscription/trial/start',
            { tier: trialTier, interval },
          )
          toast.success(data?.message ?? '무료 체험이 시작되었습니다.')
          navigate('/dashboard/subscription', { replace: true })
          return
        }

        if (!tier) {
          toast.success('카드가 등록되었습니다.')
          navigate('/dashboard/subscription', { replace: true })
          return
        }

        await api.post('/subscription/subscribe', { tier, interval })
        toast.success('구독이 시작되었습니다.')
        navigate('/dashboard/subscription/success', { replace: true })
      } catch (e) {
        setError(getErrorMessage(e))
      }
    }
    void run()
  }, [params, navigate])

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
        <h1 className="mt-4 text-lg font-semibold text-gray-900">
          결제를 마치지 못했습니다
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/subscription', { replace: true })}
          className="mt-6 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          요금제로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
      <p className="mt-4 text-sm text-gray-600">
        카드를 등록하고 구독을 시작하는 중입니다. 창을 닫지 말아 주세요.
      </p>
    </div>
  )
}
