# 온고지신 AI 데스크톱 앱

Windows · macOS 설치 파일. 사용자는 홈페이지의 [/download](https://www.ongojisin.co.kr/download)
에서 받는다.

## 이 앱이 하는 일

웹앱을 복사해 담지 않는다. 배포된 웹앱(`https://www.ongojisin.co.kr`)을 그대로 띄우는 셸이다.

그렇게 만든 이유는 두 가지다.

- **file:// 로는 동작할 수 없었다.** 웹앱은 `BrowserRouter` 를 쓴다. 설치 파일 안의
  `index.html` 을 `file://` 로 열면 `location.pathname` 이 디스크 경로라 어떤 라우트에도
  맞지 않는다. 예전 구현이 `apps/web/dist` 를 통째로 담고 있었지만, 담아봐야 열리지
  않았다.
> 운영 도메인은 `www.ongojisin.co.kr` 이다. `apps/web/index.html` 의 canonical 과
> 여러 문서에 `ongojisin.ai` 가 적혀 있지만 그 도메인은 아직 DNS 에 없다.
> 셸이 그리로 가면 앱을 켤 때마다 오프라인 화면만 뜬다.

- **어차피 서버가 필요하다.** 치험례·처방·환자 데이터는 전부 `api.ongojisin.co.kr`
  에서 온다. 오프라인으로 볼 수 있는 화면이 처음부터 없다.

덤으로, 웹에 고친 내용이 앱을 새로 배포하지 않아도 그날 반영된다. 설치 파일을
다시 내보내야 하는 때는 셸 자체(메뉴, 창, 자동 업데이트)가 바뀔 때뿐이다.

## 셸이 맡는 것

| 기능 | 내용 |
| --- | --- |
| 창 상태 기억 | 크기·위치·최대화 여부를 `userData/window-state.json` 에 남긴다. 저장된 좌표가 지금 없는 모니터를 가리키면 무시한다. |
| 단일 인스턴스 | 두 번 실행하면 이미 열린 창을 앞으로 가져온다. |
| 결제·인증 | http(s) 이동은 남의 도메인이라도 앱 안에서 연다. 구독 결제는 토스 빌링 인증으로 창을 통째로 보냈다가 `successUrl` 로 돌아오는 왕복이라, 밖으로 넘기면 카드 등록은 브라우저에서 끝나고 앱은 결제 전 화면에 멈춘다. 팝업(카드사 인증창)은 자식 창으로 연다. |
| 외부 앱 호출 | `http(s)` 가 아닌 주소(`kb-acp://` 같은 앱카드 스킴)는 반드시 OS 로 넘긴다. 앱 안에서 처리하려 들면 아무 일도 일어나지 않고 인증이 멈춘다. |
| 뒤로 가기 | 위 규칙 때문에 앱이 남의 도메인에 가 있을 수 있다. 보기 메뉴와 `Alt+←` 로 돌아온다. |
| 켤 때 같이 실행 | 처음 설치했을 때 한 번만 켠다. 그 뒤로는 OS 값이 진실이고 `온고지신 → PC 를 켤 때 같이 실행` 으로 켜고 끈다. 매번 켜면 시작 프로그램에서 꺼도 되살아나는, 끌 수 없는 프로그램이 된다. |
| 오프라인 화면 | 서버에 닿지 못하면 다시 시도 버튼이 있는 화면을 띄운다. 별도 파일이 아니라 `main/index.ts` 안의 문자열이다 — 정작 필요한 순간에 패키징에서 빠져 있으면 빈 창이 뜬다. |
| 자동 업데이트 | 새 버전을 조용히 받아두고, 다 받은 뒤 한 번만 재시작을 묻는다. |
| 버전 전달 | 실행 인자 `--app-version` 으로 렌더러에 넘긴다. 웹앱은 `window.electronAPI.appVersion` 으로 읽는다. |

## 개발

```bash
pnpm install --filter ongojishin-desktop
cd apps/desktop
pnpm dev
```

`pnpm dev` 는 `http://localhost:3000` (apps/web 의 `pnpm dev`)을 띄운다. 다른 주소를
보려면 환경 변수로 바꾼다.

```bash
ONGOJISIN_APP_URL=https://www.ongojisin.co.kr pnpm dev
```

## 설치 파일 만들기

### 정식 배포 — 태그를 민다

```bash
# 1. 버전을 올린다 (이 파일 하나가 버전의 유일한 출처다)
#    apps/desktop/package.json 의 "version"

# 2. 커밋하고 같은 번호로 태그
git commit -am "chore(desktop): v1.1.0"
git tag v1.1.0
git push && git push --tags
```

`.github/workflows/release-desktop.yml` 이 Windows·macOS 에서 빌드해 GitHub 릴리스
`v1.1.0` 에 파일을 올린다. 홈페이지의 `/download` 는 이 릴리스를 읽어 버튼을 그리므로,
워크플로가 끝나면 별도 배포 없이 바로 받을 수 있다.

> 태그와 `package.json` 의 `version` 은 반드시 같아야 한다. electron-builder 는
> `package.json` 을 보고 릴리스를 고르므로, 어긋나면 태그는 `v1.1.0` 인데 파일은
> `v1.0.0` 릴리스에 붙는다.

### 손으로 한 번 만들어보기

```bash
# Windows
scripts\build-desktop.bat

# macOS / Linux
./scripts/build-desktop.sh
```

결과물은 `apps/desktop/release/` 에 생긴다.

| 파일 | 용도 |
| --- | --- |
| `OngojisinAI-Setup-1.0.0.exe` | Windows 설치 파일 |
| `OngojisinAI-Portable-1.0.0.exe` | Windows 무설치 (설치 권한 없는 원내 PC용) |
| `OngojisinAI-1.0.0-arm64.dmg` | macOS Apple 실리콘 |
| `OngojisinAI-1.0.0-x64.dmg` | macOS 인텔 |
| `OngojisinAI-1.0.0-*.zip` | macOS 자동 업데이트용. 사람이 받는 파일이 아니다 — electron-updater 는 맥에서 dmg 로는 업데이트하지 못하고 zip 만 읽는다. dmg 만 올리면 맥 사용자는 새 버전을 손으로 받아야 한다. |
| `latest.yml` / `latest-mac.yml` | 자동 업데이트가 읽는 메타데이터 |

Windows 설치 파일은 설치 마법사(경로 선택 · 바탕화면/시작 메뉴 아이콘 · 제어판의
프로그램 제거 등록)이고, 마지막 화면의 "실행" 체크가 기본으로 켜져 있어 설치가
끝나면 바로 앱이 뜬다. Inno Setup 이 아니라 NSIS 로 만든다 — electron-builder 가
지원하는 형식이 NSIS 이고, 사용자가 겪는 흐름은 같다.

파일 이름을 바꾸면 `apps/web/src/config/version.ts` 의 `DOWNLOAD_TARGETS` 도 같이
바꿔야 한다. 다운로드 페이지가 이 이름으로 릴리스 자산을 찾는다.

## 알아둘 것

**코드 서명이 없다.** 인증서를 아직 붙이지 않았다.

- Windows: 처음 실행할 때 "Windows의 PC 보호" 경고가 뜬다. [추가 정보] → [실행].
- macOS: 공증 전이라 첫 실행은 아이콘 우클릭 → [열기].

두 경우 모두 `/download` 페이지의 설치 안내에 적어두었다. 인증서를 구하면
`CSC_LINK` / `CSC_KEY_PASSWORD` (Windows), `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD`
(macOS) 를 릴리스 워크플로의 시크릿에 넣고, 워크플로의
`CSC_IDENTITY_AUTO_DISCOVERY: false` 를 지우면 된다.

**`electronVersion` 이 설정에 박혀 있다.** 이 레포의 `.npmrc` 는 `node-linker=hoisted`
라 모든 패키지가 레포 루트 `node_modules` 에만 놓인다. electron-builder 는
`apps/desktop/node_modules` 에서 electron 을 찾으므로 설치돼 있어도 못 찾고
`Cannot compute electron version` 으로 멈춘다. 그래서 `build.electronVersion` 에
버전을 직접 적었다 — **`devDependencies.electron` 을 올릴 때 이 값도 같이 올려야
한다.**

**`npmRebuild: false` 와 빈 `dependencies` 는 일부러 그렇게 두었다.** 이 레포에서
electron-builder 를 그냥 돌리면 앱 폴더에 `node_modules` 가 없는 것을 보고
"프로덕션 의존성을 설치" 단계로 들어간다. 그 단계가 워크스페이스 루트에서
개발 의존성을 걷어내 버려서, electron-builder 가 실행 도중 자기 자신과
`7zip-bin` 을 지우고 `ENOENT ... 7za.exe` 로 죽는다. 실행에 필요한 코드는
전부 `out/` 번들 안에 있으므로(electron.vite.config.ts 참고) 그 단계는 필요 없다.

**dmg 볼륨 이름은 ASCII 이고 배경은 단색이다.** 처음에는 `온고지신 AI ${version}`
으로 두고 기본 배경을 썼는데, GitHub 맥 러너에서 dmg 빌드가
`FileNotFoundError: /Volumes/온고지신 AI 1.0.0/.background/background.tiff` 로
죽었다. dmg-builder 가 마운트된 볼륨에 배경 이미지를 깔고 파이썬 `mac_alias`
로 다시 읽는데, 한글이 섞인 볼륨 경로에서 그 왕복이 어긋난다. 볼륨 이름을
ASCII 로 바꾸고 `backgroundColor` 를 줘서 이미지 합성 단계를 아예 건너뛴다.
설치 창에 보이는 앱 이름은 `productName`(한글) 그대로다.

색상은 **반드시 소문자**로 적어야 한다. dmgbuild 의 파서는
`#([0-9a-f]{3}(?:[0-9a-f]{3})?)$` 로 대소문자를 가린다 —
`#05070D` 로 적었다가 `ValueError: bad color syntax` 로 맥 잡이 한 번 더
죽었다. (`node_modules/dmg-builder/vendor/dmgbuild/colors.py`)

**아이콘은 `resources/icon.png` 하나다.** electron-builder 가 여기서 `.ico` 와
`.icns` 를 만들어 쓴다. `apps/web/public/icon-512.png` 와 같은 그림이다.
