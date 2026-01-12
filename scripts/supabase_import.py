"""
치험례 데이터 Supabase 삽입 스크립트
Excel 파일에서 데이터를 추출하여 기존 clinical_cases 테이블에 저장
"""

import pandas as pd
import requests
import json
import hashlib
from pathlib import Path
from datetime import datetime
import re
import uuid

# Supabase 설정
SUPABASE_URL = "https://bbwnroljrrbwnewmamno.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJid25yb2xqcnJid25ld21hbW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NDAzMCwiZXhwIjoyMDgzNTIwMDMwfQ.TIzhIHYDLzYC_BPEIzMWgvCIQvOcPZUHhMxsQVJ7svg"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}


def test_connection():
    """Supabase 연결 테스트"""
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/clinical_cases?limit=1",
            headers=HEADERS
        )
        print(f"연결 상태: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"연결 실패: {e}")
        return False


def clean_text(text):
    """텍스트 정리"""
    if pd.isna(text):
        return None
    text = str(text).strip()
    if text.lower() == 'nan' or text == '':
        return None
    return text


def parse_gender(gender_value):
    """성별 변환 (남/여 -> male/female/unknown)"""
    if pd.isna(gender_value):
        return "unknown"
    gender = str(gender_value).strip()
    if gender in ['남', '남성', 'M', 'male']:
        return "male"
    elif gender in ['여', '여성', 'F', 'female']:
        return "female"
    return "unknown"


def parse_constitution(constitution_value):
    """체질 변환"""
    if pd.isna(constitution_value):
        return None
    constitution = str(constitution_value).strip()
    valid = ['태양인', '태음인', '소양인', '소음인', '미상']
    if constitution in valid:
        return constitution
    return None


def parse_age_range(age_value):
    """나이를 연령대로 변환"""
    if pd.isna(age_value):
        return None
    try:
        age = int(float(age_value))
        if age < 10:
            return "0-9세"
        elif age < 20:
            return "10대"
        elif age < 30:
            return "20대"
        elif age < 40:
            return "30대"
        elif age < 50:
            return "40대"
        elif age < 60:
            return "50대"
        elif age < 70:
            return "60대"
        elif age < 80:
            return "70대"
        else:
            return "80세 이상"
    except:
        return None


def extract_year(date_value):
    """날짜에서 연도 추출"""
    if pd.isna(date_value):
        return 2020  # 기본값
    try:
        date_str = str(date_value)
        # 다양한 날짜 형식 처리
        match = re.search(r'(\d{4})', date_str)
        if match:
            year = int(match.group(1))
            if 1990 <= year <= 2030:
                return year
        return 2020
    except:
        return 2020


def extract_symptoms(row):
    """증상 데이터 추출"""
    symptoms = []

    # 주증상
    chief = clean_text(row.get('주증상'))
    if chief:
        symptoms.append({"type": "주증상", "description": chief[:500]})

    # 부증상
    secondary = clean_text(row.get('부증상'))
    if secondary:
        symptoms.append({"type": "부증상", "description": secondary[:500]})

    # 참고증상
    ref = clean_text(row.get('참고증상'))
    if ref:
        symptoms.append({"type": "참고증상", "description": ref[:500]})

    return symptoms if symptoms else None


def extract_formulas(row):
    """처방 데이터 추출"""
    formulas = []

    formula_name = clean_text(row.get('처방색인(처방명)'))
    formula_num = clean_text(row.get('처방색인(번호)'))
    medication = clean_text(row.get('투약내역'))

    if formula_name:
        formula = {
            "name": formula_name,
            "number": formula_num,
            "details": medication[:1000] if medication else None
        }
        formulas.append(formula)

    return formulas if formulas else None


def load_excel_data(file_path):
    """Excel 파일에서 치험례 데이터 로드 및 변환"""
    print(f"Excel 파일 로딩: {file_path}")
    df = pd.read_excel(file_path, sheet_name=0)

    cases = []
    for idx, row in df.iterrows():
        # 필수 필드 확인
        full_content = clean_text(row.get('전체 내용'))
        key_content = clean_text(row.get('핵심 내용'))
        chief = clean_text(row.get('주증상'))

        # 주소증 결정
        chief_complaint = chief
        if not chief_complaint and key_content:
            # 핵심 내용에서 첫 줄 추출
            match = re.match(r'^[●○■▶]?\s*([^\n]+)', key_content)
            if match:
                chief_complaint = match.group(1)[:500]
        if not chief_complaint and full_content:
            chief_complaint = full_content[:500]
        if not chief_complaint:
            chief_complaint = f"치험례 #{idx + 1}"

        # 원본 텍스트
        original_text = full_content or key_content or ""
        if not original_text:
            original_text = f"치험례 데이터 (번호: {row.get('번호', idx + 1)})"

        # 모든 필드를 포함 (배치 삽입 시 모든 객체가 동일한 키를 가져야 함)
        present_illness = clean_text(row.get('과정'))
        pattern_diagnosis = clean_text(row.get('변증'))
        clinical_notes = clean_text(row.get('치법'))

        case = {
            "sourceId": f"excel-{idx + 1}",
            "recordedYear": extract_year(row.get('작성일')),
            "recorderName": clean_text(row.get('작성자')),
            "patientGender": parse_gender(row.get('성별')),
            "patientAgeRange": parse_age_range(row.get('나이 추출', row.get('나이'))),
            "patientConstitution": parse_constitution(row.get('사상체질')),
            "chiefComplaint": chief_complaint[:1000],
            "presentIllness": present_illness[:2000] if present_illness else None,
            "patternDiagnosis": pattern_diagnosis[:500] if pattern_diagnosis else None,
            "clinicalNotes": clinical_notes[:2000] if clinical_notes else None,
            "originalText": original_text[:10000],
            "symptoms": extract_symptoms(row),
            "herbalFormulas": extract_formulas(row),
        }

        # 모든 키를 유지 (None 값도 포함)

        cases.append(case)

        if (idx + 1) % 500 == 0:
            print(f"  {idx + 1}건 처리됨...")

    print(f"총 {len(cases)}건 로드 완료")
    return cases


def insert_cases(cases, batch_size=50):
    """치험례 데이터 Supabase에 삽입"""
    total = len(cases)
    inserted = 0
    failed = 0
    failed_batches = []

    for i in range(0, total, batch_size):
        batch = cases[i:i+batch_size]

        try:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/clinical_cases",
                headers=HEADERS,
                json=batch
            )

            if response.status_code in [200, 201]:
                inserted += len(batch)
                print(f"삽입 진행: {inserted}/{total} ({inserted*100//total}%)")
            else:
                failed += len(batch)
                failed_batches.append(i // batch_size + 1)
                if len(failed_batches) <= 3:  # 처음 3개 에러만 출력
                    print(f"삽입 실패 (배치 {i//batch_size + 1}): {response.status_code}")
                    print(f"에러: {response.text[:300]}")

        except Exception as e:
            failed += len(batch)
            print(f"삽입 오류: {e}")

    if len(failed_batches) > 3:
        print(f"... 추가로 {len(failed_batches) - 3}개 배치 실패")

    return inserted, failed


def clear_existing_data():
    """기존 데이터 삭제 (선택적)"""
    try:
        # excel로 시작하는 sourceId를 가진 레코드 삭제
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/clinical_cases?sourceId=like.excel-*",
            headers=HEADERS
        )
        print(f"기존 Excel 데이터 삭제: {response.status_code}")
    except Exception as e:
        print(f"삭제 오류: {e}")


