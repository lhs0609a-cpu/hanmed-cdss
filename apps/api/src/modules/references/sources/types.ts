import {
  ReferenceSource,
  ReferenceCategory,
  ReferenceEvidenceType,
} from '../../../database/entities/reference.entity';

/**
 * 수집기가 돌려주는 한 건. 저장 직전의 형태다.
 *
 * 모든 어댑터가 이 모양으로 맞춰서 내놓으면, 저장·중복제거·업서트는 한 곳에서만
 * 하면 된다. 출처가 다섯이나 되므로 그 규칙이 다섯 군데로 흩어지면 곧 어긋난다.
 */
export interface RawReference {
  source: ReferenceSource;
  /** 원 출처의 식별자. 이게 없으면 재수집 때 중복을 못 막으므로 버린다. */
  externalId: string;
  title: string;
  titleKo?: string | null;
  abstract?: string | null;
  authors: string[];
  journal?: string | null;
  publishedAt?: Date | null;
  publishedYear?: number | null;
  doi?: string | null;
  /** 원문 링크. 확인할 수 없는 자료는 자료가 아니라서 필수다. */
  url: string;
  keywords: string[];
  category: ReferenceCategory;
  evidenceType: ReferenceEvidenceType;
  language: string;
}

/** 수집 한 판의 결과 — 로그와 운영 판단에 쓴다. */
export interface HarvestResult {
  source: ReferenceSource;
  /** 상류에서 받아 온 건수 */
  fetched: number;
  /** 새로 저장된 건수 */
  inserted: number;
  /** 이미 있어서 갱신만 된 건수 */
  updated: number;
  /** 필수 항목이 없어 버린 건수 */
  skipped: number;
  errors: string[];
}

export function emptyResult(source: ReferenceSource): HarvestResult {
  return { source, fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
}

/** 상류를 두드리는 간격. 어댑터마다 정책이 달라 호출부에서 정한다. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
