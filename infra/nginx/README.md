# Nginx Configuration

## api.ongojisin.co.kr

이 설정 파일은 API 서버의 nginx 설정입니다.

### 라우팅
- `/api/v1/*` → NestJS API (port 3001)
- `/` → AI Engine (port 8080)

### 배포 방법

```bash
# 1. 설정 파일 복사
sudo cp api.ongojisin.co.kr /etc/nginx/sites-available/

# 2. 기존 ai-engine 사이트 비활성화 (중복 방지)
sudo rm -f /etc/nginx/sites-enabled/ai-engine

# 3. 새 설정 활성화
sudo ln -sf /etc/nginx/sites-available/api.ongojisin.co.kr /etc/nginx/sites-enabled/

# 4. 설정 테스트
sudo nginx -t

# 5. nginx 재시작
sudo systemctl reload nginx
```

### SSL 인증서
Let's Encrypt 인증서가 필요합니다:
```bash
sudo certbot --nginx -d api.ongojisin.co.kr
```
