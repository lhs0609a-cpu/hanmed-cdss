import axios from 'axios';
import {
  ReferenceSource,
  ReferenceCategory,
  ReferenceEvidenceType,
} from '../../../database/entities/reference.entity';
import { RawReference, sleep } from './types';

/**
 * KCI 공식 Open API 수집기.
 *
 * OAI-PMH 수집기(kci.ts)와 목적은 같고 방법이 다르다. 그쪽은 주제로 못
 * 걸러서 240만 건을 전부 훑어야 했다 — 20시간을 돌리고도 한의학 논문
 * 비중이 1%라 대부분이 헛일이었다.
 *
 * 이쪽은 학술지 이름으로 직접 찾는다. 두 단계다.
 *
 *   1. apiCode=citation 으로 KCI 등재 학술지 전체를 훑는다. 응답에
 *      연구분야(major)가 실려 있어 한의학 학술지만 골라낼 수 있다.
 *      한 해 기준 2,678종이라 100건씩 27번이면 끝난다.
 *   2. 고른 학술지마다 apiCode=articleSearch&journal=<이름> 으로 논문을
 *      받는다. 응답에 국문 초록이 그대로 들어 있다.
 *
 * 국문 초록이 온다는 것이 중요하다. PubMed 는 영문이라 번역과 요약에
 * 값을 치러야 하는데 여기는 원문이 이미 한국어다. 진료 중에 바로 읽힌다.
 *
 * 인증키는 KCI 에서 따로 발급받는다. 공공데이터포털(data.go.kr)의
 * KCI 키와는 발급처가 달라 서로 통하지 않는다 — data.go.kr 키를 여기에
 * 넣으면 "등록되지 않은 key" 가 온다. 실제로 그렇게 한참 헤맸다.
 */

const API_BASE = 'https://open.kci.go.kr/po/openapi/openApiSearch.kci';

/** 우리가 누구인지 밝힌다. 없으면 방화벽이 막는다. */
const UA =
  'ongojisin-cdss/1.0 (Korean medicine CDSS; +https://ongojisin.co.kr)';

/** 명세서가 정한 상한. 더 올려 봐야 100건만 온다. */
export const MAX_DISPLAY = 100;

/** 요청 간격. 상대 서버를 밀어붙이지 않는다. */
const DELAY_MS = 400;

/**
 * 한의학 학술지로 볼 연구분야.
 *
 * citation API 의 major 는 "인문학 > 철학 > 서양철학" 처럼 계층으로 오거나
 * "사회과학" 처럼 대분류만 오기도 한다. 어느 쪽이든 한의학은 문자열에
 * 드러나므로 부분일치로 본다.
 *
 * 학술지 단위 판정이라 OAI-PMH 때처럼 관광학 논문이 섞일 일이 없다.
 * 대한한의학회지에 실린 글은 무엇이든 한의사가 읽을 것이다.
 */
const KM_JOURNAL_FIELDS = /(한의학|한방|동양의학|침구|보완대체)/;

/**
 * 분야가 안 잡힐 때를 대비한 학술지 이름 규칙.
 *
 * KCI 의 major 는 학술지 등록 시점 분류라 실제 내용과 어긋나는 것이 있다.
 * 이름에 한의학이 분명히 드러나면 분야와 무관하게 받는다.
 *
 * '한의' 앞에 '대' 가 오면 뺀다. 그냥 '한의' 로 찾았더니 대한의사협회지,
 * 대한의생명과학회지, 대한의진균학회지가 걸렸다 — 전부 '대·한의·…' 로
 * 끊기는 양방·자연과학 학회지다. 대한의사협회지 하나만 들어와도 자료실이
 * 양방 논문으로 덮인다.
 *
 * 대한한의학회지·대한한의진단학회지처럼 진짜 한의학 학술지는 '한의' 앞이
 * '한' 이라 그대로 걸린다.
 */
const KM_JOURNAL_NAMES =
  /(한의학|(?<!대)한의|한방|경락|침구|약침|본초|사상체질|동의|한약)/;

export interface KciApiOptions {
  apiKey: string;
  onProgress?: (msg: string) => void;
}

