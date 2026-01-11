import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import json
import uuid
import re
from datetime import datetime

# Supabase PostgreSQL 연결 정보
DB_CONFIG = {
    'host': 'db.bbwnroljrrbwnewmamno.supabase.co',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'goqudeo1004!'
}

# 엑셀 파일 경로
EXCEL_PATH = r"G:\내 드라이브\developer\hanmed-cdss\치험례\word\#이종대_선생님_치험례 6.000건.밴드 (2001.0.00-2025.10.24).xlsx"

def parse_gender(gender_str):
    """성별 문자열을 enum 값으로 변환"""
    if pd.isna(gender_str):
        return 'unknown'
    gender = str(gender_str).strip()
    if gender == '남':
        return 'male'
    elif gender == '여':
        return 'female'
    return 'unknown'

def parse_constitution(constitution_str):
    """사상체질 문자열 정규화"""
    if pd.isna(constitution_str):
        return '미상'
    constitution = str(constitution_str).strip()
    valid_types = ['태양인', '태음인', '소양인', '소음인']
    if constitution in valid_types:
        return constitution
    return '미상'

def extract_year(date_val):
    """작성일에서 연도 추출"""
    if pd.isna(date_val):
        return 2020  # 기본값
    try:
        if isinstance(date_val, datetime):
            return date_val.year
        date_str = str(date_val)
        # YYYY-MM-DD 형식
        match = re.match(r'(\d{4})', date_str)
        if match:
            return int(match.group(1))
    except:
        pass
    return 2020

def parse_symptoms(main_symptom, sub_symptom, ref_symptom):
    """증상들을 JSON 배열로 변환"""
    symptoms = []

    for symptom_text in [main_symptom, sub_symptom, ref_symptom]:
        if pd.isna(symptom_text):
            continue
        text = str(symptom_text).strip()
        if not text:
            continue

        # 간단히 줄바꿈이나 번호로 분리
        lines = re.split(r'\n|\d+\.', text)
        for line in lines:
            line = line.strip()
            if len(line) > 3:  # 너무 짧은 건 제외
                symptoms.append({
                    'name': line[:200],  # 최대 200자
                    'severity': None,
                    'duration': None,
                    'bodyPart': None
                })

    return symptoms[:20]  # 최대 20개

def parse_herbal_formulas(prescription_name, medication_detail):
    """처방 정보를 JSON 배열로 변환"""
    formulas = []

    if not pd.isna(prescription_name):
        formula_name = str(prescription_name).strip()
        if formula_name:
            formulas.append({
                'formulaName': formula_name,
                'herbs': [],
                'dosage': None
            })

    return formulas

def safe_text(val, max_length=None):
    """안전한 텍스트 변환"""
    if pd.isna(val):
        return None
    text = str(val).strip()
    if not text:
        return None
    if max_length:
        text = text[:max_length]
    return text

