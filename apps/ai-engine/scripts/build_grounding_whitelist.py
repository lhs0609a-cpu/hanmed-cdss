"""
그라운딩 화이트리스트 생성기.

app/services/grounding.py 는 AI 추천에 나온 처방·약재가 이 화이트리스트에 없으면
"환각 가능성"으로 판단해 결과에서 제거한다. 그런데 실제 화이트리스트 파일
(app/data/grounding/formulas.json, herbs.json)이 없어 코드에 박힌 폴백
(처방 23개·약재 34개)만 쓰이고 있었다. 그 결과 정상 추천의 대부분이 잘려나가
사용자에게 후보가 1개만 도달하고, 처방에서 약재가 임의로 빠지는 문제가 있었다.

이 스크립트는 저장소 안의 신뢰 가능한 한의학 데이터에서 표준 한글 명칭을 모아
두 파일을 생성한다. LLM 은 한글로 답하므로 화이트리스트도 한글 기준으로 만든다.

출처:
  - 처방명: apps/web/src/data/formulas/*.json (동의보감·방약합편 코퍼스, 404종)
           + hanja-dictionary.ts 의 FORMULA_DICTIONARY
  - 약재명: hanja-dictionary.ts 의 HERB_DICTIONARY(값=한글)
           + DosageCalculatorPage 의 표준 용량 테이블(한글 110종)
           + grounding.py 의 임산부/노인 금기·폴백 세트(안전상 반드시 포함)

주의: 이 화이트리스트는 "알려진 명칭인가"만 판정한다. 임산부/노인 금기 필터는
grounding.py 가 별도 세트로 처리하므로, 금기 약재도 화이트리스트에는 포함돼야
(= 인식은 되어야) 금기 경고 로직이 동작한다.

실행:
  python apps/ai-engine/scripts/build_grounding_whitelist.py
  # 또는 --check 로 파일을 쓰지 않고 커버리지만 출력
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
WEB_DATA = PROJECT_ROOT / "apps" / "web" / "src" / "data"
FORMULAS_DIR = WEB_DATA / "formulas"
HANJA_DICT_TS = WEB_DATA / "hanja-dictionary.ts"
DOSAGE_TSX = (
    PROJECT_ROOT
    / "apps"
    / "web"
    / "src"
    / "app"
    / "dosage"
    / "DosageCalculatorPage.tsx"
)
OUT_DIR = PROJECT_ROOT / "apps" / "ai-engine" / "app" / "data" / "grounding"

# 한글 명칭만 채택 (LLM 응답 기준). 2~6자 한글.
KOREAN_NAME = re.compile(r"^[가-힣]{2,6}$")


def _extract_ts_dict_values(text: str, start_marker: str, end_marker: str | None) -> list[str]:
    """`'키': '값'` 패턴에서 값(한글)만 뽑는다."""
    start = text.find(start_marker)
    if start == -1:
        return []
    end = text.find(end_marker) if end_marker else len(text)
    section = text[start : end if end != -1 else len(text)]
    return [m.group(2) for m in re.finditer(r"'([^']+)':\s*'([^']+)'", section)]


def _extract_ts_dict_keys(text: str, start_marker: str, end_marker: str | None) -> list[str]:
    start = text.find(start_marker)
    if start == -1:
        return []
    end = text.find(end_marker) if end_marker else len(text)
    section = text[start : end if end != -1 else len(text)]
    return [m.group(1) for m in re.finditer(r"'([^']+)':\s*'([^']+)'", section)]


def load_herb_names() -> set[str]:
    herbs: set[str] = set()

    # 1) 한자 사전의 한글 값
    if HANJA_DICT_TS.exists():
        text = HANJA_DICT_TS.read_text(encoding="utf-8")
        for v in _extract_ts_dict_values(text, "HERB_DICTIONARY", "FORMULA_DICTIONARY"):
            if KOREAN_NAME.match(v):
                herbs.add(v)

    # 2) 용량 계산기 테이블 (name: '인삼')
    if DOSAGE_TSX.exists():
        text = DOSAGE_TSX.read_text(encoding="utf-8")
        for m in re.finditer(r"name:\s*'([가-힣]{2,6})'", text):
            herbs.add(m.group(1))

    # 3) grounding.py 의 안전 세트 — 인식되어야 금기 필터가 동작한다
    herbs |= _grounding_safety_sets()

    return herbs


def load_formula_names() -> set[str]:
    formulas: set[str] = set()

    # 1) 처방 코퍼스의 name (한글)
    if FORMULAS_DIR.exists():
        for jf in sorted(FORMULAS_DIR.glob("*.json")):
            try:
                data = json.loads(jf.read_text(encoding="utf-8"))
            except Exception as e:  # noqa: BLE001
                print(f"  [skip] {jf.name}: {e}", file=sys.stderr)
                continue
            items = data if isinstance(data, list) else data.get("formulas") or data.get("data") or []
            for f in items:
                name = str((f or {}).get("name", "")).strip()
                if KOREAN_NAME.match(name):
                    formulas.add(name)

    # 2) 처방 사전의 한글 값
    if HANJA_DICT_TS.exists():
        text = HANJA_DICT_TS.read_text(encoding="utf-8")
        for v in _extract_ts_dict_values(text, "FORMULA_DICTIONARY", "MEDICAL_TERM_DICTIONARY"):
            if KOREAN_NAME.match(v):
                formulas.add(v)

    return formulas


def _grounding_safety_sets() -> set[str]:
    """grounding.py 의 폴백·금기 세트를 그대로 읽어 반드시 포함시킨다."""
    gpy = PROJECT_ROOT / "apps" / "ai-engine" / "app" / "services" / "grounding.py"
    names: set[str] = set()
    if not gpy.exists():
        return names
    text = gpy.read_text(encoding="utf-8")
    for var in (
        "FALLBACK_HERBS",
        "PREGNANCY_CONTRAINDICATED_HERBS",
        "ELDERLY_CAUTION_HERBS",
    ):
        start = text.find(var)
        if start == -1:
            continue
        brace = text.find("{", start)
        end = text.find("}", brace)
        if brace == -1 or end == -1:
            continue
        block = text[brace : end + 1]
        for m in re.finditer(r'"([가-힣]{2,6})"', block):
            names.add(m.group(1))
    return names


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--check",
        action="store_true",
        help="파일을 쓰지 않고 커버리지만 출력",
    )
    args = ap.parse_args()

    herbs = load_herb_names()
    formulas = load_formula_names()

    safety = _grounding_safety_sets()
    missing_safety = safety - herbs
    if missing_safety:
        # 안전 세트가 최종 화이트리스트에 반드시 있어야 한다
        print(f"[warn] 안전 세트 누락 보정: {sorted(missing_safety)}", file=sys.stderr)
        herbs |= missing_safety

    print(f"처방 화이트리스트: {len(formulas)}종")
    print(f"약재 화이트리스트: {len(herbs)}종")
    print(f"  (안전 세트 {len(safety)}종 전부 포함 확인)")

    if args.check:
        print("\n--check 모드 — 파일을 쓰지 않음")
        return 0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "formulas.json").write_text(
        json.dumps(sorted(formulas), ensure_ascii=False, indent=0),
        encoding="utf-8",
    )
    (OUT_DIR / "herbs.json").write_text(
        json.dumps(sorted(herbs), ensure_ascii=False, indent=0),
        encoding="utf-8",
    )
    print(f"\n생성 완료:\n  {OUT_DIR / 'formulas.json'}\n  {OUT_DIR / 'herbs.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
