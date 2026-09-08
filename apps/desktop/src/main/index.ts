import { app, BrowserWindow, shell, Menu, dialog, screen } from 'electron'
import { autoUpdater } from 'electron-updater'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

/**
 * 온고지신 AI 데스크톱 셸.
 *
 * 이 앱은 웹앱을 복사해 담지 않고, 배포된 웹앱(www.ongojisin.co.kr)을 그대로 띄운다.
 *
 * 예전 구현은 apps/web/dist 를 설치 파일 안에 넣고 file:// 로 열었는데,
 * 그렇게는 동작할 수 없었다. 웹앱은 BrowserRouter 를 쓴다 — file:// 에서는
 * location.pathname 이 디스크 경로라 어떤 라우트도 맞지 않는다. 게다가
 * 진료 데이터는 어차피 api.ongojisin.co.kr 에서 오므로, 오프라인으로
 * 쓸 수 있는 화면은 처음부터 없었다.
 *
 * 웹을 그대로 띄우면 얻는 것이 하나 더 있다. 서버에 고친 내용이 앱을
 * 새로 배포하지 않아도 그날 바로 반영된다. 설치 파일 업데이트는 셸
 * 자체(메뉴, 자동 업데이트)가 바뀔 때만 필요하다.
 */

/**
 * 띄울 주소. 사내 테스트 때는 ONGOJISIN_APP_URL 로 바꿔 끼운다.
 *
 * 운영 도메인은 www.ongojisin.co.kr 이다. index.html 의 canonical 과 여기저기
 * 문서에 ongojisin.ai 가 적혀 있지만 그 도메인은 아직 DNS 에 없다 — 셸이
 * 그리로 가면 앱을 켤 때마다 "연결할 수 없습니다" 만 뜬다.
 */
const APP_URL = process.env.ONGOJISIN_APP_URL ?? 'https://www.ongojisin.co.kr'

/** 우리 서비스의 호스트. 오프라인 안내를 띄울지 판단하는 데만 쓴다. */
const INTERNAL_HOSTS = ['ongojisin.ai', 'www.ongojisin.ai', 'ongojisin.co.kr', 'www.ongojisin.co.kr']

// 업데이트는 조용히 받아두고, 다 받은 뒤에 한 번만 물어본다.
// 받을지 말지부터 묻는 방식은 진료 중에 뜨면 그냥 닫히고 만다.
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

let mainWindow: BrowserWindow | null = null

/* ────────────────────────────────────────────────────────────
   창 크기 기억하기
   ──────────────────────────────────────────────────────────── */

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  maximized?: boolean
}

const DEFAULT_STATE: WindowState = { width: 1400, height: 900 }
const stateFile = () => join(app.getPath('userData'), 'window-state.json')

function loadWindowState(): WindowState {
  let state: WindowState
  try {
    state = { ...DEFAULT_STATE, ...JSON.parse(readFileSync(stateFile(), 'utf-8')) }
  } catch {
    return DEFAULT_STATE
  }

  // 모니터를 떼고 온 경우, 저장된 좌표가 지금 없는 화면을 가리킬 수 있다.
  // 그대로 두면 창이 보이지 않는 곳에 열린다.
  if (state.x !== undefined && state.y !== undefined) {
    const onScreen = screen.getAllDisplays().some((d) => {
      const b = d.workArea
      return (
        state.x! >= b.x && state.y! >= b.y && state.x! < b.x + b.width && state.y! < b.y + b.height
      )
    })
    if (!onScreen) {
      delete state.x
      delete state.y
    }
  }

  return state
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const bounds = win.getNormalBounds()
    const state: WindowState = { ...bounds, maximized: win.isMaximized() }
    writeFileSync(stateFile(), JSON.stringify(state), 'utf-8')
  } catch {
    // 창 크기를 못 적는 것으로 앱이 죽을 이유는 없다.
  }
}

/* ────────────────────────────────────────────────────────────
   연결이 끊겼을 때 보여줄 화면
   ──────────────────────────────────────────────────────────── */