def get_existing_count():
    """기존 데이터 개수 확인"""
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/clinical_cases?select=id&limit=1",
            headers={**HEADERS, "Prefer": "count=exact"}
        )
        count = response.headers.get('content-range', '0').split('/')[-1]
        return int(count) if count != '*' else 0
    except:
        return 0


def main():
    print("=" * 60)
    print("치험례 데이터 Supabase 삽입 스크립트")
    print("=" * 60)

    # 1. 연결 테스트
    print("\n[1/3] Supabase 연결 테스트...")
    if not test_connection():
        print("Supabase 연결 실패. 종료합니다.")
        return
    print("연결 성공!")

    existing_count = get_existing_count()
    print(f"기존 데이터 수: {existing_count}건")

    # 2. Excel 데이터 로드
    print("\n[2/3] Excel 데이터 로드...")
    excel_path = Path(__file__).parent.parent / "치험례/word/#이종대_선생님_치험례 6.000건.밴드 (2001.0.00-2025.10.24).xlsx"

    if not excel_path.exists():
        print(f"Excel 파일을 찾을 수 없습니다: {excel_path}")
        return

    cases = load_excel_data(str(excel_path))

    # 3. 데이터 삽입
    print("\n[3/3] Supabase에 데이터 삽입...")
    inserted, failed = insert_cases(cases)

    print("\n" + "=" * 60)
    print(f"완료! 삽입: {inserted}건, 실패: {failed}건")
    print(f"총 데이터: {existing_count + inserted}건")
    print("=" * 60)


if __name__ == "__main__":
    main()
