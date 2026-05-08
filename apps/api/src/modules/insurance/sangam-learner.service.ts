import { Injectable, Logger } from '@nestjs/common';

/**
 * 삭감 패턴 학습 서비스 (룰 단계).
 *
 * 청구가 자주 삭감되는 코드 조합을 한의원 단위로 학습한다.
 * 본격 ML 도입 전 단계 — 빈도/조건부 확률 기반 룰을 추출한다.
 *
 * 데이터 모델 (개념):
 *   ClaimSubmission: { id, clinicId, codes: [str], submittedAt, outcome: 'approved'|'rejected'|'partial', rejectionReasons }
 *
 * 산출:
 *   1) 단일 코드 삭감률  P(rejected | codeA)
 *   2) 코드쌍 삭감률    P(rejected | codeA && codeB)
 *   3) 사유별 빈도      top reasons
 *
 * 사용 방식:
 *   - 청구 직전 ClaimCheckPage 에서 evaluateDraft() 호출 → 위험도+사유 표시.
 *   - 한의사가 인지하고 코드 수정 후 청구 → 삭감 ↓ → 매출 보호.
 *
 * 주의:
 *   - 한의원별 데이터로만 학습 (개인정보보호). 다른 한의원 패턴 공유는 동의 기반 익명 집계.
 *   - 최근 12개월 데이터에 가중. 그보다 오래된 청구는 0.5x 가중.
 */

export interface ClaimRecord {
  clinicId: string;
  codes: string[];
  submittedAt: Date;
  outcome: 'approved' | 'rejected' | 'partial';
  rejectionReasons?: string[];
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  rejectionProbability: number; // 0-1
  triggers: Array<{
    kind: 'single' | 'pair';
    codes: string[];
    probability: number;
    pastSampleSize: number;
    suggestedAction?: string;
  }>;
  topReasons: Array<{ reason: string; count: number }>;
}

interface CodeStats {
  total: number;
  rejected: number;
  partial: number;
  reasons: Map<string, number>;
}

@Injectable()
export class SangamLearnerService {
  private readonly logger = new Logger(SangamLearnerService.name);
  /** clinicId → (code → CodeStats) */
  private readonly singleStats = new Map<string, Map<string, CodeStats>>();
  /** clinicId → ("codeA|codeB" → CodeStats) — 정렬된 키로 순서 무시 */
  private readonly pairStats = new Map<string, Map<string, CodeStats>>();
  /** 최근 12개월 cutoff */
  private static readonly RECENT_MS = 365 * 24 * 60 * 60 * 1000;
  /** 최소 표본 — 이보다 적으면 신뢰도 낮음으로 표시 */
  private static readonly MIN_SAMPLE = 5;

  /** 한의원의 청구 이력을 학습 모델에 적재. */
  ingest(records: ClaimRecord[]): void {
    for (const r of records) {
      this.updateSingle(r);
      this.updatePairs(r);
    }
    this.logger.log(`[sangam] ingested ${records.length} records`);
  }

