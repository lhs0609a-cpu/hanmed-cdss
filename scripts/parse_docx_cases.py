#!/usr/bin/env python3
"""
치험례 DOCX 파일 파싱 스크립트
- 다양한 형식의 치험례 문서를 파싱하여 JSON으로 변환
"""

import os
import re
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Optional, Any
import hashlib

# 프로젝트 루트 경로
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "apps" / "ai-engine" / "data"
CASES_DIR = PROJECT_ROOT / "치험례"


def extract_text_from_docx(docx_path: str) -> str:
    """DOCX 파일에서 텍스트 추출"""
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)

            # 모든 텍스트 노드 추출
            namespaces = {
                'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
            }

            texts = []
            for elem in tree.iter():
                if elem.tag.endswith('}t'):
                    if elem.text:
                        texts.append(elem.text)

            return ' '.join(texts)
    except Exception as e:
        print(f"Error extracting text from {docx_path}: {e}")
        return ""


def parse_patient_info(text: str) -> Dict[str, Any]:
    """환자 정보 파싱"""
    patient_info = {
        "age": None,
        "gender": None,
        "constitution": None
    }

    # 나이 추출
    age_patterns = [
        r'(\d{1,3})\s*세',
        r'남\s*(\d{1,3})',
        r'여\s*(\d{1,3})',
    ]
    for pattern in age_patterns:
        match = re.search(pattern, text)
        if match:
            try:
                age = int(match.group(1))
                if 0 < age < 120:
                    patient_info["age"] = age
                    break
            except:
                pass

    # 성별 추출
    if re.search(r'\b남\b|남자|남성', text):
        patient_info["gender"] = "M"
    elif re.search(r'\b여\b|여자|여성', text):
        patient_info["gender"] = "F"

    # 체질 추출
    constitution_map = {
        "소음인": "소음인",
        "소양인": "소양인",
        "태음인": "태음인",
        "태양인": "태양인"
    }
    for const_name, const_value in constitution_map.items():
        if const_name in text:
            patient_info["constitution"] = const_value
            break

    return patient_info


def extract_symptoms(text: str) -> List[str]:
    """증상 추출"""
    symptoms = []

    # 주증상 패턴
    symptom_patterns = [
        r'주\s*증\s*상\s*[:\s]*(.+?)(?=부수증상|참\s*고|변\s*증|치\s*법|처방|복\s*용|$)',
        r'주\s*소\s*[:\s]*(.+?)(?=참\s*고|변\s*증|치\s*법|$)',
        # ① ② ③ 번호가 있는 증상
        r'[①②③④⑤⑥⑦⑧⑨⑩]\s*([가-힣()（）\s]{2,50}?)(?=[①②③④⑤⑥⑦⑧⑨⑩]|처방|변증|$)',
    ]

    for pattern in symptom_patterns:
        matches = re.findall(pattern, text, re.DOTALL)
        if matches:
            for match_text in matches:
                if isinstance(match_text, str):
                    symptom_text = match_text
                else:
                    symptom_text = match_text[0] if match_text else ""

                # 번호 패턴으로 증상 분리
                numbered_symptoms = re.findall(r'[①②③④⑤⑥⑦⑧⑨⑩\d]+[.\s]*([가-힣()（）\s]{2,50}?)(?=[①②③④⑤⑥⑦⑧⑨⑩\d]|$)', symptom_text)
                if numbered_symptoms:
                    symptoms.extend([s.strip()[:100] for s in numbered_symptoms if s.strip() and len(s.strip()) > 1])
                else:
                    # 쉼표나 마침표로 분리
                    parts = re.split(r'[,，.。]', symptom_text)
                    symptoms.extend([p.strip()[:100] for p in parts if p.strip() and len(p.strip()) > 2])

    # 증상이 없으면 일반적인 증상 키워드 추출
    if not symptoms:
        common_symptoms = [
            '두통', '어지러움', '현훈', '불면', '피로', '무기력',
            '소화불량', '식욕부진', '구역', '구토', '복통', '설사', '변비',
            '기침', '가래', '천식', '호흡곤란', '숨참',
            '요통', '관절통', '근육통', '신경통', '마비',
            '중풍', '반신불수', '언어장애', '구안와사',
            '고혈압', '저혈압', '심계', '부정맥',
            '부종', '수종', '소변불리', '빈뇨',
            '월경통', '월경불순', '불임', '냉대하',
            '발열', '오한', '감기', '비염', '축농증',
        ]
        for symptom in common_symptoms:
            if symptom in text:
                symptoms.append(symptom)

    # 중복 제거
    seen = set()
    unique_symptoms = []
    for s in symptoms:
        s_clean = s.strip()
        if s_clean and s_clean not in seen and len(s_clean) > 1:
            seen.add(s_clean)
            unique_symptoms.append(s_clean)

    return unique_symptoms[:10]  # 최대 10개


