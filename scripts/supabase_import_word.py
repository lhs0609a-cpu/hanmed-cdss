"""
Word 파일에서 치험례 데이터 추출하여 Supabase에 삽입
개선 버전: 다양한 문서 패턴 지원
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

# Word 파일 목록과 유형
WORD_FILES = {
    # 사상체질 치험례 - 패턴: ■ 처방명(번호) -- 증상
    "사상 소양인 치험례 모음(081024).docx": "sasang",
    "사상 소음인 치험례 모음(081024).docx": "sasang",
    "사상 태양인 치험례 모음081025.docx": "sasang",
    "사상 태음인 치험례 모음(081024).docx": "sasang",

    # 고령자채록 - 패턴: 처방명 N-N. 증상
    "220603 고령자채록 수정본.docx": "goreyongja",
    "11-1.고령자채록모음집.목차. 방안. 106사례 195쪽..22.5.23.이종대.docx": "goreyongja",
    "211119. 청주 감초당 한약방 한장훈선생 채록 22편 총100쪽.docx": "goreyongja",

    # 태극지 - 처방별 치험례
    "태1장(최종).docx": "taekeuk",
    "태2장(최종).docx": "taekeuk",
    "태3장(최종).docx": "taekeuk",
    "태4장(최종).docx": "taekeuk",
    "태5장(최종).docx": "taekeuk",
    "태6장(최종).docx": "taekeuk",
    "태7장(최종).docx": "taekeuk",
    "태8장(최종).docx": "taekeuk",
    "태9장(최종).docx": "taekeuk",
    "태10장(최종).docx": "taekeuk",
    "태11장(최종).docx": "taekeuk",
    "태12장(최종).docx": "taekeuk",
    "태13장(최종).docx": "taekeuk",
    "태14장(최종).docx": "taekeuk",
    "태15장(최종).docx": "taekeuk",
    "태16장(최종).docx": "taekeuk",
    "태17장(최종).docx": "taekeuk",
    "태18장(최종).docx": "taekeuk",
    "태19장(최종).docx": "taekeuk",
    "태20장(최종).docx": "taekeuk",
    "태22장(최종).docx": "taekeuk",

    # 기타 - 개별 치험례 파일
    "00-075-05.docx": "individual",
    "00-100-1.docx": "individual",
    "00-135-03.docx": "individual",
    "1-007-01.docx": "individual",
    "1-015-26.docx": "individual",
    "1-083-22.docx": "individual",
    "1-085-19.docx": "individual",
    "1-098-14.docx": "individual",
    "2-019-14 w+010214.docx": "individual",
    "2-050-15.docx": "individual",
    "2-157-05.docx": "individual",
    "2-157-06.docx": "individual",
    "3-071-15.docx": "individual",
    "3-071-24.docx": "individual",
    "40-216.docx": "individual",
    "4-411-02.docx": "individual",
    "6-102-01.docx": "individual",
    "6-102-02.docx": "individual",
    "최경구. 삼례. 연수당. 흑색종..docx": "individual",
}

# 제외할 파일 (처방 설명서, 치험례 아님)
EXCLUDE_FILES = [
    "빈용 202처방 정담편집4본.2005.3.2일기준. 2025.12.25. 이현석대표에게 발송.docx",
    "새로보는 방약합편 1_상통-최종본. 2025.12.25. 이현석 대표에게.docx",
    "감기의 한약치료(하권-2002년 6월 20일).docx",
]


def extract_gender(text):
    """텍스트에서 성별 추출 - 개선된 버전"""
    # 전체 텍스트에서 성별 패턴 검색 (처음 500자)
    search_text = text[:500]

    # 패턴 1: "남 NN세" 또는 "여 NN세"
    if re.search(r'남\s*\d{1,3}\s*세', search_text):
        return 'male'
    if re.search(r'여\s*\d{1,3}\s*세', search_text):
        return 'female'

    # 패턴 2: "NN세 남" 또는 "NN세 여"
    if re.search(r'\d{1,3}\s*세\s*남', search_text):
        return 'male'
    if re.search(r'\d{1,3}\s*세\s*여', search_text):
        return 'female'

    # 패턴 3: 공백으로 구분된 "남" 또는 "여" (이름 뒤)
    # 예: "○ ○ ○  남  70세" 또는 "백 0 0 여 34세"
    if re.search(r'[○0\s]{3,}\s+남\s+\d', search_text):
        return 'male'
    if re.search(r'[○0\s]{3,}\s+여\s+\d', search_text):
        return 'female'

    # 패턴 4: 단순 검색 (처음 200자에서)
    first_200 = text[:200]
    if '남성' in first_200 or re.search(r'\s남\s', first_200):
        return 'male'
    if '여성' in first_200 or re.search(r'\s여\s', first_200):
        return 'female'

    return 'unknown'


def extract_age_range(text):
    """텍스트에서 연령대 추출 - 개선된 버전"""
    search_text = text[:500]

    # 나이 패턴 찾기 (예: 32세, 70세)
    match = re.search(r'(\d{1,3})\s*세', search_text)
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
    search_text = text[:500]
    constitutions = ['태양인', '태음인', '소양인', '소음인']
    for const in constitutions:
        if const in search_text:
            return const
    return None


def extract_formula_name(text):
    """텍스트에서 처방명 추출"""
    # 첫 500자에서 처방명 찾기
    search_text = text[:500]

    # 한글 처방명 패턴 (예: 소속명탕, 갈근해기탕, 형방지황탕)
    match = re.search(r'([가-힣]{2,10}(?:탕|산|환|원|고|단|음|전))', search_text)
    if match:
        return match.group(1)
    return None


def extract_chief_complaint(text, title):
    """주증상 추출 - 개선된 버전"""
    # 1. 제목에서 증상 추출 시도
    # 패턴: "처방명(번호) -- 증상"
    if '--' in title:
        parts = title.split('--')
        if len(parts) > 1:
            complaint = parts[-1].strip()
            if complaint and len(complaint) > 2:
                return complaint[:500]

    # 패턴: "처방명 번호. 증상"
    dot_match = re.search(r'\d+-\d+\.\s*(.+)', title)
    if dot_match:
        complaint = dot_match.group(1).strip()
        if complaint and len(complaint) > 2:
            return complaint[:500]

    # 2. 본문에서 주증상 섹션 찾기
    # 패턴: "￭ 주 증 상", "￭ 주증상", "주증상"
    patterns = [
        r'[￭●■]\s*주\s*증\s*상\s*[:\s]*\n?([\s\S]*?)(?=[￭●■]|\n\n)',
        r'주증상[:\s]*\n?([\s\S]*?)(?=부수증상|참고|변상|변증|\n\n)',
        r'①\s*(.+?)(?:②|$)',  # 번호 매긴 증상
    ]

    for pattern in patterns:
        match = re.search(pattern, text[:3000])
        if match:
            complaint = match.group(1).strip()
            # 줄바꿈을 공백으로
            complaint = re.sub(r'\s+', ' ', complaint)
            if complaint and len(complaint) > 5:
                return complaint[:500]

    # 3. Fallback: 처방명 반환
    formula = extract_formula_name(text)
    if formula:
        return f"{formula} 치험례"

    return title[:500] if title else "치험례"


def extract_symptoms(text):
    """증상 목록 추출"""
    symptoms = []

    # 번호가 매겨진 증상 찾기 (① ② ③ 또는 1. 2. 3.)
    # 패턴 1: 원형 숫자
    circle_matches = re.findall(r'[①②③④⑤⑥⑦⑧⑨⑩]\s*(.+?)(?=[①②③④⑤⑥⑦⑧⑨⑩]|\n\n|$)', text[:3000])
    for match in circle_matches[:10]:  # 최대 10개
        symptom = match.strip()
        symptom = re.sub(r'\s+', ' ', symptom)
        if symptom and len(symptom) > 2 and len(symptom) < 200:
            symptoms.append({"type": "주증상", "description": symptom})

    # 패턴 2: 숫자. 형식
    if not symptoms:
        num_matches = re.findall(r'\d+\.\s*(.+?)(?=\d+\.|$)', text[:2000])
        for match in num_matches[:10]:
            symptom = match.strip()
            symptom = re.sub(r'\s+', ' ', symptom)
            if symptom and len(symptom) > 2 and len(symptom) < 200:
                symptoms.append({"type": "주증상", "description": symptom})

    return symptoms if symptoms else None


def split_sasang_cases(doc_text, filename):
    """사상체질 치험례 분할 - 패턴: ■ 처방명(번호) -- 증상"""
    cases = []

    # 패턴: ■ 처방명(번호) -- 또는 ■ 처방명(번호-번호)
    pattern = r'■\s*([가-힣]+(?:탕|산|환|원|고|단|음|전))\s*\((\d+-\d+-\d+|\d+-\d+)\)\s*(?:--|—|–)?\s*'

    splits = re.split(pattern, doc_text)

    # splits 구조: [앞부분, 처방명1, 번호1, 내용1, 처방명2, 번호2, 내용2, ...]
    if len(splits) > 3:
        for i in range(1, len(splits) - 2, 3):
            formula_name = splits[i].strip()
            case_number = splits[i + 1].strip()
            content = splits[i + 2].strip()

            if len(content) > 100:
                # 제목에서 증상 부분 추출
                first_line = content.split('\n')[0].strip()
                title = f"{formula_name}({case_number}) -- {first_line}"

                cases.append({
                    'title': title[:300],
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': case_number
                })

    return cases


def split_goreyongja_cases(doc_text, filename):
    """고령자채록 치험례 분할 - 패턴: 처방명 N-N. 증상"""
    cases = []

    # 패턴: "처방명 N-N. 증상" (예: "소속명탕 1-1. 중풍(中風)")
    # 또는 "N. 처방명 N-N. 증상"
    pattern = r'\n\s*(?:\d+\.\s*)?([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s+(\d+-\d+)\.\s*'

    splits = re.split(pattern, doc_text)

    if len(splits) > 3:
        for i in range(1, len(splits) - 2, 3):
            formula_name = splits[i].strip()
            case_number = splits[i + 1].strip()
            content = splits[i + 2].strip()

            if len(content) > 50:
                # 첫 줄에서 증상 추출
                first_line = content.split('\n')[0].strip()
                # 증상 부분만 추출 (한자 포함 가능)
                symptom_match = re.match(r'([가-힣\(\)（）\s,、]+)', first_line)
                symptom = symptom_match.group(1).strip() if symptom_match else first_line[:100]

                title = f"{formula_name} {case_number}. {symptom}"

                cases.append({
                    'title': title[:300],
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': case_number
                })

    return cases


def split_taekeuk_cases(doc_text, filename):
    """태극지 치험례 분할"""
    cases = []

    # 여러 패턴 시도
    patterns = [
        # 패턴 1: "처방명의 증상" 형식
        r'\n\s*(\d+)\.\s*([가-힣]+(?:탕|산|환|원|고|단|음|전))의\s+([가-힣]+)',
        # 패턴 2: "처방명 처방기준" 또는 "처방명 치험례"
        r'\n([가-힣]+(?:탕|산|환|원|고|단|음|전))\s*\n처방내용',
    ]

    # 패턴 1 시도
    matches = list(re.finditer(patterns[0], doc_text))
    if matches:
        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(doc_text)

            case_num = match.group(1)
            formula_name = match.group(2)
            symptom = match.group(3)
            content = doc_text[start:end].strip()

            if len(content) > 100:
                title = f"{formula_name} {case_num}. {symptom}"
                cases.append({
                    'title': title[:300],
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': case_num
                })

    # 패턴 2 시도 (패턴 1이 실패한 경우)
    if not cases:
        matches = list(re.finditer(patterns[1], doc_text))
        if matches:
            for i, match in enumerate(matches):
                start = match.start()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(doc_text)

                formula_name = match.group(1)
                content = doc_text[start:end].strip()

                if len(content) > 200:
                    title = f"{formula_name} 치험례"
                    cases.append({
                        'title': title,
                        'content': content[:15000],
                        'formula_name': formula_name,
                        'case_number': str(i + 1)
                    })

    return cases


def split_individual_case(doc_text, filename):
    """개별 치험례 파일 (파일 전체가 하나의 치험례)"""
    cases = []

    if len(doc_text) > 100:
        # 파일명에서 처방 번호 추출
        case_number = filename.replace('.docx', '')

        # 처방명 추출
        formula_name = extract_formula_name(doc_text)

        # 첫 줄에서 제목 생성
        first_lines = doc_text[:500].split('\n')
        title_line = ""
        for line in first_lines:
            line = line.strip()
            if line and len(line) > 5:
                title_line = line
                break

        title = f"{formula_name or case_number}: {title_line[:100]}" if title_line else case_number

        cases.append({
            'title': title[:300],
            'content': doc_text[:15000],
            'formula_name': formula_name,
            'case_number': case_number
        })

    return cases


def split_into_cases(doc_text, filename, file_type):
    """문서를 개별 치험례로 분할 - 파일 유형에 따라 다른 방식 적용"""

    if file_type == "sasang":
        cases = split_sasang_cases(doc_text, filename)
    elif file_type == "goreyongja":
        cases = split_goreyongja_cases(doc_text, filename)
    elif file_type == "taekeuk":
        cases = split_taekeuk_cases(doc_text, filename)
    elif file_type == "individual":
        cases = split_individual_case(doc_text, filename)
    else:
        cases = []

    # Fallback: 분할 실패 시 기존 방식 사용하되, 더 작은 단위로
    if not cases and len(doc_text) > 500:
        print(f"  ⚠ 분할 실패, Fallback 적용: {filename}")
        # 기존보다 작은 단위로 분할하고, 더 의미있는 제목 생성
        # 최소 1000자 이상의 청크만 생성
        chunks = []
        current_pos = 0
        chunk_size = 8000

        while current_pos < len(doc_text):
            # 다음 단락 끝까지 포함
            end_pos = min(current_pos + chunk_size, len(doc_text))

            # 가능하면 문단 끝에서 자르기
            para_end = doc_text.rfind('\n\n', current_pos, end_pos)
            if para_end > current_pos + 1000:
                end_pos = para_end

            chunk = doc_text[current_pos:end_pos].strip()
            if len(chunk) > 500:
                chunks.append(chunk)

            current_pos = end_pos

        for idx, chunk in enumerate(chunks[:30]):  # 최대 30개
            formula = extract_formula_name(chunk)
            chief = extract_chief_complaint(chunk, "")

            title = f"{formula}: {chief}" if formula else f"{filename} 치험례 {idx + 1}"

            cases.append({
                'title': title[:300],
                'content': chunk,
                'formula_name': formula,
                'case_number': str(idx + 1)
            })

    return cases


def parse_word_file(file_path, file_type):
    """Word 파일 파싱"""
    try:
        doc = Document(str(file_path))
        filename = file_path.name

        # 전체 텍스트 추출
        full_text = '\n'.join([p.text for p in doc.paragraphs])

        # 치험례 분할
        raw_cases = split_into_cases(full_text, filename, file_type)

        cases = []
        for idx, raw_case in enumerate(raw_cases):
            content = raw_case['content']
            title = raw_case['title']
            formula_name = raw_case.get('formula_name')
            case_number = raw_case.get('case_number', str(idx + 1))

            # 주증상 추출
            chief_complaint = extract_chief_complaint(content, title)

            # 증상 목록 추출
            symptoms = extract_symptoms(content)

            case = {
                "sourceId": f"word-{filename}-{case_number}",
                "recordedYear": 2020,  # 기본값
                "recorderName": "이종대",
                "patientGender": extract_gender(content),
                "patientAgeRange": extract_age_range(content),
                "patientConstitution": extract_constitution(content),
                "chiefComplaint": chief_complaint,
                "presentIllness": None,
                "patternDiagnosis": None,
                "clinicalNotes": None,
                "originalText": content[:10000],
                "symptoms": symptoms,
                "herbalFormulas": [{"name": formula_name}] if formula_name else None,
            }
            cases.append(case)

        return cases

    except Exception as e:
        print(f"파싱 오류 ({file_path.name}): {e}")
        import traceback
        traceback.print_exc()
        return []


def delete_existing_word_cases():
    """기존 Word 파일 기반 치험례 삭제"""
    print("기존 Word 기반 치험례 삭제 중...")

    try:
        # sourceId가 'word-'로 시작하는 데이터 삭제
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/clinical_cases",
            headers=HEADERS,
            params={"sourceId": "like.word-%"}
        )

        if response.status_code in [200, 204]:
            print("  기존 데이터 삭제 완료")
        else:
            print(f"  삭제 실패: {response.status_code} - {response.text[:200]}")

    except Exception as e:
        print(f"  삭제 오류: {e}")


def insert_cases(cases, batch_size=50):
    """Supabase에 삽입 (upsert 방식)"""
    total = len(cases)
    inserted = 0
    failed = 0

    # Upsert 헤더 (중복 시 업데이트)
    upsert_headers = {
        **HEADERS,
        "Prefer": "resolution=merge-duplicates"
    }

    for i in range(0, total, batch_size):
        batch = cases[i:i+batch_size]

        try:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/clinical_cases",
                headers=upsert_headers,
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
    print("Word 파일 치험례 Supabase 삽입 (개선 버전)")
    print("=" * 60)

    word_dir = Path(__file__).parent.parent / "치험례/word"

    # 기존 Word 기반 데이터 삭제
    delete_existing_word_cases()

    all_cases = []
    stats = {"sasang": 0, "goreyongja": 0, "taekeuk": 0, "individual": 0}

    for filename, file_type in WORD_FILES.items():
        if filename in EXCLUDE_FILES:
            print(f"\n건너뜀 (제외 파일): {filename}")
            continue

        file_path = word_dir / filename
        if file_path.exists():
            print(f"\n처리 중 [{file_type}]: {filename}")
            cases = parse_word_file(file_path, file_type)
            print(f"  추출된 치험례: {len(cases)}건")

            # 샘플 출력
            if cases:
                sample = cases[0]
                print(f"  샘플 - 주증상: {sample['chiefComplaint'][:50]}...")
                print(f"  샘플 - 성별: {sample['patientGender']}, 나이: {sample['patientAgeRange']}")

            all_cases.extend(cases)
            stats[file_type] += len(cases)
        else:
            print(f"파일 없음: {filename}")

    print(f"\n{'=' * 60}")
    print(f"추출 통계:")
    for file_type, count in stats.items():
        print(f"  {file_type}: {count}건")
    print(f"  총계: {len(all_cases)}건")

    if all_cases:
        print("\nSupabase에 삽입 중...")
        inserted, failed = insert_cases(all_cases)
        print(f"\n완료! 삽입: {inserted}건, 실패: {failed}건")
    else:
        print("삽입할 데이터가 없습니다.")


if __name__ == "__main__":
    main()
