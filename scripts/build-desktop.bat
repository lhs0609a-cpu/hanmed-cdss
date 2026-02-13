@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   온고지신 AI 데스크톱 앱 빌드
echo ========================================
echo.

:: 프로젝트 루트로 이동
cd /d "%~dp0\.."

:: 1. 의존성 설치
echo [1/4] 의존성 설치 중...
call pnpm install
if errorlevel 1 (
    echo 의존성 설치 실패!
    pause
    exit /b 1
)

:: 2. 웹앱 빌드
echo.
echo [2/4] 웹앱 빌드 중...
cd apps\web
call pnpm build
if errorlevel 1 (
    echo 웹앱 빌드 실패!
    pause
    exit /b 1
)
cd ..\..

:: 3. 데스크톱 앱 빌드
echo.
echo [3/4] 데스크톱 앱 빌드 중...
cd apps\desktop
call pnpm build
if errorlevel 1 (
    echo 데스크톱 앱 빌드 실패!
    pause
    exit /b 1
)

:: 4. Windows 설치 파일 생성
echo.
echo [4/4] Windows 설치 파일 생성 중...
call pnpm package:win
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

:: release 폴더 열기
if exist release (
    explorer release
)

pause