/**
 * 서버에 닿지 못했을 때 띄우는 화면.
 *
 * 별도 파일로 두면 패키징 목록에 넣는 것을 잊었을 때 정작 필요한 순간에
 * 빈 창이 뜬다. 이 화면이 필요한 때는 이미 뭔가 잘못된 때이므로,
 * 실패할 수 있는 요소를 두지 않는다.
 */
function offlinePage(): string {
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>연결할 수 없습니다</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;background:#05070D;color:#fff;
       font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Malgun Gothic",sans-serif}
  .box{max-width:26rem;padding:0 2rem;text-align:center}
  h1{font-size:19px;font-weight:600;margin:0 0 .75rem}
  p{font-size:14px;line-height:1.7;color:rgba(255,255,255,.5);margin:0 0 1.75rem}
  button{border:0;border-radius:10px;padding:.7rem 1.6rem;font-size:14px;font-weight:600;color:#fff;
         background:linear-gradient(135deg,#3182F6,#5B7CFA);cursor:pointer;font-family:inherit}
  button:hover{opacity:.92}
</style>
</head>
<body>
  <div class="box">
    <h1>온고지신 AI 에 연결할 수 없습니다</h1>
    <p>인터넷 연결을 확인한 뒤 다시 시도해 주세요.<br />
       진료 기록은 서버에 그대로 있습니다.</p>
    <button onclick="location.href='${APP_URL}'">다시 시도</button>
  </div>
</body>
</html>`
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
}

/* ────────────────────────────────────────────────────────────
   창
   ──────────────────────────────────────────────────────────── */

function createWindow(): void {
  const state = loadWindowState()

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    title: '온고지신 AI',
    backgroundColor: '#05070D',
    // 제목 표시줄은 OS 기본을 쓴다. hiddenInset 으로 감추면 맥에서 웹앱의
    // sticky 헤더가 신호등 버튼 아래로 깔리고, 웹 쪽에 -webkit-app-region
    // 을 넣을 수 없어(원격 페이지다) 창을 끌 수도 없다.
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // 웹앱이 "지금 데스크톱 앱이고 버전은 이것"임을 동기적으로 알 수 있게 한다.
      additionalArguments: [`--app-version=${app.getVersion()}`],
    },
  })

  if (state.maximized) mainWindow.maximize()

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', () => mainWindow && saveWindowState(mainWindow))
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  attachNavigationRules(mainWindow)

  // 서버에 닿지 못했을 때. -3 은 사용자가 취소한 이동이라 무시한다.
  // 남의 도메인(결제·카드사)이 실패한 것까지 "온고지신 AI 에 연결할 수
  // 없습니다" 로 덮으면, 원인이 우리 쪽인 줄 알고 문의가 온다.
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, _desc, url, isMainFrame) => {
    if (isMainFrame && errorCode !== -3 && isInternal(url)) {
      mainWindow?.loadURL(offlinePage())
    }
  })

  mainWindow.loadURL(is.dev ? (process.env.ONGOJISIN_APP_URL ?? 'http://localhost:3000') : APP_URL)

  if (is.dev) {
    mainWindow.webContents.openDevTools()
  }
}

function isInternal(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return INTERNAL_HOSTS.includes(hostname) || hostname === 'localhost'
  } catch {
    return false
  }
}

/* ────────────────────────────────────────────────────────────
   창 안에서 어디까지 열어줄 것인가
   ──────────────────────────────────────────────────────────── */

/**
 * 결제가 되려면 남의 도메인도 앱 안에서 열려야 한다.
 *
 * 구독 결제는 토스 빌링 인증으로 간다(SubscriptionPage 의
 * requestBillingAuth). 그건 팝업이 아니라 지금 창을 통째로
 * pay.toss.im 으로 보냈다가, 끝나면 successUrl(우리 도메인)로 돌려보내는
 * 왕복이다. 여기서 "우리 도메인 밖은 기본 브라우저로" 규칙을 걸면 그 왕복이
 * 두 프로그램으로 쪼개진다 — 카드 등록은 브라우저에서 끝나고, 앱은 결제
 * 전 화면에 그대로 멈춰 있다. 사용자는 결제가 됐는지 안 됐는지 알 수 없다.
 *
 * 그래서 http(s) 이동은 앱 안에서 그대로 연다. 대신 뒤로 가기를 메뉴와
 * 단축키로 열어둬서, 어디로 가든 돌아올 수 있게 한다.
 *
 * http(s) 가 아닌 주소는 반대로 반드시 OS 에 넘겨야 한다. 한국 카드 인증은
 * 앱카드를 kb-acp:// 같은 사용자 지정 스킴으로 깨우는데, 그걸 앱 안에서
 * 처리하려 들면 아무 일도 일어나지 않고 인증이 멈춘다.
 */
function attachNavigationRules(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      openChildWindow(url, win)
    } else {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return
    }
    event.preventDefault()
    // 앱카드·계좌인증 같은 외부 앱 호출. 설치돼 있지 않으면 OS 가 알아서
    // 알려주므로, 우리가 따로 오류를 띄우지 않는다.
    shell.openExternal(url).catch(() => {})
  })
}

/**
 * 팝업으로 열리는 것들 — 카드사 인증창, 약관 상세, OAuth 동의 화면.
 *
 * 기본 브라우저로 넘기면 인증을 마친 뒤 부모 창(앱)에 결과를 돌려줄 방법이
 * 없다. 앱 안의 자식 창으로 열어야 window.opener 로 이어진다.
 */
function openChildWindow(url: string, parent: BrowserWindow): void {
  const child = new BrowserWindow({
    parent,
    width: 520,
    height: 720,
    title: '온고지신 AI',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 자식 창이 또 팝업을 띄우는 경우(카드사 → 본인확인)까지 이어지게 한다.
  child.webContents.setWindowOpenHandler(({ url: nested }) => {
    if (nested.startsWith('http://') || nested.startsWith('https://')) {
      openChildWindow(nested, parent)
    } else {
      shell.openExternal(nested)
    }
    return { action: 'deny' }
  })

  child.webContents.on('will-navigate', (event, next) => {
    if (next.startsWith('http://') || next.startsWith('https://')) return
    event.preventDefault()
    shell.openExternal(next).catch(() => {})
  })

  child.loadURL(url)
}

/* ────────────────────────────────────────────────────────────
   켤 때 같이 뜨게 하기
   ──────────────────────────────────────────────────────────── */

const prefsFile = () => join(app.getPath('userData'), 'prefs.json')

/**
 * 처음 설치했을 때 한 번만 "PC 켤 때 같이 실행"을 켠다.
 *
 * 매번 켜면 안 된다. 사용자가 작업 관리자의 시작 프로그램에서 꺼도 다음
 * 실행 때 되살아나는데, 그건 끄는 방법이 없는 프로그램이 된다. 한 번
 * 켜둔 뒤로는 OS 에 저장된 값이 진실이고, 메뉴의 체크 항목으로 켜고 끈다.
 */
function initAutoLaunch(): void {
  if (is.dev) return

  let configured = false
  try {
    configured = JSON.parse(readFileSync(prefsFile(), 'utf-8')).autoLaunchConfigured === true
  } catch {
    configured = false
  }

  if (configured) return

  try {
    app.setLoginItemSettings({ openAtLogin: true })
    writeFileSync(prefsFile(), JSON.stringify({ autoLaunchConfigured: true }), 'utf-8')
  } catch {
    // 회사 PC 정책으로 막혀 있을 수 있다. 그렇다고 앱이 안 뜰 이유는 없다.
  }
}

function isAutoLaunchOn(): boolean {
  try {
    return app.getLoginItemSettings().openAtLogin
  } catch {
    return false
  }
}

/* ────────────────────────────────────────────────────────────
   메뉴
   ──────────────────────────────────────────────────────────── */

async function checkForUpdatesManually(): Promise<void> {
  if (is.dev) {
    await dialog.showMessageBox({
      type: 'info',
      title: '업데이트',
      message: '개발 모드에서는 업데이트를 확인하지 않습니다.',
    })
    return
  }

  try {
    const result = await autoUpdater.checkForUpdates()
    const latest = result?.updateInfo?.version

    // autoDownload 가 켜져 있으므로, 새 버전이 있으면 이 시점에 이미
    // 내려받기가 시작됐다. 다 받으면 update-downloaded 에서 다시 묻는다.
    await dialog.showMessageBox({
      type: 'info',
      title: '업데이트',
      message:
        latest && latest !== app.getVersion()
          ? `새 버전 ${latest} 을 내려받고 있습니다.`
          : '현재 최신 버전입니다.',
      detail:
        latest && latest !== app.getVersion()
          ? '다 받으면 다시 알려드립니다. 그동안 계속 쓰셔도 됩니다.'
          : `설치된 버전: ${app.getVersion()}`,
    })
  } catch {
    await dialog.showMessageBox({
      type: 'info',
      title: '업데이트',
      message: '업데이트 서버에 연결할 수 없습니다.',
      detail: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
    })
  }
}

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
              detail: `버전: ${app.getVersion()}\nElectron: ${process.versions.electron}\n\n40년 임상 경험의 치험례 데이터와 AI가 결합된\n한의학 임상 의사결정 지원 시스템`,
            })
          },
        },
        { type: 'separator' },
        { label: '업데이트 확인', click: () => void checkForUpdatesManually() },
        {
          label: 'PC 를 켤 때 같이 실행',
          type: 'checkbox',
          checked: isAutoLaunchOn(),
          click: (item) => {
            try {
              app.setLoginItemSettings({ openAtLogin: item.checked })
            } catch {
              // 정책으로 막힌 PC 라면 체크 상태를 실제 값으로 되돌린다.
              item.checked = isAutoLaunchOn()
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
        // 결제·인증 때문에 남의 도메인도 앱 안에서 열린다(attachNavigationRules).
        // 돌아올 길이 없으면 그 순간 갇히므로 뒤로 가기를 메뉴에 둔다.
        {
          label: '뒤로',
          accelerator: process.platform === 'darwin' ? 'Cmd+Left' : 'Alt+Left',
          click: () => {
            const wc = BrowserWindow.getFocusedWindow()?.webContents
            if (wc?.canGoBack()) wc.goBack()
          },
        },
        {
          label: '앞으로',
          accelerator: process.platform === 'darwin' ? 'Cmd+Right' : 'Alt+Right',
          click: () => {
            const wc = BrowserWindow.getFocusedWindow()?.webContents
            if (wc?.canGoForward()) wc.goForward()
          },
        },
        { type: 'separator' },
        { role: 'reload', label: '새로고침' },
        { role: 'forceReload', label: '강제 새로고침' },
        {
          label: '처음 화면으로',
          click: () => mainWindow?.loadURL(APP_URL),
        },
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
          click: () => shell.openExternal('https://www.ongojisin.co.kr'),
        },
        {
          label: '고객 지원',
          click: () => shell.openExternal('mailto:lhs0609c@naver.com'),
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

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/* ────────────────────────────────────────────────────────────
   수명 주기
   ──────────────────────────────────────────────────────────── */

// 두 번 실행하면 창이 두 개 뜬다. 같은 계정으로 같은 화면을 두 창에서
// 보게 되므로, 두 번째 실행은 이미 열린 창을 앞으로 가져오는 것으로 끝낸다.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // Windows 작업표시줄이 창을 이 앱으로 묶는 데 쓴다.
    electronApp.setAppUserModelId('kr.co.ongojisin.desktop')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    initAutoLaunch()
    createMenu()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    if (!is.dev) {
      autoUpdater.checkForUpdates().catch(() => {})
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

autoUpdater.on('update-downloaded', (info) => {
  dialog
    .showMessageBox({
      type: 'info',
      title: '업데이트 준비됨',
      message: `새 버전 ${info.version} 을 설치할 준비가 됐습니다.`,
      detail: '지금 재시작하면 바로 적용됩니다. 나중에 고르면 앱을 종료할 때 설치합니다.',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 1,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
})
