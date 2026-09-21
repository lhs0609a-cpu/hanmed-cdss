import { contextBridge, ipcRenderer } from 'electron'

/**
 * 웹앱이 "지금 데스크톱 앱 안에서 돌고 있다"는 것을 알 수 있게 하는 창구.
 *
 * 버전은 IPC 로 물어보지 않고 실행 인자에서 읽는다. 웹앱은 첫 렌더에
 * 버전을 그려야 하는데(다운로드 페이지의 안내 문구가 여기에 걸린다),
 * 비동기로 받아오면 한 프레임 늦게 나타나 화면이 덜컥거린다.
 */
const appVersion =
  process.argv.find((arg) => arg.startsWith('--app-version='))?.split('=')[1] ?? ''

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  appVersion,

  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // IPC 통신 (필요 시 확장)
  send: (channel: string, data: unknown) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel: string, func: (...args: unknown[]) => void) => {
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => func(...args))
    }
  },
})

// 타입 정의 (웹앱에서 사용)
declare global {
  interface Window {
    electronAPI?: {
      platform: string
      isElectron: boolean
      appVersion: string
      versions: {
        node: string
        chrome: string
        electron: string
      }
      send: (channel: string, data: unknown) => void
      receive: (channel: string, func: (...args: unknown[]) => void) => void
    }
  }
}
