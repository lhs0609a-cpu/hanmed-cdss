"""
AI 처방 추천 평가 러너.

사용:
    cd apps/ai-engine
    python scripts/evaluate.py                          # 기본 평가셋
    python scripts/evaluate.py --eval-set custom.jsonl  # 사용자 평가셋
    python scripts/evaluate.py --top-k 5                # top-5 정확도

평가 기준:
    - top_1: 모델이 1순위로 추천한 처방이 expected_formulas에 포함되는가
    - top_k: 모델이 추천한 top-k 처방 중 하나라도 expected_formulas에 포함되는가
    - precision_at_k: top-k 중 expected에 포함된 비율
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ai-engine 루트를 import path에 추가
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.services.llm_service import LLMService  # noqa: E402
from app.services.rag_service import RAGService  # noqa: E402


@dataclass
class CaseResult:
    case_id: str
    description: str
    expected: list[str]
    predicted: list[str]
    top_1_hit: bool
    top_k_hit: bool
    precision_at_k: float
    duration_ms: int
    error: str | None = None


@dataclass
class EvalReport:
    eval_set: str
    model: str
    total: int = 0
    completed: int = 0
    failed: int = 0
    top_1_correct: int = 0
    top_k_correct: int = 0
    avg_precision_at_k: float = 0.0
    avg_duration_ms: float = 0.0
    cases: list[CaseResult] = field(default_factory=list)

    def summary(self) -> dict[str, Any]:
        return {
            "eval_set": self.eval_set,
            "model": self.model,
            "total": self.total,
            "completed": self.completed,
            "failed": self.failed,
            "top_1_accuracy": (self.top_1_correct / self.completed) if self.completed else 0,
            "top_k_accuracy": (self.top_k_correct / self.completed) if self.completed else 0,
            "avg_precision_at_k": self.avg_precision_at_k,
            "avg_duration_ms": self.avg_duration_ms,
        }


def load_cases(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def extract_formula_names(recommendation: dict[str, Any]) -> list[str]:
    recs = recommendation.get("recommendations") or []
    out: list[str] = []
    for r in recs:
        name = (r.get("formula_name") or "").strip()
        if name:
            out.append(name)
    return out


def normalize(name: str) -> str:
    """평가용 처방명 정규화: 공백 제거 + 소문자."""
    return name.replace(" ", "").lower()


def evaluate_case(expected: list[str], predicted: list[str], top_k: int) -> tuple[bool, bool, float]:
    expected_norm = {normalize(e) for e in expected}
    predicted_top_k = predicted[:top_k]
    top_1_hit = bool(predicted_top_k) and normalize(predicted_top_k[0]) in expected_norm
    hits = [p for p in predicted_top_k if normalize(p) in expected_norm]
    top_k_hit = len(hits) > 0
    precision = len(hits) / max(len(predicted_top_k), 1)
    return top_1_hit, top_k_hit, precision


async def run_case(
    rag: RAGService,
    case: dict[str, Any],
    top_k: int,
) -> CaseResult:
    start = time.perf_counter()
    try:
        result = await rag.get_recommendation(case["patient_info"], top_k=top_k)
        predicted = extract_formula_names(result)
        top_1, top_k_hit, precision = evaluate_case(case["expected_formulas"], predicted, top_k)
        return CaseResult(
            case_id=case["id"],
            description=case.get("description", ""),
            expected=case["expected_formulas"],
            predicted=predicted,
            top_1_hit=top_1,
            top_k_hit=top_k_hit,
            precision_at_k=precision,
            duration_ms=int((time.perf_counter() - start) * 1000),
        )
    except Exception as exc:
        return CaseResult(
            case_id=case["id"],
            description=case.get("description", ""),
            expected=case["expected_formulas"],
            predicted=[],
            top_1_hit=False,
            top_k_hit=False,
            precision_at_k=0.0,
            duration_ms=int((time.perf_counter() - start) * 1000),
            error=str(exc),
        )


async def main() -> int:
    parser = argparse.ArgumentParser(description="AI 처방 추천 평가")
    parser.add_argument(
        "--eval-set",
        type=Path,
        default=ROOT / "data" / "eval" / "cases.jsonl",
        help="평가셋 JSONL 파일 경로",
    )
    parser.add_argument("--top-k", type=int, default=3, help="평가에 사용할 top-k")
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "data" / "eval" / "results",
        help="결과 저장 디렉터리 (자동 생성)",
    )
    parser.add_argument("--limit", type=int, default=0, help="평가할 최대 케이스 수 (0=전체)")
    args = parser.parse_args()

    if not args.eval_set.exists():
        print(f"평가셋을 찾을 수 없습니다: {args.eval_set}", file=sys.stderr)
        return 1

    cases = load_cases(args.eval_set)
    if args.limit > 0:
        cases = cases[: args.limit]

    rag = RAGService(LLMService())
    report = EvalReport(eval_set=str(args.eval_set.name), model="gpt", total=len(cases))

    print(f"\n=== 평가 시작: {len(cases)}개 케이스, top-{args.top_k} ===\n")

    results: list[CaseResult] = []
    for i, case in enumerate(cases, 1):
        res = await run_case(rag, case, args.top_k)
        results.append(res)
        marker = "✓" if res.top_1_hit else ("△" if res.top_k_hit else "✗")
        if res.error:
            marker = "!"
        print(
            f"[{i:>2}/{len(cases)}] {marker} {res.case_id:<12} "
            f"({res.duration_ms:>5}ms) "
            f"기대: {res.expected[0]:<10} → 예측: "
            f"{(res.predicted[0] if res.predicted else '(없음)'):<12}"
            f"{('  err: ' + res.error[:60]) if res.error else ''}"
        )

    report.cases = results
    report.completed = sum(1 for r in results if r.error is None)
    report.failed = sum(1 for r in results if r.error is not None)
    report.top_1_correct = sum(1 for r in results if r.top_1_hit)
    report.top_k_correct = sum(1 for r in results if r.top_k_hit)
    if report.completed:
        report.avg_precision_at_k = sum(r.precision_at_k for r in results) / report.completed
        report.avg_duration_ms = sum(r.duration_ms for r in results) / report.completed

    summary = report.summary()
    print("\n=== 결과 요약 ===")
    for k, v in summary.items():
        if isinstance(v, float):
            print(f"  {k}: {v:.3f}")
        else:
            print(f"  {k}: {v}")

    args.out.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    out_path = args.out / f"eval-{timestamp}.json"
    payload = {
        "summary": summary,
        "cases": [
            {
                "id": r.case_id,
                "description": r.description,
                "expected": r.expected,
                "predicted": r.predicted,
                "top_1_hit": r.top_1_hit,
                "top_k_hit": r.top_k_hit,
                "precision_at_k": r.precision_at_k,
                "duration_ms": r.duration_ms,
                "error": r.error,
            }
            for r in results
        ],
    }
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"\n결과 저장: {out_path}")

    return 0 if report.failed == 0 else 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
