import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Reference, ReferenceSource } from '../../database/entities/reference.entity';
import { RawReference, HarvestResult, emptyResult } from './sources/types';
import { PubMedClient, PUBMED_TOPICS } from './sources/pubmed';

/**
 * 문헌 수집·저장.
 *
 * 상류가 다섯 곳이라 받아 오는 방식은 어댑터마다 다르지만, 저장 규칙은 여기
 * 한 곳에만 둔다 — 중복 판정과 업서트 규칙이 다섯 군데로 흩어지면 곧 어긋나고,
 * 어긋난 순간부터 "1만 건" 중 몇 건이 진짜인지 아무도 모르게 된다.
 *
 * 지어낸 문장은 한 줄도 저장하지 않는다. 요약·번역·해설을 붙이고 싶은 유혹이
 * 있지만, 한의사가 이걸 보고 처방을 정한다. 초록은 원문 그대로 두고 해석은
 * 읽는 사람에게 맡긴다.
 */
@Injectable()
export class ReferenceIngestService {
  private readonly logger = new Logger(ReferenceIngestService.name);
  private running = false;

  constructor(
    @InjectRepository(Reference)
    private readonly refs: Repository<Reference>,
  ) {}

  /**
   * 같은 논문을 알아보는 지문.
   *
   * DOI 가 있으면 그것이 가장 확실하다. 없으면 제목을 정규화해서 쓴다 —
   * 같은 논문이 PubMed 와 KCI 에 각각 올라오는데, 그때 대소문자·구두점·공백만
   * 다른 경우가 대부분이다. 한글은 그대로 두고 라틴 문자만 소문자화한다.
   */
  static contentHash(ref: Pick<RawReference, 'doi' | 'title'>): string {
    const basis = ref.doi
      ? `doi:${ref.doi.trim().toLowerCase()}`
      : `title:${ref.title
          .toLowerCase()
          .replace(/[^0-9a-z가-힣]+/g, ' ')
          .trim()}`;
    return createHash('sha256').update(basis).digest('hex');
  }

