import axios from 'axios';
import {
  ReferenceSource,
  ReferenceCategory,
  ReferenceEvidenceType,
} from '../../../database/entities/reference.entity';
import { RawReference, sleep } from './types';

/**
 * PubMed (NCBI E-utilities) 수집기.
 *
 * 1만 건 목표를 실제로 채울 수 있는 유일한 단일 출처다. 침구만으로도 수만 건이
 * 색인돼 있고 초록·서지정보가 공개돼 있다.
 *
 * XML 대신 MEDLINE 텍스트 포맷을 쓴다. efetch 는 JSON 을 주지 않아서 XML 아니면
 * MEDLINE 인데, XML 을 쓰려면 파서를 새로 의존성에 넣어야 하고 그 패키지가
 * 운영 이미지까지 따라간다. MEDLINE 은 수십 년째 안 바뀐 줄 단위 키-값 형식이라
 * 표준 라이브러리만으로 견고하게 읽힌다.
 *
 * NCBI 이용 정책을 지킨다 — tool·email 을 붙이고, 키 없이 초당 3회를 넘지 않는다.
 * 넘기면 IP 가 차단되고, 차단되면 이 기능 전체가 죽는다.
 */

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/** NCBI 가 요구하는 신원 표시. 문제가 생기면 저쪽에서 연락할 수 있어야 한다. */
const TOOL = 'ongojisin-cdss';

/**
 * 요청 간격.
 *
 * 키 없이 초당 3회가 상한이라 340ms 면 이론상 맞지만, 여유를 두지 않으면
 * 네트워크 지터로 순간 초과가 난다. 한 번 차단당하는 비용이 몇 시간 늦게
 * 끝나는 비용보다 훨씬 크다.
 */
const DELAY_NO_KEY = 400;
const DELAY_WITH_KEY = 120; // 키가 있으면 초당 10회까지 허용된다

/** efetch 한 번에 묶는 PMID 수. NCBI 권고가 200 이다. */
const FETCH_BATCH = 200;

/**
 * 수집 주제.
 *
 * 학술 분류가 아니라 진료실에서 나뉘는 대로 잡았다. 각 줄이 PubMed 쿼리 하나이고,
 * 여기서 붙인 category 가 그대로 자료실 필터가 된다.
 *
 * 쿼리에 [MeSH Terms] 와 [Title/Abstract] 를 섞은 이유: MeSH 만 쓰면 색인이 아직
 * 안 붙은 최신 논문이 통째로 빠지고, 자유어만 쓰면 엉뚱한 분야가 딸려 온다.
 */
export interface PubMedTopic {
  query: string;
  category: ReferenceCategory;
  label: string;
}

export const PUBMED_TOPICS: PubMedTopic[] = [
  {
    label: '침구',
    category: ReferenceCategory.ACUPUNCTURE,
    query:
      '("Acupuncture Therapy"[MeSH Terms] OR "Electroacupuncture"[MeSH Terms] OR acupuncture[Title/Abstract] OR electroacupuncture[Title/Abstract])',
  },
  {
    label: '뜸·부항',
    category: ReferenceCategory.ACUPUNCTURE,
    query:
      '("Moxibustion"[MeSH Terms] OR moxibustion[Title/Abstract] OR "cupping therapy"[Title/Abstract])',
  },
  {
    label: '한약·본초',
    category: ReferenceCategory.HERBAL,
    query:
      '("Drugs, Chinese Herbal"[MeSH Terms] OR "Medicine, Korean Traditional"[MeSH Terms] OR "herbal medicine"[Title/Abstract] OR "herbal decoction"[Title/Abstract])',
  },
  {
    label: '한약 안전성·상호작용',
    category: ReferenceCategory.SAFETY,
    query:
      '("Herb-Drug Interactions"[MeSH Terms] OR "herb-drug interaction"[Title/Abstract] OR "herbal hepatotoxicity"[Title/Abstract])',
  },
  {
    label: '추나·도수치료',
    category: ReferenceCategory.REHAB,
    query:
      '("Musculoskeletal Manipulations"[MeSH Terms] OR tuina[Title/Abstract] OR "manual therapy"[Title/Abstract]) AND ("Medicine, East Asian Traditional"[MeSH Terms] OR "traditional medicine"[Title/Abstract])',
  },
  {
    label: '변증·진단',
    category: ReferenceCategory.DIAGNOSIS,
    query:
      '("Medicine, Chinese Traditional/diagnosis"[MeSH Terms] OR "pattern identification"[Title/Abstract] OR "syndrome differentiation"[Title/Abstract] OR "tongue diagnosis"[Title/Abstract] OR "pulse diagnosis"[Title/Abstract])',
  },
  {
    label: '한의학 일반',
    category: ReferenceCategory.OTHER,
    query:
      '("Medicine, Korean Traditional"[MeSH Terms] OR "Korean medicine"[Title/Abstract] OR "Kampo"[Title/Abstract])',
  },
];

