-- 2026-05-03: 2FA 백업 코드 컬럼 추가. idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'twoFaBackupCodesEncrypted'
  ) THEN
    EXECUTE 'ALTER TABLE "users" ADD COLUMN "twoFaBackupCodesEncrypted" text';
  END IF;
END
$$;