def main():
    print("=" * 60)
    print("치험례 데이터 DB 삽입 시작")
    print("=" * 60)

    # 엑셀 파일 읽기
    print("\n1. 엑셀 파일 읽는 중...")
    df = pd.read_excel(EXCEL_PATH, sheet_name='11년치 치험례 업그레이드2.0')
    print(f"   총 {len(df)} 건의 데이터 로드 완료")

    # DB 연결
    print("\n2. 데이터베이스 연결 중...")
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    print("   연결 성공!")

    # clinical_cases 테이블 존재 확인
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'clinical_cases'
        );
    """)
    table_exists = cursor.fetchone()[0]

    if not table_exists:
        print("\n3. clinical_cases 테이블 생성 중...")
        cursor.execute("""
            CREATE TYPE gender_enum AS ENUM ('male', 'female', 'unknown');
            CREATE TYPE constitution_enum AS ENUM ('태양인', '태음인', '소양인', '소음인', '미상');
            CREATE TYPE outcome_enum AS ENUM ('완치', '호전', '불변', '악화');

            CREATE TABLE clinical_cases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "sourceId" VARCHAR(100) UNIQUE NOT NULL,
                "recordedYear" INTEGER NOT NULL,
                "recorderName" VARCHAR(100),
                "patientGender" gender_enum DEFAULT 'unknown',
                "patientAgeRange" VARCHAR(50),
                "patientConstitution" constitution_enum,
                "chiefComplaint" TEXT NOT NULL,
                "presentIllness" TEXT,
                "pulseDiagnosis" VARCHAR(500),
                "tongueDiagnosis" VARCHAR(500),
                "abdominalDiagnosis" TEXT,
                "patternDiagnosis" VARCHAR(500),
                "treatmentOutcome" outcome_enum,
                "clinicalNotes" TEXT,
                "originalText" TEXT NOT NULL,
                "embeddingVectorId" VARCHAR(100),
                symptoms JSONB,
                "herbalFormulas" JSONB,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX idx_clinical_cases_constitution ON clinical_cases("patientConstitution");
            CREATE INDEX idx_clinical_cases_year ON clinical_cases("recordedYear");
            CREATE INDEX idx_clinical_cases_recorder ON clinical_cases("recorderName");
        """)
        conn.commit()
        print("   테이블 생성 완료!")
    else:
        print("\n3. clinical_cases 테이블이 이미 존재합니다.")
        # 기존 데이터 수 확인
        cursor.execute("SELECT COUNT(*) FROM clinical_cases")
        existing_count = cursor.fetchone()[0]
        print(f"   기존 데이터: {existing_count} 건")

    # 데이터 변환 및 삽입
    print("\n4. 데이터 변환 및 삽입 중...")

    inserted = 0
    skipped = 0
    errors = 0

    for idx, row in df.iterrows():
        try:
            # sourceId 생성
            record_num = row.get('번호', idx + 1)
            year = extract_year(row.get('작성일'))
            source_id = f"LEE-{year}-{record_num:04d}"

            # 원본 텍스트 (필수)
            original_text = safe_text(row.get('전체 내용')) or safe_text(row.get('핵심 내용')) or f"치험례 #{record_num}"

            # 주증상 (필수)
            chief_complaint = safe_text(row.get('주증상')) or safe_text(row.get('핵심 내용')) or "증상 정보 없음"

            # 데이터 준비
            data = {
                'id': str(uuid.uuid4()),
                'sourceId': source_id,
                'recordedYear': year,
                'recorderName': safe_text(row.get('작성자'), 100),
                'patientGender': parse_gender(row.get('성별')),
                'patientAgeRange': safe_text(row.get('나이'), 50) if not pd.isna(row.get('나이')) else None,
                'patientConstitution': parse_constitution(row.get('사상체질')),
                'chiefComplaint': chief_complaint,
                'presentIllness': safe_text(row.get('과정')),
                'pulseDiagnosis': None,
                'tongueDiagnosis': None,
                'abdominalDiagnosis': safe_text(row.get('용모')),
                'patternDiagnosis': safe_text(row.get('변증'), 500),
                'treatmentOutcome': None,
                'clinicalNotes': safe_text(row.get('처방구상')) or safe_text(row.get('치법')),
                'originalText': original_text,
                'symptoms': json.dumps(parse_symptoms(
                    row.get('주증상'),
                    row.get('부증상'),
                    row.get('참고증상')
                ), ensure_ascii=False),
                'herbalFormulas': json.dumps(parse_herbal_formulas(
                    row.get('처방색인(처방명)'),
                    row.get('투약내역')
                ), ensure_ascii=False)
            }

            # 삽입 쿼리
            cursor.execute("""
                INSERT INTO clinical_cases (
                    id, "sourceId", "recordedYear", "recorderName", "patientGender",
                    "patientAgeRange", "patientConstitution", "chiefComplaint", "presentIllness",
                    "pulseDiagnosis", "tongueDiagnosis", "abdominalDiagnosis", "patternDiagnosis",
                    "treatmentOutcome", "clinicalNotes", "originalText", symptoms, "herbalFormulas"
                ) VALUES (
                    %(id)s, %(sourceId)s, %(recordedYear)s, %(recorderName)s, %(patientGender)s,
                    %(patientAgeRange)s, %(patientConstitution)s, %(chiefComplaint)s, %(presentIllness)s,
                    %(pulseDiagnosis)s, %(tongueDiagnosis)s, %(abdominalDiagnosis)s, %(patternDiagnosis)s,
                    %(treatmentOutcome)s, %(clinicalNotes)s, %(originalText)s, %(symptoms)s, %(herbalFormulas)s
                )
                ON CONFLICT ("sourceId") DO NOTHING
            """, data)

            if cursor.rowcount > 0:
                inserted += 1
            else:
                skipped += 1

            # 진행률 표시
            if (idx + 1) % 500 == 0:
                conn.commit()
                print(f"   진행: {idx + 1}/{len(df)} ({(idx+1)/len(df)*100:.1f}%)")

        except Exception as e:
            errors += 1
            if errors <= 5:  # 처음 5개 에러만 출력
                print(f"   에러 (행 {idx + 1}): {str(e)[:100]}")

    # 최종 커밋
    conn.commit()

    # 결과 확인
    cursor.execute("SELECT COUNT(*) FROM clinical_cases")
    total_count = cursor.fetchone()[0]

    print("\n" + "=" * 60)
    print("삽입 완료!")
    print(f"  - 신규 삽입: {inserted} 건")
    print(f"  - 중복 건너뜀: {skipped} 건")
    print(f"  - 에러: {errors} 건")
    print(f"  - DB 총 데이터: {total_count} 건")
    print("=" * 60)

    # 연결 종료
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
