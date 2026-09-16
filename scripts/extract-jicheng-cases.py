# -*- coding: utf-8 -*-
"""中醫笈成(jicheng.tw) 醫案 서적 -> 고전 의안 JSON.

라이선스:
  https://jicheng.tw/tcm/copyright.html 원문 —
  "本站所有對公眾領域文本之篩選、編排、標點、附註等一切編輯，均以CC0授權釋出至公眾領域"
  底本(저본)은 공중영역 고서이고, 이 사이트가 더한 표점·편집은 CC0 다.
  상업적 재배포에 제약이 없다. 이번 조사에서 라이선스가 가장 깨끗한 출처다.

  개별 페이지가 따로 저작권을 선언하면 그쪽이 우선이라고 적혀 있으나,
  醫案 계열 87종을 전수 확인한 결과 자체 선언이 있는 페이지는 한 곳도 없다.

원본 구조:
  <header data-type="book"> 作者 / 朝代 / 年份 / 底本
  <h1>卷一</h1>            권
  <h2>中風</h2>            門類 (질환 분류)
  <p>錢　偏枯在左。血虛不縈筋骨…（肝腎虛內風動）</p>   <- 醫案 시작
  <p>制首烏（四兩烘）　枸杞子（去蒂二兩）…</p>          <- 약재 구성
  <p>又　操持經營…</p>                                  <- 같은 환자 재진

  醫案의 시작은 환자를 가리키는 한 글자(성씨, 익명이면 '某')다. 뒤에 전각
  공백이나 （나이）가 온다. '又' 로 시작하는 단락은 앞 환자의 재진이므로
  같은 케이스에 이어 붙인다.

실행:
  python scripts/extract-jicheng-cases.py <jc.data 경로> apps/ai-engine/data/jicheng_cases.json
"""
import re
import os
import sys
import json
import html

# 醫案의 시작은 환자를 가리키는 한 글자다 — 성씨이거나 익명일 때 '某' 다.
# 뒤에 전각 공백이나 （나이）가 온다.
#
# 성씨 화이트리스트를 쓰다가 뒤집었다. 임증지남의안만 봐도 익명 환자 '某' 가
# 612건인데 성씨 목록에는 없고, 서적마다 등장 성씨가 달라 목록이 계속 샌다.
# 대신 '이어지는 단락'의 머리글자를 막는다 — 이쪽은 종류가 적고 안 변한다.
# 성씨 뒤에 바로 전각공백/（나이）가 오는 형태 외에, 丁甘仁醫案처럼
# '袁左　', '陳右　', '王氏　' 로 성별·존칭을 한 글자 끼우는 서적이 있다.
# 이 셋을 안 받으면 한 문(門) 전체가 사례 하나로 뭉친다.
CASE_START = re.compile(r'^[一-鿿](?:[（(]|　|[左右氏](?:　|[（(]))')

# 앞 醫案 에 이어지는 단락. 재진(又), 회차(三診), 처방 첨언(加·服) 등.
# 이 글자로 시작하면 새 사례가 아니라 직전 사례의 연속이다.
CONTINUATION = set('又再復三四五六七八九次診服加減前上按附初後另更今仍改')

FOLLOWUP = re.compile(r'^(又|再診|三診|四診|復診|次診)')
AGE = re.compile(r'[（(]([一二三四五六七八九十百]{1,4})[）)]')
TAG = re.compile(r'<[^>]+>')
META = re.compile(
    r'<div><dt>(作者|朝代|年份|底本)</dt><dd>(.*?)</dd></div>', re.S)

CN_NUM = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
          '六': 6, '七': 7, '八': 8, '九': 9, '十': 10}

# 이보다 짧으면 목차 조각이거나 약재 줄만 남은 것이다.
MIN_CASE_CHARS = 40


def strip_tags(s: str) -> str:
    return html.unescape(TAG.sub('', s)).strip()


def cn_to_int(s: str):
    """'四七' 은 47 세, '六九' 는 69 세다. 葉天士 의안의 나이 표기법이다."""
    if not s:
        return None
    if s == '十':
        return 10
    digits = [CN_NUM.get(ch) for ch in s]
    if any(d is None for d in digits):
        return None
    if len(digits) == 2 and s[0] != '十' and s[1] != '十':
        return digits[0] * 10 + digits[1]
    if len(digits) == 1:
        return digits[0]
    # 十 이 섞인 표기 (三十, 四十五)
    if '十' in s:
        parts = s.split('十')
        tens = CN_NUM.get(parts[0], 1) if parts[0] else 1
        ones = CN_NUM.get(parts[1], 0) if len(parts) > 1 and parts[1] else 0
        return tens * 10 + ones
    return None


