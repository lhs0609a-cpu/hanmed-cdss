# -*- coding: utf-8 -*-
"""치험례 워드 문서(태 시리즈·채록·사상·감기·빈용) -> 치험례 JSON.

왜 범용 추출기인가:
  파일군마다 서식이 다르다. 태 시리즈는 "용 모 : / 과 정 : / 증 상 :" 라벨,
  사상 모음은 "1-2 ■ 향부자팔물탕(44-04-01)" 헤더에 "￭ 주증상", 감기는
  "34-03.여 32소음인식체겸 몸살" 색인, 채록은 방약합편 형식이다. 파일군마다
  정규식을 따로 쓰면 다섯 벌을 유지해야 하고, 새 문서가 오면 또 한 벌이 는다.

  대신 모든 문서에 공통인 것 하나를 기준으로 삼는다 — 환자 인적사항 줄이다.
  "이 0 0 남 40세 한약업사 소양성 소음인", "o o o 여 12세 소음인",
  "○ ○ ○ 남 45세 소음인" 처럼 표기는 달라도 '성별 + 나이 + 세'는 항상 있다.
  그 줄을 사례의 시작으로 보고 다음 줄까지를 한 블록으로 자른다.

  색인·차례에도 같은 패턴이 나오지만 그쪽은 블록이 짧아 길이로 걸러진다.

실행:
  python scripts/extract-docx-cases.py apps/ai-engine/data/docx_cases.json
"""
import re
import os
import json
import sys
import zipfile
import hashlib

SOURCE_DIR = '치험례/word'
FORMULA_NAMES = 'apps/ai-engine/data/formula_names.json'

# 이 문서들은 이미 다른 경로로 적재됐거나 사례 문서가 아니다.
SKIP = {
    # 방약합편 3권은 extract-bangyak-cases.py 가 원문 txt 에서 직접 읽는다.
    # docx 는 같은 내용이라 두 번 넣을 이유가 없다.
    '새로보는 방약합편 1_상통-최종본. 2025.12.25. 이현석 대표에게.docx',
}

ANCHOR = re.compile(
    r'^[^\n]{0,60}?(남|여|녀)\s{0,3}(\d{1,3})\s*(세|개월)', re.M)
CONST = re.compile(r'((?:소음|소양|태음|태양)\s?성?\s?(?:소음|소양|태음|태양)?\s?인)')
HW = re.compile(r'(\d{2,3})\s*cm.{0,12}?(\d{2,3})\s*kg')
SYMPTOM = re.compile(r'(?:[①-⑳]|^\s{0,4}\d{1,2}[.)])\s*([^\n]{3,120})', re.M)
CTRL = re.compile(r'[\x00-\x08\x0b-\x1f\x7f]')

# 사례 본문으로 인정할 최소 길이. 이보다 짧으면 차례·색인 줄이다.
MIN_BODY = 260
# 한 블록이 이보다 길면 다음 사례까지 삼킨 것이다. 잘라 둔다.
MAX_BODY = 14000

# 차례(색인)는 "40-01. 여 43 소양인 알레르기비염" 같은 줄이 수십 개 붙어 있어
# 길이만으로는 본문과 안 갈린다. 한 블록 안에 인적사항이 여러 번 나오면
# 그건 사례 하나가 아니라 목록이다.
MAX_ANCHORS_IN_BLOCK = 2

# 빈용처방 문서에는 빈 '상담기록서' 서식이 표로 들어 있다. 표를 텍스트로 펴면
# 항목 이름만 늘어선 덩어리가 되는데, 길이는 충분해서 본문으로 오인된다.
FORM_MARKERS = ('등록번호', '피보험자', '보 호 자', '주 민')

GENDER = {'남': 'male', '여': 'female', '녀': 'female'}


def docx_text(path: str) -> str:
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml').decode('utf-8', 'ignore')
    xml = re.sub(r'</w:p>', '\n', xml)
    xml = re.sub(r'<w:tab[^>]*/>', '\t', xml)
    return re.sub(r'<[^>]+>', '', xml)


def clean(s: str) -> str:
    s = CTRL.sub(' ', s)
    s = s.replace(' ', ' ').replace('\xa0', ' ')
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


