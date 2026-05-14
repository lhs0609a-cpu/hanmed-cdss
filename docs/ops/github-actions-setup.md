# GitHub Actions 운영 자동화 — 1회 셋업

이 문서대로 한 번만 셋업하면, 그 후엔 **GitHub 웹에서 버튼 한 번**으로 배포·마이그레이션·임베딩이 자동 실행됩니다.

## 한 번만 해야 하는 셋업

### 1) Fly.io API 토큰 발급

로컬 PowerShell 에서:
```powershell
flyctl auth token
```
출력된 토큰(긴 문자열)을 복사.

### 2) OpenAI API 키 발급

<https://platform.openai.com/api-keys> → "Create new secret key" → 복사.
(무료 크레딧이 없으면 결제 수단 등록 + $5 충전. 임베딩 6,454건 실제 비용은 ~$0.10)

### 3) GitHub Secrets 등록

레포 페이지 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

두 개 등록:

| Name | Value |
| --- | --- |
| `FLY_API_TOKEN` | 위 1번에서 복사한 토큰 |
| `OPENAI_API_KEY` | 위 2번에서 복사한 키 |

---

## 실행 — 매번

레포 → **Actions** 탭 → 왼쪽 사이드바에서 **"Ops · Deploy + Migrate + Embed"** 선택 → **Run workflow** 버튼 클릭.

옵션:
- **deploy_api** — hanmed-api 재배포 (기본 ON)
- **deploy_ai_engine** — hanmed-ai-engine 재배포 (기본 ON)
- **run_migration** — DB 마이그레이션 (기본 ON, 멱등)
- **embedding** — 모드 선택:
  - `skip` — 임베딩 안 함
  - `dry-run-only` — 5건만 시험 (기본)
  - `full` — 전체 6,454건 (~$0.10, ~5분)

처음에는 `dry-run-only` 로 실행해서 결과 확인. 5건 임베딩이 정상이면 다시 실행할 때 `full` 선택.

---

## 워크플로 구조

```
deploy   →   migrate   →   embed-dry-run   →   embed-full
  (1·2)        (3)              (4)                 (5)
```

각 단계는 이전 단계가 성공해야 시작. 어느 단계든 실패하면 거기서 멈춤.

`done` job 이 마지막에 요약을 GitHub Actions Summary 에 출력.

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| `Error: not authenticated` | FLY_API_TOKEN 미설정/만료 | 1번 단계 재실행 + Secret 갱신 |
| `Error: app hanmed-api not found` | Fly.io 계정이 토큰 소유자가 아님 | 본인 계정에서 토큰 재발급 |
| `OpenAI 401` | OPENAI_API_KEY 오타/만료 | 키 재발급 후 Secret 갱신 |
| migration "already exists" | 이미 마이그됨 | 정상 (멱등) — 스킵 |
| embedding 0건 | embedded_at IS NOT NULL 만 있음 (재임베딩 X) | `--reembed` 옵션 추가 필요 (워크플로 변경 또는 컨테이너 SSH) |

---

## 보너스: master 푸시 시 자동 배포

`.github/workflows/deploy-backend.yml` 가 `apps/api/**` 변경 시 자동으로 `hanmed-api` 만 배포합니다 (AI Engine 은 수동). 코드만 푸시하면 알아서 배포되므로 일상 워크플로는 더 간단.
