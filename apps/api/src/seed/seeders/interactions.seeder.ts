import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Herb } from '../../database/entities/herb.entity';
import {
  DrugHerbInteraction,
  EvidenceLevel,
  InteractionType,
  Severity,
} from '../../database/entities/drug-herb-interaction.entity';

/**
 * 임상적으로 중요한 한약-양약 상호작용 큐레이션 데이터.
 * 출처: 식약처 DUR + 주요 한약 임상 매뉴얼 + Natural Medicines Database 정리.
 * 모든 항목은 herbs_master에 해당 약재가 있어야 시드된다 (없으면 skip).
 */
const CURATED_INTERACTIONS: Array<{
  herbName: string;
  drugName: string;
  drugAtcCode?: string;
  type: InteractionType;
  severity: Severity;
  mechanism: string;
  evidence: EvidenceLevel;
  recommendation: string;
}> = [
  // ===== 항응고제 =====
  {
    herbName: '인삼',
    drugName: '와파린 (Warfarin)',
    drugAtcCode: 'B01AA03',
    type: InteractionType.DECREASE,
    severity: Severity.WARNING,
    mechanism: '인삼이 와파린의 항응고 효과를 감소시킬 수 있다 (CYP2C9 유도 가능성).',
    evidence: EvidenceLevel.B,
    recommendation: 'INR 모니터링을 더 자주 시행하고, 가능하면 병용을 피한다.',
  },
  {
    herbName: '단삼',
    drugName: '와파린 (Warfarin)',
    drugAtcCode: 'B01AA03',
    type: InteractionType.INCREASE,
    severity: Severity.CRITICAL,
    mechanism: '단삼은 항혈소판 효과가 있어 와파린과 병용 시 출혈 위험이 크게 증가한다.',
    evidence: EvidenceLevel.A,
    recommendation: '병용 금기. 수술 전 최소 2주 중단 권장.',
  },
  {
    herbName: '은행',
    drugName: '와파린 (Warfarin)',
    drugAtcCode: 'B01AA03',
    type: InteractionType.INCREASE,
    severity: Severity.WARNING,
    mechanism: 'Ginkgolide B의 PAF 길항 작용으로 출혈 위험 증가.',
    evidence: EvidenceLevel.B,
    recommendation: '고용량 병용 회피, INR 자주 측정.',
  },
  {
    herbName: '당귀',
    drugName: '와파린 (Warfarin)',
    drugAtcCode: 'B01AA03',
    type: InteractionType.INCREASE,
    severity: Severity.WARNING,
    mechanism: '쿠마린 유도체 함유 — 항응고 효과 증강.',
    evidence: EvidenceLevel.B,
    recommendation: 'INR 모니터링 강화, 출혈 징후 관찰.',
  },
  {
    herbName: '천궁',
    drugName: '와파린 (Warfarin)',
    drugAtcCode: 'B01AA03',
    type: InteractionType.INCREASE,
    severity: Severity.WARNING,
    mechanism: 'Ferulic acid 등이 혈소판 응집 억제 → 출혈 위험.',
    evidence: EvidenceLevel.C,
    recommendation: '병용 시 출혈 모니터링.',
  },

  // ===== 강심제 =====
  {
    herbName: '감초',
    drugName: '디곡신 (Digoxin)',
    drugAtcCode: 'C01AA05',
    type: InteractionType.DANGEROUS,
    severity: Severity.CRITICAL,
    mechanism: '감초의 글리시리진이 저칼륨혈증 유발 → 디곡신 독성 증가.',
    evidence: EvidenceLevel.A,
    recommendation: '병용 금기. 부득이 병용 시 칼륨 + 디곡신 농도 정기 측정.',
  },

  // ===== 이뇨제 / 고혈압약 =====
  {
    herbName: '감초',
    drugName: '이뇨제 (Furosemide 등)',
    drugAtcCode: 'C03CA01',
    type: InteractionType.DANGEROUS,
    severity: Severity.WARNING,
    mechanism: '감초의 미네랄코르티코이드 작용 + 이뇨제 → 저칼륨혈증 위험 가중.',
    evidence: EvidenceLevel.A,
    recommendation: '장기 병용 회피. 칼륨 보충 또는 칼륨 보존성 이뇨제 고려.',
  },
  {
    herbName: '감초',
    drugName: '항고혈압제',
    drugAtcCode: 'C09',
    type: InteractionType.DECREASE,
    severity: Severity.WARNING,
    mechanism: '감초의 의해성 알도스테론증으로 혈압 상승 → 항고혈압 효과 감소.',
    evidence: EvidenceLevel.A,
    recommendation: '장기 복용 시 혈압 모니터링.',
  },

  // ===== 당뇨약 =====
  {
    herbName: '인삼',
    drugName: '경구 혈당강하제 (Metformin 등)',
    drugAtcCode: 'A10BA02',
    type: InteractionType.INCREASE,
    severity: Severity.WARNING,
    mechanism: '인삼의 ginsenoside가 혈당 강하 효과 추가 → 저혈당 위험.',
    evidence: EvidenceLevel.B,
    recommendation: '혈당 모니터링 강화, 용량 조절 가능성.',
  },
  {
    herbName: '황기',
    drugName: '경구 혈당강하제 (Metformin 등)',
    drugAtcCode: 'A10BA02',
    type: InteractionType.INCREASE,
    severity: Severity.INFO,
    mechanism: '황기 다당체의 인슐린 감수성 개선 가능성.',
    evidence: EvidenceLevel.C,
    recommendation: '혈당 모니터링.',
  },

  // ===== 면역억제제 =====
  {
    herbName: '황기',
    drugName: '면역억제제 (Cyclosporine 등)',
    drugAtcCode: 'L04AD01',
    type: InteractionType.DECREASE,
    severity: Severity.CRITICAL,
    mechanism: '황기의 면역증강 작용 → 면역억제제 효과 상쇄.',
    evidence: EvidenceLevel.B,
    recommendation: '장기 이식 환자, 자가면역 환자에서 병용 금기.',
  },

  // ===== 항우울제/진정제 =====
  {
    herbName: '감초',
    drugName: 'MAOI 항우울제',
    drugAtcCode: 'N06AF',
    type: InteractionType.DANGEROUS,
    severity: Severity.WARNING,
    mechanism: 'MAOI와 감초 병용 시 고혈압 위험 보고.',
    evidence: EvidenceLevel.C,
    recommendation: '병용 회피.',
  },
  {
    herbName: '인삼',
    drugName: 'MAOI 항우울제',
    drugAtcCode: 'N06AF',
    type: InteractionType.DANGEROUS,
    severity: Severity.WARNING,
    mechanism: '인삼이 MAOI와 병용 시 두통, 진전, 조증 보고.',
    evidence: EvidenceLevel.C,
    recommendation: '병용 회피.',
  },

  // ===== NSAID =====
  {
    herbName: '감초',
    drugName: 'NSAID (Ibuprofen 등)',
    drugAtcCode: 'M01AE01',
    type: InteractionType.INCREASE,
    severity: Severity.INFO,
    mechanism: 'NSAID의 위장관 자극 + 감초의 점막 보호 작용 — 동시에 위산 분비 영향 복합.',
    evidence: EvidenceLevel.C,
    recommendation: '단기 병용은 큰 문제 없으나 장기 사용 시 위장관 모니터링.',
  },

  // ===== 마황 (Ephedra) =====
  {
    herbName: '마황',
    drugName: '교감신경흥분제 (Pseudoephedrine 등)',
    drugAtcCode: 'R01BA02',
    type: InteractionType.DANGEROUS,
    severity: Severity.CRITICAL,
    mechanism: '마황의 ephedrine + 양약의 교감흥분 → 고혈압, 빈맥, 부정맥 위험.',
    evidence: EvidenceLevel.A,
    recommendation: '병용 금기.',
  },
  {
    herbName: '마황',
    drugName: 'MAOI 항우울제',
    drugAtcCode: 'N06AF',
    type: InteractionType.DANGEROUS,
    severity: Severity.CRITICAL,
    mechanism: 'MAOI와 ephedrine 병용 시 고혈압 위기 가능.',
    evidence: EvidenceLevel.A,
    recommendation: '절대 병용 금기.',
  },

  // ===== 레보티록신 =====
  {
    herbName: '대두',
    drugName: '레보티록신 (Levothyroxine)',
    drugAtcCode: 'H03AA01',
    type: InteractionType.DECREASE,
    severity: Severity.WARNING,
    mechanism: '대두 단백질이 레보티록신 흡수를 저해.',
    evidence: EvidenceLevel.B,
    recommendation: '복용 간격 4시간 이상 유지.',
  },

  // ===== 항생제 =====
  {
    herbName: '감초',
    drugName: '경구 항생제 (Tetracycline 등)',
    drugAtcCode: 'J01AA',
    type: InteractionType.DECREASE,
    severity: Severity.INFO,
    mechanism: '감초의 칼슘 함량이 테트라사이클린 흡수를 저해할 수 있음.',
    evidence: EvidenceLevel.C,
    recommendation: '복용 간격 2시간 이상 유지.',
  },
];

