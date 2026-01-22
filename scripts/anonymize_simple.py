"""
간단한 비식별화 스크립트
"""
import requests
import re
import random
import sys

SUPABASE_URL = 'https://bbwnroljrrbwnewmamno.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJid25yb2xqcnJid25ld21hbW5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NDAzMCwiZXhwIjoyMDgzNTIwMDMwfQ.TIzhIHYDLzYC_BPEIzMWgvCIQvOcPZUHhMxsQVJ7svg'
HEADERS = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}

SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']
REGIONS = ['서울시', '부산시', '대구시', '인천시', '광주시', '대전시', '울산시', '세종시', '경기도', '강원도', '충북', '충남', '전북', '전남', '경북', '경남', '제주도']

def anonymize_text(text):
    if not text:
        return text
    result = text

    # 이름 + 성별 + 나이 패턴
    def replace_name(m):
        return f'{random.choice(SURNAMES)}OO {m.group(2)} {m.group(3)}'
    result = re.sub(r'([가-힣]{2,4})\s+(남|여)\s+(\d{1,3}세)', replace_name, result)

    # 띄어쓰기 이름 패턴
    def replace_name2(m):
        return f'{random.choice(SURNAMES)} O O {m.group(3)}'
    result = re.sub(r'([가-힣])\s+[0○◯]\s+([가-힣])\s+(남|여)', replace_name2, result)

    # 나이 변경
    def replace_age(m):
        age = int(m.group(1))
        new_age = max(1, age + random.choice([-3,-2,-1,1,2,3]))
        return f'{new_age}세'
    result = re.sub(r'(\d{1,3})세', replace_age, result)

    # 주소 변경
    def replace_addr(m):
        return f'{random.choice(REGIONS)} OO구 OO동'
    result = re.sub(r'(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:시|도|특별시|광역시|특별자치시|특별자치도)?\s*([가-힣]+(?:구|군|시))?\s*([가-힣]+(?:동|읍|면|리))?(?:\s*[\d\-]+)?', replace_addr, result)

    return result

print('데이터 조회 중...', flush=True)
all_cases = []
offset = 0
while True:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/clinical_cases?select=id,originalText,chiefComplaint&limit=1000&offset={offset}', headers=HEADERS)
    if r.status_code != 200:
        print(f'조회 오류: {r.status_code}')
        break
    batch = r.json()
    if not batch:
        break
    all_cases.extend(batch)
    print(f'  {len(all_cases)}건 조회됨...', flush=True)
    offset += 1000
    if len(batch) < 1000:
        break

print(f'총 {len(all_cases)}건 조회 완료', flush=True)

print('비식별화 및 업데이트 중...', flush=True)
success = 0
changed = 0

for idx, case in enumerate(all_cases):
    orig_text = case.get('originalText') or ''
    orig_complaint = case.get('chiefComplaint') or ''

    new_text = anonymize_text(orig_text)
    new_complaint = anonymize_text(orig_complaint)

    update = {}
    if new_text != orig_text:
        update['originalText'] = new_text
    if new_complaint != orig_complaint:
        update['chiefComplaint'] = new_complaint

    if update:
        changed += 1
        r = requests.patch(f"{SUPABASE_URL}/rest/v1/clinical_cases?id=eq.{case['id']}", headers=HEADERS, json=update)
        if r.status_code in [200, 204]:
            success += 1

    if (idx + 1) % 500 == 0:
        print(f'  {idx+1}/{len(all_cases)} 처리됨 (변경: {changed}, 성공: {success})', flush=True)

print(f'\n완료!', flush=True)
print(f'  총 처리: {len(all_cases)}건', flush=True)
print(f'  변경 대상: {changed}건', flush=True)
print(f'  업데이트 성공: {success}건', flush=True)
