import pandas as pd
import json
import uuid
import re
from datetime import datetime
import csv

# 엑셀 파일 경로
EXCEL_PATH = r"G:\내 드라이브\developer\hanmed-cdss\치험례\word\#이종대_선생님_치험례 6.000건.밴드 (2001.0.00-2025.10.24).xlsx"
OUTPUT_PATH = r"G:\내 드라이브\developer\hanmed-cdss\scripts\clinical_cases.csv"

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
        return 2020
    try:
        if isinstance(date_val, datetime):
            return date_val.year
        date_str = str(date_val)
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
        lines = re.split(r'\n|\d+\.', text)
        for line in lines:
            line = line.strip()
            if len(line) > 3:
                symptoms.append({
                    'name': line[:200],
                    'severity': None,
                    'duration': None,
                    'bodyPart': None
                })
    return symptoms[:20]

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
        return ''
    text = str(val).strip()
    # CSV에서 문제될 수 있는 문자 처리
    text = text.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ')
    if max_length:
        text = text[:max_length]
    return text

def main():
    print("=" * 60)
    print("치험례 데이터 CSV 변환 시작")
    print("=" * 60)

    # 엑셀 파일 읽기
    print("\n1. 엑셀 파일 읽는 중...")
    df = pd.read_excel(EXCEL_PATH, sheet_name='11년치 치험례 업그레이드2.0')
    print(f"   총 {len(df)} 건의 데이터 로드 완료")

    # 변환 데이터 준비
    print("\n2. 데이터 변환 중...")
    rows = []

    for idx, row in df.iterrows():
        try:
            record_num = row.get('번호', idx + 1)
            year = extract_year(row.get('작성일'))
            source_id = f"LEE-{year}-{record_num:04d}"

            original_text = safe_text(row.get('전체 내용')) or safe_text(row.get('핵심 내용')) or f"치험례 #{record_num}"
            chief_complaint = safe_text(row.get('주증상')) or safe_text(row.get('핵심 내용')) or "증상 정보 없음"

            data = {
                'id': str(uuid.uuid4()),
                'sourceId': source_id,
                'recordedYear': year,
                'recorderName': safe_text(row.get('작성자'), 100),
                'patientGender': parse_gender(row.get('성별')),
                'patientAgeRange': safe_text(row.get('나이'), 50) if not pd.isna(row.get('나이')) else '',
                'patientConstitution': parse_constitution(row.get('사상체질')),
                'chiefComplaint': chief_complaint[:5000],  # 길이 제한
                'presentIllness': safe_text(row.get('과정'))[:5000] if safe_text(row.get('과정')) else '',
                'pulseDiagnosis': '',
                'tongueDiagnosis': '',
                'abdominalDiagnosis': safe_text(row.get('용모'))[:2000] if safe_text(row.get('용모')) else '',
                'patternDiagnosis': safe_text(row.get('변증'), 500),
                'treatmentOutcome': '',
                'clinicalNotes': (safe_text(row.get('처방구상')) or safe_text(row.get('치법')))[:5000] if (safe_text(row.get('처방구상')) or safe_text(row.get('치법'))) else '',
                'originalText': original_text[:10000],  # 원본은 좀 더 길게
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

            rows.append(data)

            if (idx + 1) % 1000 == 0:
                print(f"   진행: {idx + 1}/{len(df)}")

        except Exception as e:
            print(f"   에러 (행 {idx + 1}): {str(e)[:50]}")

    # CSV 파일 저장
    print(f"\n3. CSV 파일 저장 중... ({len(rows)} 건)")

    fieldnames = ['id', 'sourceId', 'recordedYear', 'recorderName', 'patientGender',
                  'patientAgeRange', 'patientConstitution', 'chiefComplaint', 'presentIllness',
                  'pulseDiagnosis', 'tongueDiagnosis', 'abdominalDiagnosis', 'patternDiagnosis',
                  'treatmentOutcome', 'clinicalNotes', 'originalText', 'symptoms', 'herbalFormulas']

    with open(OUTPUT_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n저장 완료: {OUTPUT_PATH}")
    print("=" * 60)

if __name__ == "__main__":
    main()
