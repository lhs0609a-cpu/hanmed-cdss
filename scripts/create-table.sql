-- clinical_cases 테이블 생성 (Supabase SQL Editor에서 실행)

-- 기존 테이블 삭제 (주의: 데이터가 모두 삭제됨)
DROP TABLE IF EXISTS clinical_cases;

-- 테이블 생성 (CSV import를 위해 VARCHAR 사용)
CREATE TABLE clinical_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sourceId" VARCHAR(100) UNIQUE NOT NULL,
    "recordedYear" INTEGER NOT NULL,
    "recorderName" VARCHAR(100),
    "patientGender" VARCHAR(20) DEFAULT 'unknown',
    "patientAgeRange" VARCHAR(50),
    "patientConstitution" VARCHAR(20) DEFAULT '미상',
    "chiefComplaint" TEXT NOT NULL,
    "presentIllness" TEXT,
    "pulseDiagnosis" VARCHAR(500),
    "tongueDiagnosis" VARCHAR(500),
    "abdominalDiagnosis" TEXT,
    "patternDiagnosis" TEXT,
    "treatmentOutcome" VARCHAR(20),
    "clinicalNotes" TEXT,
    "originalText" TEXT NOT NULL,
    "embeddingVectorId" VARCHAR(100),
    symptoms JSONB DEFAULT '[]'::jsonb,
    "herbalFormulas" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_clinical_cases_constitution ON clinical_cases("patientConstitution");
CREATE INDEX IF NOT EXISTS idx_clinical_cases_year ON clinical_cases("recordedYear");
CREATE INDEX IF NOT EXISTS idx_clinical_cases_recorder ON clinical_cases("recorderName");
CREATE INDEX IF NOT EXISTS idx_clinical_cases_gender ON clinical_cases("patientGender");

-- 확인
SELECT 'clinical_cases 테이블이 생성되었습니다.' as message;