def find_formula(block: str, names) -> str | None:
    """블록 앞부분에서 알려진 처방명을 찾는다.

    본문 아무 데서나 찾으면 '이럴 땐 오적산도 쓴다' 같은 비교 언급이 잡힌다.
    실제 투약 처방은 제목이나 첫머리에 나오므로 앞 400자만 본다.
    긴 이름을 먼저 맞춰야 '팔물탕'이 '향부자팔물탕'을 가로채지 않는다.
    """
    head = block[:400]
    for n in names:
        if n in head:
            return n
    return None


def extract_file(path: str, names) -> list:
    text = docx_text(path)
    anchors = list(ANCHOR.finditer(text))
    base = os.path.basename(path)
    slug = hashlib.md5(base.encode('utf-8')).hexdigest()[:8]
    cases = []
    for i, a in enumerate(anchors):
        start = text.rfind('\n', 0, a.start()) + 1
        end = anchors[i + 1].start() if i + 1 < len(anchors) else len(text)
        # 제목은 인적사항 줄 위에 있다. 앞 2줄까지 끌어온다.
        pre_start = start
        for _ in range(2):
            p = text.rfind('\n', 0, pre_start - 1)
            if p < 0:
                break
            if start - p > 200:
                break
            pre_start = p + 1
        block = clean(text[pre_start:end])[:MAX_BODY]
        if len(block) < MIN_BODY:
            continue
        if len(ANCHOR.findall(block)) > MAX_ANCHORS_IN_BLOCK:
            continue  # 차례·색인 덩어리
        if any(m in block[:1200] for m in FORM_MARKERS):
            continue  # 빈 상담기록서 서식

        cm = CONST.search(block[:500])
        hw = HW.search(block[:500])
        unit = a.group(3)
        cases.append({
            'id': f'docxc-{slug}-{i}',
            'source_file': base,
            'formula_name': find_formula(block, names),
            'title': clean(text[pre_start:start])[:200] or None,
            'gender': GENDER.get(a.group(1)),
            'age': int(a.group(2)) if unit == '세' else 0,
            'age_months': int(a.group(2)) if unit == '개월' else None,
            'constitution': cm.group(1).replace(' ', '') if cm else None,
            'height_cm': int(hw.group(1)) if hw else None,
            'weight_kg': int(hw.group(2)) if hw else None,
            'symptoms': [clean(x) for x in SYMPTOM.findall(block[:2500])][:20],
            'full_text': block,
        })
    return cases


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'apps/ai-engine/data/docx_cases.json'
    # 처방명 목록. DB 의 formulas.name + clinical_cases 의 herbalFormulas 를
    # 합친 것으로, 다시 만들려면:
    #   select distinct name from formulas
    #   union
    #   select distinct hf->>'formulaName' from clinical_cases,
    #     jsonb_array_elements("herbalFormulas") hf
    names = json.load(open(FORMULA_NAMES, encoding='utf-8'))
    names = sorted({n.strip() for n in names if n and len(n.strip()) >= 3},
                   key=len, reverse=True)

    allc = []
    for f in sorted(os.listdir(SOURCE_DIR)):
        if not f.endswith('.docx') or f.startswith('~$') or f in SKIP:
            continue
        path = os.path.join(SOURCE_DIR, f)
        if os.path.getsize(path) < 20000:
            continue
        try:
            cs = extract_file(path, names)
        except Exception as e:
            print(f'  !! {f}: {e}')
            continue
        if cs:
            print(f'  {f[:46]:48s} {len(cs):5d}건')
        allc.extend(cs)

    lens = sorted(len(c['full_text']) for c in allc)
    print(f'합계 {len(allc)}건 / 본문 중앙값 {lens[len(lens) // 2]}자')
    print(f'  처방명 확인 {sum(1 for c in allc if c["formula_name"])} '
          f'체질 {sum(1 for c in allc if c["constitution"])} '
          f'증상 {sum(1 for c in allc if c["symptoms"])}')
    json.dump(allc, open(out_path, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(f'-> {out_path}')


if __name__ == '__main__':
    main()
