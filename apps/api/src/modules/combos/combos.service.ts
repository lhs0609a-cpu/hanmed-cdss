import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Formula, FormulaHerb, FormulaCombo } from '../../database/entities';

interface HerbData {
  totalAmount: number;
  unit: string;
  sources: Array<{ formula: string; formulaId: string; amount: string }>;
}

@Injectable()
export class CombosService {
  constructor(
    @InjectRepository(Formula)
    private formulasRepository: Repository<Formula>,
    @InjectRepository(FormulaHerb)
    private formulaHerbsRepository: Repository<FormulaHerb>,
    @InjectRepository(FormulaCombo)
    private combosRepository: Repository<FormulaCombo>,
  ) {}

  async calculateCombo(formulaIds: string[]) {
    if (formulaIds.length < 2) {
      throw new BadRequestException('합방을 위해서는 최소 2개의 처방이 필요합니다.');
    }

    // 1. 모든 처방 조회
    const formulas = await this.formulasRepository.find({
      where: { id: In(formulaIds) },
      relations: ['formulaHerbs', 'formulaHerbs.herb'],
    });

    if (formulas.length !== formulaIds.length) {
      throw new NotFoundException('일부 처방을 찾을 수 없습니다.');
    }

    // 2. 약재별로 그룹화
    const herbMap = new Map<string, HerbData>();

    for (const formula of formulas) {
      for (const fh of formula.formulaHerbs) {
        const herbName = fh.herb.standardName;
        const { amount, unit } = this.parseAmount(fh.amount);

        if (herbMap.has(herbName)) {
          const existing = herbMap.get(herbName)!;
          existing.totalAmount += amount;
          existing.sources.push({
            formula: formula.name,
            formulaId: formula.id,
            amount: fh.amount,
          });
        } else {
          herbMap.set(herbName, {
            totalAmount: amount,
            unit,
            sources: [{
              formula: formula.name,
              formulaId: formula.id,
              amount: fh.amount,
            }],
          });
        }
      }
    }

    // 3. 중복 약재 경고 생성
    const duplicateWarnings: Array<{
      herbName: string;
      totalAmount: string;
      sources: Array<{ formula: string; amount: string }>;
      warning: string;
    }> = [];

    for (const [name, data] of herbMap) {
      if (data.sources.length > 1) {
        duplicateWarnings.push({
          herbName: name,
          totalAmount: `${data.totalAmount}${data.unit}`,
          sources: data.sources.map(s => ({ formula: s.formula, amount: s.amount })),
          warning: `${name} 중복 - 총 ${data.totalAmount}${data.unit} (용량 조절 고려)`,
        });
      }
    }

    // 4. 알려진 합방인지 확인
    const knownCombo = await this.findKnownCombo(formulaIds);

    // 5. 결과 반환
    return {
      isKnownCombo: !!knownCombo,
      knownName: knownCombo?.name,
      knownHanja: knownCombo?.hanja,
      sourceFormulas: formulas.map(f => ({
        id: f.id,
        name: f.name,
        hanja: f.hanja,
        category: f.category,
      })),
      totalHerbs: Array.from(herbMap.entries()).map(([name, data]) => ({
        name,
        totalAmount: `${data.totalAmount}${data.unit}`,
        sources: data.sources.map(s => s.formula),
        isDuplicate: data.sources.length > 1,
      })),
      duplicateWarnings,
      indication: knownCombo?.indication,
      rationale: knownCombo?.rationale,
    };
  }

  async findKnownCombos(page = 1, limit = 20) {
    const [combos, total] = await this.combosRepository.findAndCount({
      where: { isClassical: true },
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 원 처방 정보 조회
    const enrichedCombos = await Promise.all(
      combos.map(async (combo) => {
        const sourceFormulas = await this.formulasRepository.find({
          where: { id: In(combo.sourceFormulaIds) },
          select: ['id', 'name', 'hanja', 'category'],
        });

        return {
          id: combo.id,
          name: combo.name,
          hanja: combo.hanja,
          indication: combo.indication,
          rationale: combo.rationale,
          isClassical: combo.isClassical,
          sourceFormulas,
          createdAt: combo.createdAt,
        };
      }),
    );

    return {
      data: enrichedCombos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findComboById(id: string) {
    const combo = await this.combosRepository.findOne({
      where: { id },
    });

    if (!combo) {
      throw new NotFoundException('합방을 찾을 수 없습니다.');
    }

    // 원 처방 정보 조회
    const sourceFormulas = await this.formulasRepository.find({
      where: { id: In(combo.sourceFormulaIds) },
      relations: ['formulaHerbs', 'formulaHerbs.herb'],
    });

    // 합방 계산 수행
    const calculationResult = await this.calculateCombo(combo.sourceFormulaIds);

    return {
      id: combo.id,
      name: combo.name,
      hanja: combo.hanja,
      indication: combo.indication,
      rationale: combo.rationale,
      isClassical: combo.isClassical,
      sourceFormulas: sourceFormulas.map(f => ({
        id: f.id,
        name: f.name,
        hanja: f.hanja,
        category: f.category,
      })),
      ...calculationResult,
      createdAt: combo.createdAt,
    };
  }

  private async findKnownCombo(formulaIds: string[]): Promise<FormulaCombo | null> {
    // 정렬된 ID 배열로 비교
    const sortedIds = [...formulaIds].sort();

    const combos = await this.combosRepository.find();

    for (const combo of combos) {
      const comboSortedIds = [...combo.sourceFormulaIds].sort();
      if (
        sortedIds.length === comboSortedIds.length &&
        sortedIds.every((id, index) => id === comboSortedIds[index])
      ) {
        return combo;
      }
    }

    return null;
  }

  private parseAmount(amountStr: string): { amount: number; unit: string } {
    // 숫자와 단위 분리 (예: "6g", "3돈", "12g")
    const match = amountStr.match(/^([\d.]+)\s*(.*)$/);

    if (match) {
      return {
        amount: parseFloat(match[1]),
        unit: match[2] || 'g',
      };
    }

    return { amount: 0, unit: 'g' };
  }
}
