# 온고지신 AI — 운영(Ops) SOP

의료 SaaS 운영에 필요한 표준 절차서. **새벽 3시 장애 발생 시 이 문서만 보고 대응할 수 있도록** 구체적으로 작성한다.

## 문서 색인

| 파일 | 용도 | 트리거 |
| --- | --- | --- |
| [deploy.md](deploy.md) | 정상 배포 절차 | 신규 릴리스 / 핫픽스 |
| [rollback.md](rollback.md) | 롤백 절차 | 배포 후 회귀/장애 |
| [db-backup-restore.md](db-backup-restore.md) | PostgreSQL 백업·복구 | 매일 자동 + 장애 시 수동 |
| [incident-response.md](incident-response.md) | 인시던트 대응 플로우 | P0/P1 장애 |
| [oncall.md](oncall.md) | 온콜 로테이션·연락 | 24/7 모니터링 |

## 운영 환경 한눈에 보기

- **Web (apps/web)** — Vercel 자동 배포. `master` push 시 production 갱신
- **API (apps/api)** — Fly.io 수동 배포. `flyctl deploy --remote-only --config apps/api/fly.toml`
- **AI Engine (apps/ai-engine)** — Fly.io. `flyctl deploy --remote-only --config apps/ai-engine/fly.toml`
- **DB** — Supabase Postgres (관리형, PITR 활성화)
- **Redis** — Upstash (관리형)
- **API Base URL** — `https://api.ongojisin.co.kr/api/v1`

## 권한 매트릭스 (배포 가능자)

| 환경 | 승인자 | 실행자 |
| --- | --- | --- |
| dev | 본인 | 본인 |
| staging | 본인 | 본인 |
| production | 대표 + 임상 자문 한의사 | 대표 |

## 운영 변경 시 필수 체크리스트

- [ ] 변경 사항이 임상 안전 로직(grounding, interactions, prescriptions)을 건드리지 않는다 — 건드린다면 [incident-response.md](incident-response.md) §6 의 임상 검증 절차 동반
- [ ] DB 마이그레이션이 있다면 staging 에서 1회 이상 재현 완료
- [ ] 시크릿 변경이라면 `validateSecrets` 가드 통과 확인 (CHANGE_ME / test_ 접두사 금지)
- [ ] 모니터링 대시보드(Sentry, Fly metrics) 30분 이상 관찰