/**
 * MEDLINE 레코드 한 건 = 태그 → 값 목록.
 *
 * 같은 태그가 여러 번 나오는 것이 정상이다(저자, MeSH, 발행유형). 그래서
 * 값을 덮어쓰지 않고 배열로 모은다 — 덮어쓰면 저자가 마지막 한 명만 남는다.
 */
type MedlineRecord = Map<string, string[]>;

/**
 * MEDLINE 텍스트를 레코드 배열로 읽는다.
 *
 * 형식:
 *   PMID- 12345678
 *   TI  - 제목이 길면
 *         여섯 칸 들여쓰기로 이어진다
 *   AU  - Hong GD
 *   AU  - Kim CS
 *   (빈 줄이 레코드 경계)
 */
export function parseMedline(text: string): MedlineRecord[] {
  const records: MedlineRecord[] = [];
  let current: MedlineRecord = new Map();
  let lastTag: string | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    // 빈 줄은 레코드 경계다.
    if (rawLine.trim() === '') {
      if (current.size > 0) {
        records.push(current);
        current = new Map();
        lastTag = null;
      }
      continue;
    }

    // "TAG - 값" 형태인가? 태그는 왼쪽 정렬 4칸이고 그 뒤에 '- ' 가 온다.
    const m = /^([A-Z]{2,4}|[A-Z]{1,3}[0-9]?)\s*-\s?(.*)$/.exec(rawLine);
    if (m && !rawLine.startsWith('      ')) {
      lastTag = m[1];
      const list = current.get(lastTag) ?? [];
      list.push(m[2]);
      current.set(lastTag, list);
      continue;
    }

    // 여섯 칸 들여쓰기는 앞 필드의 계속이다.
    if (lastTag) {
      const list = current.get(lastTag);
      if (list && list.length > 0) {
        list[list.length - 1] = `${list[list.length - 1]} ${rawLine.trim()}`;
      }
    }
  }
  if (current.size > 0) records.push(current);
  return records;
}

function first(rec: MedlineRecord, tag: string): string | null {
  const v = rec.get(tag);
  return v && v.length > 0 ? v[0] : null;
}

/**
 * 발행유형(PT)에서 근거 수준을 읽는다.
 *
 * 추측하지 않는다. PubMed 가 붙여 준 것만 쓰고, 없으면 UNKNOWN 이다 —
 * 체계적 고찰이 아닌 것을 체계적 고찰로 표시하면 그 목록 전체가 거짓말이 된다.
 *
 * 순서가 중요하다. 한 논문에 "Review" 와 "Meta-Analysis" 가 같이 붙는 일이
 * 흔한데, 그때 무게가 큰 쪽으로 잡아야 한다.
 */
export function evidenceFromPublicationTypes(types: string[]): ReferenceEvidenceType {
  const t = types.map((s) => s.toLowerCase());
  const has = (needle: string) => t.some((x) => x.includes(needle));

  if (has('meta-analysis') || has('systematic review')) {
    return ReferenceEvidenceType.SYSTEMATIC_REVIEW;
  }
  if (has('randomized controlled trial')) return ReferenceEvidenceType.RCT;
  if (has('practice guideline') || has('guideline')) return ReferenceEvidenceType.GUIDELINE;
  if (has('case reports')) return ReferenceEvidenceType.CASE_REPORT;
  if (has('observational study') || has('cohort') || has('comparative study')) {
    return ReferenceEvidenceType.OBSERVATIONAL;
  }
  if (has('review')) return ReferenceEvidenceType.REVIEW;
  return ReferenceEvidenceType.UNKNOWN;
}