export interface KciJournal {
  journalId: string | null;
  name: string;
  publisher: string | null;
  major: string | null;
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 태그 이름 뒤에 공백이나 '>' 가 오도록 못박는다.
 *
 * 이게 없으면 <abstract-group> 이 <abstract> 로, <title-group> 이
 * <title> 로 걸린다. OAI-PMH 쪽에서 실제로 그렇게 새서 초록이 통째로
 * 비었던 적이 있다.
 */
function tagRe(name: string, flags = ''): RegExp {
  return new RegExp(`<${name}(?=[\\s>])[^>]*>([\\s\\S]*?)</${name}>`, flags);
}

function tag(xml: string, name: string): string | null {
  const m = tagRe(name).exec(xml);
  return m ? decode(m[1]) : null;
}

function tagAll(xml: string, name: string): string[] {
  const re = tagRe(name, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const v = decode(m[1]);
    if (v && !v.includes('<')) out.push(v);
  }
  return out;
}

/** 속성값 하나. `<articleInfo article-id="ART001">` 같은 것. */
function attr(xml: string, tagName: string, name: string): string | null {
  const m = new RegExp(`<${tagName}[^>]*\\b${name}="([^"]*)"`).exec(xml);
  return m ? m[1] : null;
}

/** lang 속성이 붙은 태그에서 원하는 언어만 뽑는다. */
function taggedByLang(xml: string, name: string, lang: string): string | null {
  const m = new RegExp(
    `<${name}[^>]*\\blang="${lang}"[^>]*>([\\s\\S]*?)</${name}>`,
  ).exec(xml);
  return m ? decode(m[1]) : null;
}

/**
 * 연구분야를 우리 분류로 옮긴다.
 *
 * 추측하지 않는다. 제목·초록·키워드에 분명한 말이 있을 때만 정하고
 * 없으면 OTHER 다.
 */
function categoryOf(text: string): ReferenceCategory {
  // 치료수단이 주소증보다 먼저다. "요통에 대한 침 치료" 는 침구 논문이지
  // 재활 논문이 아니다. '침' 한 글자로 찾으면 취침·침습·침전이 걸리므로
  // 붙는 말까지 본다.
  if (/(침구|약침|전침|화침|침 ?치료|침술|뜸|구법|부항|경혈|경락)/.test(text)) {
    return ReferenceCategory.ACUPUNCTURE;
  }
  if (/(추나|도수|근골격|요통|경항통|견비통)/.test(text)) {
    return ReferenceCategory.REHAB;
  }
  if (/(본초|방제|탕약|첩약|한약|약재)/.test(text)) {
    return ReferenceCategory.HERBAL;
  }
  if (/(변증|사상체질|맥진|설진|진단)/.test(text)) {
    return ReferenceCategory.DIAGNOSIS;
  }
  if (/(안전성|부작용|독성|상호작용)/.test(text)) {
    return ReferenceCategory.SAFETY;
  }
  return ReferenceCategory.OTHER;
}

/**
 * 근거 수준.
 *
 * KCI 는 발행유형 태그를 주지 않는다. 제목에 분명히 적혀 있을 때만 잡고
 * 나머지는 UNKNOWN 이다 — 추측해서 붙이면 목록 전체가 거짓말이 된다.
 */
function evidenceOf(title: string): ReferenceEvidenceType {
  if (/(체계적\s*(문헌\s*)?고찰|메타\s*분석|systematic review|meta-analysis)/i.test(title)) {
    return ReferenceEvidenceType.SYSTEMATIC_REVIEW;
  }
  if (/(무작위\s*대조|randomized controlled|RCT)/i.test(title)) {
    return ReferenceEvidenceType.RCT;
  }
  if (/(진료\s*지침|임상진료지침|guideline)/i.test(title)) {
    return ReferenceEvidenceType.GUIDELINE;
  }
  if (/(증례|치험|험례|case report)/i.test(title)) {
    return ReferenceEvidenceType.CASE_REPORT;
  }
  if (/(고찰|리뷰|review)/i.test(title)) return ReferenceEvidenceType.REVIEW;
  return ReferenceEvidenceType.UNKNOWN;
}

export class KciApiClient {
  constructor(private readonly opts: KciApiOptions) {}

  private log(m: string) {
    (this.opts.onProgress ?? (() => undefined))(m);
  }

