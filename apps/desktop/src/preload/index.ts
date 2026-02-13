import { contextBridge, ipcRenderer } from 'electron'

// 렌더러 프로세스에서 사용할 수 있는 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 앱 정보
  platform: process.platform,
  isElectron: true,

  // 기본 기능
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