/** "2024 Mar 15" / "2024 Mar" / "2024" 를 날짜와 연도로 */
export function parsePubDate(dp: string | null): {
  publishedAt: Date | null;
  publishedYear: number | null;
} {
  if (!dp) return { publishedAt: null, publishedYear: null };
  const yearMatch = /(\d{4})/.exec(dp);
  if (!yearMatch) return { publishedAt: null, publishedYear: null };
  const year = parseInt(yearMatch[1], 10);

  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const monMatch = /\b([A-Za-z]{3})\b/.exec(dp);
  const month = monMatch ? (months[monMatch[1].toLowerCase()] ?? 0) : 0;
  const dayMatch = /\b(\d{1,2})\b(?!\d)/.exec(dp.replace(/\d{4}/, ''));
  const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;

  // 월·일이 없으면 1월 1일로 채운다. 연도만 아는 자료가 흔해서, 그걸
  // 버리는 것보다 연도를 살리고 publishedYear 로 구분하는 편이 낫다.
  const d = new Date(Date.UTC(year, month, Math.min(Math.max(day, 1), 28)));
  return { publishedAt: d, publishedYear: year };
}

/** DOI 는 LID 나 AID 에 "10.xxxx/yyy [doi]" 형태로 들어온다 */
function extractDoi(rec: MedlineRecord): string | null {
  for (const tag of ['LID', 'AID']) {
    for (const v of rec.get(tag) ?? []) {
      if (v.toLowerCase().includes('[doi]')) {
        return v.replace(/\s*\[doi\]\s*/i, '').trim() || null;
      }
    }
  }
  return null;
}

