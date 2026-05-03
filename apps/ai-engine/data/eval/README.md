# AI 처방 추천 평가셋

## 목적
AI 엔진 (RAG + LLM) 변경 시 임상 정확도가 회귀하는지 자동 검증.

## 실행
```bash
cd apps/ai-engine
export OPENAI_API_KEY=...
python scripts/evaluate.py
```

## 평가셋 형식 (`cases.jsonl`)
한 줄당 하나의 케이스:
```json
{"id": "case-001", "description": "비위허약", "patient_info": {...}, "expected_formulas": ["보중익기탕", "육군자탕"]}
```

`expected_formulas`는 임상적으로 합리적인 처방 후보군. 모델 예측이
이 목록 안에 있으면 정답으로 카운트한다 (단일 정답이 아닌 다중 정답 허용).

## 평가 지표
- **top_1_accuracy**: 1순위 추천이 expected에 있는 비율
- **top_k_accuracy**: top-k 추천 중 하나라도 expected에 있는 비율
- **avg_precision_at_k**: top-k 중 정답 비율 평균

## 케이스 추가 가이드
- 출처가 명확한 임상 케이스만 추가 (출판된 치험례, 교과서 사례 등)
- `expected_formulas`는 2~5개 권장. 1개만 두면 평가가 너무 엄격해진다.
- `description`에 변증 분류를 명시 (예: "비위허약 + 기허")
- 새 케이스를 추가한 PR에는 reviewer가 임상 합리성을 확인한 흔적이 있어야 함

## 결과 비교
`data/eval/results/eval-{timestamp}.json` 파일이 생성된다.
릴리즈 전후 비교로 회귀 감지에 사용한다.
