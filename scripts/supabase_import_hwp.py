"""
HWP 파일에서 치험례 데이터 추출하여 Supabase에 삽입
HWP 3.0, 5.0 이상 모든 버전 지원

필요 라이브러리:
    pip install olefile requests pyhwp

사용법:
    python supabase_import_hwp.py
"""

import os
import re
import json
import zlib
import struct
import subprocess
import tempfile
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import requests

try:
    import olefile
except ImportError:
    print("olefile 라이브러리가 필요합니다: pip install olefile")
    exit(1)

# pyhwp 사용 가능 여부 확인
PYHWP_AVAILABLE = False
try:
    from hwp5.xmlmodel import Hwp5File
    PYHWP_AVAILABLE = True
except ImportError:
    try:
        # hwp5txt 명령어 사용 가능 여부 확인
        result = subprocess.run(['python', '-m', 'hwp5.hwp5txt', '--help'],
                                capture_output=True, timeout=5)
        PYHWP_AVAILABLE = True
    except:
        print("⚠ pyhwp 라이브러리가 없습니다. HWP 3.0 파일은 처리되지 않을 수 있습니다.")
        print("  설치: pip install pyhwp")

# =============================================================================
# Supabase 설정
# =============================================================================
SUPABASE_URL = "https://bbwnroljrrbwnewmamno.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJid25yb2xqcnJid25ld21hbW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NDAzMCwiZXhwIjoyMDgzNTIwMDMwfQ.TIzhIHYDLzYC_BPEIzMWgvCIQvOcPZUHhMxsQVJ7svg"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# =============================================================================
# HWP 파일 목록 및 분류
# =============================================================================
HWP_FILES = {
    # 태극지 시리즈 (태1장 ~ 태22장)
    "태1장(최종).hwp": {"type": "taekeuk", "chapter": 1},
    "태2장(최종).hwp": {"type": "taekeuk", "chapter": 2},
    "태3장(최종).hwp": {"type": "taekeuk", "chapter": 3},
    "태4장(최종).HWP": {"type": "taekeuk", "chapter": 4},
    "태5장(최종).hwp": {"type": "taekeuk", "chapter": 5},
    "태6장(최종).hwp": {"type": "taekeuk", "chapter": 6},
    "태7장(최종).hwp": {"type": "taekeuk", "chapter": 7},
    "태8장(최종).hwp": {"type": "taekeuk", "chapter": 8},
    "태9장(최종).hwp": {"type": "taekeuk", "chapter": 9},
    "태10장(최종).hwp": {"type": "taekeuk", "chapter": 10},
    "태11장(최종).HWP": {"type": "taekeuk", "chapter": 11},
    "태12장(최종).HWP": {"type": "taekeuk", "chapter": 12},
    "태13장(최종).HWP": {"type": "taekeuk", "chapter": 13},
    "태14장(최종).HWP": {"type": "taekeuk", "chapter": 14},
    "태15장(최종).hwp": {"type": "taekeuk", "chapter": 15},
    "태16장(최종).hwp": {"type": "taekeuk", "chapter": 16},
    "태17장(최종).hwp": {"type": "taekeuk", "chapter": 17},
    "태18장(최종).hwp": {"type": "taekeuk", "chapter": 18},
    "태19장(최종).hwp": {"type": "taekeuk", "chapter": 19},
    "태20장(최종).hwp": {"type": "taekeuk", "chapter": 20},
    "태21장(최종).hwp": {"type": "taekeuk", "chapter": 21},
    "태22장(최종).hwp": {"type": "taekeuk", "chapter": 22},

    # 사상체질 치험례 모음
    "사상 소양인 치험례 모음(081024).hwp": {"type": "sasang", "constitution": "소양인"},
    "사상 소음인 치험례 모음(081024).hwp": {"type": "sasang", "constitution": "소음인"},
    "사상 태양인 치험례 모음081025.hwp": {"type": "sasang", "constitution": "태양인"},
    "사상 태음인 치험례 모음(081024).hwp": {"type": "sasang", "constitution": "태음인"},

    # 고령자채록 모음집
    "1차본1.고령자채록모음집.22.5.12.이종대.hwp": {"type": "goreyongja", "description": "고령자채록모음집"},

    # 개별 치험례
    "최경구. 삼례. 연수당. 흑색종..hwp": {"type": "individual", "description": "흑색종 치험례"},
}