def parse_book(path: str, book_name: str):
    raw = open(path, encoding='utf-8', errors='ignore').read()

    meta = {k: strip_tags(v) for k, v in META.findall(raw)}
    # 底本(저본) 표기가 없는 서적이 87종 중 60종이다. 처음에는 전부 버렸는데
    # 확인해 보니 권리 문제가 아니라 출처 기록이 덜 된 것이었다 —
    # 87종 어디에도 페이지 자체 저작권 선언이 없어(실측 0건) 사이트 전역 CC0 가
    # 그대로 적용되고, 수록된 것은 모두 청대 이전이거나 저자 사후 50년이 지난
    # 민국기 의안이다. 버리는 대신 미상으로 남겨 화면에서 드러나게 한다.

    author = meta.get('作者') or None
    dynasty = meta.get('朝代') or None
    year = None
    ym = re.search(r'value="(\d{3,4})"', raw)
    if ym:
        year = int(ym.group(1))

    volume = None
    category = None
    cases = []
    cur = None

    for m in re.finditer(r'<(h1|h2|h3|p)[^>]*>(.*?)</\1>', raw, re.S):
        tag, inner = m.group(1), strip_tags(m.group(2))
        if not inner:
            continue
        if tag == 'h1':
            volume = inner
            continue
        if tag in ('h2', 'h3'):
            category = inner
            cur = None
            continue

        if CASE_START.match(inner) and inner[0] not in CONTINUATION:
            cur = {
                'book': book_name,
                'author': author,
                'dynasty': dynasty,
                'year': year,
                'source_edition': meta.get('底本'),
                'volume': volume,
                'category': category,
                'surname': inner[0],
                'age': cn_to_int((AGE.search(inner[:8]) or [None, None])[1])
                if AGE.search(inner[:8]) else None,
                'paragraphs': [inner],
            }
            cases.append(cur)
        elif cur is not None:
            # 재진(又)이든 약재 줄이든 직전 醫案 에 이어 붙는다.
            cur['paragraphs'].append(inner)

    out = []
    for i, c in enumerate(cases):
        body = '\n'.join(c['paragraphs'])
        if len(body) < MIN_CASE_CHARS:
            continue
        c['full_text'] = body
        c['followups'] = sum(1 for p in c['paragraphs'] if FOLLOWUP.match(p))
        c['id'] = f'jicheng-{book_name}-{i}'
        del c['paragraphs']
        out.append(c)
    return meta, out


def main():
    root = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'apps/ai-engine/data/jicheng_cases.json'
    book_dir = os.path.join(root, 'pages', 'book')

    targets = [b for b in sorted(os.listdir(book_dir)) if '醫案' in b or '醫按' in b]
    print(f'醫案 계열 서적 {len(targets)}종')

    allc = []
    no_edition = 0
    for b in targets:
        path = os.path.join(book_dir, b, 'index.html')
        if not os.path.exists(path):
            continue
        meta, cs = parse_book(path, b)
        if not meta.get('底本'):
            no_edition += 1
        allc.extend(cs)

    print(f'저본 미상 {no_edition}종 (제외하지 않고 미상으로 기록)')

    by_book = {}
    for c in allc:
        by_book[c['book']] = by_book.get(c['book'], 0) + 1
    for b, n in sorted(by_book.items(), key=lambda x: -x[1])[:15]:
        print(f'  {b:24s} {n:5d}건')

    lens = sorted(len(c['full_text']) for c in allc)
    print(f'합계 {len(allc)}건 / 본문 중앙값 {lens[len(lens) // 2]}자')
    print(f'  나이 확인 {sum(1 for c in allc if c["age"])} '
          f'門類 확인 {sum(1 for c in allc if c["category"])} '
          f'재진 포함 {sum(1 for c in allc if c["followups"])}')
    json.dump(allc, open(out_path, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(f'-> {out_path}')


if __name__ == '__main__':
    main()
