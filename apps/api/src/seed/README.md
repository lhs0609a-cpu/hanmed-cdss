# 임상 마스터 데이터 시드

운영 DB의 핵심 마스터 테이블(`formulas`, `herbs_master`, `formula_herbs`, `clinical_cases`, `drug_herb_interactions`)에 시드 데이터를 채우는 스크립트.

## 안전 장치
- 모든 시더는 **idempotent** — sourceId/name 기준으로 이미 있으면 skip
- 운영 환경(`NODE_ENV=production`)에서는 `SEED_CONFIRM=yes`를 명시적으로 설정해야 실행됨
- 데이터 정제 실패 케이스는 skip 처리하고 로그로 알림

## 사용법

### 로컬에서 운영 DB로 시드 실행 (권장)
```powershell
cd "G:\내 드라이브\developer\hanmed-cdss\apps\api"

# 1. 환경변수 — apps/api/.env.local에 운영 DATABASE_URL이 이미 있다면 자동 로드됨
# 그렇지 않으면 명시적으로:
$env:DATABASE_URL = "postgresql://..."  # Supabase 운영 URL

# 2. 운영 시드 실행 (NODE_ENV=production이면 SEED_CONFIRM도 필요)
$env:SEED_CONFIRM = "yes"
$env:NODE_ENV = "production"
pnpm seed:master all

# 또는 부분 시드
pnpm seed:master formulas       # 처방 + 약재 마스터 + formula_herbs
pnpm seed:master interactions   # 한약-양약 상호작용 (큐레이션 19건)
pnpm seed:master cases          # 치험례 7,096건 (가장 큰 작업, ~3분 소요)
```

### 시드 순서 (자동)
1. **formulas + herbs_master + formula_herbs** — 처방 데이터 + 거기서 추출한 약재 + 매핑 (가장 먼저, herbs가 다른 시드의 의존성)
2. **drug_herb_interactions** — 큐레이션 데이터, herbs가 있어야 시드됨
3. **clinical_cases** — 7,096건 치험례 (가장 큰 작업, batch INSERT)

## 데이터 출처
| 테이블 | 출처 |
|---|---|
| `formulas` | `apps/web/public/data/formulas/all-formulas.json` (6MB, 약 8000건 처방) |
| `herbs_master` | 위 처방의 composition에서 unique 추출 |
| `formula_herbs` | 처방-약재 매핑 (군신좌사는 데이터에 없어서 NULL로 시드) |
| `clinical_cases` | `apps/ai-engine/data/all_cases_combined.json` (12MB, 7,096건 실제 치험례) |
| `drug_herb_interactions` | `interactions.seeder.ts` 내장 큐레이션 (와파린, 디곡신, MAOI, 마황 등 임상 핵심 19건) |

## 실행 후 검증
Supabase SQL Editor에서:
```sql
SELECT
  (SELECT COUNT(*) FROM formulas)                AS formulas,
  (SELECT COUNT(*) FROM herbs_master)            AS herbs,
  (SELECT COUNT(*) FROM formula_herbs)           AS formula_herbs,
  (SELECT COUNT(*) FROM clinical_cases)          AS cases,
  (SELECT COUNT(*) FROM drug_herb_interactions)  AS interactions;
```

기대값:
- formulas ~7000-8000
- herbs ~1500-2500 (처방에 등장하는 unique 약재)
- formula_herbs ~50000-80000
- cases ~7000
- interactions = 19

## 주의사항
- **데이터 정제 한계**: clinical_cases의 `formula_name` 필드가 종종 약재명 또는 처방명이 아닌 잘못된 값 — 그대로 시드됨. 향후 별도 정제 필요.
- **herbs_master의 분류**: 자동 시드는 모든 약재 카테고리를 `'미분류'`로 둠. 향후 본초학 분류 별도 작업 필요.
- **상호작용 데이터**: 19건만 시드. 임상 사용을 위해선 식약처 DUR 데이터 추가 필요.
- **벡터 임베딩**: clinical_cases의 `embeddingVectorId`는 NULL. Pinecone 인덱싱은 별도 작업 (ai-engine 측).