# =============================================================================
# HWP 파싱 클래스
# =============================================================================
class HWPParser:
    """HWP 3.0/5.0+ 파일 파서"""

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.text = ""

    def extract_text(self) -> str:
        """HWP 파일에서 텍스트 추출"""
        # 1. OLE 형식 (HWP 5.0+) 시도
        if olefile.isOleFile(self.file_path):
            text = self._extract_ole_text()
            if text:
                return text

        # 2. pyhwp (hwp5txt) 사용 시도 - HWP 3.0 등 지원
        if PYHWP_AVAILABLE:
            text = self._extract_with_pyhwp()
            if text:
                return text

        # 3. 바이너리에서 직접 텍스트 추출 시도 (Fallback)
        text = self._extract_raw_text()
        if text:
            return text

        print(f"  ⚠ 모든 파싱 방법 실패")
        return ""

    def _extract_ole_text(self) -> str:
        """OLE 형식 (HWP 5.0+)에서 텍스트 추출"""
        try:
            ole = olefile.OleFileIO(self.file_path)
            text_parts = []

            for entry in ole.listdir():
                entry_path = "/".join(entry)

                if entry_path.startswith("BodyText/Section"):
                    try:
                        data = ole.openstream(entry).read()
                        section_text = self._decode_body_text(data)
                        if section_text:
                            text_parts.append(section_text)
                    except Exception:
                        pass

            ole.close()
            self.text = "\n".join(text_parts)
            return self.text

        except Exception as e:
            return ""

    def _extract_with_pyhwp(self) -> str:
        """pyhwp (hwp5txt)를 사용한 텍스트 추출"""
        try:
            # hwp5txt 명령어 실행
            result = subprocess.run(
                ['python', '-m', 'hwp5.hwp5txt', self.file_path],
                capture_output=True,
                text=True,
                timeout=60,
                encoding='utf-8'
            )

            if result.returncode == 0 and result.stdout:
                self.text = result.stdout
                return self.text

            # stderr에 에러가 있어도 stdout에 결과가 있을 수 있음
            if result.stdout:
                self.text = result.stdout
                return self.text

        except subprocess.TimeoutExpired:
            print(f"  ⚠ hwp5txt 타임아웃")
        except Exception as e:
            # print(f"  ⚠ pyhwp 오류: {e}")
            pass

        return ""

    def _extract_raw_text(self) -> str:
        """바이너리에서 직접 한글 텍스트 추출 (Fallback)"""
        try:
            with open(self.file_path, 'rb') as f:
                raw_data = f.read()

            # CP949/EUC-KR로 디코딩 시도
            text_parts = []

            # 연속된 한글/ASCII 문자열 찾기
            # CP949에서 한글은 0x81-0xFE 범위의 2바이트
            i = 0
            current_text = []

            while i < len(raw_data):
                byte = raw_data[i]

                # ASCII 출력 가능 문자
                if 0x20 <= byte <= 0x7E:
                    current_text.append(chr(byte))
                    i += 1
                # CP949 한글 영역
                elif 0x81 <= byte <= 0xFE and i + 1 < len(raw_data):
                    try:
                        char = raw_data[i:i+2].decode('cp949')
                        current_text.append(char)
                        i += 2
                    except:
                        if current_text and len(''.join(current_text)) > 10:
                            text_parts.append(''.join(current_text))
                        current_text = []
                        i += 1
                # 줄바꿈
                elif byte in [0x0A, 0x0D]:
                    current_text.append('\n')
                    i += 1
                else:
                    if current_text and len(''.join(current_text)) > 10:
                        text_parts.append(''.join(current_text))
                    current_text = []
                    i += 1

            if current_text and len(''.join(current_text)) > 10:
                text_parts.append(''.join(current_text))

            # 의미 있는 텍스트만 필터링 (한글 포함)
            korean_texts = [t for t in text_parts if re.search(r'[가-힣]{5,}', t)]

            if korean_texts:
                self.text = '\n'.join(korean_texts)
                return self.text

        except Exception as e:
            pass

        return ""

    def _decode_body_text(self, data: bytes) -> str:
        """BodyText 데이터 디코딩"""
        try:
            # zlib 압축 해제 시도
            try:
                decompressed = zlib.decompress(data, -15)
                data = decompressed
            except:
                pass  # 압축되지 않은 경우

            # 텍스트 추출
            text = self._extract_text_from_records(data)
            return text

        except Exception as e:
            # print(f"  디코딩 오류: {e}")
            return ""

    def _extract_text_from_records(self, data: bytes) -> str:
        """HWP 레코드에서 텍스트 추출"""
        text_parts = []
        pos = 0

        while pos < len(data) - 4:
            try:
                # 레코드 헤더 읽기 (4바이트)
                header = struct.unpack('<I', data[pos:pos+4])[0]
                tag_id = header & 0x3FF
                level = (header >> 10) & 0x3FF
                size = (header >> 20) & 0xFFF

                if size == 0xFFF:
                    # 확장 크기
                    if pos + 8 > len(data):
                        break
                    size = struct.unpack('<I', data[pos+4:pos+8])[0]
                    pos += 8
                else:
                    pos += 4

                if pos + size > len(data):
                    break

                record_data = data[pos:pos+size]
                pos += size

                # HWPTAG_PARA_TEXT (67) - 문단 텍스트
                if tag_id == 67:
                    text = self._decode_para_text(record_data)
                    if text:
                        text_parts.append(text)

            except Exception:
                pos += 1
                continue

        return "\n".join(text_parts)

    def _decode_para_text(self, data: bytes) -> str:
        """문단 텍스트 디코딩"""
        try:
            text_chars = []
            i = 0

            while i < len(data) - 1:
                char_code = struct.unpack('<H', data[i:i+2])[0]
                i += 2

                # 제어 문자 처리
                if char_code < 32:
                    if char_code == 0:  # NULL
                        continue
                    elif char_code == 10:  # 줄바꿈
                        text_chars.append('\n')
                    elif char_code == 13:  # 캐리지 리턴
                        continue
                    elif char_code == 9:  # 탭
                        text_chars.append('\t')
                    elif char_code in [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]:
                        # 인라인 컨트롤 - 추가 데이터 스킵
                        if char_code in [2, 3]:  # 섹션/컬럼 정의
                            i += 12
                        elif char_code in [4, 5, 6, 7, 8, 9, 10, 11]:
                            i += 12
                        continue
                else:
                    # 일반 문자 (UTF-16LE)
                    try:
                        char = chr(char_code)
                        text_chars.append(char)
                    except:
                        continue

            return ''.join(text_chars)

        except Exception:
            return ""


