import axios from 'axios';
import {
  ReferenceSource,
  ReferenceCategory,
  ReferenceEvidenceType,
} from '../../../database/entities/reference.entity';
import { RawReference, sleep } from './types';

/**
 * KCI (한국학술지인용색인) 수집기 — OAI-PMH.
 *
 * 자료실이 14,804건인데 한국어는 11건이었다. 진료 중에 영어 초록을 읽는
 * 한의사는 거의 없다. 검색해서 제목만 보고 닫는다. 한국어 논문 몇 천 건이
 * 영어 1만 건보다 실제로 더 쓰인다.
 *
 * 왜 OAI-PMH 인가
 * 공공데이터포털의 KCI 논문정보서비스는 승인이 났는데도 계속
 * NO_OPENAPI_SERVICE_ERROR 가 나서 열리지 않았다. OAI-PMH 는 키 없이 열려
 * 있고, 학술 메타데이터 수집을 위해 만들어진 표준 프로토콜이라 이 용도에
 * 정확히 맞는다.
 *
 * User-Agent 를 반드시 붙인다. curl 기본값으로는 방화벽이 "비정상적인 접근"
 * 으로 차단한다. 브라우저를 위장하는 것이 아니라 우리가 누구인지 밝히는
 * 것이고, 그게 API 클라이언트의 정상적인 예의다.
 *
 * 아픈 부분: set 이 ARTI / ARTI_CONF / JOUR 셋뿐이라 주제로 못 거른다.
 * 240만 건을 받아 article-categories 로 한의학만 골라내야 한다. 그래서
 * 이어서 돌릴 수 있게 만들었다 — resumptionToken 을 저장하고 다음 실행에서
 * 그 지점부터 잇는다.
 */

const OAI_BASE = 'https://open.kci.go.kr/oai/request';

/** 우리가 누구인지 밝힌다. 없으면 방화벽에 막힌다. */
const UA =
  'ongojisin-cdss/1.0 (Korean medicine CDSS; +https://ongojisin.co.kr)';

/** 한 번에 100건씩 온다(서버가 정한다). 요청 간격은 예의상 둔다. */
const DELAY_MS = 700;

/**
 * 한의학으로 볼 연구분야.
 *
 * KCI 의 article-categories 는 "한의학", "약학", "간호학" 처럼 분야명이 온다.
 * 한의학만 좁게 잡으면 통합의학·보완대체의학 논문이 빠지고, 넓게 잡으면
 * 양방 논문이 쏟아진다. 분야로 1차로 거르고 제목·초록 키워드로 2차로 거른다.
 */
const KM_CATEGORIES = /(한의학|한방|동양의학|보완대체|침구)/;

/**
 * 분야가 애매할 때 제목·초록에서 찾는 말.
 *
 * 분야가 "약학" 이나 "간호학" 으로 잡힌 한의학 논문이 실제로 많다. 학회지가
 * 어디에 등록돼 있느냐의 문제라, 내용으로 한 번 더 본다.
 */
const KM_KEYWORDS =
  /(한의|한방|침구|약침|뜸|부항|추나|경혈|경락|변증|사상체질|본초|방제|탕약|첩약|한약|東醫|韓醫)/;

export interface KciOptions {
  /**
   * 훑을 datestamp 구간.
   *
   * 이걸 안 주면 서버가 1900-01-01:9999-12-31 로 잡는데, 그 구간은 102건만
   * 돌려주는 빈 창이다. 실제 데이터는 구간을 명시해야 나온다.
   */
  from: string;
  until: string;
  /** 이어서 돌릴 때 쓰는 토큰. 없으면 구간 처음부터. */
  resumptionToken?: string | null;
  /** 이번 실행에서 훑을 최대 페이지 수(한 페이지 100건) */
  maxPages: number;
  onProgress?: (msg: string) => void;
  /**
   * 중간 저장 지점.
   *
   * 이게 없으면 harvest() 가 끝나야 저장한다. --pages=5000 이면 50만 건을
   * 메모리에 이고 몇 시간을 돌다가 마지막에 한 번 쓰는 셈인데, 그 사이
   * 프로세스가 죽거나 창이 닫히면 그날 것이 통째로 없어진다. 실제로
   * 20시간을 돌고도 DB 에 0건이었다.
   *
   * 몇 페이지마다 여기로 넘겨 저장하고 토큰까지 남긴다. 토큰을 같이 주는
   * 이유는 저장과 이어받기 지점이 어긋나면 안 되기 때문이다 — 저장은
   * 됐는데 토큰이 뒤처지면 다음 실행이 같은 구간을 다시 훑는다.
   */
  onBatch?: (refs: RawReference[], token: string | null) => Promise<void>;
  /** 몇 페이지마다 onBatch 를 부를지. */
  flushEvery?: number;
}

