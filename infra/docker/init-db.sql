-- 온고지신 AI CDSS 초기 데이터베이스 설정

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 기본 스키마 생성
CREATE SCHEMA IF NOT EXISTS hanmed;

-- 권한 설정
GRANT ALL PRIVILEGES ON SCHEMA hanmed TO hanmed;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hanmed TO hanmed;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hanmed TO hanmed;

-- 검색 경로 설정
ALTER DATABASE hanmed_cdss SET search_path TO hanmed, public;

-- 초기화 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '온고지신 AI 데이터베이스 초기화 완료';
END $$;
