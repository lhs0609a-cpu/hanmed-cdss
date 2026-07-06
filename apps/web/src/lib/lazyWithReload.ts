import { lazy as reactLazy, type ComponentType } from 'react'

const RELOAD_FLAG = 'ongojisin:chunk-reloaded'

function safeSession(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** 새 배포로 구버전 청크가 사라져 dynamic import 가 실패한 경우인지 판별. */
export function isChunkLoadError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk')
  )
}

/**
 * React.lazy 래퍼 — SPA 배포 레이스 자가치유.
 *
 * Vercel 재배포 후 사용자의 브라우저는 구버전 index.html(구 청크 해시)을 들고 있어,
 * 라우트 이동 시 lazy import 가 사라진 청크를 404 로 받아 "Failed to fetch dynamically
 * imported module" 로 실패한다. 이 경우 최신 index.html 을 받도록 1회 하드 리로드로
 * 자가치유한다. sessionStorage 플래그로 무한 새로고침을 막고, 로드 성공 시 초기화한다.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return reactLazy(async () => {
    try {
      const mod = await factory()
      safeSession()?.removeItem(RELOAD_FLAG)
      return mod
    } catch (err) {
      const ss = safeSession()
      if (isChunkLoadError(err) && ss && !ss.getItem(RELOAD_FLAG)) {
        ss.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // 리로드가 진행되는 동안 절대 resolve/reject 되지 않는 프라미스를 반환해
        // ErrorBoundary 가 잠깐이라도 에러 화면을 그리지 않도록 한다.
        return new Promise<{ default: T }>(() => {})
      }
      throw err
    }
  })
}