  private async get(params: Record<string, string | number>): Promise<string> {
    const q = new URLSearchParams({
      key: this.opts.apiKey,
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ),
    });
    const res = await axios.get(`${API_BASE}?${q.toString()}`, {
      headers: { 'User-Agent': UA, Accept: 'application/xml' },
      timeout: 60_000,
      responseType: 'text',
    });
    const xml = String(res.data);

    // 이 API 는 오류도 200 으로 준다. 본문을 봐야 안다.
    const msg = tag(xml, 'resultMsg');
    if (msg && !/^\s*$/.test(msg)) {
      throw new Error(`KCI: ${msg}`);
    }
    return xml;
  }

  /**
   * KCI 등재 학술지 전체에서 한의학 학술지를 골라낸다.
   *
   * citation API 는 year 와 years 가 필수다. 인용지수를 주는 API 라서인데,
   * 우리에게 필요한 것은 딸려 오는 학술지 목록과 연구분야다.
   */
  async findKoreanMedicineJournals(year: number): Promise<KciJournal[]> {
    const out: KciJournal[] = [];
    const seen = new Set<string>();
    let page = 1;
    let total = Infinity;

    while ((page - 1) * MAX_DISPLAY < total) {
      // 여기서 한 페이지를 잃으면 학술지 몇 종이 통째로 목록에서 빠지고,
      // 그러면 그 학술지의 논문을 아예 안 받는다. 논문 한 페이지를 잃는
      // 것보다 손해가 크다.
      const xml = await this.getPageWithRetry({
        apiCode: 'citation',
        year,
        years: 2,
        page,
        displayCount: MAX_DISPLAY,
      });

      if (total === Infinity) {
        total = parseInt(tag(xml, 'total') ?? '0', 10) || 0;
        this.log(`${year}년 기준 등재 학술지 ${total.toLocaleString()}종을 훑습니다.`);
      }

      const records = xml.split('<record>').slice(1);
      if (records.length === 0) break;

      for (const rec of records) {
        const name = tag(rec, 'journal-name');
        if (!name || seen.has(name)) continue;
        const major = tag(rec, 'major') ?? '';
        if (!KM_JOURNAL_FIELDS.test(major) && !KM_JOURNAL_NAMES.test(name)) {
          continue;
        }
        seen.add(name);
        out.push({
          journalId: attr(rec, 'journalInfo', 'journal-id'),
          name,
          publisher: tag(rec, 'publisher-name'),
          major: major || null,
        });
      }

      page += 1;
      await sleep(DELAY_MS);
    }

    return out;
  }

  /**
   * 한 페이지를 받는다. 실패하면 몇 번 다시 시도한다.
   *
   * 이게 없어서 수집이 조용히 잘렸다. get() 이 던지면 학술지 루프가 그걸
   * 잡고 다음 학술지로 넘어가는데, 그 순간 이 학술지의 남은 페이지가
   * 통째로 버려진다. 로그에는 "실패" 한 줄만 남고 몇 편을 못 받았는지는
   * 아무 데도 안 적힌다.
   *
   * 실제로 1,525편이 그렇게 빠졌다. 다시 돌려 보고 나서야 알았다.
   *
   * 네트워크가 한 번 튀는 것은 흔한 일이고, 그때마다 학술지 하나를 통째로
   * 잃을 이유가 없다. 세 번까지 다시 물어본다.
   */
  private async getPageWithRetry(
    params: Record<string, string | number>,
    attempts = 3,
  ): Promise<string> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        return await this.get(params);
      } catch (e) {
        lastError = e;
        // 인증키가 틀렸거나 계약이 없는 것은 다시 물어도 같다.
        const msg = (e as Error)?.message ?? '';
        if (/등록되지 않은 key|사용기간|계약/.test(msg)) throw e;
        this.log(`페이지 재시도 ${i + 1}/${attempts}: ${msg}`);
        await sleep(DELAY_MS * (i + 2));
      }
    }
    throw lastError;
  }

  /**
   * 학술지 하나의 논문을 전부 받는다.
   *
   * maxPages 를 두는 이유는 안전장치다. total 을 믿고 돌다가 서버가 다른
   * 수를 주면 끝나지 않는 반복이 된다.
   */
  async fetchJournalArticles(
    journal: string,
    maxPages = 200,
  ): Promise<RawReference[]> {
    const out: RawReference[] = [];
    let page = 1;
    let total = Infinity;

    while ((page - 1) * MAX_DISPLAY < total && page <= maxPages) {
      const xml = await this.getPageWithRetry({
        apiCode: 'articleSearch',
        journal,
        page,
        displayCount: MAX_DISPLAY,
      });

      if (total === Infinity) {
        total = parseInt(tag(xml, 'total') ?? '0', 10) || 0;
        if (total === 0) break;
      }

      const records = xml.split('<record>').slice(1);
      if (records.length === 0) break;

      for (const rec of records) {
        const ref = toReference(rec, journal);
        if (ref) out.push(ref);
      }

      page += 1;
      await sleep(DELAY_MS);
    }

    // 받은 수가 총계와 다르면 알린다.
    //
    // 조용히 덜 받는 것이 가장 나쁘다. 로그가 멀쩡하면 다 받은 줄 알고
    // 넘어가고, 나중에 검색에서 안 나오는 논문을 보고서야 알게 된다.
    // 실제로 1,525편이 그렇게 빠져 있었다.
    if (total !== Infinity && out.length < total) {
      this.log(
        `${journal}: 총 ${total}건 중 ${out.length}건만 받았습니다. 다시 돌려 주세요.`,
      );
    }

    return out;
  }
}

