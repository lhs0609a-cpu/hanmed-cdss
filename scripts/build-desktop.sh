#!/bin/bash

# 온고지신 AI 데스크톱 앱 빌드 스크립트

set -e

echo "🏗️ 온고지신 AI 데스크톱 앱 빌드 시작..."

# 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 1. 의존성 설치
echo "📦 의존성 설치 중..."
pnpm install

# 2. 웹앱 빌드
echo "🌐 웹앱 빌드 중..."
cd apps/web
pnpm build
cd "$PROJECT_ROOT"

# 3. 데스크톱 앱 빌드
echo "🖥️ 데스크톱 앱 빌드 중..."
cd apps/desktop
pnpm build

# 4. 패키징
echo "📦 설치 파일 생성 중..."

# OS에 따라 빌드
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS 빌드..."
    pnpm package:mac
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "🪟 Windows 빌드..."
    pnpm package:win
else
    echo "🐧 Linux 빌드... (Windows/Mac 크로스 빌드)"
    pnpm package:all
fi

echo ""
echo "✅ 빌드 완료!"
echo "📁 설치 파일 위치: apps/desktop/release/"
ls -la release/ 2>/dev/null || echo "release 폴더를 확인하세요."
