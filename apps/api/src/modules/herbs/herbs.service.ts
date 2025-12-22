import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Herb, HerbCompound, FormulaHerb } from '../../database/entities';

@Injectable()
export class HerbsService {
  constructor(
    @InjectRepository(Herb)
    private herbsRepository: Repository<Herb>,
    @InjectRepository(HerbCompound)
    private compoundsRepository: Repository<HerbCompound>,
    @InjectRepository(FormulaHerb)
    private formulaHerbsRepository: Repository<FormulaHerb>,
  ) {}

  async findAll(page = 1, limit = 20, category?: string, nature?: string) {
    const queryBuilder = this.herbsRepository.createQueryBuilder('herb');

    if (category) {
      queryBuilder.andWhere('herb.category = :category', { category });
    }

    if (nature) {
      queryBuilder.andWhere("herb.properties->>'nature' = :nature", { nature });
    }

    queryBuilder
      .orderBy('herb.standardName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [herbs, total] = await queryBuilder.getManyAndCount();

    return {
      data: herbs.map((h) => this.transformHerb(h)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const herb = await this.herbsRepository.findOne({
      where: { id },
      relations: ['compounds'],
    });

    if (!herb) {
      throw new NotFoundException('약재를 찾을 수 없습니다.');
    }

    // 이 약재가 포함된 처방 조회
    const formulaHerbs = await this.formulaHerbsRepository.find({
      where: { herbId: id },
      relations: ['formula'],
    });

    const containedIn = formulaHerbs.map((fh) => ({
      id: fh.formula.id,
      name: fh.formula.name,
      hanja: fh.formula.hanja,
      category: fh.formula.category,
    }));

    return {
      ...this.transformHerb(herb),
      compounds: herb.compounds?.map((c) => ({
        id: c.id,
        compoundName: c.compoundName,
        compoundNameKo: c.compoundNameKo,
        casNumber: c.casNumber,
        category: c.category,
        pharmacology: c.pharmacology,
        contentPercent: c.contentPercent,
        pubmedIds: c.pubmedIds,
      })) || [],
      containedIn,
    };
  }

  async search(query: string, page = 1, limit = 20) {
    const [herbs, total] = await this.herbsRepository.findAndCount({
      where: [
        { standardName: Like(`%${query}%`) },
        { hanjaName: Like(`%${query}%`) },
        { efficacy: Like(`%${query}%`) },
      ],
      order: { standardName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: herbs.map((h) => this.transformHerb(h)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByCategory(category: string, page = 1, limit = 20) {
    return this.findAll(page, limit, category);
  }

  async getCompounds(herbId: string) {
    const compounds = await this.compoundsRepository.find({
      where: { herbId },
      order: { compoundName: 'ASC' },
    });

    return compounds.map((c) => ({
      id: c.id,
      compoundName: c.compoundName,
      compoundNameKo: c.compoundNameKo,
      casNumber: c.casNumber,
      category: c.category,
      pharmacology: c.pharmacology,
      contentPercent: c.contentPercent,
      pubmedIds: c.pubmedIds,
    }));
  }

  async searchCompounds(query: string, page = 1, limit = 20) {
    const [compounds, total] = await this.compoundsRepository.findAndCount({
      where: [
        { compoundName: Like(`%${query}%`) },
        { compoundNameKo: Like(`%${query}%`) },
        { pharmacology: Like(`%${query}%`) },
      ],
      relations: ['herb'],
      order: { compoundName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: compounds.map((c) => ({
        id: c.id,
        compoundName: c.compoundName,
        compoundNameKo: c.compoundNameKo,
        casNumber: c.casNumber,
        category: c.category,
        pharmacology: c.pharmacology,
        contentPercent: c.contentPercent,
        pubmedIds: c.pubmedIds,
        herb: {
          id: c.herb.id,
          name: c.herb.standardName,
          hanja: c.herb.hanjaName,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategories() {
    const result = await this.herbsRepository
      .createQueryBuilder('herb')
      .select('DISTINCT herb.category', 'category')
      .getRawMany();

    return result.map((r) => r.category).filter(Boolean);
  }

  async getNatures() {
    const result = await this.herbsRepository
      .createQueryBuilder('herb')
      .select("DISTINCT herb.properties->>'nature'", 'nature')
      .getRawMany();

    return result.map((r) => r.nature).filter(Boolean);
  }

  private transformHerb(herb: Herb) {
    return {
      id: herb.id,
      standardName: herb.standardName,
      hanjaName: herb.hanjaName,
      aliases: herb.aliases,
      category: herb.category,
      properties: herb.properties,
      meridianTropism: herb.meridianTropism,
      efficacy: herb.efficacy,
      contraindications: herb.contraindications,
      activeCompounds: herb.activeCompounds,
      pubmedReferences: herb.pubmedReferences,
      createdAt: herb.createdAt,
      updatedAt: herb.updatedAt,
    };
  }
}
