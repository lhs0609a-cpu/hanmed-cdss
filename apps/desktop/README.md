# 온고지신 AI 데스크톱 앱

Windows 및 macOS용 데스크톱 애플리케이션입니다.

## 빌드 방법

### 1. 의존성 설치

```bash
# 프로젝트 루트에서
pnpm install
```

### 2. 웹앱 빌드 (먼저 실행)

```bash
cd apps/web
pnpm build
```

### 3. 데스크톱 앱 빌드

```bash
cd apps/desktop

# 개발 모드
pnpm dev

# 프로덕션 빌드
pnpm build

# Windows 설치 파일 생성
pnpm package:win

# macOS 설치 파일 생성
pnpm package:mac

# 모든 플랫폼 빌드
pnpm package:all
```

### 4. 출력 파일

빌드된 설치 파일은 `apps/desktop/release/` 폴더에 생성됩니다:

- **Windows**:
  - `온고지신 AI-1.0.0-Windows-Setup.exe` (설치 파일)
  - `온고지신 AI-1.0.0-Windows-Portable.exe` (휴대용)

- **macOS**:
  - `온고지신 AI-1.0.0-Mac.dmg`

## 기능

- 웹앱의 모든 기능 사용 가능
- 자동 업데이트 지원
- 오프라인 사용 (캐시된 데이터)
- 네이티브 메뉴 및 단축키
- 시스템 트레이 지원 (향후 추가 예정)

## 개발 참고

- Electron 28.x 사용
- electron-vite로 빌드 구성
- electron-builder로 패키징

## 아이콘 설정

배포 전 아이콘 파일을 `resources/` 폴더에 추가하세요:

- `icon.ico` - Windows용 (256x256 이상)
- `icon.icns` - macOS용
- `icon.png` - 기타 용도 (512x512 권장)