def extract_formula_name(text: str, filename: str) -> tuple:
    """처방명 추출 - 개선된 버전"""
    formula_name = ""
    formula_hanja = ""

    # 처방명 접미사 패턴
    formula_suffixes = r'(?:탕|산|환|음|원|고|단|방|차|주|액|엑스|가피|백피|청피)'

    # 1. 파일명에서 추출 시도
    filename_match = re.search(r'([가-힣]{2,}' + formula_suffixes + r')', filename)
    if filename_match:
        formula_name = filename_match.group(1)

    # 2. 파일명 시작 부분에서 처방명 추출 (예: "가시오가피(00-075-05)")
    filename_start = re.search(r'^([가-힣]{2,})', os.path.basename(filename))
    if filename_start and not formula_name:
        potential = filename_start.group(1)
        if len(potential) >= 2 and not potential.endswith(('장', '편', '권')):
            formula_name = potential

    # 3. 본문 첫 부분에서 추출 (처방명(코드) 형식)
    first_line_patterns = [
        # 처방명(코드) 형식 - 가장 일반적
        r'^([가-힣]{2,}' + formula_suffixes + r'?)\s*\([0-9\-]+\)',
        # ■ 처방명(코드) 형식
        r'■\s*([가-힣]{2,}' + formula_suffixes + r')\s*\(',
        # 처방명(한자) 형식
        r'^([가-힣]{2,}' + formula_suffixes + r')\s*\([一-龥]+\)',
        # 단독 처방명
        r'^([가-힣]{2,}' + formula_suffixes + r')\s',
    ]

    if not formula_name:
        for pattern in first_line_patterns:
            match = re.search(pattern, text[:500], re.MULTILINE)
            if match:
                potential = match.group(1)
                if len(potential) >= 2:
                    formula_name = potential
                    break

    # 4. 처방 키워드로 추출 (기본 패턴)
    if not formula_name:
        treatment_patterns = [
            r'처\s*방\s*[:\s]*([가-힣]{2,}' + formula_suffixes + r')',
            r'투\s*약\s*[:\s]*([가-힣]{2,}' + formula_suffixes + r')',
            r'치\s*료\s*[:\s]*([가-힣]{2,}' + formula_suffixes + r')',
        ]
        for pattern in treatment_patterns:
            match = re.search(pattern, text)
            if match:
                formula_name = match.group(1)
                break

    # 5. 투약내역, 처방구상, 처방구성 등 확장 패턴 (태XX장 형식)
    if not formula_name:
        extended_patterns = [
            # "투약내역 : 처방은 ... XXX탕" 형식
            r'투\s*약\s*내\s*역\s*[:\s].{0,100}?([가-힣]{2,}' + formula_suffixes + r')',
            # "처방구상 : ... XXX탕을 쓰기로" 형식
            r'처\s*방\s*구\s*상\s*[:\s].{0,200}?([가-힣]{2,}' + formula_suffixes + r')을?\s*(?:쓰|투|사용)',
            # "처방구성 : ... XXX탕" 형식
            r'처\s*방\s*구\s*성\s*[:\s].{0,100}?([가-힣]{2,}' + formula_suffixes + r')',
            # "XXX탕을 쓰기로 하였다" 형식
            r'([가-힣]{2,}' + formula_suffixes + r')을?\s*(?:쓰기로|투여|처방|사용)',
            # "XXX탕을 2제 지어" 형식
            r'([가-힣]{2,}' + formula_suffixes + r')을?\s*\d+\s*제',
            # "목표로 XXX탕을" 형식
            r'목표로\s*([가-힣]{2,}' + formula_suffixes + r')',
            # "치법 : ... XXX탕"
            r'치\s*법\s*[:\s].{0,150}?([가-힣]{2,}' + formula_suffixes + r')',
        ]
        for pattern in extended_patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                formula_name = match.group(1)
                break

    # 6. 목차/제목에서 처방명 추출 (예: "1. 승지조위탕의 치험례")
    if not formula_name:
        title_patterns = [
            r'\d+\.\s*([가-힣]{2,}' + formula_suffixes + r')의?\s*(?:치험례|치험|사례)',
            r'([가-힣]{2,}' + formula_suffixes + r')\s*치험례',
            r'([가-힣]{2,}' + formula_suffixes + r')\s*\(\d+편\)',
        ]
        for pattern in title_patterns:
            match = re.search(pattern, text[:1000])
            if match:
                formula_name = match.group(1)
                break

    # 7. 텍스트 내 모든 처방명 후보 중 가장 먼저 나오는 것 선택
    if not formula_name:
        all_formulas = re.findall(r'([가-힣]{2,}' + formula_suffixes + r')', text[:2000])
        # 필터링: 잘못된 이름 제외
        invalid_names = {'을', '의', '가', '이', '에', '로', '과', '와', '뛰고', '았고', '었고', '위원',
                        '하였', '되었', '같았', '보였', '나왔', '들었', '겠'}
        valid_formulas = [f for f in all_formulas if f not in invalid_names and len(f) >= 3]
        if valid_formulas:
            formula_name = valid_formulas[0]

    # 8. 한자 추출
    hanja_patterns = [
        r'\(([一-龥]{2,}(?:湯|散|丸|飮|元|膏|丹|方)?)\)',
        r'([一-龥]{2,}(?:湯|散|丸|飮|元|膏|丹|方))',
    ]
    for pattern in hanja_patterns:
        match = re.search(pattern, text[:500])
        if match:
            formula_hanja = match.group(1)
            break

    # 9. 잘못된 처방명 필터링
    invalid_names = {'을', '의', '가', '이', '에', '로', '과', '와', '뛰고', '았고', '었고', '위원',
                    '하였', '되었', '같았', '보였', '나왔', '들었', '겠', '태극', '대한'}
    if formula_name in invalid_names or len(formula_name) < 2:
        formula_name = ""

    return formula_name, formula_hanja


