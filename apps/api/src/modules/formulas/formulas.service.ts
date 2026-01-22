import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Formula, FormulaHerb, Herb } from '../../database/entities';
import { CacheService } from '../cache/cache.service';

const CACHE_PREFIX = 'formulas';
const CACHE_TTL = 1800; // 30 minutes

@Injectable()
export class FormulasService {
  constructor(
    @InjectRepository(Formula)
    private formulasRepository: Repository<Formula>,
    @InjectRepository(FormulaHerb)
    private formulaHerbsRepository: Repository<FormulaHerb>,
    @InjectRepository(Herb)
    private herbsRepository: Repository<Herb>,
    private cacheService: CacheService,
  ) {}

  async findAll(page = 1, limit = 20, category?: string) {
    const cacheKey = `list:${page}:${limit}:${category || 'all'}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: any = {};
        if (category) {
          where.category = category;
        }

        const [formulas, total] = await this.formulasRepository.findAndCount({
          where,
          relations: ['formulaHerbs', 'formulaHerbs.herb'],
          order: { name: 'ASC' },
          skip: (page - 1) * limit,
          take: limit,
        });

        return {
          data: formulas.map((f) => this.transformFormula(f)),
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      { prefix: CACHE_PREFIX, ttl: CACHE_TTL },
    );
  }

  async findById(id: string) {
    const cacheKey = `detail:${id}`;

    const cached = await this.cacheService.get(cacheKey, { prefix: CACHE_PREFIX });
    if (cached) return cached;

    const formula = await this.formulasRepository.findOne({
      where: { id },
      relations: ['formulaHerbs', 'formulaHerbs.herb'],
    });

    if (!formula) {
      throw new NotFoundException('처방을 찾을 수 없습니다.');
    }

    const result = this.transformFormula(formula);
    await this.cacheService.set(cacheKey, result, { prefix: CACHE_PREFIX, ttl: CACHE_TTL });
    return result;
  }

  async search(query: string, page = 1, limit = 20) {
    const [formulas, total] = await this.formulasRepository.findAndCount({
      where: [
        { name: Like(`%${query}%`) },
        { hanja: Like(`%${query}%`) },
        { indication: Like(`%${query}%`) },
      ],
      relations: ['formulaHerbs', 'formulaHerbs.herb'],
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: formulas.map((f) => this.transformFormula(f)),
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

  async findByHerb(herbId: string, page = 1, limit = 20) {
    const formulaHerbs = await this.formulaHerbsRepository.find({
      where: { herbId },
      relations: ['formula'],
    });

    const formulaIds = formulaHerbs.map((fh) => fh.formula.id);

    if (formulaIds.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const [formulas, total] = await this.formulasRepository.findAndCount({
      where: { id: In(formulaIds) },
      relations: ['formulaHerbs', 'formulaHerbs.herb'],
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: formulas.map((f) => this.transformFormula(f)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategories() {
    const cacheKey = 'categories';

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await this.formulasRepository
          .createQueryBuilder('formula')
          .select('DISTINCT formula.category', 'category')
          .getRawMany();

        return result.map((r) => r.category).filter(Boolean);
      },
      { prefix: CACHE_PREFIX, ttl: 86400 }, // 24 hours - categories rarely change
    );
  }

  private transformFormula(formula: Formula) {
    const herbs = formula.formulaHerbs?.map((fh) => ({
      id: fh.herb?.id,
      name: fh.herb?.standardName,
      hanja: fh.herb?.hanjaName,
      amount: fh.amount,
      role: fh.role,
      processingMethod: fh.processingMethod,
      notes: fh.notes,
      properties: fh.herb?.properties,
      efficacy: fh.herb?.efficacy,
    })) || [];

    // 군신좌사 순서로 정렬
    const roleOrder = { '군': 0, '신': 1, '좌': 2, '사': 3 };
    herbs.sort((a, b) => {
      const orderA = a.role ? roleOrder[a.role] ?? 4 : 4;
      const orderB = b.role ? roleOrder[b.role] ?? 4 : 4;
      return orderA - orderB;
    });

    return {
      id: formula.id,
      name: formula.name,
      hanja: formula.hanja,
      aliases: formula.aliases,
      category: formula.category,
      source: formula.source,
      indication: formula.indication,
      pathogenesis: formula.pathogenesis,
      contraindications: formula.contraindications,
      modifications: formula.modifications,
      herbs,
      createdAt: formula.createdAt,
      updatedAt: formula.updatedAt,
    };
  }
}
