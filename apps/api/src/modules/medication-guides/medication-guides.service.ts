import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  MedicationGuide,
  GuideHerb,
  GuideInteraction,
  GuideEvidence,
  GuideCostItem,
} from '../../database/entities/medication-guide.entity';
import { MedicationGuideReport } from '../../database/entities/medication-guide-report.entity';
import { PractitionerVisit } from '../../database/entities/practitioner-visit.entity';
import { PractitionerPatient } from '../../database/entities/practitioner-patient.entity';
import { Formula } from '../../database/entities/formula.entity';
import { User } from '../../database/entities/user.entity';
import { CasesService } from '../cases/cases.service';
import { InteractionsService } from '../interactions/interactions.service';

/** 환자가 즉시 알아야 하는 이상반응 — 안내서에 그대로 노출한다. */
export const ADVERSE_FLAGS = [
  '피부 발진·가려움',
  '심한 피로감',
  '눈·피부가 노래짐(황달)',
  '소변 색이 진해짐',
  '오심·구토',
  '설사·복통',
  '두근거림',
] as const;

export interface CreateGuideInput {
  instructions?: string | null;
  cautions?: string | null;
  totalDays?: number | null;
  dispensedDays?: number | null;
  costItems?: GuideCostItem[];
}

export interface GuideDto {
  id: string;
  token: string;
  visitId: string | null;
  formulaName: string;
  herbs: GuideHerb[];
  evidence: GuideEvidence | null;
  interactions: GuideInteraction[];
  instructions: string | null;
  cautions: string | null;
  totalDays: number | null;
  dispensedDays: number | null;
  costItems: GuideCostItem[];
  totalCost: number | null;
  clinicName: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface GuideReportDto {
  id: string;
  symptomScore: number | null;
  adverseFlags: string[];
  note: string | null;
  reviewedAt: string | null;
  reportedAt: string;
}

/**
 * 환자용 복약 안내서.
 *
 * 조사에서 한의원 기피 이유 상위에 오른 것들이 전부 "모른다" 였다 —
 * 뭘 먹는지, 안전한지, 왜 이 약인지, 얼마인지. 진료 기록·처방 카탈로그·
 * 치험례·상호작용 데이터는 이미 서버에 있으므로, 한의사가 다시 타이핑하지
 * 않아도 환자가 열어 볼 문서를 만들 수 있다.
 *
 * 공개 링크로 열리는 문서라 환자 식별정보는 절대 담지 않는다.
 */
@Injectable()
export class MedicationGuidesService {
  private readonly logger = new Logger(MedicationGuidesService.name);

  constructor(
    @InjectRepository(MedicationGuide)
    private readonly guides: Repository<MedicationGuide>,
    @InjectRepository(MedicationGuideReport)
    private readonly reports: Repository<MedicationGuideReport>,
    @InjectRepository(PractitionerVisit)
    private readonly visits: Repository<PractitionerVisit>,
    @InjectRepository(PractitionerPatient)
    private readonly patients: Repository<PractitionerPatient>,
    @InjectRepository(Formula)
    private readonly formulas: Repository<Formula>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly casesService: CasesService,
    private readonly interactionsService: InteractionsService,
  ) {}

  private toDto(g: MedicationGuide): GuideDto {
    return {
      id: g.id,
      token: g.token,
      visitId: g.visitId,
      formulaName: g.formulaName,
      herbs: g.herbs ?? [],
      evidence: g.evidence,
      interactions: g.interactions ?? [],
      instructions: g.instructions,
      cautions: g.cautions,
      totalDays: g.totalDays,
      dispensedDays: g.dispensedDays,
      costItems: g.costItems ?? [],
      totalCost: g.totalCost,
      clinicName: g.clinicName,
      revokedAt: g.revokedAt ? g.revokedAt.toISOString() : null,
      createdAt: g.createdAt.toISOString(),
    };
  }

  private toReportDto(r: MedicationGuideReport): GuideReportDto {
    return {
      id: r.id,
      symptomScore: r.symptomScore,
      adverseFlags: r.adverseFlags ?? [],
      note: r.note,
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      reportedAt: r.reportedAt.toISOString(),
    };
  }

