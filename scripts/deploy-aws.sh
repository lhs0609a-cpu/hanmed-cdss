#!/bin/bash
# 온고지신 AI - AWS Lightsail 배포 스크립트
# 사용법: ./scripts/deploy-aws.sh

set -e

echo "=========================================="
echo "온고지신 AI - AWS 배포 시작"
echo "=========================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 변수 설정
DEPLOY_DIR="/home/ubuntu/hanmed-cdss"
REPO_URL="https://github.com/lhs0609a-cpu/hanmed-cdss.git"
BRANCH="master"

# 1. 시스템 업데이트
echo -e "${YELLOW}[1/7] 시스템 업데이트 중...${NC}"
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Docker 설치 (없는 경우)
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[2/7] Docker 설치 중...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo -e "${GREEN}[2/7] Docker 이미 설치됨${NC}"
fi

# 3. Docker Compose 설치 (없는 경우)
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}[3/7] Docker Compose 설치 중...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}[3/7] Docker Compose 이미 설치됨${NC}"
fi

# 4. 저장소 클론 또는 업데이트
echo -e "${YELLOW}[4/7] 소스 코드 가져오는 중...${NC}"
if [ -d "$DEPLOY_DIR" ]; then
    cd $DEPLOY_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
else
    git clone -b $BRANCH $REPO_URL $DEPLOY_DIR
    cd $DEPLOY_DIR
fi

# 5. 환경 변수 파일 확인
echo -e "${YELLOW}[5/7] 환경 변수 확인 중...${NC}"
if [ ! -f ".env.prod" ]; then
    echo -e "${RED}오류: .env.prod 파일이 없습니다.${NC}"
    echo "다음 내용으로 .env.prod 파일을 생성하세요:"
    cat << 'EOF'
# .env.prod 예시
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://hanmed-cdss.vercel.app
OPENAI_API_KEY=sk-xxx
GPT_MODEL=gpt-4o-mini
TOSS_CLIENT_KEY=live_ck_xxx
TOSS_SECRET_KEY=live_sk_xxx
EOF
    exit 1
fi

# 6. Docker 이미지 빌드 및 실행
echo -e "${YELLOW}[6/7] Docker 컨테이너 빌드 및 시작 중...${NC}"
sudo docker-compose -f docker-compose.prod.yml --env-file .env.prod down || true
sudo docker-compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache
sudo docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 7. 상태 확인
echo -e "${YELLOW}[7/7] 서비스 상태 확인 중...${NC}"
sleep 10

echo ""
echo "=========================================="
echo -e "${GREEN}배포 완료!${NC}"
echo "=========================================="
echo ""
echo "서비스 상태:"
sudo docker-compose -f docker-compose.prod.yml ps
echo ""
echo "API 엔드포인트:"
echo "  - NestJS API: http://$(curl -s ifconfig.me):3001/api/v1"
echo "  - AI Engine:  http://$(curl -s ifconfig.me):8080"
echo "  - Nginx:      http://$(curl -s ifconfig.me)"
echo ""
echo "로그 확인: sudo docker-compose -f docker-compose.prod.yml logs -f"
echo ""