def extract_diagnosis(text: str) -> str:
    """진단/변증 추출"""
    # 변증 패턴
    patterns = [
        r'변\s*증\s*[:\s]*([가-힣]+(?:증|허|실|열|한|담|어혈|기체|혈허|기허|음허|양허)[가-힣]*)',
        r'진\s*단\s*[:\s]*([가-힣]{2,20})',
        r'병\s*명\s*[:\s]*([가-힣]{2,20})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()[:50]

    # 한의학 변증 키워드 직접 추출
    diagnosis_keywords = [
        '기허', '혈허', '음허', '양허', '기체', '혈어', '담음', '습담',
        '간기울결', '간양상항', '심비양허', '비기허', '신양허', '신음허',
        '폐기허', '위기허', '기혈양허', '음양양허', '담화', '습열',
        '풍한', '풍열', '풍습', '한습', '습열', '어혈', '식적',
    ]

    for keyword in diagnosis_keywords:
        if keyword in text:
            return keyword

    return ""


def extract_chief_complaint(text: str) -> str:
    """주소증 추출"""
    patterns = [
        # 처방명 다음의 주소증 (예: "소속명탕 1-1. 중풍")
        r'[가-힣]+(?:탕|산|환|음|원|방|전|단)\s+\d+-\d+\.\s*([가-힣()（）\s]{2,30}?)(?=\s*다음은|\s*○|\s*남|\s*여|\s*\d+세)',
        # 기존 패턴
        r'^[가-힣]+(?:탕|산|환|음)\s*\([^)]+\)\s*(.+?)(?=\s*-|$)',
        r'주\s*증\s*상\s*[:\s]*(.+?)(?=\d+\.|부수|참고)',
        r'주\s*소\s*[:\s]*(.+?)(?=참고|변증)',
        # 번호-번호. 다음의 주소증 (감기의 한약치료 형식)
        r'\d+-\d+\.\s*[남여]\s*\d+\s*[가-힣]+인?\s+([가-힣]+)',
        # 제목 형식
        r'[●■]\s*[가-힣]+(?:탕|산|환|음)\s*\([^)]+\)\s*([가-힣()（）,\s]{2,50})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.MULTILINE)
        if match:
            complaint = match.group(1).strip()
            # 괄호 내용 정리
            complaint = re.sub(r'\s+', ' ', complaint)
            # 너무 길면 자르기
            if len(complaint) > 100:
                complaint = complaint[:100]
            if len(complaint) >= 2:
                return complaint

    return ""


def parse_single_case(case_text: str, filename: str, case_index: int) -> Optional[Dict]:
    """단일 치험례 파싱"""
    if len(case_text) < 50:
        return None

    formula_name, formula_hanja = extract_formula_name(case_text, filename)
    patient_info = parse_patient_info(case_text)
    symptoms = extract_symptoms(case_text)
    chief_complaint = extract_chief_complaint(case_text)
    diagnosis = extract_diagnosis(case_text)

    if not formula_name and not chief_complaint and not symptoms:
        return None

    # ID 생성
    base_name = Path(filename).stem
    case_id = f"docx_{base_name}_{case_index}"

    # 제목 생성
    title = chief_complaint if chief_complaint else (symptoms[0] if symptoms else formula_name)

    # 결과 추출
    result_patterns = [
        r'경\s*과\s*[:\s]*(.+?)(?=증\s*상|복\s*용|치\s*료|$)',
        r'결\s*과\s*[:\s]*(.+?)(?=$)',
    ]
    result = ""
    for pattern in result_patterns:
        match = re.search(pattern, case_text, re.DOTALL)
        if match:
            result = match.group(1).strip()[:500]
            break

    # 데이터 소스
    data_source = f"docx_{base_name}"

    # search_text 생성 (diagnosis 포함)
    search_text = f"{formula_name} {formula_hanja} {title} {diagnosis} {' '.join(symptoms)}"

    return {
        "id": case_id,
        "formula_id": f"docx_{formula_name}" if formula_name else "",
        "formula_name": formula_name,
        "formula_hanja": formula_hanja,
        "title": title[:200] if title else "",
        "chief_complaint": chief_complaint[:200] if chief_complaint else "",
        "symptoms": symptoms,
        "diagnosis": diagnosis,
        "patient_age": patient_info["age"],
        "patient_gender": patient_info["gender"],
        "patient_constitution": patient_info["constitution"],
        "treatment_formula": formula_name,
        "treatment_modification": "",
        "result": result,
        "progress": [],
        "data_source": data_source,
        "search_text": search_text,
        "symptom_keywords": symptoms[:5]
    }


def split_into_cases(text: str) -> List[str]:
    """텍스트를 개별 치험례로 분리 - 개선된 버전"""
    best_cases = []
    min_len = 80  # 기본 최소 글자 수

    # 파일 형식 감지 (태XX장 형식인지 확인)
    is_tae_format = bool(re.search(r'태\s*\d+\s*호|용\s*모\s*:|과\s*정\s*:|주\s*증\s*상\s*:', text[:500]))

    if is_tae_format:
        # 태XX장 형식: "이름 + 나이 + 체질 + 지역" 패턴으로 분리
        # 예: "이 ○ ○   남 60 세 태음인   의사"
        tae_pattern = r'(?=[가-힣]\s*[○●]\s*[○●]\s+[남여]\s*\d+\s*세?\s*(?:태음인|태양인|소음인|소양인)?)'
        tae_parts = re.split(tae_pattern, text)
        if len(tae_parts) > 1:
            # 목차 부분 제거 (첫 부분이 목차인 경우)
            if '치험례' in tae_parts[0][:200] and '편)' in tae_parts[0][:500]:
                tae_parts = tae_parts[1:]
            best_cases = [p.strip() for p in tae_parts if p.strip() and len(p.strip()) > 200]

        # 위 패턴이 안 먹히면 "용 모 :" 패턴으로 시도
        if len(best_cases) < 2:
            yongmo_pattern = r'(?=용\s*모\s*:)'
            yongmo_parts = re.split(yongmo_pattern, text)
            if len(yongmo_parts) > 1:
                yongmo_cases = [p.strip() for p in yongmo_parts if p.strip() and len(p.strip()) > 200]
                if len(yongmo_cases) > len(best_cases):
                    best_cases = yongmo_cases

        if best_cases:
            return best_cases

    # 치험례 구분 패턴들
    split_patterns = [
        # 처방명 번호-번호. 패턴 (220603 고령자채록 본문 형식)
        r'(?=[가-힣]{2,}(?:탕|산|환|음|원|방|전|단)\s+\d+-\d+\.)',
        # ●처방명 패턴 (고령자채록 형식)
        r'(?=●[가-힣]+(?:탕|산|환|음|원|방|전|단)\s*\([^)]+\))',
        # ■ 처방명 패턴
        r'(?=■\s*[가-힣]+(?:탕|산|환|음|원|방|전|단))',
        # 번호. 처방명 번호-번호. 패턴
        r'(?=\d+\.\s*[가-힣]+(?:탕|산|환|음|원|방|전|단)\s+\d+-\d+\.)',
        # 처방명(코드) 형식 - 개별 파일용
        r'(?=[가-힣]+(?:탕|산|환|음|원|고|방|전|단)\s*\(\d+-\d+)',
        # 처방명(코드) 일반
        r'(?=[가-힣]+(?:탕|산|환|음|원|고)\s*\([0-9\-]+\))',
        # 소속명탕 1-1. 형식 (공백 없는 버전)
        r'(?=[가-힣]+(?:탕|산|환|음)\s*\d+-\d+\.)',
        # 번호. 처방명(코드) 패턴 (목차 형식)
        r'(?=\d+\.\s*[가-힣]+(?:탕|산|환|음|원|방|전|단)\s*\([^)]+\))',
        # 번호. 처방명 패턴 (더 느슨한)
        r'(?=\d+\.\s*[가-힣]{2,}(?:탕|산|환|음|원|방|전|단|고))',
        # 번호-코드 패턴 (1-007-01 형식)
        r'(?=\d+-\d+-\d+)',
        # ■과정 패턴으로 분리 (상세 치험례)
        r'(?=■과정|■주증상)',
        # ●처방명 일반
        r'(?=●[가-힣]+)',
        # === 구분자
        r'(?====)',
    ]

    # 모든 패턴을 시도하고 가장 많은 케이스를 추출하는 패턴 선택
    for pattern in split_patterns:
        try:
            parts = re.split(pattern, text)
            if len(parts) > 1:
                # 최소 글자 수 이상인 파트만 유효한 케이스로 간주
                cases = [p.strip() for p in parts if p.strip() and len(p.strip()) > min_len]
                if len(cases) > len(best_cases):
                    best_cases = cases
        except re.error:
            continue

    # 추가 패턴: 번호-번호. 남/여 (감기의 한약치료 형식) - 짧은 케이스 허용
    # 이 패턴은 기존 분리가 충분하지 않을 때만 적용
    short_pattern = r'(?=\d+-\d+\.\s*[남여]\s*\d)'
    short_parts = re.split(short_pattern, text)
    if len(short_parts) > 1:
        short_cases = [p.strip() for p in short_parts if p.strip() and len(p.strip()) > 15]
        # 기존보다 훨씬 많은 케이스가 추출되면 사용 (최소 2배 이상)
        if len(short_cases) > len(best_cases) * 2:
            best_cases = short_cases

    # 분리되지 않았으면 전체를 하나의 케이스로
    if not best_cases and len(text) > 100:
        best_cases = [text]

    return best_cases


def process_docx_file(docx_path: str) -> List[Dict]:
    """DOCX 파일 처리"""
    print(f"Processing: {docx_path}")

    text = extract_text_from_docx(docx_path)
    if not text:
        return []

    filename = os.path.basename(docx_path)
    cases_text = split_into_cases(text)

    parsed_cases = []
    for i, case_text in enumerate(cases_text):
        parsed = parse_single_case(case_text, filename, i + 1)
        if parsed:
            parsed_cases.append(parsed)

    # 파싱된 케이스가 없고 텍스트가 충분히 길면 전체를 하나의 케이스로 처리
    # (특수한 형식의 단일 치험례 파일 처리)
    if not parsed_cases and len(text) > 100:
        # 파일명에서 처방명 추출 시도
        base_name = Path(docx_path).stem
        case_id = f"docx_{base_name}_1"

        # 텍스트에서 정보 추출
        patient_info = parse_patient_info(text)
        symptoms = extract_symptoms(text)

        # 간단한 제목 생성
        title = text[:100].strip() if len(text) > 100 else text.strip()

        parsed_cases.append({
            "id": case_id,
            "formula_id": f"docx_{base_name}",
            "formula_name": base_name.split('-')[0] if '-' in base_name else base_name,
            "formula_hanja": "",
            "title": title,
            "chief_complaint": title[:200],
            "symptoms": symptoms,
            "diagnosis": "",
            "patient_age": patient_info["age"],
            "patient_gender": patient_info["gender"],
            "patient_constitution": patient_info["constitution"],
            "treatment_formula": "",
            "treatment_modification": "",
            "result": "",
            "progress": [],
            "data_source": f"docx_{base_name}",
            "search_text": f"{base_name} {title} {' '.join(symptoms)}",
            "symptom_keywords": symptoms[:5]
        })

    print(f"  Found {len(parsed_cases)} cases")
    return parsed_cases


def main():
    """메인 함수"""
    print("=" * 60)
    print("치험례 DOCX 파일 파싱 시작")
    print("=" * 60)

    # DOCX 파일 목록 (치험례 폴더와 치험례/word 폴더 모두 검색)
    docx_files = list(CASES_DIR.glob("*.docx"))
    word_subdir = CASES_DIR / "word"
    if word_subdir.exists():
        docx_files.extend(list(word_subdir.glob("*.docx")))
    print(f"\n총 {len(docx_files)}개의 DOCX 파일 발견\n")

    all_cases = []

    for docx_path in docx_files:
        cases = process_docx_file(str(docx_path))
        all_cases.extend(cases)

    print(f"\n총 {len(all_cases)}개의 치험례 추출 완료")

    # 기존 데이터 로드
    existing_cases = []
    existing_file = DATA_DIR / "extracted_cases.json"
    if existing_file.exists():
        with open(existing_file, 'r', encoding='utf-8') as f:
            existing_cases = json.load(f)
        print(f"기존 데이터: {len(existing_cases)}개")

    # 기존 docx 케이스 제거 (새로 파싱하므로)
    non_docx_cases = [c for c in existing_cases if not c.get("data_source", "").startswith("docx_")]
    print(f"기존 non-docx 케이스: {len(non_docx_cases)}개")

    # 새 케이스에서 유효한 것만 필터링 (처방명 또는 증상이 있어야 함)
    valid_cases = [c for c in all_cases if c.get("formula_name") or c.get("symptoms")]
    print(f"유효한 새 케이스: {len(valid_cases)}개")

    # 병합
    merged_cases = non_docx_cases + valid_cases

    # 저장
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(existing_file, 'w', encoding='utf-8') as f:
        json.dump(merged_cases, f, ensure_ascii=False, indent=2)

    print(f"\n최종 저장: {len(merged_cases)}개 케이스")
    print(f"저장 위치: {existing_file}")
    print("=" * 60)

    # 통계 출력
    formula_counts = {}
    for c in valid_cases:
        f = c.get("formula_name") or "미분류"
        formula_counts[f] = formula_counts.get(f, 0) + 1

    print("\n처방별 케이스 수 (상위 20개):")
    for formula, count in sorted(formula_counts.items(), key=lambda x: -x[1])[:20]:
        print(f"  - {formula}: {count}개")

    # 샘플 출력
    print("\n추출된 케이스 샘플:")
    for case in valid_cases[:10]:
        print(f"  - [{case.get('formula_name') or 'N/A'}] {case.get('title', '')[:40]}...")
        if case.get('patient_constitution'):
            print(f"    환자: {case.get('patient_age')}세 {case.get('patient_gender') or ''} {case.get('patient_constitution')}")


if __name__ == "__main__":
    main()