export interface KciHarvestResult {
  refs: RawReference[];
  /** 다음 실행에 넘길 토큰. null 이면 끝까지 훑은 것이다. */
  nextToken: string | null;
  scanned: number;
}

/**
 * XML 태그를 뽑는다.
 *
 * 이름 뒤에 반드시 공백이나 '>' 가 오도록 못박는다. 이게 없으면
 * <abstract-group> 이 <abstract> 로, <keyword-group> 이 <keyword> 로 걸린다.
 * 실제로 그렇게 새서 초록이 통째로 비고 키워드가 하나만 잡혔다.
 */
function tagRe(name: string, flags = ''): RegExp {
  // 템플릿 문자열 안에서는 역슬래시를 두 번 써야 정규식에 \s 로 들어간다.
  // 한 번만 쓰면 그냥 s 가 되어 조용히 엉뚱한 것을 찾는다.
  return new RegExp(`<${name}(?=[\\s>])[^>]*>([\\s\\S]*?)</${name}>`, flags);
}

function tag(xml: string, name: string): string | null {
  const m = tagRe(name).exec(xml);
  return m ? decode(m[1].trim()) : null;
}

function tagAll(xml: string, name: string): string[] {
  const re = tagRe(name, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const v = decode(m[1].trim());
    // 그래도 자식 태그가 섞여 오면 값이 아니다.
    if (v && !v.includes('<')) out.push(v);
  }
  return out;
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
 * 연구분야를 우리 분류로 옮긴다.
 *
 * 추측하지 않는다. 제목·초록에 분명한 말이 있을 때만 정하고, 없으면 OTHER 다.
 */
function categoryOf(text: string): ReferenceCategory {
  // 치료수단이 주소증보다 먼저다. "요통에 대한 침 치료" 는 침구 논문이지
  // 재활 논문이 아니다 — 자료실 필터가 치료수단 기준이라 그쪽에 맞춘다.
  // '침' 한 글자로 찾으면 취침·침습·침전이 걸리므로 붙는 말까지 본다.
  if (/(침구|약침|전침|화침|침 ?치료|침술|acupuncture|뜸|구법|부항|경혈|경락)/i.test(text)) {
    return ReferenceCategory.ACUPUNCTURE;
  }
  if (/(추나|도수|근골격|요통|경항통|견비통)/.test(text)) return ReferenceCategory.REHAB;
  if (/(본초|방제|탕약|첩약|한약|약재)/.test(text)) return ReferenceCategory.HERBAL;
  if (/(변증|사상체질|진단|맥진|설진)/.test(text)) return ReferenceCategory.DIAGNOSIS;
  if (/(안전성|부작용|독성|상호작용)/.test(text)) return ReferenceCategory.SAFETY;
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

function toReference(recordXml: string): RawReference | null {
  const artIdMatch = /<articleInfo[^>]*article-id="([^"]+)"/.exec(recordXml);
  const externalId = artIdMatch?.[1] ?? tag(recordXml, 'identifier');
  if (!externalId) return null;

  const titles = tagAll(recordXml, 'article-title');
  const titleKo = titles[0] ?? null;
  const titleEn = titles[1] ?? null;
  const title = titleEn || titleKo;
  if (!title) return null;

  const category = tag(recordXml, 'article-categories') ?? '';
  // <abstract-group> 이 <abstract lang="..."> 를 감싼다. 태그 이름만으로 찾으면
  // 바깥 래퍼가 먼저 걸려서 초록이 통째로 비어 버린다 — 실제로 그렇게 새고 있었다.
  const abstract =
    tagAll(recordXml, 'abstract').join(String.fromCharCode(10, 10)) ||
    null;

  // <author-name> 도 래퍼다. 안쪽 <name> 이 사람 이름이다.
  const authors = tagAll(recordXml, 'name').slice(0, 30);

  // 분야로 1차, 내용으로 2차. 둘 다 아니면 한의학 논문이 아니다.
  const haystack = `${category} ${titleKo ?? ''} ${title} ${abstract ?? ''}`;
  if (!KM_CATEGORIES.test(category) && !KM_KEYWORDS.test(haystack)) return null;

  const year = tag(recordXml, 'pub-year');
  const mon = tag(recordXml, 'pub-mon');
  const publishedYear = year ? parseInt(year, 10) || null : null;
  const publishedAt =
    publishedYear !== null
      ? new Date(Date.UTC(publishedYear, mon ? Math.max(parseInt(mon, 10) - 1, 0) : 0, 1))
      : null;

  return {
    source: ReferenceSource.KCI,
    externalId,
    // 목록에서는 한국어 제목이 먼저 보여야 한다.
    title: title.slice(0, 500),
    titleKo: titleKo && titleKo !== title ? titleKo.slice(0, 500) : null,
    abstract,
    authors,
    journal: tag(recordXml, 'journal-name')?.slice(0, 300) ?? null,
    publishedAt,
    publishedYear,
    doi: tag(recordXml, 'doi'),
    url: `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${externalId}`,
    keywords: tagAll(recordXml, 'keyword').slice(0, 20),
    category: categoryOf(haystack),
    evidenceType: evidenceOf(`${titleKo ?? ''} ${title}`),
    language: titleKo ? 'ko' : 'en',
  };
}

