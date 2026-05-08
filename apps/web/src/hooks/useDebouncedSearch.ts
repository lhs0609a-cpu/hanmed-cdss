import { useEffect, useRef, useState } from 'react'

/**
 * 검색 디바운스 + AbortController 통합 훅.
 *
 * 한의사 사용 환경 가정:
 *   - 빠르게 타이핑하면 마지막 입력에 대해서만 결과를 받고 싶다 (race condition 방지).
 *   - 도중에 다른 화면으로 떠도 진행 중인 요청은 취소되어야 한다.
 *
 * 사용 예:
 *   const { data, isLoading, error } = useDebouncedSearch(query, async (signal, q) => {
 *     const res = await fetch(`/api/search?q=${q}`, { signal })
 *     return res.json()
 *   })
 */

interface UseDebouncedSearchOptions {
  delayMs?: number
  /** 최소 검색어 길이 (이 미만이면 호출 안 함) */
  minLength?: number
  /** 빈 입력에서 반환할 초기값 */
  emptyValue?: unknown
}

export function useDebouncedSearch<T>(
  query: string,
  fetcher: (signal: AbortSignal, query: string) => Promise<T>,
  options: UseDebouncedSearchOptions = {},
): { data: T | null; isLoading: boolean; error: Error | null } {
  const { delayMs = 300, minLength = 1, emptyValue = null } = options
  const [data, setData] = useState<T | null>(emptyValue as T | null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 입력이 짧으면 즉시 빈 결과로 초기화
    if (!query || query.trim().length < minLength) {
      if (abortRef.current) abortRef.current.abort()
      if (timerRef.current) clearTimeout(timerRef.current)
      setData(emptyValue as T | null)
      setIsLoading(false)
      setError(null)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      // 이전 진행 중 요청을 취소 (race condition 방지)
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)
      setError(null)
      try {
        const result = await fetcher(controller.signal, query)
        if (!controller.signal.aborted) {
          setData(result)
          setIsLoading(false)
        }
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
        setError(e as Error)
        setIsLoading(false)
      }
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, delayMs, minLength])

  // 언마운트 시 진행 중 요청 취소
  useEffect(
    () => () => {
      if (abortRef.current) abortRef.current.abort()
    },
    [],
  )

  return { data, isLoading, error }
}

/** 단순 디바운스만 필요한 경우 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