@Injectable()
export class InteractionsSeeder {
  private readonly logger = new Logger(InteractionsSeeder.name);

  constructor(
    @InjectRepository(Herb) private herbsRepo: Repository<Herb>,
    @InjectRepository(DrugHerbInteraction)
    private interactionsRepo: Repository<DrugHerbInteraction>,
  ) {}

  async run() {
    let inserted = 0;
    let skipped = 0;
    let missingHerb = 0;

    for (const item of CURATED_INTERACTIONS) {
      const herb = await this.herbsRepo.findOne({
        where: { standardName: item.herbName },
        select: ['id', 'standardName'],
      });
      if (!herb) {
        missingHerb++;
        this.logger.warn(`herbs_master에 "${item.herbName}" 없음 — interactions 시드 skip`);
        continue;
      }

      const existing = await this.interactionsRepo.findOne({
        where: { herbId: herb.id, drugName: item.drugName },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await this.interactionsRepo.save(
        this.interactionsRepo.create({
          drugName: item.drugName,
          drugAtcCode: item.drugAtcCode || null,
          herbId: herb.id,
          interactionType: item.type,
          severity: item.severity,
          mechanism: item.mechanism,
          evidenceLevel: item.evidence,
          recommendation: item.recommendation,
        }),
      );
      inserted++;
    }

    this.logger.log(
      `✅ interactions 시드 완료: insert=${inserted}, skip=${skipped}, herb 없음=${missingHerb}`,
    );
  }
}