export class KciClient {
  constructor(private readonly opts: KciOptions) {}

  async harvest(): Promise<KciHarvestResult> {
    const log = this.opts.onProgress ?? (() => undefined);
    const refs: RawReference[] = [];
    let token = this.opts.resumptionToken ?? null;
    let scanned = 0;

    for (let page = 0; page < this.opts.maxPages; page += 1) {
      const url = token
        ? `${OAI_BASE}?verb=ListRecords&resumptionToken=${encodeURIComponent(token)}`
        : `${OAI_BASE}?verb=ListRecords&set=ARTI&metadataPrefix=oai_kci` +
          `&from=${this.opts.from}&until=${this.opts.until}`;

      let xml = '';
      try {
        const res = await axios.get(url, {
          headers: { 'User-Agent': UA, Accept: 'application/xml' },
          timeout: 60_000,
          responseType: 'text',
          maxContentLength: 50 * 1024 * 1024,
        });
        xml = String(res.data);
      } catch (e) {
        // 한 페이지가 실패해도 그때까지 받은 것은 살린다. 240만 건을 훑는
        // 작업이라 중간에 통째로 죽으면 그날 것이 다 날아간다.
        log(`KCI 페이지 실패(중단): ${(e as Error).message}`);
        break;
      }

      const records = xml.split('<record>').slice(1);
      if (records.length === 0) {
        token = null;
        break;
      }
      scanned += records.length;

      for (const rec of records) {
        const ref = toReference(rec);
        if (ref) refs.push(ref);
      }

      const nextToken = tag(xml, 'resumptionToken');
      token = nextToken && nextToken.length > 0 ? nextToken : null;

      if ((page + 1) % 10 === 0) {
        log(`KCI ${scanned.toLocaleString()}건 훑음 · 한의학 ${refs.length}건 추출`);
      }

      // 중간 저장. 걸러낸 것이 없어도 토큰은 남겨야 한다 — 한의학 논문이
      // 한 건도 없는 구간이 수만 건씩 이어지는데, 그때 토큰을 안 남기면
      // 다음 실행이 그 빈 구간을 처음부터 다시 훑는다.
      const flush = this.opts.flushEvery ?? 0;
      if (this.opts.onBatch && flush > 0 && (page + 1) % flush === 0) {
        await this.opts.onBatch(refs.splice(0, refs.length), token);
      }

      if (!token) break;
      await sleep(DELAY_MS);
    }

    return { refs, nextToken: token, scanned };
  }
}
