-- 2026-05-03: 사용자 2FA(TOTP) 컬럼 추가. idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is2faEnabled'
  ) THEN
    EXECUTE 'ALTER TABLE "users" ADD COLUMN "is2faEnabled" boolean NOT NULL DEFAULT false';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'totpSecretEncrypted'
  ) THEN
    EXECUTE 'ALTER TABLE "users" ADD COLUMN "totpSecretEncrypted" text';
  END IF;
END
$$;
