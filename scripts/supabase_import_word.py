"""
Word 파일에서 치험례 데이터 추출하여 Supabase에 삽입
"""

from docx import Document
from pathlib import Path
import requests
import re
import json

# Supabase 설정
SUPABASE_URL = "https://bbwnroljrrbwnewmamno.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJid25yb2xqcnJid25ld21hbW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NDAzMCwiZXhwIjoyMDgzNTIwMDMwfQ.TIzhIHYDLzYC_BPEIzMWgvCIQvOcPZUHhMxsQVJ7svg"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Word 파일 목록
WORD_FILES = [
    "태1장(최종).docx",
    "태2장(최종).docx",
    "태3장(최종).docx",
    "태4장(최종).docx",
    "태5장(최종).docx",
    "태6장(최종).docx",
    "태7장(최종).docx",
    "태8장(최종).docx",
    "태9장(최종).docx",
    "태10장(최종).docx",
    "태11장(최종).docx",
    "태12장(최종).docx",
    "태13장(최종).docx",
    "태14장(최종).docx",
    "태15장(최종).docx",
    "태16장(최종).docx",
    "태17장(최종).docx",
    "태18장(최종).docx",
    "태19장(최종).docx",
    "태20장(최종).docx",
    "태22장(최종).docx",
    "사상 소양인 치험례 모음(081024).docx",
    "사상 소음인 치험례 모음(081024).docx",
    "사상 태양인 치험례 모음081025.docx",
    "사상 태음인 치험례 모음(081024).docx",
    "220603 고령자채록 수정본.docx",
    "11-1.고령자채록모음집.목차. 방안. 106사례 195쪽..22.5.23.이종대.docx",
    "211119. 청주 감초당 한약방 한장훈선생 채록 22편 총100쪽.docx",
    "감기의 한약치료(하권-2002년 6월 20일).docx",
    "새로보는 방약합편 1_상통-최종본. 2025.12.25. 이현석 대표에게.docx",
    "빈용 202처방 정담편집4본.2005.3.2일기준. 2025.12.25. 이현석대표에게 발송.docx",
]


def extract_gender(text):
    """텍스트에서 성별 추출"""
    if '남' in text[:100]:
        return 'male'
    elif '여' in text[:100]:
        return 'female'
    return 'unknown'


def extract_age_range(text):
    """텍스트에서 연령대 추출"""
    # 나이 패턴 찾기 (예: 32세, 70세)
    match = re.search(r'(\d{1,3})\s*세', text[:200])
    if match:
        age = int(match.group(1))
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
    return None


def extract_constitution(text):
    """텍스트에서 체질 추출"""
    constitutions = ['태양인', '태음인', '소양인', '소음인']
    for const in constitutions:
        if const in text[:300]:
            return const
    return None


def extract_formula_name(text):
    """텍스트에서 처방명 추출"""
    # 한글 처방명 패턴 (예: 소속명탕, 갈근해기탕)
    match = re.search(r'([가-힣]{2,10}(?:탕|산|환|원|고|단|음))', text[:500])
    if match:
        return match.group(1)
    return None


def split_into_cases(doc_text, filename):
    """문서를 개별 치험례로 분할"""
    cases = []

    # 다양한 분할 패턴
    patterns = [
        r'\n\s*(\d+\.\s*[가-힣]+\s+\d+-\d+\.)',  # 1. 소속명탕 1-1.
        r'\n\s*(증례\s*\d+)',  # 증례 1
        r'\n\s*(제\s*\d+\s*례)',  # 제 1 례
        r'\n\s*(【\d+】)',  # 【1】
        r'\n\s*(\[\d+\])',  # [1]
        r'\n\s*(●\s*[가-힣]+)',  # ● 처방명
        r'\n\s*(■\s*[가-힣]+)',  # ■ 처방명
    ]

    # 각 패턴으로 분할 시도
    for pattern in patterns:
        splits = re.split(pattern, doc_text)
        if len(splits) > 3:  # 의미있는 분할이 되었으면
            # 분할된 텍스트를 치험례로 변환
            for i in range(1, len(splits), 2):
                if i + 1 < len(splits):
                    title = splits[i].strip()
                    content = splits[i + 1].strip()
                    if len(content) > 100:  # 의미있는 내용이 있으면
                        cases.append({
                            'title': title[:200],
                            'content': content[:10000]
                        })
            break

    # 분할이 안 되면 전체 문서를 하나의 치험례로
    if not cases and len(doc_text) > 500:
        # 문서를 적당한 크기로 분할 (약 3000자씩)
        chunks = [doc_text[i:i+5000] for i in range(0, len(doc_text), 4500)]
        for idx, chunk in enumerate(chunks[:50]):  # 최대 50개
            if len(chunk) > 200:
                cases.append({
                    'title': f"{filename} - 파트 {idx + 1}",
                    'content': chunk
                })

    return cases


def parse_word_file(file_path):
    """Word 파일 파싱"""
    try:
        doc = Document(str(file_path))
        filename = file_path.name

        # 전체 텍스트 추출
        full_text = '\n'.join([p.text for p in doc.paragraphs])

        # 치험례 분할
        raw_cases = split_into_cases(full_text, filename)

        cases = []
        for idx, raw_case in enumerate(raw_cases):
            content = raw_case['content']
            title = raw_case['title']

            # 주소증 추출 (첫 번째 의미있는 텍스트)
            chief_complaint = title
            if '.' in title:
                parts = title.split('.')
                if len(parts) > 1:
                    chief_complaint = parts[-1].strip()[:500]

            case = {
                "sourceId": f"word-{filename}-{idx + 1}",
                "recordedYear": 2020,  # 기본값
                "recorderName": "이종대",
                "patientGender": extract_gender(content),
                "patientAgeRange": extract_age_range(content),
                "patientConstitution": extract_constitution(content),
                "chiefComplaint": chief_complaint[:1000] if chief_complaint else f"치험례 {idx + 1}",
                "presentIllness": None,
                "patternDiagnosis": None,
                "clinicalNotes": None,
                "originalText": content[:10000],
                "symptoms": None,
                "herbalFormulas": [{"name": extract_formula_name(content)}] if extract_formula_name(content) else None,
            }
            cases.append(case)

        return cases

    except Exception as e:
        print(f"파싱 오류 ({file_path.name}): {e}")
        return []


def insert_cases(cases, batch_size=50):
    """Supabase에 삽입"""
    total = len(cases)
    inserted = 0
    failed = 0

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
            else:
                failed += len(batch)
                if failed <= 100:  # 처음 몇 개 에러만 출력
                    print(f"삽입 실패: {response.status_code} - {response.text[:200]}")

        except Exception as e:
            failed += len(batch)
            print(f"삽입 오류: {e}")

    return inserted, failed


def main():
    print("=" * 60)
    print("Word 파일 치험례 Supabase 삽입")
    print("=" * 60)

    word_dir = Path(__file__).parent.parent / "치험례/word"

    all_cases = []

    for filename in WORD_FILES:
        file_path = word_dir / filename
        if file_path.exists():
            print(f"\n처리 중: {filename}")
            cases = parse_word_file(file_path)
            print(f"  추출된 치험례: {len(cases)}건")
            all_cases.extend(cases)
        else:
            print(f"파일 없음: {filename}")

    print(f"\n총 추출된 치험례: {len(all_cases)}건")

    if all_cases:
        print("\nSupabase에 삽입 중...")
        inserted, failed = insert_cases(all_cases)
        print(f"\n완료! 삽입: {inserted}건, 실패: {failed}건")
    else:
        print("삽입할 데이터가 없습니다.")


if __name__ == "__main__":
    main()