# =============================================================================
# 데이터 추출 함수들
# =============================================================================
def extract_gender(text: str) -> str:
    """텍스트에서 성별 추출"""
    search_text = text[:500]

    # 패턴들
    if re.search(r'남\s*\d{1,3}\s*세', search_text) or re.search(r'\d{1,3}\s*세\s*남', search_text):
        return 'male'
    if re.search(r'여\s*\d{1,3}\s*세', search_text) or re.search(r'\d{1,3}\s*세\s*여', search_text):
        return 'female'

    # 공백 패턴
    if re.search(r'[○0\s]{3,}\s+남\s+\d', search_text):
        return 'male'
    if re.search(r'[○0\s]{3,}\s+여\s+\d', search_text):
        return 'female'

    # 단순 검색
    first_200 = text[:200]
    if '남성' in first_200 or re.search(r'\s남\s', first_200):
        return 'male'
    if '여성' in first_200 or re.search(r'\s여\s', first_200):
        return 'female'

    return 'unknown'


def extract_age_range(text: str) -> Optional[str]:
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


def extract_constitution(text: str) -> Optional[str]:
    """텍스트에서 사상체질 추출"""
    search_text = text[:1000]
    constitutions = ['태양인', '태음인', '소양인', '소음인']
    for const in constitutions:
        if const in search_text:
            return const
    return None


