#!/bin/bash

# 온고지신 AI 데스크톱 설치 파일을 내 PC 에서 만든다.
#
# 데스크톱 앱은 웹앱을 담지 않고 배포된 웹앱(https://ongojisin.ai)을 띄우는
# 셸이다. 그래서 apps/web 을 먼저 빌드할 필요가 없다 — 예전 스크립트는
# 그러고 있었는데, 몇 분을 쓰고 만든 결과물이 설치 파일에 들어가지 않았다.
#
# 정식 배포는 이 스크립트가 아니라 태그를 미는 것으로 한다:
#   git tag v1.1.0 && git push --tags   → .github/workflows/release-desktop.yml
# 이 스크립트는 손에 든 PC 에서 시험 삼아 만들어볼 때 쓴다.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "📦 의존성 확인..."
pnpm install --filter ongojishin-desktop

cd apps/desktop

echo "🖥️  셸 빌드..."
pnpm build

echo "📦 설치 파일 생성..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    pnpm exec electron-builder --mac -p never
else
    pnpm exec electron-builder --win -p never
fi

echo ""
echo "✅ 완료 — apps/desktop/release/"
ls -la release/ 2>/dev/null || true
