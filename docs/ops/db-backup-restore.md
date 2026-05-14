# DB 백업·복구 SOP

## 데이터 분류 (의료법·개인정보보호법)

| 분류 | 예시 | 암호화 | 보존 기간 |
| --- | --- | --- | --- |
| 환자 식별정보 | 이름, 휴대전화, 주민번호 | AES-256-GCM (`encryption.service`) | 진료기록 10년 |
| 진료·처방 기록 | SOAP, 처방전 | 컬럼 암호화 | 10년 |
| 시스템 로그 | API 호출, 에러 | 원본 보관 (PII 마스킹 후) | 1년 |

## 1. 자동 백업 (Supabase)

Supabase Pro 플랜 기본:
- **PITR (Point-in-Time Recovery)** — 최근 7일 모든 시점 복구 가능
- **Daily snapshot** — 30일 보관

확인: <https://supabase.com/dashboard/project/<project-id>/settings/database> → "Backups"

## 2. 수동 백업 (배포 직전)

위험한 마이그레이션 직전엔 수동 백업 한 번 더:

```bash
# Supabase CLI
supabase db dump --db-url "$DATABASE_URL" -f backups/pre-deploy-$(date +%Y%m%d-%H%M).sql

# 또는 pg_dump 직접
pg_dump --no-owner --no-acl --format=custom \
  "$DATABASE_URL" > backups/pre-deploy-$(date +%Y%m%d-%H%M).dump
```

백업 파일은 환자 PII 포함 가능 — **공용 클라우드 업로드 금지**.
회사 암호화 외장 디스크 또는 회사 전용 S3 KMS 버킷에만 보관.

## 3. 마이그레이션 롤백 SQL

각 TypeORM 마이그레이션 파일에 `down()` 메서드가 존재해야 함.
운영에서 마이그레이션 되돌릴 때:

```bash
# 1) 한 단계 되돌리기
pnpm --filter @hanmed/api migration:revert

# 2) 특정 시점까지
pnpm --filter @hanmed/api migration:revert -- --to <migration-name>
```

⚠️ 컬럼 DROP 이 들어간 마이그레이션은 데이터 손실. **반드시 사전 백업** 후 진행.

## 4. 복구 절차

### 4.1. 시점 복구 (PITR)

소요: 10~30분. 권장 — DB 일부 깨졌을 때.

1. Supabase 대시보드 → Database → Backups → "Restore to point in time"
2. 타겟 시점 선택 (장애 직전, UTC 기준 입력)
3. 복구 완료까지 API/AI Engine 차단 (Fly scale 0)
4. 복구 후 connection string 변경 시 `DATABASE_URL` secret 업데이트

### 4.2. 스냅샷 복구

소요: 1~2시간. 사용 — PITR 윈도 벗어난 경우.

1. Supabase 대시보드 → Backups → 일자 선택 → Restore
2. 신규 DB 인스턴스에 복구됨 → `DATABASE_URL` 갱신 필요

## 5. 복구 후 검증

```sql
-- 마지막 진료 기록 확인
SELECT MAX(created_at) FROM consultations;

-- 환자 수 카운트
SELECT COUNT(*) FROM patients;

-- 처방 기록 카운트
SELECT COUNT(*) FROM prescriptions;
```

복구 시점과 카운트 비교해서 데이터 손실분 산정 → 사용자 공지 의무 (개인정보보호법 §34, 72시간 내 신고).

## 6. 정기 복구 훈련

분기 1회, staging 환경에서 운영 백업으로 복구 테스트.
체크리스트: `docs/ops/dr-drill-checklist.md` (TODO — 1차 훈련 후 작성).