def extract_formula_name(text: str) -> Optional[str]:
    """텍스트에서 처방명 추출"""
    search_text = text[:800]

    # 한글 처방명 패턴
    match = re.search(r'([가-힣]{2,10}(?:탕|산|환|원|고|단|음|전|자|포))', search_text)
    if match:
        return match.group(1)
    return None


def extract_chief_complaint(text: str, title: str = "") -> str:
    """주증상 추출"""
    # 제목에서 추출 시도
    if '--' in title:
        parts = title.split('--')
        if len(parts) > 1:
            complaint = parts[-1].strip()
            if complaint and len(complaint) > 2:
                return complaint[:500]

    # 본문에서 주증상 섹션 찾기
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

    # Fallback
    formula = extract_formula_name(text)
    if formula:
        return f"{formula} 치험례"

    return title[:500] if title else "치험례"


def extract_symptoms(text: str) -> Optional[List[Dict]]:
    """증상 목록 추출"""
    symptoms = []

    # 원형 숫자 패턴
    circle_matches = re.findall(r'[①②③④⑤⑥⑦⑧⑨⑩]\s*(.+?)(?=[①②③④⑤⑥⑦⑧⑨⑩]|\n\n|$)', text[:3000])
    for match in circle_matches[:10]:
        symptom = re.sub(r'\s+', ' ', match.strip())
        if 2 < len(symptom) < 200:
            symptoms.append({"name": symptom, "severity": None, "duration": None, "bodyPart": None})

    # 숫자. 형식
    if not symptoms:
        num_matches = re.findall(r'\d+\.\s*(.+?)(?=\d+\.|$)', text[:2000])
        for match in num_matches[:10]:
            symptom = re.sub(r'\s+', ' ', match.strip())
            if 2 < len(symptom) < 200:
                symptoms.append({"name": symptom, "severity": None, "duration": None, "bodyPart": None})

    return symptoms if symptoms else None