/** 검색 결과 한 건을 우리 문헌 형태로 옮긴다. */
export function toReference(
  recordXml: string,
  fallbackJournal: string,
): RawReference | null {
  const externalId = attr(recordXml, 'articleInfo', 'article-id');
  if (!externalId) return null;

  const titleKo = taggedByLang(recordXml, 'article-title', 'original');
  const titleEn = taggedByLang(recordXml, 'article-title', 'english');
  const title = titleEn || titleKo;
  if (!title) return null;

  // 국문 초록이 있으면 그것이 본문이다. PubMed 와 달리 번역이 필요 없다.
  const abstractKo = taggedByLang(recordXml, 'abstract', 'original');
  const abstractEn = taggedByLang(recordXml, 'abstract', 'english');

  // 저자는 "김갑수(서울교육대학교)" 형태로 온다. 소속은 떼어낸다 —
  // 목록에서 이름만 보이면 되고, 소속까지 붙으면 한 줄이 넘어간다.
  const authors = tagAll(recordXml, 'author')
    .map((a) => a.replace(/\([^)]*\)/g, '').trim())
    .filter((a) => a.length > 0)
    .slice(0, 30);

  const year = tag(recordXml, 'pub-year');
  const mon = tag(recordXml, 'pub-mon');
  const publishedYear = year ? parseInt(year, 10) || null : null;
  const publishedAt =
    publishedYear !== null
      ? new Date(
          Date.UTC(
            publishedYear,
            mon ? Math.max(parseInt(mon, 10) - 1, 0) : 0,
            1,
          ),
        )
      : null;

  const field = tag(recordXml, 'article-categories') ?? '';
  const haystack = `${field} ${titleKo ?? ''} ${title} ${abstractKo ?? ''}`;

  return {
    source: ReferenceSource.KCI,
    externalId,
    title: title.slice(0, 500),
    titleKo: titleKo && titleKo !== title ? titleKo.slice(0, 500) : null,
    // 원문 초록. 한국어가 있으면 한국어를 본문으로 둔다.
    abstract: abstractKo || abstractEn,
    authors,
    journal: (tag(recordXml, 'journal-name') ?? fallbackJournal).slice(0, 300),
    publishedAt,
    publishedYear,
    doi: tag(recordXml, 'doi'),
    url:
      tag(recordXml, 'url') ??
      `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${externalId}`,
    // articleSearch 는 저자 키워드를 주지 않는다. 연구분야를 넣는다 —
    // 없는 값을 지어내지 않는다.
    keywords: field ? [field] : [],
    category: categoryOf(haystack),
    evidenceType: evidenceOf(`${titleKo ?? ''} ${title}`),
    language: abstractKo || titleKo ? 'ko' : 'en',
  };
}
