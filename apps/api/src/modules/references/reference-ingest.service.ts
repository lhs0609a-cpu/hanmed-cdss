import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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
   * 주 1회 갱신.
   *
   * 새 논문은 하루에 몇 건씩 늘어나므로 매일 돌 이유가 없다. 주 1회면
   * 놓치는 것 없이 상류 부담도 적다. 처음 1만 건을 채우는 것은 이 크론이
   * 아니라 관리자 트리거(POST /admin/references/harvest)로 여러 번 돌린다 —
   * 크론이 수 시간짜리 초기 적재를 맡으면 배포할 때마다 처음부터 다시 돈다.
   */
  @Cron('0 0 5 * * 1', { name: 'references-weekly', timeZone: 'Asia/Seoul' })
  async runWeekly(): Promise<void> {
    if (this.running) {
      this.logger.warn('이미 수집이 돌고 있어 이번 실행은 건너뜁니다.');
      return;
    }
    this.running = true;
    try {
      // 주간 갱신은 최근 것만 얕게 훑는다. 깊이 파는 것은 초기 적재의 몫이다.
      const r = await this.harvestPubMed(120, new Date().getFullYear() - 1);
      this.logger.log(
        `문헌 주간 갱신 완료 — 신규 ${r.inserted} · 갱신 ${r.updated} · 제외 ${r.skipped}`,
      );
    } catch (e) {
      this.logger.error(`문헌 주간 갱신 실패: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** 관리자 트리거용. 초기 적재는 이걸 여러 번 돌려 쌓는다. */
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
