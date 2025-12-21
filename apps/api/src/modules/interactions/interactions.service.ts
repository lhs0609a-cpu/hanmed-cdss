import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DrugHerbInteraction, Severity } from '../../database/entities/drug-herb-interaction.entity';
import { Herb } from '../../database/entities/herb.entity';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(DrugHerbInteraction)
    private interactionsRepository: Repository<DrugHerbInteraction>,
    @InjectRepository(Herb)
    private herbsRepository: Repository<Herb>,
  ) {}

  async checkInteractions(herbNames: string[], drugNames: string[]) {
    // 약재명으로 약재 ID 조회
    const herbs = await this.herbsRepository.find({
      where: { standardName: In(herbNames) },
    });
    const herbIds = herbs.map((h) => h.id);

    // 상호작용 조회
    const interactions = await this.interactionsRepository.find({
      where: {
        herbId: In(herbIds),
        drugName: In(drugNames),
      },
      relations: ['herb'],
    });

    // 심각도별 분류
    const critical = interactions.filter((i) => i.severity === Severity.CRITICAL);
    const warning = interactions.filter((i) => i.severity === Severity.WARNING);
    const info = interactions.filter((i) => i.severity === Severity.INFO);

    return {
      hasInteractions: interactions.length > 0,
      totalCount: interactions.length,
      bySeverity: {
        critical: critical.map((i) => ({
          drug: i.drugName,
          herb: i.herb.standardName,
          mechanism: i.mechanism,
          recommendation: i.recommendation,
        })),
        warning: warning.map((i) => ({
          drug: i.drugName,
          herb: i.herb.standardName,
          mechanism: i.mechanism,
          recommendation: i.recommendation,
        })),
        info: info.map((i) => ({
          drug: i.drugName,
          herb: i.herb.standardName,
          mechanism: i.mechanism,
        })),
      },
      overallSafety: critical.length > 0
        ? '위험 - 금기 상호작용 발견'
        : warning.length > 0
          ? '주의 - 모니터링 필요'
          : '안전',
    };
  }

  async findByDrug(drugName: string) {
    return this.interactionsRepository.find({
      where: { drugName },
      relations: ['herb'],
    });
  }

  async findByHerb(herbId: string) {
    return this.interactionsRepository.find({
      where: { herbId },
    });
  }
}
