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
 *
 * 짧은 말은 뺐다. 처음에는 '한의' 와 '한방' 과 '뜸' 을 넣었는데 한국어는
 * 조사가 붙어서 "남북한의 심리적 통일", "북한의 정책" 이 '한의' 로 걸린다.
 * 실제로 그렇게 들어온 것이 시험 수집 62건 중 상당수였다. '한방' 은 말
 * 자체는 맞지만 한방관광·한방화장품·한방테라피처럼 임상과 무관한 쓰임이
 * 더 많다. 그래서 뒤에 무엇이 붙는지까지 본다.
 */
const KM_KEYWORDS =
  /(한의학|한의사|한의원|한의약|한의계|한방치료|한방요법|한방재활|한방병원|한방의료|침구|약침|전침|뜸치료|부항|추나|경혈|경락|변증|사상체질|본초|방제|탕약|첩약|한약|東醫|韓醫)/;

/**
 * 임상과 관계없는 연구분야.
 *
 * 여기에 걸리면 키워드가 맞아도 받지 않는다. 한방관광 논문은 '한방' 이
 * 제목에 있지만 관광학이고, 진료에 쓸 일이 없다. 자료실은 진료 중에 여는
 * 곳이라 한 편이라도 엉뚱한 것이 섞이면 다음부터 안 연다.
 *
 * 분야가 '한의학' 계열이면 이 목록을 보지 않는다 — 한의학 분야로 등록된
 * 논문은 그 자체로 근거가 충분하다.
 */
const NON_CLINICAL_FIELDS =
  /(관광학|신문방송학|언어학|종교학|기타예술체육|경영학|무역학|행정학|정치외교학|법학|역사학|문학|교육학|사회학|건축|기계공학|전자공학|컴퓨터학|지리학|인류학|철학)/;

/**
 * 이 논문을 자료실에 넣을지.
 *
 * 초록까지 한 덩어리로 놓고 키워드 하나만 걸리면 받던 때가 있었다. 그랬더니
 * 2천 자짜리 초록에 '한의학' 이 한 번 스친 공연관광 논문, 심리학 논문이
 * 들어왔다 — 시험 수집 17건 중 15건이 그런 것이었다. 한 번의 언급은 그
 * 논문의 주제가 아니라 배경 설명이다.
 *
 * 그래서 세 갈래로 본다.
 *
 *   1. 연구분야가 한의학 계열이면 받는다. 가장 강한 신호다.
 *   2. 제목에 걸리면 받는다. 자기 주제를 제목에 안 적는 논문은 드물다.
 *   3. 초록만 걸릴 때는 서로 다른 말이 둘 이상이어야 받는다. 하나는
 *      스쳐 지나간 것일 수 있어도 둘이면 그 논문이 다루는 것이다.
 *
 * 비임상 분야는 어느 갈래든 제외한다 — 한방관광 논문은 '한방' 이 제목에
 * 있어도 관광학이고 진료에 쓸 일이 없다.
 */
function isKoreanMedicine(
  field: string,
  title: string,
  abstract: string,
): boolean {
  if (KM_CATEGORIES.test(field)) return true;
  if (NON_CLINICAL_FIELDS.test(field)) return false;
  if (KM_KEYWORDS.test(title)) return true;

  // 초록만 걸린 경우 — 서로 다른 말이 몇 개인지 센다. 같은 말이 열 번
  // 나와도 하나로 본다.
  const hits = new Set(
    (abstract.match(new RegExp(KM_KEYWORDS.source, 'g')) ?? []).map((v) => v),
  );
  return hits.size >= 2;
}

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

  // 분야로 1차, 제목으로 2차, 초록만 걸릴 때는 서로 다른 말이 둘 이상.
  const haystack = `${category} ${titleKo ?? ''} ${title} ${abstract ?? ''}`;
  if (!isKoreanMedicine(category, `${titleKo ?? ''} ${title}`, abstract ?? '')) {
    return null;
  }

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

