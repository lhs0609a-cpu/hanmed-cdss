"""
치험례 데이터 개인정보 비식별화 스크립트
- 나이: ±1~3세 랜덤 변경
- 이름: 성씨 랜덤 변경 + "OO"
- 주소: 시/도 랜덤 변경 + "OO구 OO동"
"""

import requests
import re
import random
import json

# Supabase 설정
SUPABASE_URL = "https://bbwnroljrrbwnewmamno.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJid25yb2xqcnJid25ld21hbW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NDAzMCwiZXhwIjoyMDgzNTIwMDMwfQ.TIzhIHYDLzYC_BPEIzMWgvCIQvOcPZUHhMxsQVJ7svg"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# 랜덤 성씨 풀
SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']

# 랜덤 지역 풀
REGIONS = ['서울시', '부산시', '대구시', '인천시', '광주시', '대전시', '울산시', '세종시', '경기도', '강원도', '충북', '충남', '전북', '전남', '경북', '경남', '제주도']


def anonymize_age(text):
    """나이 비식별화: ±1~3세 랜덤 변경"""
    def replace_age(match):
        original_age = int(match.group(1))
        # ±1~3세 변경
        delta = random.choice([-3, -2, -1, 1, 2, 3])
        new_age = max(1, original_age + delta)  # 최소 1세
        return f"{new_age}세"

    # 패턴: 숫자 + 세 (예: 32세, 5세)
    result = re.sub(r'(\d{1,3})세', replace_age, text)
    return result


def anonymize_name(text):
    """이름 비식별화: 성씨 랜덤 변경 + OO"""

    # 이미 익명화된 패턴은 건너뛰기
    # ○○○, ◯◯◯, OOO, 김○○ 등

    # 패턴 1: 한글 성씨 + 2글자 이름 (예: 김현성, 이철수)
    def replace_full_name(match):
        new_surname = random.choice(SURNAMES)
        return f"{new_surname}OO"

    # 성씨(1글자) + 이름(2글자) 패턴
    # 단, 처방명이나 한약명은 제외해야 함
    # 일반적인 이름 패턴: 성씨 + 공백 또는 줄바꿈 없이 바로 이름

    # 패턴: 성씨 + 한글 2글자 (탕, 산, 환 등으로 끝나지 않는)
    name_pattern = r'([가-힣])([가-힣]{2})(?!\s*(?:탕|산|환|원|고|단|음|전|자|포|약|방|법))'

    # 문맥상 이름으로 보이는 패턴 찾기
    # "XXX 남/여 NN세" 또는 "성명: XXX" 패턴

    # 패턴 1: 이름 + 성별 + 나이 (예: "김현성 남 32세", "이영희 여 28세")
    pattern1 = r'([가-힣]{2,4})\s+(남|여)\s+\d{1,3}세'
    def replace_pattern1(match):
        new_surname = random.choice(SURNAMES)
        gender = match.group(2)
        # 나이는 anonymize_age에서 처리하므로 여기서는 원본 유지
        rest = match.group(0)[len(match.group(1)):]
        return f"{new_surname}OO{rest}"
    result = re.sub(pattern1, replace_pattern1, text)

    # 패턴 2: "성명:" 또는 "이름:" 뒤의 이름
    pattern2 = r'(성명\s*[:：]\s*)([가-힣]{2,4})'
    def replace_pattern2(match):
        new_surname = random.choice(SURNAMES)
        return f"{match.group(1)}{new_surname}OO"
    result = re.sub(pattern2, replace_pattern2, result)

    # 패턴 3: "환자:" 뒤의 이름
    pattern3 = r'(환자\s*[:：]\s*)([가-힣]{2,4})'
    def replace_pattern3(match):
        new_surname = random.choice(SURNAMES)
        return f"{match.group(1)}{new_surname}OO"
    result = re.sub(pattern3, replace_pattern3, result)

    # 패턴 4: 줄 시작에서 "성 이름이름" 형태 + 남/여 (예: 줄바꿈 후 "김 현 성  남")
    pattern4 = r'\n([가-힣])\s+([가-힣])\s+([가-힣])\s+(남|여)'
    def replace_pattern4(match):
        new_surname = random.choice(SURNAMES)
        return f"\n{new_surname} O O  {match.group(4)}"
    result = re.sub(pattern4, replace_pattern4, result)

    # 패턴 5: "○ ○ ○" 형태 유지 (이미 익명화됨)
    # 건드리지 않음

    # 패턴 6: 단순 한글 3글자 이름 (문맥상 사람 이름으로 보이는 경우)
    # 예: "조  0  숙  여 32" -> 띄어쓰기된 이름
    pattern6 = r'([가-힣])\s+[0○◯]\s+([가-힣])\s+(남|여)'
    def replace_pattern6(match):
        new_surname = random.choice(SURNAMES)
        return f"{new_surname}  O  O  {match.group(3)}"
    result = re.sub(pattern6, replace_pattern6, result)

    # 패턴 7: "백 0 0 여 34세" 형태
    pattern7 = r'([가-힣])\s+[0○◯]\s+[0○◯]\s+(남|여)\s+(\d)'
    def replace_pattern7(match):
        new_surname = random.choice(SURNAMES)
        return f"{new_surname} O O {match.group(2)} {match.group(3)}"
    result = re.sub(pattern7, replace_pattern7, result)

    return result


