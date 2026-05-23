# Fuzz / 검증 도구

출시 전 기능 검증용 퍼즈 하니스 모음.

## 1. 순수 로직 퍼즈 (지금 바로 실행 가능, DB 불필요)

`pure-logic.fuzz.cjs` — 안전이 중요한 순수 함수에 임의/악성 입력을 다량 주입하고
"절대 깨지면 안 되는" 불변식을 검사한다 (크래시·PII 누출·타입오류 0 확인).

대상: `anonymizePatientText`(PHI 비식별), `isPostSafeForCommunity`(의료광고 차단),
`maskPatientName`, `maskAgeToDecade`, `formatStatNumber/Approx`, `processTranscriptToSOAP`(SOAP).

### 실행
```bash
# 1) 순수 모듈을 JS 로 컴파일 (재생성 가능, _lib 는 gitignore)
cd <repo-root>
npx --prefix apps/web tsc \
  apps/web/src/lib/patientPii.ts \
  apps/web/src/config/stats.config.ts \
  apps/web/src/lib/soapClassifier.ts \
  --outDir tools/fuzz/_lib --module commonjs --target es2020 --skipLibCheck --moduleResolution node

# 2) 실행 (각 함수 1000회 + 엣지케이스)
node tools/fuzz/pure-logic.fuzz.cjs
```

## 2. DB 포함 엔드포인트 퍼즈 + E2E (일회용 테스트 DB 필요)

⚠️ **운영 Supabase DB 로는 절대 실행하지 말 것.** `NODE_ENV=development` + `synchronize`
조합이라 운영 스키마가 변경될 수 있다. 반드시 **일회용 staging DB** 를 쓸 것.

### 준비
1. 일회용 Postgres 준비 — 다음 중 하나:
   - 새 Supabase 무료 프로젝트("hanmed-staging") → Settings → Database → Connection string
   - 로컬 Postgres (`createdb hanmed_test`)
2. `apps/api/.env.test.example` → `apps/api/.env.test` 로 복사 후 `DATABASE_URL` 채우기.
   (빈 DB 라도 부팅 시 마이그레이션이 자동 적용되어 스키마가 생성됨)

### 실행 (DB 준비되면)
```bash
cd apps/api
npm i -D supertest @types/supertest          # 1회
# 엔드포인트 퍼즈/E2E 스펙을 test/*.e2e-spec.ts 로 작성 후:
NODE_ENV=test npm run test:e2e
```

프런트 E2E (Playwright, 백엔드 떠 있어야 함):
```bash
cd apps/web
BASE_URL=http://localhost:5173 npm run test:e2e
```

### 퍼즈 계획 (테스트 DB 확보 시 구현)
- `Test.createTestingModule({ imports: [AppModule] })` + supertest 로 부팅
- demo-login 으로 토큰 발급 → 인증 필요 엔드포인트에 주입
- 각 엔드포인트(auth/patients/community/prescriptions/analytics/subscription)에
  임의값 100회씩 — 5xx/크래시/검증우회 발생 시 보고
- Playwright 7개 스펙(demo-login, clinical-search, patient-flow, dashboard-navigation,
  logout, auth, medical-disclaimer) 실행
