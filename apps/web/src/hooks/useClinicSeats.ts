import { useEffect, useState, useCallback } from 'react'
import api from '@/services/api'

/**
 * 다인 한의원 — 좌석/원장 관리 훅.
 *
 * 정책:
 *   - 한의원당 OWNER 1명, PRACTITIONER N명. PRACTITIONER 는 면허 검수 통과 시에만 처방 가능.
 *   - 좌석 추가는 결제 모듈에서 처리 (per-seat pricing).
 *   - 환자 데이터는 한의원 단위로 공유 (소유자 OWNER), 부원장은 RBAC 으로 접근.
 */

export type SeatRole = 'owner' | 'practitioner' | 'staff'

export interface ClinicSeat {
  userId: string
  email: string
  name: string
  role: SeatRole
  isLicenseVerified: boolean
  practitionerType: string
  joinedAt: string
}

export interface ClinicMembership {
  clinicId: string
  clinicName: string
  ownerId: string
  seats: ClinicSeat[]
  maxSeats: number
}

export function useClinicSeats() {
  const [data, setData] = useState<ClinicMembership | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get<ClinicMembership>('/clinics/me')
      setData(res.data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch().catch(() => {})
  }, [refetch])

  const inviteSeat = useCallback(
    async (email: string, role: SeatRole) => {
      await api.post(`/clinics/me/seats/invite`, { email, role })
      await refetch()
    },
    [refetch],
  )

  const removeSeat = useCallback(
    async (userId: string) => {
      await api.delete(`/clinics/me/seats/${userId}`)
      await refetch()
    },
    [refetch],
  )

  const changeRole = useCallback(
    async (userId: string, role: SeatRole) => {
      await api.patch(`/clinics/me/seats/${userId}`, { role })
      await refetch()
    },
    [refetch],
  )

  return { data, isLoading, error, refetch, inviteSeat, removeSeat, changeRole }
}
