-- 2026-05-02: User 엔티티의 결제 식별자 컬럼을 Toss 빌링키 의미에 맞게 리네이밍.
-- 안전을 위해 컬럼이 존재할 때만 변경 (이미 적용된 환경 idempotent).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripeCustomerId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tossBillingKey'
  ) THEN
    EXECUTE 'ALTER TABLE "users" RENAME COLUMN "stripeCustomerId" TO "tossBillingKey"';
  END IF;
END
$$;