  /** 링크 토큰 — 추측 가능하면 남의 처방이 열린다. */
  private newToken(): string {
    return randomBytes(24).toString('base64url');
  }

  /** 처방 카탈로그에서 약재 구성을 가져온다. 없으면 빈 배열. */
  private async loadHerbs(formulaName: string): Promise<GuideHerb[]> {
    if (!formulaName) return [];
    const formula = await this.formulas.findOne({
      where: { name: formulaName },
      relations: ['formulaHerbs', 'formulaHerbs.herb'],
    });
    if (!formula) return [];

    const seen = new Set<string>();
    const out: GuideHerb[] = [];
    for (const fh of formula.formulaHerbs ?? []) {
      const name = fh.herb?.standardName;
      // 이름 없는 행(용량만 있는 행)과 중복이 카탈로그에 섞여 있다.
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({
        name,
        amount: fh.amount ?? null,
        // 환자가 읽을 한 줄이므로 첫 문장만 쓴다.
        effect: fh.herb?.efficacy ? fh.herb.efficacy.split('.')[0].trim() : null,
      });
    }
    return out;
  }

  /** 왜 이 처방인지 — 치험례 근거. 실패해도 안내서는 나가야 한다. */
  private async loadEvidence(formulaName: string): Promise<GuideEvidence | null> {
    if (!formulaName) return null;
    try {
      const ev = (await this.casesService.getCaseEvidence({
        kind: 'formula',
        name: formulaName,
        limit: 1,
      })) as { total?: number; successRate?: number | null; cases?: Array<{ source?: string }> };
      if (!ev?.total) return null;
      return {
        caseCount: ev.total,
        successRate: ev.successRate ?? null,
        source: ev.cases?.[0]?.source ?? null,
      };
    } catch (e) {
      this.logger.warn(`치험례 근거 조회 실패: ${(e as Error).message}`);
      return null;
    }
  }

