/**
 * 버전 · 설치 파일 배포 설정
 *
 * 웹 화면에 "지금 쓰고 있는 게 몇 버전인지"를 적어두기 위한 파일이고,
 * 동시에 데스크톱 설치 파일을 어디서 받는지의 유일한 출처다.
 *
 * 버전 숫자는 여기에 손으로 적지 않는다. vite.config.ts 가 빌드 시점에
 * package.json 두 개를 읽어 __APP_VERSION__ / __DESKTOP_VERSION__ 으로
 * 박아 넣는다. 손으로 적어두면 릴리스 때마다 누군가 한 곳을 빠뜨리고,
 * 다운로드 페이지가 존재하지 않는 파일을 가리키게 된다.
 */

/** 웹앱 버전 — apps/web/package.json */
export const APP_VERSION: string = __APP_VERSION__

/** 데스크톱 앱 버전 — apps/desktop/package.json (설치 파일 이름·자동 업데이트와 같은 값) */
export const DESKTOP_VERSION: string = __DESKTOP_VERSION__

/** 이 웹 번들을 만든 날짜 (YYYY-MM-DD) */
export const BUILD_DATE: string = __BUILD_DATE__

/** 릴리스가 올라가는 저장소 */
export const GITHUB_REPO = 'lhs0609a-cpu/hanmed-cdss'

const RELEASES = `https://github.com/${GITHUB_REPO}/releases`

/** 전체 릴리스 목록 (지난 버전 받기) */
export const RELEASES_URL = RELEASES

/** 특정 버전의 릴리스 노트 */
export const releaseNotesUrl = (version: string) => `${RELEASES}/tag/v${version}`

/**
 * 설치 파일 종류.
 *
 * key 는 GitHub 릴리스에 올라온 자산 이름과 맞춰야 한다.
 * electron-builder 의 artifactName(apps/desktop/package.json 의 build 항목)을
 * 바꾸면 여기 pattern 도 같이 바꿔야 한다.
 */
export interface DownloadTarget {
  /** 내부 식별자 */
  id: 'win-setup' | 'win-portable' | 'mac-arm64' | 'mac-x64'
  /** 화면에 보이는 이름 */
  label: string
  /** 부연 설명 */
  hint: string
  /** 어느 OS 감지 결과에 묶이는지 */
  platform: 'windows' | 'mac'
  /** 버전이 주어졌을 때의 파일 이름 */
  fileName: (version: string) => string
  /** GitHub 릴리스 자산 목록에서 이 대상을 찾아내는 규칙 */
  pattern: RegExp
}

export const DOWNLOAD_TARGETS: DownloadTarget[] = [
  {
    id: 'win-setup',
    label: 'Windows 설치 파일',
    hint: 'Windows 10 이상 · 64비트 · 설치 후 바탕화면 아이콘 생성',
    platform: 'windows',
    fileName: (v) => `OngojisinAI-Setup-${v}.exe`,
    pattern: /^OngojisinAI-Setup-.*\.exe$/i,
  },
  {
    id: 'win-portable',
    label: 'Windows 무설치(포터블)',
    hint: '설치 권한이 없는 원내 PC용 · 파일 하나로 바로 실행',
    platform: 'windows',
    fileName: (v) => `OngojisinAI-Portable-${v}.exe`,
    pattern: /^OngojisinAI-Portable-.*\.exe$/i,
  },
  {
    id: 'mac-arm64',
    label: 'macOS (Apple 실리콘)',
    hint: 'M1 이후 맥 · macOS 11 이상',
    platform: 'mac',
    fileName: (v) => `OngojisinAI-${v}-arm64.dmg`,
    pattern: /^OngojisinAI-.*-arm64\.dmg$/i,
  },
  {
    id: 'mac-x64',
    label: 'macOS (인텔)',
    hint: '2020년 이전 인텔 맥 · macOS 11 이상',
    platform: 'mac',
    fileName: (v) => `OngojisinAI-${v}-x64.dmg`,
    pattern: /^OngojisinAI-.*-x64\.dmg$/i,
  },
]

/**
 * 릴리스 자산의 기본 주소.
 *
 * 실제로는 GitHub API 에서 받아온 browser_download_url 을 쓰는 편이 정확하다.
 * 이 함수는 API 를 못 부를 때(오프라인, 요청 한도 초과) 쓰는 대비책이라,
 * 태그가 v{version} 규칙을 지킨다는 전제 위에 서 있다.
 */
export const assetUrl = (version: string, target: DownloadTarget) =>
  `${RELEASES}/download/v${version}/${target.fileName(version)}`

export type DetectedPlatform = 'windows' | 'mac' | 'other'

/**
 * 어느 OS 로 들어왔는지 짐작한다.
 *
 * 맞히려는 게 아니라 버튼 순서를 정하려는 것이다. 틀려도 다른 설치 파일이
 * 바로 아래 전부 보이므로, 확신이 서지 않으면 'other' 로 두고 전부 나열한다.
 */
export function detectPlatform(ua: string = navigator.userAgent): DetectedPlatform {
  if (/Windows|Win64|Win32/i.test(ua)) return 'windows'
  // iPad 는 데스크톱 UA 를 쓸 때가 있지만, 어차피 dmg 를 줄 수 없으므로 제외한다.
  if (/Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) return 'mac'
  return 'other'
}

/** 앱이 Electron 껍데기 안에서 돌고 있는지 (preload 가 심어준 표식) */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && window.electronAPI?.isElectron === true
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string
      isElectron: boolean
      appVersion?: string
      versions: { node: string; chrome: string; electron: string }
    }
  }
}
