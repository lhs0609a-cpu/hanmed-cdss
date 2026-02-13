#!/bin/bash
# =============================================================================
# 온고지신 AI - Fly.io 배포 스크립트
# =============================================================================

set -e

APP_NAME="hanmed-api"
REGION="nrt"

echo "=== 온고지신 AI - Fly.io 배포 ==="
echo ""

# Fly CLI 확인
if ! command -v fly &> /dev/null; then
    echo "ERROR: Fly CLI가 설치되어 있지 않습니다."
    echo "설치: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# 로그인 확인
if ! fly auth whoami &> /dev/null; then
    echo "Fly.io 로그인이 필요합니다..."
    fly auth login
fi

# 프로젝트 디렉토리로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../apps/api"

echo "1. 앱 상태 확인..."
if fly status -a $APP_NAME &> /dev/null; then
    echo "   앱이 이미 존재합니다: $APP_NAME"
else
    echo "   앱 생성 중..."
    fly apps create $APP_NAME --org personal
fi

echo ""
echo "2. 시크릿 설정 확인..."
echo "   현재 설정된 시크릿:"
fly secrets list -a $APP_NAME 2>/dev/null || echo "   (없음)"
echo ""
echo "   시크릿이 설정되지 않았다면 아래 명령어로 설정하세요:"
echo "   fly secrets set -a $APP_NAME DATABASE_URL=\"postgresql://...\""
echo ""

read -p "시크릿이 모두 설정되었나요? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "=== 필수 시크릿 목록 ==="
    echo "fly secrets set -a $APP_NAME \\"
    echo "  DATABASE_URL=\"postgresql://...\" \\"
    echo "  JWT_SECRET=\"...\" \\"
    echo "  REFRESH_TOKEN_SECRET=\"...\" \\"
    echo "  ENCRYPTION_KEY=\"...\" \\"
    echo "  OPENAI_API_KEY=\"sk-...\" \\"
    echo "  TOSS_SECRET_KEY=\"live_sk_...\" \\"
    echo "  TOSS_CLIENT_KEY=\"live_ck_...\" \\"
    echo "  INTERNAL_API_KEY=\"...\" \\"
    echo "  CORS_ORIGIN=\"https://ongojisin.co.kr\" \\"
    echo "  FRONTEND_URL=\"https://ongojisin.co.kr\" \\"
    echo "  SMTP_HOST=\"smtp.gmail.com\" \\"
    echo "  SMTP_PORT=\"587\" \\"
    echo "  SMTP_USER=\"...\" \\"
    echo "  SMTP_PASS=\"...\""
    echo ""
    echo "시크릿 설정 후 다시 실행하세요."
    exit 0
fi

echo ""
echo "3. 배포 시작..."
fly deploy -a $APP_NAME

echo ""
echo "4. 배포 상태 확인..."
fly status -a $APP_NAME

echo ""
echo "5. 헬스체크..."
sleep 5
HEALTH_URL="https://$APP_NAME.fly.dev/api/v1/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ 헬스체크 성공!"
else
    echo "   ✗ 헬스체크 실패 (HTTP $HTTP_CODE)"
    echo "   로그 확인: fly logs -a $APP_NAME"
fi

echo ""
echo "=== 배포 완료! ==="
echo ""
echo "API 엔드포인트: https://$APP_NAME.fly.dev/api/v1"
echo "Swagger 문서:  https://$APP_NAME.fly.dev/api/docs"
echo ""
echo "유용한 명령어:"
echo "  fly logs -a $APP_NAME          # 로그 확인"
echo "  fly status -a $APP_NAME        # 상태 확인"
echo "  fly ssh console -a $APP_NAME   # SSH 접속"
echo "  fly scale count 2 -a $APP_NAME # 인스턴스 2개로 확장"
