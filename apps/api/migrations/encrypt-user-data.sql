-- 2026-05-03: user_data.data 컬럼을 암호화 가능한 text로 변경하고 isEncrypted 플래그 추가.
-- 기존 행은 isEncrypted=false 상태로 유지되며, 다음 saveData() 호출 시 자동 암호화된다.
DO $$
BEGIN
  -- isEncrypted 컬럼 추가 (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_data' AND column_name = 'isEncrypted'
  ) THEN
    EXECUTE 'ALTER TABLE "user_data" ADD COLUMN "isEncrypted" boolean NOT NULL DEFAULT false';
  END IF;

  -- data 컬럼이 json/jsonb이면 text로 변경 (기존 JSON은 그대로 텍스트화되어 평문으로 보존)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_data'
      AND column_name = 'data'
      AND data_type IN ('json', 'jsonb')
  ) THEN
    EXECUTE 'ALTER TABLE "user_data" ALTER COLUMN "data" TYPE text USING "data"::text';
  END IF;
END
$$;
