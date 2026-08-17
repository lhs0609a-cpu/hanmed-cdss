import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, LessThan } from 'typeorm';
import {
  Partner,
  PartnerCategory,
  PartnerPlacement,
  PartnerStatus,
} from '../../database/entities/partner.entity';
import { PartnerImpression } from '../../database/entities/partner-impression.entity';

interface MatchQuery {
  placement: PartnerPlacement;
  herbIds?: string[];
  formulaIds?: string[];
  keywords?: string[];
  limit?: number;
}

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    @InjectRepository(Partner)
    private partnerRepo: Repository<Partner>,
    @InjectRepository(PartnerImpression)
    private impressionRepo: Repository<PartnerImpression>,
  ) {}

  /**
   * 노출 후보 파트너 조회.
   *
   * 핵심 원칙(신뢰 보호):
   *  - placement 화이트리스트 일치 필수
   *  - 상태 active만
   *  - 월 노출 한도(monthlyImpressionCap) 초과 시 자동 제외
   *  - 매칭 기준(herbIds/formulaIds/keywords)에 일치하는 파트너 우선
   */
  async findCandidates(query: MatchQuery): Promise<Partner[]> {
    const all = await this.partnerRepo.find({
      where: { status: PartnerStatus.ACTIVE },
    });

    const eligible = all.filter((p) => p.placements?.includes(query.placement));

    // 매칭 기준 필터 (있으면 강한 매칭 우선, 없으면 일반 노출)
    const scored = eligible.map((p) => {
      let score = 0;
      const crit = p.matchCriteria;
      if (crit) {
        if (query.herbIds && crit.herbIds) {
          const hit = query.herbIds.some((id) => crit.herbIds!.includes(id));
          if (hit) score += 10;
        }
        if (query.formulaIds && crit.formulaIds) {
          const hit = query.formulaIds.some((id) => crit.formulaIds!.includes(id));
          if (hit) score += 10;
        }
        if (query.keywords && crit.keywords) {
          const hit = query.keywords.some((k) =>
            crit.keywords!.some((kk) => kk.toLowerCase() === k.toLowerCase()),
          );
          if (hit) score += 5;
        }
      }
      return { partner: p, score };
    });

    // 한도 체크
    const withinCap = await Promise.all(
      scored.map(async ({ partner, score }) => {
        if (!partner.monthlyImpressionCap) return { partner, score };
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const count = await this.impressionRepo.count({
          where: {
            partnerId: partner.id,
            eventType: 'impression',
            occurredAt: MoreThanOrEqual(monthStart),
          },
        });
        return count >= partner.monthlyImpressionCap ? null : { partner, score };
      }),
    );

    return withinCap
      .filter((x): x is { partner: Partner; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit ?? 3)
      .map((x) => x.partner);
  }

  async logImpression(opts: {
    partnerId: string;
    userId: string;
    placement: PartnerPlacement;
    eventType?: 'impression' | 'click';
    context?: Record<string, unknown>;
  }): Promise<void> {
    await this.impressionRepo.save(
      this.impressionRepo.create({
        partnerId: opts.partnerId,
        userId: opts.userId,
        placement: opts.placement,
        eventType: opts.eventType ?? 'impression',
        context: opts.context ?? null,
      }),
    );
  }

  /** 운영 대시보드용 — 카테고리별 활성 파트너 수 */
  async statsByCategory(): Promise<Record<string, number>> {
    const all = await this.partnerRepo.find({ where: { status: PartnerStatus.ACTIVE } });
    return all.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
  }
}
