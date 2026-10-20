# FIGURE_PRESETS

지침 V19 §H, §K. **입력 JSON 형식을 고정해 두고 수치만 교체한다.** 파일명 두 번째 조각이 `--type` 값이다.

| 프리셋 | type | 쓰는 자리 |
|---|---|---|
| `ladder.steps.json` | steps | 기준값 → 중간 계산값 → 최종값 사다리. §E-2 를 그림으로 만족시킨다 |
| `bracket-bar.bar.json` | bar | 구간·조건별 금액 비교 |
| `cost-stack.stack.json` | stack | 항목 구성과 합계 |
| `deadline.compare.json` | compare | §E-3 시점 구분 표 |

## 1장당 20초

```
cp FIGURE_PRESETS/ladder.steps.json tmp.json      # 복사
#   __표시__ 를 실제 수치로 교체                    # 수치만 교체
npm run figsvg -- steps tmp.json public/figures/<slug>-ladder.svg
```

`__표시__` 가 남아 있으면 종료코드 1로 막는다. 자리표시자가 그대로 발행되지 않는다.

## 금지

- 수치가 없는 장식 그래픽으로 장수를 채우지 않는다. (§G)
- `source` 의 확인일을 비우지 않는다. SOURCE_CACHE 의 확인일을 그대로 옮긴다.
- `alt` 에 수치를 넣는다. "그래프"만 적으면 접근성과 SEO 모두 손해다.