# =============================================================================
# 치험례 분할 함수들
# =============================================================================
def split_sasang_cases(text: str, file_info: Dict) -> List[Dict]:
    """사상체질 치험례 분할 - 다양한 패턴 지원"""
    cases = []
    constitution = file_info.get('constitution')

    # 패턴 1: "N-N ■ 처방명(번호)" 또는 "N-N 처방명(번호)"
    # 예: "1-2 ■ 향부자팔물탕(44-04-01)"
    pattern1 = r'\n\s*(\d+-\d+)\s*■?\s*([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\(([^)]+)\)'

    matches1 = list(re.finditer(pattern1, text))
    if matches1:
        for i, match in enumerate(matches1):
            start = match.start()
            end = matches1[i + 1].start() if i + 1 < len(matches1) else len(text)

            case_number = match.group(1)
            formula_name = match.group(2)
            sub_number = match.group(3)
            content = text[start:end].strip()

            if len(content) > 100:
                first_line = content.split('\n')[0].strip()[:100]
                cases.append({
                    'title': f"{formula_name}({sub_number}) - {first_line}",
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': f"{case_number}-{sub_number}",
                    'constitution': constitution
                })

    # 패턴 2: "N-N 번호 처방명" 형태
    # 예: "1-3 44-06-01 향부자팔물탕"
    if not cases:
        pattern2 = r'\n\s*(\d+-\d+)\s+(\d+-\d+-\d+|\d+-\d+)\s+([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))'

        matches2 = list(re.finditer(pattern2, text))
        if matches2:
            for i, match in enumerate(matches2):
                start = match.start()
                end = matches2[i + 1].start() if i + 1 < len(matches2) else len(text)

                case_number = match.group(1)
                sub_number = match.group(2)
                formula_name = match.group(3)
                content = text[start:end].strip()

                if len(content) > 100:
                    first_line = content.split('\n')[0].strip()[:100]
                    cases.append({
                        'title': f"{formula_name}({sub_number}) - {first_line}",
                        'content': content[:15000],
                        'formula_name': formula_name,
                        'case_number': f"{case_number}-{sub_number}",
                        'constitution': constitution
                    })

    # 패턴 3: "처방명(번호)" 형태로만 분할
    # 예: "향부자팔물탕(44-04-01)"
    if not cases:
        pattern3 = r'\n([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\((\d+-\d+-\d+|\d+-\d+)\)'

        matches3 = list(re.finditer(pattern3, text))
        if matches3:
            for i, match in enumerate(matches3):
                start = match.start()
                end = matches3[i + 1].start() if i + 1 < len(matches3) else len(text)

                formula_name = match.group(1)
                case_number = match.group(2)
                content = text[start:end].strip()

                if len(content) > 200:  # 최소 200자
                    first_line = content.split('\n')[0].strip()[:100]
                    cases.append({
                        'title': f"{formula_name}({case_number})",
                        'content': content[:15000],
                        'formula_name': formula_name,
                        'case_number': case_number,
                        'constitution': constitution
                    })

    # 패턴 4: 치험례 섹션 분할 (주증상, 투약, 경과 패턴)
    if not cases:
        # "주 증 상" 또는 "주증상" 패턴으로 분할
        pattern4 = r'\n([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))[으로는의]?\s*\n'

        matches4 = list(re.finditer(pattern4, text))
        if len(matches4) > 3:  # 최소 3개 이상
            for i, match in enumerate(matches4):
                start = match.start()
                end = matches4[i + 1].start() if i + 1 < len(matches4) else len(text)

                formula_name = match.group(1)
                content = text[start:end].strip()

                # 치험례 관련 키워드가 있는 경우만
                if len(content) > 300 and ('주증상' in content or '투약' in content or '경과' in content):
                    cases.append({
                        'title': f"{formula_name} 치험례 {i+1}",
                        'content': content[:15000],
                        'formula_name': formula_name,
                        'case_number': str(i + 1),
                        'constitution': constitution
                    })

    return cases


def split_taekeuk_cases(text: str, file_info: Dict) -> List[Dict]:
    """태극지 치험례 분할"""
    cases = []
    chapter = file_info.get('chapter', 0)

    # 여러 패턴 시도
    patterns = [
        # 패턴 1: "N. 처방명의 증상" 형식
        r'\n\s*(\d+)\.\s*([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))의?\s+([가-힣\s,]+)',
        # 패턴 2: 처방명 단독 라인
        r'\n([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\n(?:처방|적응증|주치)',
    ]

    # 패턴 1 시도
    matches = list(re.finditer(patterns[0], text))
    if matches:
        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)

            case_num = match.group(1)
            formula_name = match.group(2)
            symptom = match.group(3).strip()[:100]
            content = text[start:end].strip()

            if len(content) > 100:
                title = f"태{chapter}장 {case_num}. {formula_name} - {symptom}"
                cases.append({
                    'title': title[:300],
                    'content': content[:15000],
                    'formula_name': formula_name,
                    'case_number': f"{chapter}-{case_num}",
                    'constitution': None
                })

    # Fallback: 전체를 하나의 케이스로
    if not cases and len(text) > 500:
        formula = extract_formula_name(text)
        cases.append({
            'title': f"태{chapter}장 치험례",
            'content': text[:15000],
            'formula_name': formula,
            'case_number': str(chapter),
            'constitution': None
        })

    return cases


