# 롤백 절차서 (Rollback SOP)

## 언제 롤백하는가

다음 중 하나라도 해당되면 **즉시 롤백**(원인 분석은 그 다음). 의료 SW 는 1분이라도 잘못된 처방 정보를 노출하면 환자 안전 직결.

- 임상 안전 로직 회귀 — 임산부 금기 차단 실패, CRITICAL 상호작용 미탐지, 그라운딩 비활성화
- 결제 실패율 5% 초과 (정상은 0.5% 이하)
- API 5xx 비율 1% 초과
- 한의사 사용자 신고 "처방이 잘못 떴다" 1건 이상

## 1. 웹 (Vercel)

```bash
# Vercel 대시보드 → Deployments → 직전 안정 빌드 → "Promote to Production"
# CLI 로도 가능:
vercel rollback <previous-deployment-url>
```

소요: ~30초. 사용자 영향 없음(CDN 즉시 전환).

## 2. API (Fly.io)

```bash
# 1) 직전 릴리스 확인
flyctl releases -a hanmed-api

# 2) 롤백 (이전 버전 번호로)
flyctl releases rollback <version> -a hanmed-api

# 3) 헬스체크
curl -fsS https://api.ongojisin.co.kr/api/v1/health
```

DB 마이그레이션이 함께 배포된 경우 — **단순 코드 롤백만으론 부족**.
스키마가 새 버전을 가정한 상태에서 구 코드를 돌리면 컬럼 mismatch 로 5xx 폭증.
이 경우 [db-backup-restore.md](db-backup-restore.md) 의 §3 마이그레이션 역방향 SQL 부터 실행.

## 3. AI 엔진

```bash
flyctl releases rollback <version> -a hanmed-ai-engine
```

## 4. 롤백 후 검증

- [ ] `/api/v1/health` 200
- [ ] 로그인 → 처방 추천 1회 성공
- [ ] 임산부 시나리오: 임신=true + 반하 포함 처방 → 차단 확인
- [ ] CRITICAL 시나리오: 와파린 + 당귀 → CRITICAL 표시 확인

## 5. 사후 (Postmortem)

24시간 내 작성:

1. 타임라인 (배포 → 첫 증상 → 신고 → 롤백)
2. 영향 범위 (피해 사용자 수, 잘못된 응답 건수)
3. 근본 원인
4. 재발 방지책

`docs/ops/postmortems/YYYY-MM-DD-<제목>.md` 에 저장.
