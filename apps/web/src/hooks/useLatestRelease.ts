import { useEffect, useState } from 'react'
import {
  DESKTOP_VERSION,
  DOWNLOAD_TARGETS,
  GITHUB_REPO,
  assetUrl,
  type DownloadTarget,
} from '@/config/version'

/**
 * 다운로드 페이지가 보여줄 "지금 받을 수 있는 것".
 *
 * 빌드 시점 상수(DESKTOP_VERSION)로 먼저 그린 뒤, GitHub 릴리스를 실제로
 * 확인해서 덮어쓴다. 웹은 Vercel 이, 설치 파일은 GitHub Actions 가 따로
 * 올리기 때문에 둘의 시각이 몇 분에서 며칠까지 어긋날 수 있다. 방문자에게
 * 중요한 것은 웹이 마지막으로 배포될 때의 버전이 아니라 지금 받을 수 있는
 * 버전이다.
 *
 * 확인에 실패하면(오프라인, API 한도 60회/시간, 릴리스가 아직 없음)
 * 조용히 빌드 시점 값을 그대로 쓴다. 이 페이지는 다운로드 버튼이 살아
 * 있는 것이 먼저라, 오류 문구로 버튼을 가리지 않는다.
 */

export interface ReleaseAsset {
  target: DownloadTarget
  url: string
  /** 바이트. API 를 못 불렀으면 알 수 없다. */
  size: number | null
}

export interface LatestRelease {
  version: string
  /** 릴리스 발행일 (ISO). 확인 전에는 null */
  publishedAt: string | null
  assets: ReleaseAsset[]
  /** GitHub 응답으로 확인된 값인지, 빌드 시점 추정값인지 */
  confirmed: boolean
}

interface GithubAsset {
  name: string
  browser_download_url: string
  size: number
}

interface GithubRelease {
  tag_name: string
  published_at: string
  draft: boolean
  prerelease: boolean
  assets: GithubAsset[]
}

/** 빌드 시점 정보만으로 만든 대비책 */
function fallback(): LatestRelease {
  return {
    version: DESKTOP_VERSION,
    publishedAt: null,
    confirmed: false,
    assets: DOWNLOAD_TARGETS.map((target) => ({
      target,
      url: assetUrl(DESKTOP_VERSION, target),
      size: null,
    })),
  }
}

export function useLatestRelease(): LatestRelease {
  const [release, setRelease] = useState<LatestRelease>(fallback)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((res) => (res.ok ? (res.json() as Promise<GithubRelease>) : Promise.reject(res.status)))
      .then((data) => {
        if (data.draft) return

        const version = data.tag_name.replace(/^v/, '')

        // 릴리스에 실제로 올라온 파일만 연결한다. macOS 빌드가 실패해서
        // 자산이 빠진 릴리스라면, 없는 링크를 주는 것보다 그 항목을 숨기는
        // 편이 낫다 — 눌러서 404 를 만나면 앱 자체를 의심하게 된다.
        const assets = DOWNLOAD_TARGETS.map((target): ReleaseAsset | null => {
          const match = data.assets.find((a) => target.pattern.test(a.name))
          return match ? { target, url: match.browser_download_url, size: match.size } : null
        }).filter((a): a is ReleaseAsset => a !== null)

        if (assets.length === 0) return

        setRelease({ version, publishedAt: data.published_at, assets, confirmed: true })
      })
      .catch(() => {
        /* 빌드 시점 값 유지 */
      })

    return () => controller.abort()
  }, [])

  return release
}

/** 바이트를 사람이 읽는 크기로. 알 수 없으면 빈 문자열. */
export function formatSize(bytes: number | null): string {
  if (bytes === null) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
}