def split_goreyongja_cases(text: str, file_info: Dict) -> List[Dict]:
    """고령자채록 치험례 분할"""
    cases = []

    # 패턴: "처방명 N-N. 증상"
    pattern = r'\n\s*(?:\d+\.\s*)?([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s+(\d+-\d+)\.\s*'

    splits = re.split(pattern, text)

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


def split_individual_case(text: str, file_info: Dict, filename: str) -> List[Dict]:
    """개별 치험례 파일"""
    cases = []

    if len(text) > 100:
        formula_name = extract_formula_name(text)
        description = file_info.get('description', filename)

        cases.append({
            'title': f"{formula_name}: {description}" if formula_name else description,
            'content': text[:15000],
            'formula_name': formula_name,
            'case_number': "1",
            'constitution': None
        })

    return cases


def split_into_cases(text: str, filename: str, file_info: Dict) -> List[Dict]:
    """파일 유형에 따라 치험례 분할"""
    file_type = file_info.get('type', 'individual')

    if file_type == "sasang":
        cases = split_sasang_cases(text, file_info)
    elif file_type == "taekeuk":
        cases = split_taekeuk_cases(text, file_info)
    elif file_type == "goreyongja":
        cases = split_goreyongja_cases(text, file_info)
    else:
        cases = split_individual_case(text, file_info, filename)

    # Fallback: 분할 실패 시
    if not cases and len(text) > 500:
        print(f"  ⚠ 분할 실패, Fallback 적용")

        # 적절한 크기로 분할
        chunk_size = 8000
        chunks = []
        pos = 0

        while pos < len(text):
            end_pos = min(pos + chunk_size, len(text))
            para_end = text.rfind('\n\n', pos, end_pos)
            if para_end > pos + 1000:
                end_pos = para_end

            chunk = text[pos:end_pos].strip()
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


# =============================================================================
# DB 삽입 함수들
# =============================================================================
def delete_existing_hwp_cases():
    """기존 HWP 파일 기반 치험례 삭제"""
    print("\n기존 HWP 기반 치험례 삭제 중...")

    try:
        response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/clinical_cases",
            headers=HEADERS,
            params={"sourceId": "like.hwp-%"}
        )

        if response.status_code in [200, 204]:
            print("  ✓ 기존 HWP 데이터 삭제 완료")
        else:
            print(f"  삭제 응답: {response.status_code}")

    except Exception as e:
        print(f"  삭제 오류: {e}")


def insert_cases(cases: List[Dict], batch_size: int = 50) -> Tuple[int, int]:
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


