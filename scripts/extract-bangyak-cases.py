# -*- coding: utf-8 -*-
"""새로보는 방약합편 상/중/하통 -> 치험례 JSON.

왜 다시 짜는가:
  이전 파서는 처방 해설만 긁고 그 아래 붙은 활용사례 '본문'을 통째로 놓쳤다.
  DB 에 들어간 것은 활용사례 색인 줄("1-1. 언어곤란 남 52세")뿐이라
  4,300여 건이 제목만 남은 껍데기였다. 본문에는 변증·가감·회차별 경과가
  다 있는데 그걸 버리고 있었다.

구조 (세 권 모두 동일):
  上統1 寶  신력탕 腎瀝湯      <- 처방 섹션 머리
  ...처방 해설...
  활용사례
  1-1. 언어곤란(言語困難)  남  52세     <- 색인 줄 (짧다)
  2-1. 중풍(中風) 초기의 어둔감 ...
  1-1. 언어곤란(言語困難)               <- 본문 블록 (길다)
   ○ ○ ○  남  52세  서울특별시 마포구 ...
  ① 말을 전혀 하지 못해 벙어리와 같다. ...

  색인 줄과 본문 블록은 번호 형식이 같아 정규식으로는 못 가른다.
  대신 '다음 헤더까지의 길이'로 가른다 — 색인 줄은 바로 다음 색인 줄이
  붙어 80자 미만이고, 본문은 수백~수천 자다.

실행:
  python scripts/extract-bangyak-cases.py apps/ai-engine/data/bangyak_cases.json
"""
import re
import json
import sys

VOLUMES = [
    ('docs/bangyak_1_sangton_extracted.txt', '上統', 'sangton', '상통'),
    ('docs/bangyak_2_jungton_extracted.txt', '中統', 'jungton', '중통'),
    ('docs/bangyak_3_haton_extracted.txt', '下統', 'haton', '하통'),
]

HDR = re.compile(r'\n[ \t ]*(\d{1,2})-(\d{1,3})\.[ \t ]*([^\n]*)')
AGE = re.compile(r'(남|여|녀)\s{0,3}(\d{1,3})\s*세')
AGE_MONTH = re.compile(r'(남|여|녀)\s{0,3}(\d{1,2})\s*개월')
CONST = re.compile(r'((?:소음|소양|태음|태양)성?(?:소음|소양|태음|태양)?인)')
HW = re.compile(r'(\d{2,3})\s*cm.{0,12}?(\d{2,3})\s*kg')
SYMPTOM = re.compile(r'[①-⑳]\s*([^①-⑳\n]{2,120})')
BORROWED = re.compile(r'다음은\s*([^\n]{1,20}?)\s*(?:선생|씨|원장)')
CTRL = re.compile(r'[\x00-\x08\x0b-\x1f\x7f-\U000f0000-\U000fffff]')

# 본문으로 인정할 최소 길이. 41건이 이 사이(80~250)에 있고 표본 확인 결과
# 전부 실제 사례라 120 으로 낮췄다. 그 아래는 전부 색인 줄이다.
MIN_BODY = 120

GENDER = {'남': 'male', '여': 'female', '녀': 'female'}


def clean(s: str) -> str:
    s = CTRL.sub(' ', s)
    s = s.replace(' ', ' ').replace('\xa0', ' ')
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


def parse_volume(path, mark, slug, vol_ko):
    raw = open(path, encoding='utf-8', errors='ignore').read()
    secs = list(re.finditer(
        rf'\n[^\S\n]*{mark}\s*(\d+)\s*(\S*)\s+(\S+)\s+([^\n]*)', raw))
    cases = []
    for i, sec in enumerate(secs):
        no = int(sec.group(1))
        name = sec.group(3).strip()
        tail = sec.group(4).strip().split()
        hanja = tail[0] if tail else ''
        end = secs[i + 1].start() if i + 1 < len(secs) else len(raw)
        section = raw[sec.end():end]

        hdrs = list(HDR.finditer(section))
        # 합방(合方) 절에서 사례 번호가 1-1 부터 다시 시작한다. 둘 다 진짜
        # 사례이므로 버리지 않고, 섹션 안 등장 순서를 붙여 id 를 갈라 준다.
        seen = {}
        for j, h in enumerate(hdrs):
            seg_end = hdrs[j + 1].start() if j + 1 < len(hdrs) else len(section)
            seg = clean(section[h.end():seg_end])
            if len(seg) < MIN_BODY:
                continue  # 색인 줄
            title = clean(h.group(3))
            head = seg[:400]

            am = AGE.search(head)
            mm = AGE_MONTH.search(head)
            cm = CONST.search(head)
            hw = HW.search(head)
            bm = BORROWED.search(head)

            key = f'{h.group(1)}-{h.group(2)}'
            seen[key] = seen.get(key, 0) + 1
            suffix = '' if seen[key] == 1 else f'-{seen[key]}'

            cases.append({
                'id': f'bangyak-{slug}-{no}-{key}{suffix}',
                'volume': vol_ko,
                'formula_no': f'{vol_ko}{no}',
                'formula_name': name,
                'formula_hanja': hanja,
                'title': title,
                'gender': GENDER.get(am.group(1)) if am else (
                    GENDER.get(mm.group(1)) if mm else None),
                'age': int(am.group(2)) if am else (0 if mm else None),
                'age_months': int(mm.group(2)) if mm else None,
                'constitution': cm.group(1) if cm else None,
                'height_cm': int(hw.group(1)) if hw else None,
                'weight_kg': int(hw.group(2)) if hw else None,
                # 원문이 "다음은 OOO 선생의 경험이다" 로 시작하면 그 사람이 기록자다.
                # 없으면 저자 본인(이종대)의 케이스다.
                'recorder': bm.group(1) if bm else '이종대',
                'symptoms': [clean(x) for x in SYMPTOM.findall(seg[:2500])][:20],
                'full_text': f'{name} {h.group(1)}-{h.group(2)}. {title}\n{seg}',
            })
    return cases


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'apps/ai-engine/data/bangyak_cases.json'
    allc = []
    for path, mark, slug, vol in VOLUMES:
        cs = parse_volume(path, mark, slug, vol)
        print(f'  {vol}: {len(cs)}건')
        allc.extend(cs)

    ids = [c['id'] for c in allc]
    assert len(ids) == len(set(ids)), '중복 id 발생'

    lens = sorted(len(c['full_text']) for c in allc)
    print(f'합계 {len(allc)}건 / 본문 중앙값 {lens[len(lens) // 2]}자')
    print(f'  성별 {sum(1 for c in allc if c["gender"])} '
          f'나이 {sum(1 for c in allc if c["age"] is not None)} '
          f'체질 {sum(1 for c in allc if c["constitution"])} '
          f'증상 {sum(1 for c in allc if c["symptoms"])}')
    print(f'  기록자 종류 {len(set(c["recorder"] for c in allc))}')
    json.dump(allc, open(out_path, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(f'-> {out_path}')


if __name__ == '__main__':
    main()
