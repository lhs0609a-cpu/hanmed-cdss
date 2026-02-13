import { app, BrowserWindow, shell, Menu, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// 자동 업데이트 설정
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    title: '온고지신 AI - 한의학 CDSS',
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    // macOS 스타일
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
  })

  // 윈도우 준비되면 표시
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 개발 모드 vs 프로덕션 모드
  if (is.dev) {
    // 개발 모드: 웹앱 개발 서버 사용
    mainWindow.loadURL('http://localhost:5173')
  } else {
    // 프로덕션: 빌드된 웹앱 로드
    // extraResources에서 복사된 웹앱 경로
    const webAppPath = join(process.resourcesPath, 'app', 'index.html')
    mainWindow.loadFile(webAppPath)
  }

  // 개발자 도구 (개발 모드에서만)
  if (is.dev) {
    mainWindow.webContents.openDevTools()
  }
}

// 메뉴 생성
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '온고지신',
      submenu: [
        {
          label: '온고지신 AI 정보',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '온고지신 AI',
              message: '온고지신 AI - 한의학 CDSS',
              detail: `버전: ${app.getVersion()}\n\n40년 임상 경험의 치험례 데이터와 AI가 결합된\n한의학 임상 의사결정 지원 시스템`,
            })
          },
        },
        { type: 'separator' },
        {
          label: '업데이트 확인',
          click: async () => {
            try {
              const result = await autoUpdater.checkForUpdates()
              if (result?.updateInfo) {
                const response = await dialog.showMessageBox({
                  type: 'info',
                  title: '업데이트 가능',
                  message: `새 버전 ${result.updateInfo.version}이 있습니다.`,
                  detail: '지금 다운로드하시겠습니까?',
                  buttons: ['다운로드', '나중에'],
                })
                if (response.response === 0) {
                  autoUpdater.downloadUpdate()
                }
              } else {
                dialog.showMessageBox({
                  type: 'info',
                  title: '업데이트',
                  message: '현재 최신 버전입니다.',
                })
              }
            } catch {
              dialog.showMessageBox({
                type: 'info',
                title: '업데이트',
                message: '업데이트 서버에 연결할 수 없습니다.',
              })
            }
          },
        },
        { type: 'separator' },
        { role: 'quit', label: '종료' },
      ],
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo', label: '실행 취소' },
        { role: 'redo', label: '다시 실행' },
        { type: 'separator' },
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { role: 'selectAll', label: '전체 선택' },
      ],
    },
    {
      label: '보기',
      submenu: [
        { role: 'reload', label: '새로고침' },
        { role: 'forceReload', label: '강제 새로고침' },
        { type: 'separator' },
        { role: 'resetZoom', label: '기본 크기' },
        { role: 'zoomIn', label: '확대' },
        { role: 'zoomOut', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체 화면' },
      ],
    },
    {
      label: '창',
      submenu: [
        { role: 'minimize', label: '최소화' },
        { role: 'close', label: '닫기' },
      ],
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '온고지신 웹사이트',
          click: () => shell.openExternal('https://ongojisin.co.kr'),
        },
        {
          label: '고객 지원',
          click: () => shell.openExternal('mailto:support@ongojisin.co.kr'),
        },
        { type: 'separator' },
        {
          label: '개발자 도구',
          accelerator: process.platform === 'darwin' ? 'Cmd+Option+I' : 'Ctrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 앱 준비 완료
app.whenReady().then(() => {
  // 앱 ID 설정 (Windows 작업표시줄)
  electronApp.setAppUserModelId('kr.co.ongojisin.desktop')

  // 개발 모드 최적화
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createMenu()
  createWindow()

  // macOS: 독 아이콘 클릭 시 창 다시 열기
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // 자동 업데이트 체크 (프로덕션에서만)
  if (!is.dev) {
    autoUpdater.checkForUpdates().catch(() => {})
  }
})

// 모든 창이 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 자동 업데이트 이벤트
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: '업데이트 준비됨',
    message: '업데이트가 다운로드되었습니다.',
    detail: '앱을 재시작하면 업데이트가 설치됩니다.',
    buttons: ['지금 재시작', '나중에'],
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })
})