def anonymize_address(text):
    """주소 비식별화: 시/도 랜덤 변경"""

    # 시/도 패턴들
    city_patterns = [
        r'서울(?:시|특별시)?',
        r'부산(?:시|광역시)?',
        r'대구(?:시|광역시)?',
        r'인천(?:시|광역시)?',
        r'광주(?:시|광역시)?',
        r'대전(?:시|광역시)?',
        r'울산(?:시|광역시)?',
        r'세종(?:시|특별자치시)?',
        r'경기(?:도)?',
        r'강원(?:도|특별자치도)?',
        r'충청북도|충북',
        r'충청남도|충남',
        r'전라북도|전북|전북특별자치도',
        r'전라남도|전남',
        r'경상북도|경북',
        r'경상남도|경남',
        r'제주(?:도|특별자치도)?',
    ]

    result = text

    # 패턴: 시/도 + 구/군/시 + 동/읍/면 + 상세주소
    # 예: "서울시 강남구 역삼동 123-45" -> "부산시 OO구 OO동"

    full_address_pattern = r'(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:시|도|특별시|광역시|특별자치시|특별자치도)?\s*([가-힣]+(?:구|군|시))\s*([가-힣]+(?:동|읍|면|리))(?:\s*[\d\-]+)?(?:\s*[가-힣]*(?:아파트|빌라|맨션|타워))?(?:\s*[\d\-]+동?)?(?:\s*[\d\-]+호?)?'

    def replace_full_address(match):
        new_region = random.choice(REGIONS)
        return f"{new_region} OO구 OO동"

    result = re.sub(full_address_pattern, replace_full_address, result)

    # 간단한 패턴: 시/도 + 구/군
    simple_pattern = r'(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:시|도|특별시|광역시)?\s+([가-힣]+(?:구|군|시))'

    def replace_simple_address(match):
        new_region = random.choice(REGIONS)
        return f"{new_region} OO구"

    result = re.sub(simple_pattern, replace_simple_address, result)

    # 번지수만 있는 경우 제거
    result = re.sub(r'\s+\d{1,4}(?:-\d{1,4})?\s*번지?', ' ', result)

    return result


def anonymize_text(text):
    """텍스트 전체 비식별화"""
    if not text:
        return text

    result = text
    result = anonymize_name(result)
    result = anonymize_age(result)
    result = anonymize_address(result)

    return result


def fetch_all_cases():
    """모든 치험례 조회"""
    all_data = []
    offset = 0
    while True:
        url = f'{SUPABASE_URL}/rest/v1/clinical_cases?select=id,originalText,chiefComplaint,clinicalNotes&limit=1000&offset={offset}'
        r = requests.get(url, headers=HEADERS)
        if r.status_code != 200:
            print(f"조회 오류: {r.status_code}")
            break
        batch = r.json()
        if not batch:
            break
        all_data.extend(batch)
        offset += 1000
        if len(batch) < 1000:
            break
    return all_data


def update_case(case_id, data):
    """개별 케이스 업데이트"""
    url = f'{SUPABASE_URL}/rest/v1/clinical_cases?id=eq.{case_id}'
    r = requests.patch(url, headers=HEADERS, json=data)
    return r.status_code in [200, 204]


def update_cases_batch(updates):
    """배치 업데이트 (개별 업데이트)"""
    success = 0
    failed = 0

    for case_id, data in updates:
        if update_case(case_id, data):
            success += 1
        else:
            failed += 1

    return success, failed


def main():
    print("=" * 60)
    print("  치험례 개인정보 비식별화")
    print("=" * 60)

    # 모든 데이터 조회
    print("\n데이터 조회 중...")
    cases = fetch_all_cases()
    print(f"총 {len(cases):,}건 조회됨")

    # 비식별화 처리
    print("\n비식별화 처리 중...")
    updates = []

    for idx, case in enumerate(cases):
        case_id = case['id']
        original_text = case.get('originalText', '')
        chief_complaint = case.get('chiefComplaint', '')
        clinical_notes = case.get('clinicalNotes', '')

        # 비식별화
        new_original_text = anonymize_text(original_text) if original_text else None
        new_chief_complaint = anonymize_text(chief_complaint) if chief_complaint else None
        new_clinical_notes = anonymize_text(clinical_notes) if clinical_notes else None

        # 변경된 경우만 업데이트 목록에 추가
        update_data = {}
        if new_original_text and new_original_text != original_text:
            update_data['originalText'] = new_original_text
        if new_chief_complaint and new_chief_complaint != chief_complaint:
            update_data['chiefComplaint'] = new_chief_complaint
        if new_clinical_notes and new_clinical_notes != clinical_notes:
            update_data['clinicalNotes'] = new_clinical_notes

        if update_data:
            updates.append((case_id, update_data))

        if (idx + 1) % 1000 == 0:
            print(f"  처리 중... {idx + 1:,}/{len(cases):,}")

    print(f"\n변경 대상: {len(updates):,}건")

    # 업데이트 실행
    if updates:
        print("\nDB 업데이트 중...")
        total = len(updates)
        success_total = 0
        failed_total = 0

        batch_size = 100
        for i in range(0, total, batch_size):
            batch = updates[i:i+batch_size]
            success, failed = update_cases_batch(batch)
            success_total += success
            failed_total += failed

            if (i + batch_size) % 500 == 0 or i + batch_size >= total:
                print(f"  [{i+1}-{min(i+batch_size, total)}] 완료 (성공: {success_total}, 실패: {failed_total})")

        print(f"\n업데이트 완료!")
        print(f"  성공: {success_total:,}건")
        print(f"  실패: {failed_total:,}건")
    else:
        print("\n변경할 데이터가 없습니다.")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