/**
 * 더블린코어(oai_dc) 레코드 파서.
 *
 * 왜 파서가 둘인가: 서버가 resumptionToken 에 metadataPrefix 를 유지하지
 * 않는다. 첫 요청은 oai_kci 로 오는데, 그 응답의 토큰으로 다음 장을 받으면
 * 기본값인 oai_dc 로 돌아온다. 그래서 2페이지부터는 article-title 도
 * article-categories 도 없고 dc:title / dc:subject 로 온다.
 *
 * 이걸 모르고 oai_kci 파서 하나로 돌렸더니 첫 100건만 읽히고 그 뒤로는
 * 전부 조용히 버려졌다. 10만 건을 훑고도 추출 0건이던 이유가 이것이다.
 * 오류가 아니라 빈손으로 돌아오는 종류라 로그만 봐서는 알 수 없었다.
 *
 * oai_dc 에도 필요한 것은 다 있다. dc:subject 가 연구분야라 분야 필터를
 * 그대로 쓸 수 있고, 제목과 초록은 한국어·영어가 순서대로 두 개씩 온다.
 * 없는 것은 DOI 와 발행월 정도인데 둘 다 없어도 되는 값이다.
 */
function toReferenceDc(recordXml: string): RawReference | null {
  const ids = tagAll(recordXml, 'dc:identifier');
  // ART 로 시작하는 것이 논문 고유번호다. 나머지는 서지 표기와 페이지 수다.
  const externalId =
    ids.find((v) => /^ART\d+$/.test(v)) ?? tag(recordXml, 'identifier');
  if (!externalId) return null;

  const titles = tagAll(recordXml, 'dc:title');
  const titleKo = titles[0] ?? null;
  const titleEn = titles[1] ?? null;
  const title = titleEn || titleKo;
  if (!title) return null;

  const category = tagAll(recordXml, 'dc:subject').join(' ');
  const abstract =
    tagAll(recordXml, 'dc:description').join(String.fromCharCode(10, 10)) || null;

  const haystack = `${category} ${titleKo ?? ''} ${title} ${abstract ?? ''}`;
  if (!isKoreanMedicine(category, `${titleKo ?? ''} ${title}`, abstract ?? '')) {
    return null;
  }

  // dc:creator 는 "홍길동(경희대학교); 김철수(가천대학교)" 한 줄로 온다.
  const authors = (tag(recordXml, 'dc:creator') ?? '')
    .split(';')
    .map((a) => a.replace(/\([^)]*\)/g, '').trim())
    .filter((a) => a.length > 0)
    .slice(0, 30);

  // dc:date 는 "2016-01" 형태다.
  const date = tag(recordXml, 'dc:date') ?? '';
  const publishedYear = parseInt(date.slice(0, 4), 10) || null;
  const mon = parseInt(date.slice(5, 7), 10);
  const publishedAt =
    publishedYear !== null
      ? new Date(Date.UTC(publishedYear, Number.isFinite(mon) ? Math.max(mon - 1, 0) : 0, 1))
      : null;

  // 첫 dc:identifier 가 "관광연구저널, 30(1), , pp.211-226" 처럼 온다.
  // 쉼표 앞이 학술지명이다.
  const journal = ids.find((v) => !/^ART\d+$/.test(v) && /,/.test(v))?.split(',')[0]?.trim();

  return {
    source: ReferenceSource.KCI,
    externalId,
    title: title.slice(0, 500),
    titleKo: titleKo && titleKo !== title ? titleKo.slice(0, 500) : null,
    abstract,
    authors,
    journal: journal ? journal.slice(0, 300) : (tag(recordXml, 'dc:publisher')?.slice(0, 300) ?? null),
    publishedAt,
    publishedYear,
    // oai_dc 에는 DOI 가 없다. 없는 것을 지어내지 않는다.
    doi: null,
    url:
      tag(recordXml, 'dc:url') ??
      `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${externalId}`,
    // dc:subject 는 연구분야다. 저자 키워드가 아니라 분류라 그대로 둔다.
    keywords: tagAll(recordXml, 'dc:subject').slice(0, 20),
    category: categoryOf(haystack),
    evidenceType: evidenceOf(`${titleKo ?? ''} ${title}`),
    language: /[가-힣]/.test(titleKo ?? '') ? 'ko' : 'en',
  };
}

/** 레코드가 어느 형식인지 보고 알맞은 파서로 보낸다. */
function parseRecord(recordXml: string): RawReference | null {
  return recordXml.includes('<oai_dc:dc')
    ? toReferenceDc(recordXml)
    : toReference(recordXml);
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
        const ref = parseRecord(rec);
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
