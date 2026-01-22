"""
HWP 파일 구조 분석 - 치험례 분할 패턴 파악
"""

import re
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent))

from supabase_import_hwp import HWPParser

# 분석할 파일들
FILES_TO_ANALYZE = [
    r"G:\내 드라이브\developer\hanmed-cdss\치험례\word1\사상 소음인 치험례 모음(081024).hwp",
    r"G:\내 드라이브\developer\hanmed-cdss\치험례\word1\사상 태음인 치험례 모음(081024).hwp",
]


def analyze_file(file_path):
    """파일 구조 분석"""
    print(f"\n{'='*70}")
    print(f"파일: {Path(file_path).name}")
    print('='*70)

    parser = HWPParser(file_path)
    text = parser.extract_text()

    if not text:
        print("텍스트 추출 실패")
        return

    print(f"총 텍스트 길이: {len(text)}자")

    # 처음 3000자 출력
    print(f"\n--- 처음 3000자 ---")
    print(text[:3000])

    # 패턴 분석
    print(f"\n--- 패턴 분석 ---")

    # ■ 패턴 찾기
    pattern1 = re.findall(r'■\s*[가-힣]+', text)
    print(f"'■ 처방명' 패턴: {len(pattern1)}개")
    if pattern1[:10]:
        print(f"  샘플: {pattern1[:10]}")

    # ● 패턴 찾기
    pattern2 = re.findall(r'●\s*[가-힣]+', text)
    print(f"'● 처방명' 패턴: {len(pattern2)}개")
    if pattern2[:10]:
        print(f"  샘플: {pattern2[:10]}")

    # ◆ 패턴 찾기
    pattern3 = re.findall(r'◆\s*[가-힣]+', text)
    print(f"'◆ 처방명' 패턴: {len(pattern3)}개")

    # 숫자. 패턴 찾기 (예: 1. 2. 3.)
    pattern4 = re.findall(r'\n\s*(\d+)\.\s*([가-힣]+(?:탕|산|환|원|고|단|음|전))', text)
    print(f"'N. 처방명' 패턴: {len(pattern4)}개")
    if pattern4[:10]:
        print(f"  샘플: {pattern4[:10]}")

    # 처방명(번호) 패턴
    pattern5 = re.findall(r'([가-힣]+(?:탕|산|환|원|고|단|음|전|자|포))\s*\((\d+-\d+|\d+)\)', text)
    print(f"'처방명(번호)' 패턴: {len(pattern5)}개")
    if pattern5[:10]:
        print(f"  샘플: {pattern5[:10]}")

    # 【 】 패턴 찾기
    pattern6 = re.findall(r'【[^】]+】', text)
    print(f"'【내용】' 패턴: {len(pattern6)}개")
    if pattern6[:5]:
        print(f"  샘플: {pattern6[:5]}")

    # ▶ 패턴 찾기
    pattern7 = re.findall(r'▶\s*[가-힣]+', text)
    print(f"'▶ 내용' 패턴: {len(pattern7)}개")

    # 줄바꿈 후 처방명 패턴
    pattern8 = re.findall(r'\n([가-힣]{2,8}(?:탕|산|환|원|고|단|음|전))\s*\n', text)
    print(f"줄바꿈 후 '처방명' 패턴: {len(pattern8)}개")
    if pattern8[:10]:
        print(f"  샘플: {list(set(pattern8))[:10]}")

    # 5000자~8000자 부분 출력 (중간 부분 확인)
    print(f"\n--- 5000~8000자 부분 (중간 확인) ---")
    print(text[5000:8000])


def main():
    for file_path in FILES_TO_ANALYZE:
        if Path(file_path).exists():
            analyze_file(file_path)
        else:
            print(f"파일 없음: {file_path}")


if __name__ == "__main__":
    main()