export function medlineToReference(
  rec: MedlineRecord,
  category: ReferenceCategory,
): RawReference | null {
  const pmid = first(rec, 'PMID');
  const title = first(rec, 'TI');
  // PMID 도 제목도 없으면 자료로 쓸 수 없다. 억지로 채우지 않고 버린다.
  if (!pmid || !title) return null;

  // 초록이 여러 조각(BACKGROUND/METHODS/...)으로 오면 이어 붙인다.
  const abstractParts = rec.get('AB') ?? [];
  const abstract = abstractParts.length > 0 ? abstractParts.join('\n\n') : null;

  const { publishedAt, publishedYear } = parsePubDate(
    first(rec, 'DP') ?? first(rec, 'DEP'),
  );

  // MeSH(MH)에서 '*' 강조와 하위구분(/therapy)을 떼어 키워드로 쓴다.
  const mesh = (rec.get('MH') ?? []).map((s) =>
    s.replace(/^\*/, '').split('/')[0].trim(),
  );
  const otherKeywords = (rec.get('OT') ?? []).map((s) => s.trim());
  const keywords = Array.from(new Set([...mesh, ...otherKeywords])).filter(Boolean);

  const langs = (rec.get('LA') ?? []).map((s) => s.toLowerCase());
  const language = langs.includes('kor') ? 'ko' : langs[0]?.slice(0, 8) || 'en';

  return {
    source: ReferenceSource.PUBMED,
    externalId: pmid.trim(),
    title: title.replace(/\s+/g, ' ').trim().slice(0, 500),
    // 영문 문헌을 기계번역해 titleKo 를 채우지 않는다. 처방명·혈위명이 미묘하게
    // 어긋나고 그 어긋남이 임상에서 사고가 된다.
    titleKo: null,
    abstract,
    authors: (rec.get('FAU') ?? rec.get('AU') ?? []).map((s) => s.trim()),
    journal: (first(rec, 'JT') ?? first(rec, 'TA'))?.slice(0, 300) ?? null,
    publishedAt,
    publishedYear,
    doi: extractDoi(rec),
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid.trim()}/`,
    keywords,
    category,
    evidenceType: evidenceFromPublicationTypes(rec.get('PT') ?? []),
    language,
  };
}

export interface PubMedOptions {
  apiKey?: string | null;
  /** NCBI 정책상 연락 가능한 주소를 붙여야 한다 */
  email?: string | null;
  /** 주제당 최대 수집 건수 */
  perTopic: number;
  /** 이 연도 이후만 — 오래된 문헌까지 다 끌어오면 임상 값어치가 떨어진다 */
  minYear?: number;
  onProgress?: (msg: string) => void;
}

export class PubMedClient {
  constructor(private readonly opts: PubMedOptions) {}

  private get delay(): number {
    return this.opts.apiKey ? DELAY_WITH_KEY : DELAY_NO_KEY;
  }

  private common(): Record<string, string> {
    const p: Record<string, string> = { db: 'pubmed', tool: TOOL };
    if (this.opts.apiKey) p.api_key = this.opts.apiKey;
    if (this.opts.email) p.email = this.opts.email;
    return p;
  }

  /** 주제 하나의 PMID 목록. retstart 로 넘겨 가며 perTopic 까지 모은다. */
  async searchIds(topic: PubMedTopic): Promise<string[]> {
    const ids: string[] = [];
    const pageSize = Math.min(this.opts.perTopic, 500);
    const term = this.opts.minYear
      ? `${topic.query} AND ${this.opts.minYear}:3000[dp]`
      : topic.query;

    while (ids.length < this.opts.perTopic) {
      const res = await axios.get(`${EUTILS}/esearch.fcgi`, {
        params: {
          ...this.common(),
          term,
          retmode: 'json',
          retmax: pageSize,
          retstart: ids.length,
          sort: 'date',
        },
        timeout: 30_000,
      });
      const batch: string[] = res.data?.esearchresult?.idlist ?? [];
      if (batch.length === 0) break;
      ids.push(...batch);
      // 상류가 가진 것보다 더 달라고 조를 수는 없다.
      const total = parseInt(res.data?.esearchresult?.count ?? '0', 10);
      if (ids.length >= total) break;
      await sleep(this.delay);
    }
    return ids.slice(0, this.opts.perTopic);
  }

  /** PMID 묶음의 MEDLINE 레코드 */
  async fetchRecords(ids: string[]): Promise<MedlineRecord[]> {
    const res = await axios.get(`${EUTILS}/efetch.fcgi`, {
      params: {
        ...this.common(),
        id: ids.join(','),
        rettype: 'medline',
        retmode: 'text',
      },
      timeout: 60_000,
      responseType: 'text',
      // 초록이 길어 응답이 수 MB 가 된다. axios 기본 상한에 걸리지 않게 푼다.
      maxContentLength: 100 * 1024 * 1024,
      maxBodyLength: 100 * 1024 * 1024,
    });
    return parseMedline(String(res.data));
  }

  /** 주제 하나를 통째로 수집한다 */
  async harvestTopic(topic: PubMedTopic): Promise<RawReference[]> {
    const log = this.opts.onProgress ?? (() => undefined);
    const ids = await this.searchIds(topic);
    log(`PubMed [${topic.label}] PMID ${ids.length}건`);

    const out: RawReference[] = [];
    for (let i = 0; i < ids.length; i += FETCH_BATCH) {
      const slice = ids.slice(i, i + FETCH_BATCH);
      try {
        const records = await this.fetchRecords(slice);
        for (const rec of records) {
          const ref = medlineToReference(rec, topic.category);
          if (ref) out.push(ref);
        }
        log(`PubMed [${topic.label}] ${Math.min(i + FETCH_BATCH, ids.length)}/${ids.length}`);
      } catch (e) {
        // 한 묶음이 실패해도 나머지는 계속 간다. 수 시간짜리 작업이라
        // 중간에 통째로 죽으면 그때까지 받은 것도 못 쓴다.
        log(`PubMed [${topic.label}] 묶음 실패(계속 진행): ${(e as Error).message}`);
      }
      await sleep(this.delay);
    }
    return out;
  }
}
