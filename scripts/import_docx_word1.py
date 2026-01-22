"""
Word1 폴더의 DOCX 파일에서 치험례 데이터 추출하여 Supabase에 삽입
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

# Word1 폴더 DOCX 파일 목록과 유형
DOCX_FILES = {
    "사상 소양인 치험례 모음(081024).docx": {"type": "sasang", "constitution": "소양인"},
    "사상 소음인 치험례 모음(081024).docx": {"type": "sasang", "constitution": "소음인"},
    "사상 태양인 치험례 모음081025.docx": {"type": "sasang", "constitution": "태양인"},
    "사상 태음인 치험례 모음(081024).docx": {"type": "sasang", "constitution": "태음인"},
    "최경구. 삼례. 연수당. 흑색종..docx": {"type": "individual", "description": "흑색종 치험례"},
    "1차본1.고령자채록모음집.22.5.12.이종대.docx": {"type": "goreyongja", "description": "고령자채록모음집"},
}


def extract_gender(text):
    """텍스트에서 성별 추출"""
    search_text = text[:500]

    if re.search(r'남\s*\d{1,3}\s*세', search_text) or re.search(r'\d{1,3}\s*세\s*남', search_text):
        return 'male'
    if re.search(r'여\s*\d{1,3}\s*세', search_text) or re.search(r'\d{1,3}\s*세\s*여', search_text):
        return 'female'

    if re.search(r'[○0\s]{3,}\s+남\s+\d', search_text):
        return 'male'
    if re.search(r'[○0\s]{3,}\s+여\s+\d', search_text):
        return 'female'

    first_200 = text[:200]
    if '남성' in first_200 or re.search(r'\s남\s', first_200):
        return 'male'
    if '여성' in first_200 or re.search(r'\s여\s', first_200):
        return 'female'

    return 'unknown'


def extract_age_range(text):
    """텍스트에서 연령대 추출"""
    search_text = text[:500]

    match = re.search(r'(\d{1,3})\s*세', search_text)
    if match:
        age = int(match.group(1))
        if age < 10: return "0-9세"
        elif age < 20: return "10대"
        elif age < 30: return "20대"
        elif age < 40: return "30대"
        elif age < 50: return "40대"
        elif age < 60: return "50대"
        elif age < 70: return "60대"
        elif age < 80: return "70대"
        else: return "80세 이상"
    return None


def extract_constitution(text):
    """텍스트에서 체질 추출"""
    search_text = text[:1000]
    constitutions = ['태양인', '태음인', '소양인', '소음인']
    for const in constitutions:
        if const in search_text:
            return const
    return None


def extract_formula_name(text):
    """텍스트에서 처방명 추출"""
    search_text = text[:800]

    match = re.search(r'([가-힣]{2,10}(?:탕|산|환|원|고|단|음|전|자|포))', search_text)
    if match:
        return match.group(1)
    return None


def extract_chief_complaint(text, title=""):
    """주증상 추출"""
    if '--' in title:
        parts = title.split('--')
        if len(parts) > 1:
            complaint = parts[-1].strip()
            if complaint and len(complaint) > 2:
                return complaint[:500]

    patterns = [
        r'[￭●■◆▶]\s*주\s*증\s*상\s*[:\s]*\n?([\s\S]*?)(?=[￭●■◆▶]|\n\n)',
        r'주증상[:\s]*\n?([\s\S]*?)(?=부수증상|참고|변상|변증|\n\n)',
        r'①\s*(.+?)(?:②|$)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text[:3000])
        if match:
            complaint = match.group(1).strip()
            complaint = re.sub(r'\s+', ' ', complaint)
            if complaint and len(complaint) > 5:
                return complaint[:500]

    formula = extract_formula_name(text)
    if formula:
        return f"{formula} 치험례"

    return title[:500] if title else "치험례"


def extract_symptoms(text):
    """증상 목록 추출"""
    symptoms = []

    circle_matches = re.findall(r'[①②③④⑤⑥⑦⑧⑨⑩]\s*(.+?)(?=[①②③④⑤⑥⑦⑧⑨⑩]|\n\n|$)', text[:3000])
    for match in circle_matches[:10]:
        symptom = re.sub(r'\s+', ' ', match.strip())
        if 2 < len(symptom) < 200:
            symptoms.append({"name": symptom, "severity": None, "duration": None, "bodyPart": None})

    if not symptoms:
        num_matches = re.findall(r'\d+\.\s*(.+?)(?=\d+\.|$)', text[:2000])
        for match in num_matches[:10]:
            symptom = re.sub(r'\s+', ' ', match.strip())
            if 2 < len(symptom) < 200:
                symptoms.append({"name": symptom, "severity": None, "duration": None, "bodyPart": None})

    return symptoms if symptoms else None


def split_sasang_cases(doc_text, file_info):
    """사상체질 치험례 분할 - 패턴: ■ 처방명(번호) -- 증상"""
    cases = []

    pattern = r'■\s*([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\((\d+-\d+-\d+|\d+-\d+)\)\s*(?:--|—|–)?\s*'

    splits = re.split(pattern, doc_text)

    if len(splits) > 3:
        for i in range(1, len(splits) - 2, 3):
            formula_name = splits[i].strip()
            case_number = splits[i + 1].strip()
            content = splits[i + 2].strip()

            if len(content) > 100:
                first_line = content.split('\n')[0].strip()
                title = f"{formula_name}({case_number}) -- {first_line}"

                cases.append({
                    'title': title[:300],
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': case_number,
                    'constitution': file_info.get('constitution')
                })

    return cases


def split_goreyongja_cases(doc_text, file_info):
    """고령자채록 치험례 분할"""
    cases = []

    pattern = r'\n\s*(?:\d+\.\s*)?([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s+(\d+-\d+)\.\s*'

    splits = re.split(pattern, doc_text)

    if len(splits) > 3:
        for i in range(1, len(splits) - 2, 3):
            formula_name = splits[i].strip()
            case_number = splits[i + 1].strip()
            content = splits[i + 2].strip()

            if len(content) > 50:
                first_line = content.split('\n')[0].strip()[:100]
                title = f"{formula_name} {case_number}. {first_line}"

                cases.append({
                    'title': title[:300],
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': case_number,
                    'constitution': None
                })

    return cases


def split_individual_case(doc_text, file_info, filename):
    """개별 치험례 파일"""
    cases = []

    if len(doc_text) > 100:
        formula_name = extract_formula_name(doc_text)
        description = file_info.get('description', filename)

        cases.append({
            'title': f"{formula_name}: {description}" if formula_name else description,
            'content': doc_text[:15000],
            'formula_name': formula_name,
            'case_number': "1",
            'constitution': None
        })

    return cases


def split_into_cases(doc_text, filename, file_info):
    """파일 유형에 따라 치험례 분할"""
    file_type = file_info.get('type', 'individual')

    if file_type == "sasang":
        cases = split_sasang_cases(doc_text, file_info)
    elif file_type == "goreyongja":
        cases = split_goreyongja_cases(doc_text, file_info)
    else:
        cases = split_individual_case(doc_text, file_info, filename)

    # Fallback
    if not cases and len(doc_text) > 500:
        print(f"  ⚠ 분할 실패, Fallback 적용")

        chunk_size = 8000
        chunks = []
        pos = 0

        while pos < len(doc_text):
            end_pos = min(pos + chunk_size, len(doc_text))
            para_end = doc_text.rfind('\n\n', pos, end_pos)
            if para_end > pos + 1000:
                end_pos = para_end

            chunk = doc_text[pos:end_pos].strip()
            if len(chunk) > 500:
                chunks.append(chunk)
            pos = end_pos

        for idx, chunk in enumerate(chunks[:50]):
            formula = extract_formula_name(chunk)
            cases.append({
                'title': f"{filename} - 치험례 {idx + 1}",
                'content': chunk,
                'formula_name': formula,
                'case_number': str(idx + 1),
                'constitution': file_info.get('constitution')
            })

    return cases


def parse_docx_file(file_path, file_info):
    """DOCX 파일 파싱"""
    try:
        doc = Document(str(file_path))
        filename = file_path.name

        full_text = '\n'.join([p.text for p in doc.paragraphs])

        print(f"  추출된 텍스트: {len(full_text)}자")

        raw_cases = split_into_cases(full_text, filename, file_info)
        print(f"  분할된 치험례: {len(raw_cases)}건")

        db_cases = []
        for idx, raw_case in enumerate(raw_cases):
            content = raw_case['content']
            title = raw_case['title']
            formula_name = raw_case.get('formula_name')
            case_number = raw_case.get('case_number', str(idx + 1))
            constitution = raw_case.get('constitution')

            if not constitution:
                constitution = extract_constitution(content)

            source_id = f"docx-word1-{filename}-{case_number}".replace(" ", "_")

            db_case = {
                "sourceId": source_id[:100],
                "recordedYear": 2008,
                "recorderName": "이종대",
                "patientGender": extract_gender(content),
                "patientAgeRange": extract_age_range(content),
                "patientConstitution": constitution,
                "chiefComplaint": extract_chief_complaint(content, title),
                "presentIllness": None,
                "patternDiagnosis": None,
                "clinicalNotes": None,
                "originalText": content[:10000],
                "symptoms": extract_symptoms(content),
                "herbalFormulas": [{"formulaName": formula_name, "herbs": [], "dosage": None}] if formula_name else None,
            }
            db_cases.append(db_case)

        return db_cases

    except Exception as e:
        print(f"  ⚠ 파싱 오류: {e}")
        import traceback
        traceback.print_exc()
        return []


def delete_existing_docx_cases():
    """기존 DOCX word1 기반 치험례 삭제"""
    print("\n기존 DOCX word1 기반 치험례 삭제 중...")

    try:
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/clinical_cases",
            headers=HEADERS,
            params={"sourceId": "like.docx-word1-%"}
        )

        if response.status_code in [200, 204]:
            print("  ✓ 기존 데이터 삭제 완료")
        else:
            print(f"  삭제 응답: {response.status_code}")

    except Exception as e:
        print(f"  삭제 오류: {e}")


def insert_cases(cases, batch_size=50):
    """Supabase에 삽입"""
    total = len(cases)
    inserted = 0
    failed = 0

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
                if failed <= 10:
                    print(f"  삽입 실패: {response.status_code} - {response.text[:200]}")

        except Exception as e:
            failed += len(batch)
            print(f"  삽입 오류: {e}")

    return inserted, failed


def main():
    print("=" * 70)
    print("  DOCX 치험례 파일 (word1) → Supabase DB 삽입")
    print("=" * 70)

    # Google Drive 경로 직접 지정
    docx_dir = Path(r"G:\내 드라이브\developer\hanmed-cdss\치험례\word1")

    if not docx_dir.exists():
        print(f"\n⚠ 디렉토리를 찾을 수 없습니다: {docx_dir}")
        return

    # 실제 파일 목록 확인
    print(f"\n디렉토리: {docx_dir}")
    print("DOCX 파일 검색 중...")

    # 기존 데이터 삭제
    delete_existing_docx_cases()

    all_cases = []
    stats = {"sasang": 0, "goreyongja": 0, "individual": 0}
    processed_files = []

    print("\n" + "=" * 70)
    print("  파일 처리 시작")
    print("=" * 70)

    for filename, file_info in DOCX_FILES.items():
        file_path = docx_dir / filename

        if file_path.exists():
            print(f"\n[{file_info['type']}] {filename}")

            cases = parse_docx_file(file_path, file_info)

            if cases:
                sample = cases[0]
                print(f"  샘플 - 주증상: {sample['chiefComplaint'][:50]}...")
                print(f"  샘플 - 성별: {sample['patientGender']}, 나이: {sample['patientAgeRange']}, 체질: {sample['patientConstitution']}")

                all_cases.extend(cases)
                stats[file_info['type']] += len(cases)
                processed_files.append({
                    'filename': filename,
                    'type': file_info['type'],
                    'cases_count': len(cases),
                    'constitution': file_info.get('constitution'),
                    'table': 'clinical_cases',
                    'source_prefix': f"docx-word1-{filename}"
                })
        else:
            print(f"\n⚠ 파일 없음: {filename}")

    # 통계 출력
    print("\n" + "=" * 70)
    print("  추출 통계")
    print("=" * 70)
    for file_type, count in stats.items():
        print(f"  {file_type:12}: {count:5}건")
    print(f"  {'총계':12}: {len(all_cases):5}건")

    # DB 삽입
    if all_cases:
        print("\n" + "=" * 70)
        print("  Supabase DB 삽입 중...")
        print("=" * 70)

        inserted, failed = insert_cases(all_cases)

        print(f"\n  ✓ 완료!")
        print(f"    - 삽입 성공: {inserted}건")
        print(f"    - 삽입 실패: {failed}건")
    else:
        print("\n⚠ 삽입할 데이터가 없습니다.")

    # 상세 보고
    print("\n" + "=" * 70)
    print("  📊 파일별 적재 보고서")
    print("=" * 70)

    for pf in processed_files:
        print(f"""
  ┌─────────────────────────────────────────────────────────────────┐
  │ 📄 파일: {pf['filename'][:50]}
  ├─────────────────────────────────────────────────────────────────┤
  │ • 파일 유형      : {pf['type']}
  │ • 사상체질       : {pf.get('constitution') or '본문에서 추출'}
  │ • 추출 건수      : {pf['cases_count']}건
  │ • 저장 테이블    : {pf['table']}
  │ • sourceId 형식  : {pf['source_prefix'][:40]}...
  │ • 검색 방법      : sourceId LIKE 'docx-word1-{pf['filename'][:20]}%'
  └─────────────────────────────────────────────────────────────────┘""")

    # DB 매핑 근거
    print("\n" + "=" * 70)
    print("  📋 DB 매핑 근거")
    print("=" * 70)
    print("""
  clinical_cases 테이블 컬럼 매핑:
  ┌─────────────────────┬────────────────────────────────────────────┐
  │ 컬럼                │ 추출 근거                                  │
  ├─────────────────────┼────────────────────────────────────────────┤
  │ sourceId            │ "docx-word1-{파일명}-{케이스번호}"         │
  │ recordedYear        │ 2008 (파일 작성 시기)                      │
  │ recorderName        │ "이종대" (저자)                            │
  │ patientGender       │ "남/여 NN세" 패턴 추출                    │
  │ patientAgeRange     │ "NN세" → 연령대 변환                      │
  │ patientConstitution │ 파일명(사상) 또는 본문에서 추출           │
  │ chiefComplaint      │ "■ 처방명 -- 증상" 또는 주증상 섹션      │
  │ originalText        │ 분할된 치험례 본문 (최대 10,000자)       │
  │ symptoms            │ ①②③ 또는 1.2.3. 패턴                     │
  │ herbalFormulas      │ "OO탕/산/환" 패턴 → formulaName          │
  └─────────────────────┴────────────────────────────────────────────┘
    """)

    # 검색 예시
    print("\n" + "=" * 70)
    print("  🔍 검색 예시 (Supabase)")
    print("=" * 70)
    print("""
  -- 소양인 치험례 검색
  SELECT * FROM clinical_cases
  WHERE "patientConstitution" = '소양인';

  -- 특정 파일에서 추출된 치험례 검색
  SELECT * FROM clinical_cases
  WHERE "sourceId" LIKE 'docx-word1-사상 소양인%';

  -- 처방명으로 검색
  SELECT * FROM clinical_cases
  WHERE "herbalFormulas"::text LIKE '%형방지황탕%';

  -- 주증상 키워드 검색
  SELECT * FROM clinical_cases
  WHERE "chiefComplaint" ILIKE '%두통%';
    """)


if __name__ == "__main__":
    main()
