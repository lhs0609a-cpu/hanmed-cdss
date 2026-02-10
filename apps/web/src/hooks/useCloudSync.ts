/**
 * 클라우드 데이터 동기화 훅
 * localStorage 데이터를 서버와 동기화하여 다중 기기 접근 및 데이터 보존을 지원합니다.
 * Pro 플랜 이상에서만 클라우드 동기화가 활성화됩니다.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

// 동기화 대상 데이터 키
export const SYNC_KEYS = {
  PULSE_RECORDS: 'pulse_diagnosis_records',
  VOICE_SESSIONS: 'voice_chart_sessions',
  INTEGRATED_DIAGNOSIS: 'integratedDiagnosisRecords',
  RECENT_SEARCHES: 'recent-items-storage',
  USER_PREFERENCES: 'user_preferences',
} as const

type SyncKey = typeof SYNC_KEYS[keyof typeof SYNC_KEYS]

interface SyncStatus {
  lastSynced: Date | null
  isSyncing: boolean
  error: string | null
  isEnabled: boolean
}

interface CloudData {
  key: string
  data: unknown
  updatedAt: string
}

// 동기화 가능 플랜
const SYNC_ENABLED_TIERS = ['professional', 'clinic', 'enterprise']

export function useCloudSync() {
  const user = useAuthStore((state) => state.user)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSynced: null,
    isSyncing: false,
    error: null,
    isEnabled: false,
  })

  // 플랜 기반 동기화 활성화 여부
  const isCloudSyncEnabled = user?.subscriptionTier
    ? SYNC_ENABLED_TIERS.includes(user.subscriptionTier.toLowerCase())
    : false

  useEffect(() => {
    setSyncStatus(prev => ({ ...prev, isEnabled: isCloudSyncEnabled }))
  }, [isCloudSyncEnabled])

  /**
   * 서버에서 데이터 가져오기
   */
  const pullFromCloud = useCallback(async (key: SyncKey): Promise<unknown | null> => {
    if (!isCloudSyncEnabled || !user) return null

    try {
      const response = await api.get<{ data: CloudData }>(`/user-data/${key}`)
      return response.data.data?.data || null
    } catch (error) {
      console.error(`클라우드에서 ${key} 데이터 가져오기 실패:`, error)
      return null
    }
  }, [isCloudSyncEnabled, user])

  /**
   * 서버에 데이터 저장
   */
  const pushToCloud = useCallback(async (key: SyncKey, data: unknown): Promise<boolean> => {
    if (!isCloudSyncEnabled || !user) return false

    try {
      await api.put(`/user-data/${key}`, { data })
      return true
    } catch (error) {
      console.error(`클라우드에 ${key} 데이터 저장 실패:`, error)
      return false
    }
  }, [isCloudSyncEnabled, user])

  /**
   * 특정 키의 데이터 동기화 (양방향)
   */
  const syncData = useCallback(async (key: SyncKey): Promise<void> => {
    if (!isCloudSyncEnabled || !user) return

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }))

    try {
      // 1. 로컬 데이터 가져오기
      const localDataStr = localStorage.getItem(key)
      const localData = localDataStr ? JSON.parse(localDataStr) : null
      const localTimestamp = localStorage.getItem(`${key}_timestamp`)

      // 2. 클라우드 데이터 가져오기
      const response = await api.get<{ data: CloudData | null }>(`/user-data/${key}`)
      const cloudData = response.data.data

      // 3. 병합 전략: 최신 데이터 우선
      if (cloudData && cloudData.updatedAt) {
        const cloudTimestamp = new Date(cloudData.updatedAt).getTime()
        const localTime = localTimestamp ? new Date(localTimestamp).getTime() : 0

        if (cloudTimestamp > localTime) {
          // 클라우드가 더 최신 → 로컬 업데이트
          localStorage.setItem(key, JSON.stringify(cloudData.data))
          localStorage.setItem(`${key}_timestamp`, cloudData.updatedAt)
        } else if (localData && localTime > cloudTimestamp) {
          // 로컬이 더 최신 → 클라우드 업데이트
          await pushToCloud(key, localData)
        }
      } else if (localData) {
        // 클라우드에 데이터 없음 → 로컬 데이터 업로드
        await pushToCloud(key, localData)
      }

      setSyncStatus(prev => ({
        ...prev,
        lastSynced: new Date(),
        isSyncing: false,
      }))
    } catch (error) {
      console.error(`${key} 동기화 실패:`, error)
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: '동기화에 실패했습니다.',
      }))
    }
  }, [isCloudSyncEnabled, user, pushToCloud])

  /**
   * 모든 데이터 동기화
   */
  const syncAll = useCallback(async (): Promise<void> => {
    if (!isCloudSyncEnabled) return

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }))

    try {
      const syncPromises = Object.values(SYNC_KEYS).map(key => syncData(key))
      await Promise.all(syncPromises)

      setSyncStatus(prev => ({
        ...prev,
        lastSynced: new Date(),
        isSyncing: false,
      }))
    } catch (error) {
      console.error('전체 동기화 실패:', error)
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: '동기화에 실패했습니다.',
      }))
    }
  }, [isCloudSyncEnabled, syncData])

  /**
   * localStorage 저장 시 자동 클라우드 동기화
   */
  const saveWithSync = useCallback(async (key: SyncKey, data: unknown): Promise<void> => {
    // 1. 로컬에 먼저 저장
    const timestamp = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(data))
    localStorage.setItem(`${key}_timestamp`, timestamp)

    // 2. 클라우드 동기화 (백그라운드)
    if (isCloudSyncEnabled) {
      pushToCloud(key, data).catch(console.error)
    }
  }, [isCloudSyncEnabled, pushToCloud])

  /**
   * 앱 시작 시 자동 동기화 (초기 로드)
   */
  useEffect(() => {
    if (isCloudSyncEnabled && user) {
      // 로그인 후 3초 뒤 동기화 (UI 렌더링 후)
      const timer = setTimeout(() => {
        syncAll()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isCloudSyncEnabled, user]) // syncAll 의존성 제거 (무한 루프 방지)

  return {
    syncStatus,
    isCloudSyncEnabled,
    syncData,
    syncAll,
    pushToCloud,
    pullFromCloud,
    saveWithSync,
  }
}

/**
 * 특정 데이터 키에 대한 동기화 훅 (간편 사용)
 */
export function useSyncedData<T>(key: SyncKey, defaultValue: T) {
  const { isCloudSyncEnabled, pullFromCloud, saveWithSync } = useCloudSync()
  const [data, setData] = useState<T>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      // 로컬 데이터 먼저 로드
      const localStr = localStorage.getItem(key)
      if (localStr) {
        try {
          setData(JSON.parse(localStr))
        } catch {
          setData(defaultValue)
        }
      }

      // 클라우드에서 최신 데이터 가져오기
      if (isCloudSyncEnabled) {
        const cloudData = await pullFromCloud(key)
        if (cloudData) {
          setData(cloudData as T)
          localStorage.setItem(key, JSON.stringify(cloudData))
        }
      }

      setIsLoading(false)
    }

    loadData()
  }, [key, isCloudSyncEnabled]) // pullFromCloud 의존성 제거

  // 데이터 저장 함수
  const save = useCallback(async (newData: T) => {
    setData(newData)
    await saveWithSync(key, newData)
  }, [key, saveWithSync])

  return { data, setData: save, isLoading, isCloudSyncEnabled }
}

export default useCloudSync
