#!/bin/bash
# 배포 스크립트 - git pull 후 실행

set -e

echo "=== 한의학 CDSS 배포 스크립트 ==="

# 프로젝트 루트 디렉토리
PROJECT_DIR="/home/ubuntu/hanmed-cdss"
cd $PROJECT_DIR

echo "1. 최신 코드 가져오기..."
git pull origin master

echo "2. API 의존성 설치..."
cd $PROJECT_DIR/apps/api

# node_modules가 손상된 경우를 대비해 clean install
if [ ! -d "node_modules/@nestjs/cli" ]; then
    echo "   @nestjs/cli가 없습니다. 전체 재설치..."
    rm -rf node_modules package-lock.json
    npm install
else
    npm install
fi

echo "3. API 빌드..."
npm run build

# 빌드 결과 확인
if [ ! -f "dist/main.js" ]; then
    echo "ERROR: 빌드 실패 - dist/main.js가 없습니다"
    exit 1
fi

echo "4. nginx 설정 배포..."
sudo cp $PROJECT_DIR/infra/nginx/api.ongojisin.co.kr /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/api.ongojisin.co.kr /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/ai-engine

echo "5. nginx 테스트..."
sudo nginx -t

echo "6. nginx 재시작..."
sudo systemctl reload nginx

echo "7. PM2로 API 재시작..."
cd $PROJECT_DIR/apps/api

# 기존 프로세스 삭제 후 새로 시작 (환경변수 적용을 위해)
pm2 delete api 2>/dev/null || true
pm2 start dist/main.js --name api --env production

echo "8. API 헬스체크 (10초 대기)..."
sleep 10

# 헬스체크
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>/dev/null || echo "000")
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "   API 헬스체크 성공!"
else
    echo "   WARNING: 헬스체크 실패 (HTTP $HEALTH_CHECK)"
    echo "   PM2 로그 확인:"
    pm2 logs api --lines 20 --nostream
fi

echo ""
echo "=== 배포 완료! ==="
pm2 status
echo ""
echo "API 엔드포인트: https://api.ongojisin.co.kr/api/v1"
echo "Swagger 문서: https://api.ongojisin.co.kr/api/docs"
