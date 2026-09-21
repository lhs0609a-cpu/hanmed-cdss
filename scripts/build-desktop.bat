@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 온고지신 AI 데스크톱 설치 파일을 내 PC 에서 만든다.
REM
REM 데스크톱 앱은 웹앱을 담지 않고 배포된 웹앱(https://ongojisin.ai)을 띄우는
REM 셸이다. 그래서 apps\web 을 먼저 빌드할 필요가 없다 - 예전 스크립트는
REM 그러고 있었는데, 몇 분을 쓰고 만든 결과물이 설치 파일에 들어가지 않았다.
REM
REM 정식 배포는 태그를 미는 것으로 한다:
REM   git tag v1.1.0 ^&^& git push --tags
REM 이 스크립트는 손에 든 PC 에서 시험 삼아 만들어볼 때 쓴다.

echo.
echo ========================================
echo   온고지신 AI 데스크톱 앱 빌드
echo ========================================
echo.

cd /d "%~dp0\.."

echo [1/3] 의존성 확인 중...
call pnpm install --filter ongojishin-desktop
if errorlevel 1 (
    echo 의존성 설치 실패!
    pause
    exit /b 1
)

cd apps\desktop

echo.
echo [2/3] 셸 빌드 중...
call pnpm build
if errorlevel 1 (
    echo 빌드 실패!
    pause
    exit /b 1
)

echo.
echo [3/3] Windows 설치 파일 생성 중...
call pnpm exec electron-builder --win -p never
if errorlevel 1 (
    echo 패키징 실패!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   빌드 완료!
echo ========================================
echo.
echo 설치 파일 위치: apps\desktop\release\
echo.

if exist release (
    explorer release
)

pause