  /** 청구 초안의 위험도 평가. */
  evaluateDraft(input: { clinicId: string; codes: string[] }): RiskAssessment {
    const cMap = this.singleStats.get(input.clinicId);
    const pMap = this.pairStats.get(input.clinicId);
    const triggers: RiskAssessment['triggers'] = [];
    const reasonCounter = new Map<string, number>();

    if (cMap) {
      for (const code of input.codes) {
        const s = cMap.get(code);
        if (!s || s.total < SangamLearnerService.MIN_SAMPLE) continue;
        const prob = (s.rejected + s.partial * 0.5) / s.total;
        if (prob >= 0.3) {
          triggers.push({
            kind: 'single',
            codes: [code],
            probability: prob,
            pastSampleSize: s.total,
            suggestedAction:
              prob >= 0.6
                ? `코드 ${code} 의 단독 사용은 과거 ${(prob * 100).toFixed(0)}% 삭감/감액 — 보조 코드 추가 검토.`
                : `코드 ${code} 위험도 중간 — 진료 기록과 일치 여부 재확인.`,
          });
          for (const [reason, n] of s.reasons.entries()) {
            reasonCounter.set(reason, (reasonCounter.get(reason) ?? 0) + n);
          }
        }
      }
    }

    if (pMap && input.codes.length >= 2) {
      for (let i = 0; i < input.codes.length; i++) {
        for (let j = i + 1; j < input.codes.length; j++) {
          const key = SangamLearnerService.pairKey(input.codes[i], input.codes[j]);
          const s = pMap.get(key);
          if (!s || s.total < SangamLearnerService.MIN_SAMPLE) continue;
          const prob = (s.rejected + s.partial * 0.5) / s.total;
          if (prob >= 0.3) {
            triggers.push({
              kind: 'pair',
              codes: [input.codes[i], input.codes[j]],
              probability: prob,
              pastSampleSize: s.total,
              suggestedAction: `${input.codes[i]} + ${input.codes[j]} 조합 동시 청구는 ${(prob * 100).toFixed(0)}% 삭감 — 분리 청구 또는 1개 제외 검토.`,
            });
            for (const [reason, n] of s.reasons.entries()) {
              reasonCounter.set(reason, (reasonCounter.get(reason) ?? 0) + n);
            }
          }
        }
      }
    }

    triggers.sort((a, b) => b.probability - a.probability);
    const topReasons = Array.from(reasonCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count }));

    const maxProb = triggers.reduce((m, t) => Math.max(m, t.probability), 0);
    const riskLevel: RiskAssessment['riskLevel'] =
      maxProb >= 0.6 ? 'high' : maxProb >= 0.3 ? 'medium' : 'low';

    return { riskLevel, rejectionProbability: maxProb, triggers, topReasons };
  }

  // === 내부 ===

  private static pairKey(a: string, b: string): string {
    return [a, b].sort().join('|');
  }

  private weight(submittedAt: Date): number {
    const age = Date.now() - submittedAt.getTime();
    return age <= SangamLearnerService.RECENT_MS ? 1 : 0.5;
  }

  private updateSingle(r: ClaimRecord): void {
    if (!this.singleStats.has(r.clinicId)) this.singleStats.set(r.clinicId, new Map());
    const map = this.singleStats.get(r.clinicId)!;
    const w = this.weight(r.submittedAt);
    for (const code of new Set(r.codes)) {
      const s = map.get(code) ?? { total: 0, rejected: 0, partial: 0, reasons: new Map() };
      s.total += w;
      if (r.outcome === 'rejected') s.rejected += w;
      if (r.outcome === 'partial') s.partial += w;
      for (const reason of r.rejectionReasons ?? []) {
        s.reasons.set(reason, (s.reasons.get(reason) ?? 0) + w);
      }
      map.set(code, s);
    }
  }

  private updatePairs(r: ClaimRecord): void {
    if (r.codes.length < 2) return;
    if (!this.pairStats.has(r.clinicId)) this.pairStats.set(r.clinicId, new Map());
    const map = this.pairStats.get(r.clinicId)!;
    const w = this.weight(r.submittedAt);
    for (let i = 0; i < r.codes.length; i++) {
      for (let j = i + 1; j < r.codes.length; j++) {
        const key = SangamLearnerService.pairKey(r.codes[i], r.codes[j]);
        const s = map.get(key) ?? { total: 0, rejected: 0, partial: 0, reasons: new Map() };
        s.total += w;
        if (r.outcome === 'rejected') s.rejected += w;
        if (r.outcome === 'partial') s.partial += w;
        for (const reason of r.rejectionReasons ?? []) {
          s.reasons.set(reason, (s.reasons.get(reason) ?? 0) + w);
        }
        map.set(key, s);
      }
    }
  }
}