# =============================================================================
# 메인 함수
# =============================================================================
def process_hwp_file(file_path: Path, file_info: Dict) -> List[Dict]:
    """단일 HWP 파일 처리"""
    filename = file_path.name

    # HWP 파싱
    parser = HWPParser(str(file_path))
    text = parser.extract_text()

    if not text or len(text) < 100:
        print(f"  ⚠ 텍스트 추출 실패 또는 내용 없음")
        return []

    print(f"  추출된 텍스트: {len(text)}자")

    # 치험례 분할
    raw_cases = split_into_cases(text, filename, file_info)
    print(f"  분할된 치험례: {len(raw_cases)}건")

    # DB 형식으로 변환
    db_cases = []
    for idx, raw_case in enumerate(raw_cases):
        content = raw_case['content']
        title = raw_case['title']
        formula_name = raw_case.get('formula_name')
        case_number = raw_case.get('case_number', str(idx + 1))
        constitution = raw_case.get('constitution')

        # 체질이 파일에서 명시된 경우 사용
        if not constitution:
            constitution = extract_constitution(content)

        source_id = f"hwp-{filename}-{case_number}".replace(" ", "_")

        db_case = {
            "sourceId": source_id[:100],
            "recordedYear": 2008,  # 대부분 2008년 전후 자료
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


def main():
    print("=" * 70)
    print("  HWP 치험례 파일 → Supabase DB 삽입")
    print("=" * 70)

    # HWP 파일 디렉토리
    hwp_dir = Path(__file__).parent.parent / "치험례" / "word1"

    if not hwp_dir.exists():
        print(f"\n⚠ 디렉토리를 찾을 수 없습니다: {hwp_dir}")
        print("  'word1' 폴더에 HWP 파일이 있는지 확인하세요.")
        return

    # 기존 HWP 데이터 삭제
    delete_existing_hwp_cases()

    all_cases = []
    stats = {"sasang": 0, "taekeuk": 0, "goreyongja": 0, "individual": 0}
    processed_files = []

    print("\n" + "=" * 70)
    print("  파일 처리 시작")
    print("=" * 70)

    for filename, file_info in HWP_FILES.items():
        file_path = hwp_dir / filename

        # 대소문자 구분 없이 파일 찾기
        if not file_path.exists():
            # 다른 확장자 시도
            alt_names = [
                filename,
                filename.replace('.hwp', '.HWP'),
                filename.replace('.HWP', '.hwp'),
            ]
            for alt_name in alt_names:
                alt_path = hwp_dir / alt_name
                if alt_path.exists():
                    file_path = alt_path
                    break

        if file_path.exists():
            print(f"\n[{file_info['type']}] {filename}")

            cases = process_hwp_file(file_path, file_info)

            if cases:
                # 샘플 출력
                sample = cases[0]
                print(f"  샘플 - 주증상: {sample['chiefComplaint'][:50]}...")
                print(f"  샘플 - 성별: {sample['patientGender']}, 나이: {sample['patientAgeRange']}, 체질: {sample['patientConstitution']}")

                all_cases.extend(cases)
                stats[file_info['type']] += len(cases)
                processed_files.append({
                    'filename': filename,
                    'type': file_info['type'],
                    'cases_count': len(cases),
                    'reason': f"파일 유형: {file_info['type']}, 분할 패턴 적용"
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

    # 처리 결과 상세
    print("\n" + "=" * 70)
    print("  파일별 처리 결과 및 근거")
    print("=" * 70)

    for pf in processed_files:
        print(f"\n  📄 {pf['filename']}")
        print(f"     - 유형: {pf['type']}")
        print(f"     - 추출 건수: {pf['cases_count']}건")
        print(f"     - 처리 근거: {pf['reason']}")

    print("\n" + "=" * 70)
    print("  DB 매핑 근거")
    print("=" * 70)
    print("""
  clinical_cases 테이블 매핑:
  ┌─────────────────────┬────────────────────────────────────────┐
  │ 컬럼                │ HWP 추출 근거                          │
  ├─────────────────────┼────────────────────────────────────────┤
  │ sourceId            │ "hwp-{파일명}-{케이스번호}" 형식       │
  │ recordedYear        │ 파일 작성 시기 (대부분 2008년)         │
  │ recorderName        │ "이종대" (저자)                        │
  │ patientGender       │ 본문에서 "남/여 NN세" 패턴 추출       │
  │ patientAgeRange     │ 본문에서 "NN세" 추출 후 연령대 변환   │
  │ patientConstitution │ 파일명 또는 본문에서 사상체질 추출    │
  │ chiefComplaint      │ 제목 또는 "주증상" 섹션에서 추출      │
  │ originalText        │ HWP 본문 텍스트 전체 (최대 10,000자) │
  │ symptoms            │ ①②③ 또는 1.2.3. 패턴으로 추출        │
  │ herbalFormulas      │ "OO탕/산/환" 패턴으로 처방명 추출     │
  └─────────────────────┴────────────────────────────────────────┘
    """)


if __name__ == "__main__":
    main()
