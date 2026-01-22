"""
D 드라이브 치험례 DOCX 파일에서 데이터 추출하여 Supabase에 삽입
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

# D 드라이브 치험례 폴더
BASE_DIR = Path(r"D:\★★★★★사업 개발부\온고지신 AI\치험례")

# DOCX 파일 목록과 유형
DOCX_FILES = {
    "사상 소양인 치험례 모음(081024).docx": {"type": "sasang", "constitution": "소양인"},
    "사상 소음인 치험례 모음(081024).docx": {"type": "sasang", "constitution": "소음인"},
    "사상 태양인 치험례 모음081025.docx": {"type": "sasang", "constitution": "태양인"},
    "사상 태음인 치험례 모음(081024).docx": {"type": "sasang", "constitution": "태음인"},
    "최경구. 삼례. 연수당. 흑색종.docx": {"type": "individual", "description": "흑색종 치험례 (온열요법)"},
    "1차본1.고령자채록모음집.22.5.12.docx": {"type": "goreyongja", "description": "고령자채록모음집"},
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
    """사상체질 치험례 분할 - 개선된 다중 패턴"""
    cases = []

    # 패턴 0: N-N 로 시작하는 치험례 (소음인 파일 전용)
    # "1-1  향부자팔물탕", "1-2 ■ 향부자팔물탕", "10-1 파두단" 등
    pattern0 = r'\n(\d+-\d+)\s*[■￭]?\s*([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))'
    matches0 = list(re.finditer(pattern0, doc_text))

    if len(matches0) >= 3:
        for idx, match in enumerate(matches0):
            start_pos = match.start()
            end_pos = matches0[idx + 1].start() if idx + 1 < len(matches0) else len(doc_text)

            case_id = match.group(1)
            formula_name = match.group(2)
            content = doc_text[start_pos:end_pos].strip()

            if len(content) > 200:
                # 첫 줄에서 제목 추출
                lines = content.split('\n')
                first_line = lines[0].strip()[:150] if lines else ""

                cases.append({
                    'title': first_line[:300],
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': case_id,
                    'constitution': file_info.get('constitution')
                })

    # 패턴 1: N-N ■ 처방명(NN-NN-NN) 형식
    if not cases:
        pattern1 = r'\n(\d+-\d+)\s*■\s*([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\((\d+-\d+-\d+|\d+-\d+)\)'
        matches = list(re.finditer(pattern1, doc_text))

        if matches:
            for idx, match in enumerate(matches):
                start_pos = match.end()
                end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(doc_text)

                case_id = match.group(1)
                formula_name = match.group(2)
                case_number = match.group(3)
                content = doc_text[start_pos:end_pos].strip()

                if len(content) > 100:
                    first_line = content.split('\n')[0].strip()[:100]
                    cases.append({
                        'title': f"{case_id} {formula_name}({case_number}) -- {first_line}",
                        'content': content[:15000],
                        'formula_name': formula_name,
                        'case_number': f"{case_id}-{case_number}",
                        'constitution': file_info.get('constitution')
                    })

    # 패턴 2: ■ 처방명(N-N-N) -- 증상 형식 (소양인 파일)
    if not cases:
        pattern2 = r'■\s*([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\((\d+-\d+-\d+|\d+-\d+)\)\s*(?:--|—|–)?\s*'
        splits2 = re.split(pattern2, doc_text)

        if len(splits2) > 3:
            for i in range(1, len(splits2) - 2, 3):
                formula_name = splits2[i].strip()
                case_number = splits2[i + 1].strip()
                content = splits2[i + 2].strip()

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

    # 패턴 3: N. 처방명 N-N. 형식 (태음인/고령자 파일)
    if not cases:
        pattern3 = r'\n\s*(?:\d+\.\s*)?([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s+(\d+-\d+)\.'
        matches = list(re.finditer(pattern3, doc_text))

        for idx, match in enumerate(matches):
            start_pos = match.end()
            end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(doc_text)

            formula_name = match.group(1)
            case_number = match.group(2)
            content = doc_text[start_pos:end_pos].strip()

            if len(content) > 50:
                first_line = content.split('\n')[0].strip()[:100]
                cases.append({
                    'title': f"{formula_name} {case_number} -- {first_line}",
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': case_number,
                    'constitution': file_info.get('constitution')
                })

    # 패턴 4: N-N 처방명(번호) 형식
    if not cases:
        pattern4 = r'\n(\d+-\d+)\s+([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\((\d+)\)'
        matches = list(re.finditer(pattern4, doc_text))

        for idx, match in enumerate(matches):
            start_pos = match.end()
            end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(doc_text)

            case_id = match.group(1)
            formula_name = match.group(2)
            sub_number = match.group(3)
            content = doc_text[start_pos:end_pos].strip()

            if len(content) > 50:
                first_line = content.split('\n')[0].strip()[:100]
                cases.append({
                    'title': f"{case_id} {formula_name}({sub_number}) -- {first_line}",
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': f"{case_id}-{sub_number}",
                    'constitution': file_info.get('constitution')
                })

    # 패턴 5: 처방명(번호) 형식
    if not cases:
        pattern5 = r'\n([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\((\d+-\d+|\d+)\)\s*\n'
        matches = list(re.finditer(pattern5, doc_text))

        for idx, match in enumerate(matches):
            start_pos = match.end()
            end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(doc_text)

            formula_name = match.group(1)
            case_number = match.group(2)
            content = doc_text[start_pos:end_pos].strip()

            if len(content) > 50:
                first_line = content.split('\n')[0].strip()[:100]
                cases.append({
                    'title': f"{formula_name}({case_number}) -- {first_line}",
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
    """개별 치험례 파일 - 흑색종 파일 특별 처리"""
    cases = []

    if "흑색종" in filename:
        # 흑색종 파일: 여러 사례 포함
        # <제목> 패턴으로 분할
        section_pattern = r'<([^>]+)>'
        sections = re.split(section_pattern, doc_text)

        if len(sections) > 2:
            for i in range(1, len(sections) - 1, 2):
                section_title = sections[i].strip()
                section_content = sections[i + 1].strip() if i + 1 < len(sections) else ""

                if len(section_content) > 100:
                    formula_name = extract_formula_name(section_content)
                    cases.append({
                        'title': f"흑색종 치험례: {section_title}",
                        'content': section_content[:15000],
                        'formula_name': formula_name,
                        'case_number': str(len(cases) + 1),
                        'constitution': None
                    })

        # 섹션 분할 실패 시 전체를 하나로
        if not cases and len(doc_text) > 100:
            cases.append({
                'title': "흑색종 치험례 (온열요법, 고열발한탕, 인삼패독산)",
                'content': doc_text[:15000],
                'formula_name': "고열발한탕",
                'case_number': "1",
                'constitution': None
            })
    else:
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
        print(f"  경고: 분할 실패, Fallback 적용")

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

            source_id = f"docx-d-{filename}-{case_number}".replace(" ", "_")

            # recordedYear 결정
            if "081024" in filename or "081025" in filename:
                recorded_year = 2008
            elif "22.5.12" in filename:
                recorded_year = 2022
            else:
                recorded_year = 2024

            db_case = {
                "sourceId": source_id[:100],
                "recordedYear": recorded_year,
                "recorderName": "이종대" if recorded_year == 2022 else "최경구" if "흑색종" in filename else "이종대",
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
        print(f"  파싱 오류: {e}")
        import traceback
        traceback.print_exc()
        return []


def delete_existing_d_drive_cases():
    """기존 D 드라이브 기반 치험례 삭제"""
    print("\n기존 D 드라이브 기반 치험례 삭제 중...")

    try:
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/clinical_cases",
            headers=HEADERS,
            params={"sourceId": "like.docx-d-%"}
        )

        if response.status_code in [200, 204]:
            print("  기존 데이터 삭제 완료")
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
                print(f"    응답: {response.text[:300]}")

        except Exception as e:
            failed += len(batch)
            print(f"  [{i + 1}-{i + len(batch)}] 오류: {e}")

    return inserted, failed


def main():
    print("=" * 60)
    print("  D 드라이브 치험례 DOCX -> Supabase 적재")
    print("=" * 60)

    # 기존 데이터 삭제
    delete_existing_d_drive_cases()

    all_cases = []
    results = []

    for filename, file_info in DOCX_FILES.items():
        file_path = BASE_DIR / filename

        print(f"\n처리 중: {filename}")

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
                "constitution": file_info.get('constitution'),
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
    print("\n" + "=" * 60)
    print("  적재 결과 보고")
    print("=" * 60)

    total_cases = 0
    for r in results:
        print(f"\n{r['file']}")
        print(f"  상태: {r['status']}")
        print(f"  치험례 수: {r['cases']}건")
        if r.get('constitution'):
            print(f"  체질: {r['constitution']}")
        if r.get('type'):
            print(f"  유형: {r['type']}")
        total_cases += r['cases']

    print(f"\n{'=' * 60}")
    print(f"  총 치험례: {total_cases}건")
    print(f"  DB 삽입 성공: {inserted}건")
    print(f"  DB 삽입 실패: {failed}건")
    print("=" * 60)

    # 상세 내역 JSON 저장
    report = {
        "files": results,
        "total_cases": total_cases,
        "inserted": inserted,
        "failed": failed
    }

    report_path = BASE_DIR / "import_report.json"
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n상세 보고서: {report_path}")
    except:
        pass


if __name__ == "__main__":
    main()
