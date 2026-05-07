# 사용자가 직접 해야 할 일 (체크리스트)

> AI가 코드는 다 고쳤지만, **계정 가입/키 발급/배포**는 본인 신분으로만 가능. 아래 순서대로 진행.

---

## ☐ STEP A. `.env.local` 키 채우기

위치: `apps/api/.env.local`

### A-1. 운영자 알림 메일 (Gmail 권장 — 5분)

```bash
# 1) Gmail 2단계 인증 활성화
#    https://myaccount.google.com/security
# 2) 앱 비밀번호 발급
#    https://myaccount.google.com/apppasswords (16자리)

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=lhs0609a@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx     # 앱 비밀번호 (공백 제거)
SMTP_FROM="온고지신 AI <noreply@ongojisin.co.kr>"
ADMIN_ALERT_EMAIL=lhs0609a@gmail.com
FRONTEND_URL=https://ongojisin.co.kr
```

### A-2. SMS 인증 (NHN Cloud — 30분)

```bash
# 1) https://www.toast.com 가입 (사업자등록증 필요)
# 2) 콘솔 → Notification → SMS 활성화
# 3) 발신번호 사전 등록 (서류 검토 1-2일)
# 4) AppKey, SecretKey 복사

NHN_SMS_APP_KEY=8글자~12글자
NHN_SMS_SECRET_KEY=8글자~12글자
NHN_SMS_SEND_NO=01012345678   # 사전 등록한 번호
```

> ⚠️ 키 없어도 dev 모드는 동작 (콘솔 로그로 인증번호 확인 가능). 운영 배포 전엔 필수.

### A-3. PDF 저장 — Supabase Storage (이미 Supabase 쓰고 있으니 5분)

```bash
# 1) Supabase 대시보드 → Storage → New bucket
# 2) Bucket name: saju-reports, Public: ON
# 3) Settings → API → service_role 키 복사 (절대 공개 금지)

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_BUCKET=saju-reports
```

> ⚠️ 안 채우면 로컬 디스크 `uploads/saju/`에 저장됨. Fly.io 배포 시 볼륨 마운트 필요.

### A-4. 추가 보안 키 (이미 있으면 스킵)

```bash
# 다음 명령으로 생성:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
REFRESH_TOKEN_SECRET=...64바이트 hex...

# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=...32바이트 hex...
```

---

## ☐ STEP B. 데이터베이스 마이그레이션

```bash
cd apps/api

# (개발) 로컬 DB에 적용
pnpm migration:run

# (프로덕션) Fly.io DB에 적용 — 배포 후 1회
flyctl ssh console -a hanmed-cdss-api
cd /app && node dist/database/migrations/run-migrations.js
# 또는 flyctl proxy 5432:5432 후 로컬에서 migration:run
```

새로 추가된 마이그레이션: `1715000000000-AddAnalyticsEvents.ts` (analytics_events 테이블 생성)

---

## ☐ STEP C. 도메인/프록시 분기 결정 (택1)

`api.ongojisin.co.kr` 한 도메인에 NestJS + AI엔진(FastAPI) 둘이 못 같이 살음.

### 옵션 1) AI엔진을 별 도메인으로 분리 (권장, 30분)

```bash
# 1) Fly.io에서 AI엔진 앱이 별도 앱이라면:
flyctl certs create ai.ongojisin.co.kr -a hanmed-ai-engine
# DNS 레코드 추가 (Cloudflare/Route53 등):
# CNAME ai.ongojisin.co.kr -> hanmed-ai-engine.fly.dev

# 2) apps/web/.env.production 업데이트:
VITE_AI_ENGINE_URL=https://ai.ongojisin.co.kr
```

### 옵션 2) Nginx로 path 라우팅 (Fly.io 앞단에 nginx 두기)

복잡함. 비권장.

---

## ☐ STEP D. 로컬 통합 테스트

```bash
# 터미널 1
cd apps/api && pnpm start:dev

# 터미널 2
cd apps/web && pnpm dev

# 터미널 3 (선택, AI엔진 직접 호출 테스트용)
cd apps/ai-engine && uvicorn app.main:app --reload --port 8000
```

체크리스트:
- [ ] `http://localhost:3000` 접속 → 로그인
- [ ] 대시보드 진입 → "최근 활동" 섹션이 빈 상태/실 데이터로 뜨는지
- [ ] 환자 한 명 등록 → 진료 기록 1건 작성 → 대시보드 새로고침 → 활동 피드에 뜨는지
- [ ] AI 진료 상담 → 추천 응답 받는지 (OpenAI 키 필수)
- [ ] 케이스 공유 페이지 진입 → 목록 200 OK인지 (DB 비어있으면 빈 배열, 정상)
- [ ] 환자앱에서 휴대폰 인증 → SMS 받는지 (NHN 키 있을 때만)
- [ ] 사주 리포트 생성 → PDF URL 떨어지는지

---

## ☐ STEP E. 배포

### E-1. Fly.io secrets 등록 (env를 fly에 동기화)

```bash
cd apps/api

flyctl secrets set \
  OPENAI_API_KEY="sk-..." \
  NHN_SMS_APP_KEY="..." \
  NHN_SMS_SECRET_KEY="..." \
  NHN_SMS_SEND_NO="01012345678" \
  SMTP_HOST="smtp.gmail.com" \
  SMTP_PORT="587" \
  SMTP_USER="..." \
  SMTP_PASS="..." \
  SMTP_FROM="온고지신 AI <noreply@ongojisin.co.kr>" \
  ADMIN_ALERT_EMAIL="lhs0609a@gmail.com" \
  SUPABASE_URL="https://xxxxx.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  SUPABASE_BUCKET="saju-reports" \
  -a hanmed-cdss-api
```

### E-2. 백엔드 배포

```bash
flyctl deploy --remote-only -a hanmed-cdss-api
```

### E-3. 프론트 배포

```bash
git push origin master
# Vercel 자동 배포 (apps/web)
```

### E-4. 배포 후 마이그레이션

```bash
flyctl ssh console -a hanmed-cdss-api
# 컨테이너 안에서:
node dist/database/data-source.js  # 또는 마이그레이션 스크립트
```

---

## 🚨 절대 잊지 말 것

- `.env.local`, `.env.prod` 파일은 **절대 git에 커밋 금지** (`.gitignore` 확인)
- `SUPABASE_SERVICE_ROLE_KEY`는 **백엔드만** 사용 (프론트 노출 시 DB 전체 권한 유출)
- 토스 라이브 키 사용 중이므로 **테스트 결제도 실제 청구**됨 — 본인 카드만 사용

---

## ❓ 막힐 때

각 STEP별 문제 발생 시 클로드한테:
- "STEP A-2에서 NHN 가입은 됐는데 발신번호 등록이 막힘"
- "STEP D에서 SMS 인증 누르면 503 떨어짐"
- "STEP E-1 secrets 등록했는데 배포 후에도 dev 시뮬레이션 로그 뜸"

상세하게 물어보면 됨.
