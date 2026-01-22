"""
word 폴더의 미적재 DOCX 파일들을 Supabase에 삽입
- 태극지 시리즈 20개 (태1장~태20장)
- 고령자채록 3개
- 참고자료 3개
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

# word 폴더 경로
WORD_DIR = Path(r"G:\내 드라이브\developer\hanmed-cdss\치험례\word")

# 적재할 파일 목록
FILES_TO_LOAD = {
    # 태극지 시리즈
    "태1장(최종).docx": {"type": "taekeuk", "chapter": 1},
    "태2장(최종).docx": {"type": "taekeuk", "chapter": 2},
    "태3장(최종).docx": {"type": "taekeuk", "chapter": 3},
    "태4장(최종).docx": {"type": "taekeuk", "chapter": 4},
    "태5장(최종).docx": {"type": "taekeuk", "chapter": 5},
    "태6장(최종).docx": {"type": "taekeuk", "chapter": 6},
    "태7장(최종).docx": {"type": "taekeuk", "chapter": 7},
    "태8장(최종).docx": {"type": "taekeuk", "chapter": 8},
    "태9장(최종).docx": {"type": "taekeuk", "chapter": 9},
    "태10장(최종).docx": {"type": "taekeuk", "chapter": 10},
    "태11장(최종).docx": {"type": "taekeuk", "chapter": 11},
    "태12장(최종).docx": {"type": "taekeuk", "chapter": 12},
    "태13장(최종).docx": {"type": "taekeuk", "chapter": 13},
    "태14장(최종).docx": {"type": "taekeuk", "chapter": 14},
    "태15장(최종).docx": {"type": "taekeuk", "chapter": 15},
    "태16장(최종).docx": {"type": "taekeuk", "chapter": 16},
    "태17장(최종).docx": {"type": "taekeuk", "chapter": 17},
    "태18장(최종).docx": {"type": "taekeuk", "chapter": 18},
    "태19장(최종).docx": {"type": "taekeuk", "chapter": 19},
    "태20장(최종).docx": {"type": "taekeuk", "chapter": 20},
    # 고령자채록
    "11-1.고령자채록모음집.목차. 방안. 106사례 195쪽..22.5.23.이종대.docx": {"type": "goreyongja", "description": "고령자채록모음집 106사례"},
    "211119. 청주 감초당 한약방 한장훈선생 채록 22편 총100쪽.docx": {"type": "chaerok", "description": "청주 감초당 한장훈선생 채록"},
    "220603 고령자채록 수정본.docx": {"type": "goreyongja", "description": "고령자채록 수정본"},
    # 참고자료 (치험례가 포함되어 있을 수 있음)
    "감기의 한약치료(하권-2002년 6월 20일).docx": {"type": "reference", "description": "감기의 한약치료"},
    "빈용 202처방 정담편집4본.2005.3.2일기준. 2025.12.25. 이현석대표에게 발송.docx": {"type": "reference", "description": "빈용 202처방"},
    "새로보는 방약합편 1_상통-최종본. 2025.12.25. 이현석 대표에게.docx": {"type": "reference", "description": "새로보는 방약합편"},
}


def extract_gender(text):
    """텍스트에서 성별 추출"""
    search_text = text[:500]
    if re.search(r'남\s*\d{1,3}\s*세', search_text) or re.search(r'\d{1,3}\s*세\s*남', search_text):
        return 'male'
    if re.search(r'여\s*\d{1,3}\s*세', search_text) or re.search(r'\d{1,3}\s*세\s*여', search_text):
        return 'female'
    return 'unknown'


def extract_age_range(text):
    """텍스트에서 연령대 추출"""
    match = re.search(r'(\d{1,3})\s*세', text[:500])
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
    for const in ['태양인', '태음인', '소양인', '소음인']:
        if const in text[:1000]:
            return const
    return None


def extract_formula_name(text):
    """텍스트에서 처방명 추출"""
    match = re.search(r'([가-힣]{2,10}(?:탕|산|환|원|고|단|음|전|자|포))', text[:800])
    return match.group(1) if match else None


def extract_chief_complaint(text, title=""):
    """주증상 추출"""
    patterns = [
        r'주\s*증\s*상[:\s]*\n?([\s\S]*?)(?=부수증상|참고|변상|변증|\n\n)',
        r'①\s*(.+?)(?:②|$)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text[:3000])
        if match:
            complaint = re.sub(r'\s+', ' ', match.group(1).strip())
            if complaint and len(complaint) > 5:
                return complaint[:500]

    formula = extract_formula_name(text)
    if formula:
        return f"{formula} 치험례"
    return title[:500] if title else "치험례"


def split_taekeuk_cases(doc_text, file_info):
    """태극지 파일 분할 - 치험례 패턴 찾기"""
    cases = []
    chapter = file_info.get('chapter', 0)

    # 패턴 1: N. 처방명 N-N. 형식
    pattern1 = r'\n\s*(\d+)\.\s*([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s+(\d+-\d+)\.'
    matches = list(re.finditer(pattern1, doc_text))

    if matches:
        for idx, match in enumerate(matches):
            start_pos = match.start()
            end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(doc_text)

            seq_num = match.group(1)
            formula_name = match.group(2)
            case_number = match.group(3)
            content = doc_text[start_pos:end_pos].strip()

            if len(content) > 100:
                first_line = content.split('\n')[0].strip()[:100]
                cases.append({
                    'title': f"태극지 {chapter}장 - {formula_name} {case_number}",
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': f"{chapter}-{case_number}",
                    'constitution': extract_constitution(content)
                })

    # 패턴 2: 처방명(번호) 형식
    if not cases:
        pattern2 = r'\n([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\((\d+-\d+|\d+)\)'
        matches = list(re.finditer(pattern2, doc_text))

        for idx, match in enumerate(matches):
            start_pos = match.start()
            end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(doc_text)

            formula_name = match.group(1)
            case_number = match.group(2)
            content = doc_text[start_pos:end_pos].strip()

            if len(content) > 100:
                cases.append({
                    'title': f"태극지 {chapter}장 - {formula_name}({case_number})",
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': f"{chapter}-{case_number}",
                    'constitution': extract_constitution(content)
                })

    # Fallback: 청크로 분할
    if not cases and len(doc_text) > 1000:
        chunk_size = 8000
        pos = 0
        chunk_idx = 1

        while pos < len(doc_text):
            end_pos = min(pos + chunk_size, len(doc_text))
            para_end = doc_text.rfind('\n\n', pos, end_pos)
            if para_end > pos + 1000:
                end_pos = para_end

            chunk = doc_text[pos:end_pos].strip()
            if len(chunk) > 500:
                formula = extract_formula_name(chunk)
                cases.append({
                    'title': f"태극지 {chapter}장 - 치험례 {chunk_idx}",
                    'content': chunk[:15000],
                    'formula_name': formula,
                    'case_number': f"{chapter}-{chunk_idx}",
                    'constitution': extract_constitution(chunk)
                })
                chunk_idx += 1
            pos = end_pos

            if chunk_idx > 50:  # 최대 50개까지
                break

    return cases


def split_goreyongja_cases(doc_text, file_info):
    """고령자채록 파일 분할"""
    cases = []

    # 패턴: N. 처방명 N-N. 또는 처방명 N-N.
    pattern = r'\n\s*(?:\d+\.\s*)?([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s+(\d+-\d+)\.'
    matches = list(re.finditer(pattern, doc_text))

    if matches:
        for idx, match in enumerate(matches):
            start_pos = match.start()
            end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(doc_text)

            formula_name = match.group(1)
            case_number = match.group(2)
            content = doc_text[start_pos:end_pos].strip()

            if len(content) > 100:
                cases.append({
                    'title': f"{formula_name} {case_number}",
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': case_number,
                    'constitution': extract_constitution(content)
                })

    # Fallback
    if not cases and len(doc_text) > 1000:
        chunk_size = 8000
        pos = 0
        chunk_idx = 1

        while pos < len(doc_text) and chunk_idx <= 50:
            end_pos = min(pos + chunk_size, len(doc_text))
            para_end = doc_text.rfind('\n\n', pos, end_pos)
            if para_end > pos + 1000:
                end_pos = para_end

            chunk = doc_text[pos:end_pos].strip()
            if len(chunk) > 500:
                formula = extract_formula_name(chunk)
                cases.append({
                    'title': f"고령자채록 - 치험례 {chunk_idx}",
                    'content': chunk[:15000],
                    'formula_name': formula,
                    'case_number': str(chunk_idx),
                    'constitution': extract_constitution(chunk)
                })
                chunk_idx += 1
            pos = end_pos

    return cases


def split_reference_cases(doc_text, file_info):
    """참고자료 파일 - 치험례 패턴 찾거나 청크로 분할"""
    cases = []
    description = file_info.get('description', '')

    # 처방명 패턴 찾기
    pattern = r'\n([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*[:\n]'
    matches = list(re.finditer(pattern, doc_text))

    if len(matches) >= 3:
        for idx, match in enumerate(matches[:100]):  # 최대 100개
            start_pos = match.start()
            end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else min(start_pos + 10000, len(doc_text))

            formula_name = match.group(1)
            content = doc_text[start_pos:end_pos].strip()

            if len(content) > 200:
                cases.append({
                    'title': f"{description} - {formula_name}",
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': str(idx + 1),
                    'constitution': extract_constitution(content)
                })

    # Fallback
    if not cases and len(doc_text) > 1000:
        chunk_size = 10000
        pos = 0
        chunk_idx = 1

        while pos < len(doc_text) and chunk_idx <= 100:
            end_pos = min(pos + chunk_size, len(doc_text))
            para_end = doc_text.rfind('\n\n', pos, end_pos)
            if para_end > pos + 2000:
                end_pos = para_end

            chunk = doc_text[pos:end_pos].strip()
            if len(chunk) > 500:
                formula = extract_formula_name(chunk)
                cases.append({
                    'title': f"{description} - {chunk_idx}",
                    'content': chunk[:15000],
                    'formula_name': formula,
                    'case_number': str(chunk_idx),
                    'constitution': extract_constitution(chunk)
                })
                chunk_idx += 1
            pos = end_pos

    return cases


def parse_docx_file(file_path, file_info):
    """DOCX 파일 파싱"""
    try:
        doc = Document(str(file_path))
        filename = file_path.name
        file_type = file_info.get('type', 'unknown')

        full_text = '\n'.join([p.text for p in doc.paragraphs])
        print(f"  추출된 텍스트: {len(full_text):,}자")

        # 파일 유형에 따라 분할
        if file_type == "taekeuk":
            raw_cases = split_taekeuk_cases(full_text, file_info)
        elif file_type in ["goreyongja", "chaerok"]:
            raw_cases = split_goreyongja_cases(full_text, file_info)
        else:
            raw_cases = split_reference_cases(full_text, file_info)

        print(f"  분할된 치험례: {len(raw_cases)}건")

        # DB 형식으로 변환
        db_cases = []
        for idx, raw_case in enumerate(raw_cases):
            content = raw_case['content']
            # 고유한 sourceId 생성 (파일명 + 인덱스)
            source_id = f"word-{filename}-{idx+1:04d}".replace(" ", "_")[:100]

            db_case = {
                "sourceId": source_id,
                "recordedYear": 2022 if "고령자" in filename or "채록" in filename else 2008,
                "recorderName": "이종대" if "이종대" in filename else "한장훈" if "한장훈" in filename else None,
                "patientGender": extract_gender(content),
                "patientAgeRange": extract_age_range(content),
                "patientConstitution": raw_case.get('constitution'),
                "chiefComplaint": extract_chief_complaint(content, raw_case.get('title', '')),
                "originalText": content[:10000],
                "herbalFormulas": [{"formulaName": raw_case.get('formula_name'), "herbs": [], "dosage": None}] if raw_case.get('formula_name') else None,
            }
            db_cases.append(db_case)

        return db_cases

    except Exception as e:
        print(f"  파싱 오류: {e}")
        import traceback
        traceback.print_exc()
        return []


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
        batch = cases[i:i + batch_size]
        try:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/clinical_cases",
                headers=upsert_headers,
                json=batch
            )
            if response.status_code in [200, 201]:
                inserted += len(batch)
                print(f"  [{i + 1}-{i + len(batch)}] 삽입 완료")
            else:
                failed += len(batch)
                print(f"  [{i + 1}-{i + len(batch)}] 삽입 실패: {response.status_code}")
                print(f"    {response.text[:200]}")
        except Exception as e:
            failed += len(batch)
            print(f"  [{i + 1}-{i + len(batch)}] 오류: {e}")

    return inserted, failed


def main():
    print("=" * 70)
    print("  word 폴더 미적재 파일 -> Supabase 적재")
    print("=" * 70)

    all_cases = []
    results = []

    for filename, file_info in FILES_TO_LOAD.items():
        file_path = WORD_DIR / filename

        print(f"\n처리 중: {filename[:50]}{'...' if len(filename) > 50 else ''}")

        if not file_path.exists():
            print(f"  파일 없음!")
            results.append({"file": filename, "status": "파일 없음", "cases": 0})
            continue

        cases = parse_docx_file(file_path, file_info)

        if cases:
            all_cases.extend(cases)
            results.append({
                "file": filename,
                "status": "성공",
                "cases": len(cases),
                "type": file_info.get('type')
            })
        else:
            results.append({"file": filename, "status": "분할 실패", "cases": 0})

    # DB 삽입
    if all_cases:
        print(f"\n\n총 {len(all_cases)}건 DB 삽입 중...")
        inserted, failed = insert_cases(all_cases)
    else:
        inserted, failed = 0, 0

    # 결과 보고
    print("\n" + "=" * 70)
    print("  적재 결과 보고")
    print("=" * 70)

    # 유형별 집계
    type_summary = {}
    for r in results:
        t = r.get('type', 'unknown')
        if t not in type_summary:
            type_summary[t] = {"files": 0, "cases": 0}
        type_summary[t]["files"] += 1
        type_summary[t]["cases"] += r['cases']

    print("\n[유형별 요약]")
    for t, s in type_summary.items():
        print(f"  {t}: {s['files']}개 파일, {s['cases']}건")

    print(f"\n[총계]")
    print(f"  처리 파일: {len(results)}개")
    print(f"  총 치험례: {sum(r['cases'] for r in results)}건")
    print(f"  DB 삽입 성공: {inserted}건")
    print(f"  DB 삽입 실패: {failed}건")
    print("=" * 70)


if __name__ == "__main__":
    main()
