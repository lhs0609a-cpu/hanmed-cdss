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
npm install --production

echo "3. API 빌드..."
npm run build

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
pm2 restart api 2>/dev/null || pm2 start dist/main.js --name api

echo "=== 배포 완료! ==="
pm2 status
