import { useState, useCallback, useEffect } from 'react'

const PRESCRIPTIONS_STORAGE_KEY = 'hanmed_prescriptions'

export interface PrescriptionRecord {
  id: string
  date: string
  formulaName: string
  herbs: Array<{ name: string; amount: string; role: string }>
  rationale: string
  confidenceScore: number
  chiefComplaint: string
  symptoms: string[]
  constitution?: string
  analysis?: string
}

export function useConsultationHistory() {
  const [history, setHistory] = useState<PrescriptionRecord[]>([])

  const loadHistory = useCallback(() => {
    try {
      const data = JSON.parse(localStorage.getItem(PRESCRIPTIONS_STORAGE_KEY) || '[]')
      setHistory(data)
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    loadHistory()

    const handleStorage = (e: StorageEvent) => {
      if (e.key === PRESCRIPTIONS_STORAGE_KEY) loadHistory()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [loadHistory])

  const getRecent = useCallback((count = 5) => {
    return history.slice(0, count)
  }, [history])

  const deleteRecord = useCallback((id: string) => {
    const updated = history.filter(r => r.id !== id)
    localStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(updated))
    setHistory(updated)
  }, [history])

  const clearAll = useCallback(() => {
    localStorage.removeItem(PRESCRIPTIONS_STORAGE_KEY)
    setHistory([])
  }, [])

  return {
    history,
    recent: getRecent(),
    getRecent,
    deleteRecord,
    clearAll,
    totalCount: history.length,
    reload: loadHistory,
  }
}

/** 상대 시간 표시 (2분 전, 1시간 전, 어제 등) */
export function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay === 1) return '어제'
  if (diffDay < 7) return `${diffDay}일 전`
  return new Date(dateString).toLocaleDateString('ko-KR')
}
