# 배포 절차서 (Deploy SOP)

## 0. 사전 체크

- [ ] `master` 가 CI green
- [ ] 임상 안전 로직(grounding/interactions/prescriptions) 변경 시 pytest `apps/ai-engine/tests/` 통과
- [ ] DB 마이그레이션 SQL 검토 완료 (롤백 SQL 함께)
- [ ] `.env.production` 시크릿이 placeholder(CHANGE_ME, your-, test_) 가 아닌지 재확인

## 1. 웹 (apps/web) — Vercel 자동 배포

```bash
git checkout master
git pull --ff-only
# master 에 머지된 커밋은 Vercel 이 자동 배포
```

Vercel 대시보드: <https://vercel.com/> → hanmed-cdss → Deployments

확인 사항:
- [ ] Build success
- [ ] Preview URL 에서 로그인 → 대시보드 1분 클릭 테스트
- [ ] Sentry 첫 5분 에러 증가 없음

## 2. API (apps/api) — Fly.io 수동 배포

```bash
# 1) 로그인 확인
flyctl auth whoami

# 2) 빌드 + 배포 (remote builder)
flyctl deploy --remote-only --config apps/api/fly.toml

# 3) 헬스체크
curl -fsS https://api.ongojisin.co.kr/api/v1/health
```

마이그레이션 동시 배포 시:
- TypeORM 마이그레이션은 부팅 시 자동 실행되도록 설정되어 있음
- 배포 후 Fly 로그에서 `Migration <name> has been executed successfully` 확인

```bash
flyctl logs -a hanmed-api | grep -i migration
```

## 3. AI 엔진 (apps/ai-engine) — Fly.io

```bash
flyctl deploy --remote-only --config apps/ai-engine/fly.toml

# 헬스체크
curl -fsS https://ai.ongojisin.co.kr/health
```

⚠️ Fly auto-stop 정책으로 백그라운드 수집 작업이 죽을 수 있음
([memory/ai_engine_fly_constraints.md](../../memory/ai_engine_fly_constraints.md) 참조).
배포 직후 30분 내 수집 잡이 재개되는지 로그 확인.

## 4. 배포 후 30분 관찰

다음 신호 중 하나라도 발생하면 즉시 [rollback.md](rollback.md):

- Sentry 에러율 평소 대비 2배 이상
- `/api/v1/health` 5xx
- AI 엔진 응답 p95 > 10s
- 한의사 사용자 1명 이상이 "처방이 안 떠요" 류 신고

## 5. 알림

운영 슬랙 #releases 채널에 배포 완료 + 변경 요약 + Sentry/Fly 모니터링 링크 포스팅.