  /**
   * 받아 온 것을 저장한다. 같은 (source, externalId) 는 덮어쓴다.
   *
   * 덮어쓰는 이유: 초록이 나중에 붙거나 MeSH 색인이 뒤늦게 달리는 일이 흔하다.
   * 처음 받았을 때의 빈 껍데기를 영원히 들고 있을 이유가 없다.
   */
  async save(raws: RawReference[]): Promise<Omit<HarvestResult, 'source'>> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const raw of raws) {
      // 확인할 수 없는 자료는 자료가 아니다.
      if (!raw.externalId || !raw.title?.trim() || !raw.url) {
        skipped += 1;
        continue;
      }
      try {
        const existing = await this.refs.findOne({
          where: { source: raw.source, externalId: raw.externalId },
          select: { id: true },
        });

        const row: Partial<Reference> = {
          source: raw.source,
          externalId: raw.externalId,
          title: raw.title.slice(0, 500),
          titleKo: raw.titleKo?.slice(0, 500) ?? null,
          abstract: raw.abstract ?? null,
          authors: raw.authors ?? [],
          journal: raw.journal?.slice(0, 300) ?? null,
          publishedAt: raw.publishedAt ?? null,
          publishedYear: raw.publishedYear ?? null,
          doi: raw.doi?.slice(0, 200) ?? null,
          url: raw.url.slice(0, 1000),
          keywords: raw.keywords ?? [],
          category: raw.category,
          evidenceType: raw.evidenceType,
          language: raw.language?.slice(0, 8) || 'en',
          contentHash: ReferenceIngestService.contentHash(raw),
        };

        if (existing) {
          await this.refs.update({ id: existing.id }, row);
          updated += 1;
        } else {
          await this.refs.insert(row as Reference);
          inserted += 1;
        }
      } catch (e) {
        // 한 건이 실패해도 나머지는 계속 간다. 수 시간짜리 작업이라
        // 한 건 때문에 통째로 죽으면 그때까지 받은 것도 못 쓴다.
        skipped += 1;
        const msg = (e as Error).message;
        if (errors.length < 10) errors.push(`${raw.externalId}: ${msg}`);
      }
    }
    return { fetched: raws.length, inserted, updated, skipped, errors };
  }

  /**
   * PubMed 수집.
   *
   * 키가 없어도 돈다(초당 3회 제한). 있으면 초당 10회까지 빨라진다.
   * 1만 건은 한 번에 끝나지 않는다 — 주제별 상한을 두고 여러 번 돌려 쌓는다.
   */
  async harvestPubMed(perTopic = 400, minYear = 2015): Promise<HarvestResult> {
    const result = emptyResult(ReferenceSource.PUBMED);
    const client = new PubMedClient({
      apiKey: process.env.NCBI_API_KEY || null,
      // NCBI 는 문제가 생겼을 때 연락할 곳을 요구한다. 없으면 익명으로 가되
      // 그만큼 차단당하기 쉬워진다.
      email: process.env.NCBI_CONTACT_EMAIL || null,
      perTopic,
      minYear,
      onProgress: (m) => this.logger.log(m),
    });

    for (const topic of PUBMED_TOPICS) {
      try {
        const raws = await client.harvestTopic(topic);
        const saved = await this.save(raws);
        result.fetched += saved.fetched;
        result.inserted += saved.inserted;
        result.updated += saved.updated;
        result.skipped += saved.skipped;
        result.errors.push(...saved.errors);
        this.logger.log(
          `PubMed [${topic.label}] 수신 ${saved.fetched} · 신규 ${saved.inserted} · 갱신 ${saved.updated} · 제외 ${saved.skipped}`,
        );
      } catch (e) {
        const msg = `PubMed [${topic.label}] 실패: ${(e as Error).message}`;
        this.logger.error(msg);
        result.errors.push(msg);
      }
    }
    return result;
  }

  /**
   * 적재는 사람이 시킬 때만 돈다. 자동 스케줄은 두지 않는다.
   *
   * 크론으로 주 1회 돌리던 것을 걷어냈다. 이 작업은 상류(NCBI)를 수 시간
   * 두드리고 DB 를 늘리는 일이라, 아무도 보고 있지 않을 때 알아서 도는 것이
   * 좋을 이유가 없다. 무엇이 언제 얼마나 들어왔는지를 사람이 알고 있어야
   * "문헌 1만 건" 이라는 숫자에 책임질 수 있다.
   *
   * 초기 적재도 이걸 여러 번 돌려 쌓는다. 이미 있는 것은 갱신만 되고
   * 중복으로 쌓이지 않으므로 몇 번을 돌려도 안전하다.
   */
  async harvestNow(perTopic: number, minYear: number): Promise<HarvestResult> {
    if (this.running) {
      throw new Error('이미 수집이 돌고 있습니다. 끝난 뒤 다시 시도해 주세요.');
    }
    this.running = true;
    try {
      return await this.harvestPubMed(perTopic, minYear);
    } finally {
      this.running = false;
    }
  }

  /**
   * 임상에서 쓸 수 없는 자료를 지운다.
   *
   * 주제어만으로 긁었더니 생쥐 대장염 모델, LC-MS 성분분석, 신호전달 기전
   * 연구가 대량으로 들어왔다. 좋은 연구지만 한의사가 진료 중에 여는 자료실에
   * 있을 것은 아니다. 열 건을 검색해 아홉 건이 쓸모없으면 그 다음부터는
   * 자료실 자체를 안 연다 — 건수가 아니라 그게 손실이다.
   *
   * 지우는 기준 두 가지.
   *
   *  1. 근거수준 미분류 — PubMed 가 발행유형을 안 붙였다는 뜻이고, 그러면
   *     이게 무슨 종류의 근거인지 우리도 말해 줄 수 없다. 근거 라이브러리에서
   *     정체를 모르는 항목은 없느니만 못하다.
   *  2. 제목이 동물·세포·성분 연구임을 드러내는 것 — 발행유형이 붙어 있어도
   *     생쥐 실험은 생쥐 실험이다.
   *
   * 제목 패턴은 거칠다. "patients with ... in a rat model of" 처럼 둘 다
   * 걸리는 제목이 있을 수 있다. 그래서 먼저 세어 보고 지운다(dryRun).
   */
  async purgeNonClinical(dryRun = false) {
    // 역슬래시 단어경계(\m, \M)를 쓰지 않는다. 템플릿 문자열에서 \m 은 그냥
    // m 으로 먹혀서 'mmice' 같은 패턴이 되고, 조용히 아무것도 안 걸린다.
    // 실제로 그렇게 써서 동물실험이 985건으로만 잡혔다. 앞뒤 문자를 직접
    // 지정하는 편이 길지만 확실하다.
    const WORD = '(mice|mouse|rats?|murine|zebrafish|rodent)';
    const ANIMAL_CELL =
      `(r."title" ~* '(^|[^a-zA-Z])${WORD}([^a-zA-Z]|$)'` +
      ` OR r."title" ~* '(in vitro|cell line|cells|signaling pathway|signalling pathway|` +
      `network pharmacology|molecular docking|metabolomics|LC-MS|UPLC|HPLC)')`;

    const qb = () =>
      this.refs
        .createQueryBuilder('r')
        .where(`(r."evidenceType" = 'unknown' OR ${ANIMAL_CELL})`);

    const unknown = await this.refs
      .createQueryBuilder('r')
      .where(`r."evidenceType" = 'unknown'`)
      .getCount();
    const animal = await this.refs
      .createQueryBuilder('r')
      .where(ANIMAL_CELL)
      .getCount();
    const target = await qb().getCount();
    const total = await this.refs.count();

    if (!dryRun && target > 0) {
      // 서브쿼리로 id 를 뽑아 지운다 — QueryBuilder 의 delete 는 조인·정규식
      // 조건을 그대로 못 받는 경우가 있어 id 목록을 거친다.
      const rows = await qb().select('r.id', 'id').getRawMany<{ id: string }>();
      const ids = rows.map((x) => x.id);
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        await this.refs.delete(ids.slice(i, i + CHUNK));
      }
    }

    return {
      total,
      unknownEvidence: unknown,
      animalOrCell: animal,
      deleted: dryRun ? 0 : target,
      wouldDelete: target,
      // dry-run 에서도 "지우면 몇 건이 남는가" 를 보여준다. 실제 남은 수를
      // 보여주면 총계가 그대로 찍혀서 판단에 아무 도움이 안 된다.
      remaining: total - target,
    };
  }

  /** 현재 적재 현황 — "1만 건" 이 사실인지 확인하는 창구 */
  async stats() {
    const total = await this.refs.count();
    const bySource = await this.refs
      .createQueryBuilder('r')
      .select('r.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.source')
      .getRawMany<{ source: string; count: string }>();
    const byCategory = await this.refs
      .createQueryBuilder('r')
      .select('r.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.category')
      .getRawMany<{ category: string; count: string }>();
    const byEvidence = await this.refs
      .createQueryBuilder('r')
      .select('r.evidenceType', 'evidenceType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.evidenceType')
      .getRawMany<{ evidenceType: string; count: string }>();

    const num = <T extends Record<string, string>>(rows: T[], key: keyof T) =>
      Object.fromEntries(rows.map((r) => [r[key], parseInt(r.count, 10)]));

    return {
      total,
      bySource: num(bySource, 'source'),
      byCategory: num(byCategory, 'category'),
      byEvidenceType: num(byEvidence, 'evidenceType'),
    };
  }
}