  /** 복용 중인 양약과의 상호작용. 실패해도 안내서는 나가야 한다. */
  private async loadInteractions(
    herbs: string[],
    drugs: string[],
  ): Promise<GuideInteraction[]> {
    if (herbs.length === 0 || drugs.length === 0) return [];
    try {
      const res = (await this.interactionsService.checkInteractions(herbs, drugs)) as {
        bySeverity?: Record<
          string,
          Array<{ drug: string; herb: string; recommendation?: string; clinicalManagement?: string }>
        >;
      };
      const out: GuideInteraction[] = [];
      for (const severity of ['critical', 'major', 'moderate', 'minor']) {
        for (const item of res?.bySeverity?.[severity] ?? []) {
          out.push({
            drug: item.drug,
            herb: item.herb,
            severity,
            advice: item.recommendation ?? item.clinicalManagement ?? null,
          });
        }
      }
      return out;
    } catch (e) {
      this.logger.warn(`상호작용 조회 실패: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * 진료 기록으로 안내서를 만든다(있으면 갱신).
   * 같은 진료에 두 개를 만들면 환자가 어느 링크를 봐야 하는지 알 수 없다.
   */
  async createFromVisit(
    practitionerId: string,
    visitId: string,
    input: CreateGuideInput,
  ): Promise<GuideDto> {
    const visit = await this.visits.findOne({
      where: { id: visitId, practitionerId, deletedAt: IsNull() },
    });
    if (!visit) throw new NotFoundException('진료 기록을 찾을 수 없습니다.');

    const formulaName = visit.formulaName ?? '';
    const herbs = await this.loadHerbs(formulaName);

    let drugs: string[] = [];
    if (visit.patientId) {
      const patient = await this.patients.findOne({
        where: { id: visit.patientId, practitionerId, deletedAt: IsNull() },
      });
      drugs = patient?.medications ?? [];
    }

    const [evidence, interactions, user] = await Promise.all([
      this.loadEvidence(formulaName),
      this.loadInteractions(
        herbs.map((h) => h.name),
        drugs,
      ),
      this.users.findOne({ where: { id: practitionerId } }),
    ]);

    const costItems = input.costItems ?? [];
    const totalCost = costItems.length
      ? costItems.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      : null;

    const existing = await this.guides.findOne({ where: { visitId } });
    const entity =
      existing ??
      this.guides.create({
        token: this.newToken(),
        practitionerId,
        visitId,
        patientId: visit.patientId,
      });

    Object.assign(entity, {
      clinicName: user?.clinicName ?? null,
      formulaName,
      herbs,
      evidence,
      interactions,
      instructions: input.instructions ?? entity.instructions ?? null,
      cautions: input.cautions ?? entity.cautions ?? null,
      totalDays: input.totalDays ?? visit.cheopyakDays ?? null,
      dispensedDays: input.dispensedDays ?? null,
      costItems,
      totalCost,
      // 다시 만들면 닫힌 안내서도 되살린다.
      revokedAt: null,
    });

    return this.toDto(await this.guides.save(entity));
  }

  async getByVisit(
    practitionerId: string,
    visitId: string,
  ): Promise<{ guide: GuideDto; reports: GuideReportDto[] } | null> {
    const guide = await this.guides.findOne({ where: { visitId, practitionerId } });
    if (!guide) return null;
    const reports = await this.reports.find({
      where: { guideId: guide.id },
      order: { reportedAt: 'DESC' },
      take: 50,
    });
    return { guide: this.toDto(guide), reports: reports.map((r) => this.toReportDto(r)) };
  }

  async revoke(practitionerId: string, id: string): Promise<{ revoked: true }> {
    const guide = await this.guides.findOne({ where: { id, practitionerId } });
    if (!guide) throw new NotFoundException('안내서를 찾을 수 없습니다.');
    guide.revokedAt = new Date();
    await this.guides.save(guide);
    return { revoked: true };
  }

  /** 자가 기록 확인 처리 — 확인한 기록은 알림에서 빠진다. */
  async markReportsReviewed(
    practitionerId: string,
    guideId: string,
  ): Promise<{ reviewed: number }> {
    const guide = await this.guides.findOne({ where: { id: guideId, practitionerId } });
    if (!guide) throw new NotFoundException('안내서를 찾을 수 없습니다.');
    const res = await this.reports.update(
      { guideId, reviewedAt: IsNull() },
      { reviewedAt: new Date() },
    );
    return { reviewed: res.affected ?? 0 };
  }

  /** 아직 확인하지 않은 환자 자가 기록 — 이상반응이 붙은 것부터. */
  async listUnreviewedReports(practitionerId: string, limit = 20) {
    const rows = await this.reports
      .createQueryBuilder('r')
      .innerJoin('medication_guides', 'g', 'g."id" = r."guideId"')
      .where('g."practitionerId" = :practitionerId', { practitionerId })
      .andWhere('r."reviewedAt" IS NULL')
      // 닫힌 안내서의 기록은 목록에 남기지 않는다. 환자를 지우면 안내서도
      // 닫히는데, 그 기록이 계속 떠 있으면 지운 환자가 화면에 남는 셈이다.
      .andWhere('g."revokedAt" IS NULL')
      .select([
        'r."id" AS id',
        'r."guideId" AS "guideId"',
        'r."symptomScore" AS "symptomScore"',
        'r."adverseFlags" AS "adverseFlags"',
        'r."note" AS note',
        'r."reportedAt" AS "reportedAt"',
        'g."formulaName" AS "formulaName"',
        'g."visitId" AS "visitId"',
        'g."patientId" AS "patientId"',
      ])
      // 이상반응이 붙은 기록이 먼저 보여야 한다.
      .orderBy('jsonb_array_length(r."adverseFlags")', 'DESC')
      .addOrderBy('r."reportedAt"', 'DESC')
      .limit(limit)
      .getRawMany<{
        id: string;
        guideId: string;
        symptomScore: number | null;
        adverseFlags: string[];
        note: string | null;
        reportedAt: Date;
        formulaName: string;
        visitId: string | null;
        patientId: string | null;
      }>();

    // 환자명은 암호화돼 있어 조인으로 못 가져온다. 필요한 것만 복호화 없이
    // 식별자만 넘기고, 이름은 화면에서 환자 조회로 붙인다.
    return rows.map((r) => ({
      id: r.id,
      guideId: r.guideId,
      visitId: r.visitId,
      patientId: r.patientId,
      formulaName: r.formulaName,
      symptomScore: r.symptomScore,
      adverseFlags: r.adverseFlags ?? [],
      note: r.note,
      reportedAt: new Date(r.reportedAt).toISOString(),
    }));
  }

  // ── 공개(비인증) ─────────────────────────────────────────────

  /**
   * 링크로 여는 안내서.
   * 식별정보는 애초에 저장하지 않으므로 여기서 걸러 낼 것도 없다.
   */
  async getPublic(token: string) {
    const guide = await this.guides.findOne({ where: { token } });
    if (!guide || guide.revokedAt) {
      throw new NotFoundException('안내서를 찾을 수 없습니다.');
    }
    return {
      formulaName: guide.formulaName,
      herbs: guide.herbs ?? [],
      evidence: guide.evidence,
      interactions: guide.interactions ?? [],
      instructions: guide.instructions,
      cautions: guide.cautions,
      totalDays: guide.totalDays,
      dispensedDays: guide.dispensedDays,
      costItems: guide.costItems ?? [],
      totalCost: guide.totalCost,
      clinicName: guide.clinicName,
      issuedAt: guide.createdAt.toISOString(),
      adverseFlagOptions: [...ADVERSE_FLAGS],
    };
  }

  /**
   * 내가 보낸 기록 다시 보기.
   *
   * 기록을 보내기만 하고 다시 볼 수 없으면, 좋아지고 있는지 본인이 알 수 없다.
   * 한의원 기피 이유 4위가 "효과가 불확실하다" 인데 정작 본인의 호전을 본인
   * 눈으로 볼 자리가 없었다.
   *
   * 열람 권한은 안내서 본문과 같다 — 링크를 아는 사람은 이미 전부 볼 수 있다.
   * 한의사의 확인 여부(reviewedAt)는 내보내지 않는다. 환자가 알 일이 아니고,
   * '아직 안 봤다' 가 보이면 불필요한 불안만 만든다.
   */
  async getPublicReports(token: string) {
    const guide = await this.guides.findOne({ where: { token } });
    if (!guide || guide.revokedAt) {
      throw new NotFoundException('안내서를 찾을 수 없습니다.');
    }
    const rows = await this.reports.find({
      where: { guideId: guide.id },
      order: { reportedAt: 'ASC' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      symptomScore: r.symptomScore,
      adverseFlags: r.adverseFlags ?? [],
      note: r.note,
      reportedAt: r.reportedAt.toISOString(),
    }));
  }

  /** 환자 자가 기록 등록 — 인증 없이 링크만으로 쓴다. */
  async addPublicReport(
    token: string,
    input: { symptomScore?: number | null; adverseFlags?: string[]; note?: string | null },
  ): Promise<{ received: true }> {
    const guide = await this.guides.findOne({ where: { token } });
    if (!guide || guide.revokedAt) {
      throw new NotFoundException('안내서를 찾을 수 없습니다.');
    }

    const score =
      typeof input.symptomScore === 'number' && Number.isFinite(input.symptomScore)
        ? Math.min(10, Math.max(0, Math.round(input.symptomScore)))
        : null;

    // 우리가 제시한 항목만 받는다 — 링크만 있으면 누구나 쓸 수 있는 자리다.
    const allowed = new Set<string>(ADVERSE_FLAGS);
    const flags = (input.adverseFlags ?? []).filter((f) => allowed.has(f));

    await this.reports.save(
      this.reports.create({
        guideId: guide.id,
        symptomScore: score,
        adverseFlags: flags,
        note: (input.note ?? '').trim().slice(0, 500) || null,
      }),
    );
    return { received: true };
  }
}
