import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Not } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  MedicationGuide,
  GuideHerb,
  GuideHerbSource,
  GuideInteraction,
  GuideEvidence,
  GuideCostItem,
} from '../../database/entities/medication-guide.entity';
import { Herb } from '../../database/entities/herb.entity';
import { MedicationGuideReport } from '../../database/entities/medication-guide-report.entity';
import { PractitionerVisit } from '../../database/entities/practitioner-visit.entity';
import { PractitionerPatient } from '../../database/entities/practitioner-patient.entity';
import { Formula } from '../../database/entities/formula.entity';
import type { VisitHerb } from '../../database/entities/practitioner-visit.entity';
import { User } from '../../database/entities/user.entity';
import { MedicationGuideDose } from '../../database/entities/medication-guide-dose.entity';
import { CasesService } from '../cases/cases.service';
import { InteractionsService } from '../interactions/interactions.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { GuideLinkSenderService } from './guide-link-sender.service';
import { seoulDay, daysBetween } from '../../common/seoul-day';

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
  /** 약재 원산지·규격 한 줄. 안 적으면 '문의' 로 남는다. */
  herbOrigin?: string | null;
  /** 환자에게 보여줄 변증·진단. 한의사가 확인·수정한 것만 담는다. */
  diagnosis?: string | null;
}

export interface GuideDto {
  id: string;
  token: string;
  visitId: string | null;
  formulaName: string;
  herbs: GuideHerb[];
  herbSource: GuideHerbSource;
  herbOrigin: string | null;
  diagnosis: string | null;
  evidence: GuideEvidence | null;
  interactions: GuideInteraction[];
  reviewedDrugCount: number | null;
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

export interface DosingDto {
  /** 복용 시작일 (KST YYYY-MM-DD). 아직 안 눌렀으면 null. */
  startedOn: string | null;
  takenDates: string[];
  takenToday: boolean;
  /** 복용 N일째. 시작 전이면 null. */
  dayIndex: number | null;
  /** 지금까지 지났어야 할 날 대비 실제 복용일 비율(%). */
  adherence: number | null;
  /** 서버가 본 오늘(KST) — 클라이언트 시계와 어긋나도 화면이 맞게 그려진다. */
  today: string;
}

export interface DeliveryDto {
  linkSentAt: string | null;
  linkSentChannel: string | null;
  hasPatient: boolean;
  hasPhone: boolean;
  consentAt: string | null;
  optedOut: boolean;
  trackToken: string | null;
}

export interface SendGuideLinkResult {
  status: string;
  channel: string;
  messageId?: string;
  reason?: string;
  link: string;
  trackToken: string;
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
    @InjectRepository(MedicationGuideDose)
    private readonly doses: Repository<MedicationGuideDose>,
    @InjectRepository(PractitionerVisit)
    private readonly visits: Repository<PractitionerVisit>,
    @InjectRepository(PractitionerPatient)
    private readonly patients: Repository<PractitionerPatient>,
    @InjectRepository(Formula)
    private readonly formulas: Repository<Formula>,
    @InjectRepository(Herb)
    private readonly herbs: Repository<Herb>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly casesService: CasesService,
    private readonly interactionsService: InteractionsService,
    private readonly encryption: EncryptionService,
    private readonly sender: GuideLinkSenderService,
  ) {}

  private toDto(g: MedicationGuide): GuideDto {
    return {
      id: g.id,
      token: g.token,
      visitId: g.visitId,
      formulaName: g.formulaName,
      herbs: g.herbs ?? [],
      herbSource: g.herbSource ?? 'none',
      herbOrigin: g.herbOrigin,
      diagnosis: g.diagnosis,
      evidence: g.evidence,
      interactions: g.interactions ?? [],
      reviewedDrugCount: g.reviewedDrugCount,
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

  /**
   * 진료 기록에 적힌 실제 조제 내용으로 약재 목록을 만든다.
   *
   * 이게 1순위여야 한다. 처방명으로 카탈로그를 찾으면 '그 처방의 교과서 구성'
   * 이 나오는데, 임상에서 원방 그대로 쓰는 일은 드물다. 가감한 처방에 원방을
   * 보여주면 뺀 약재가 있는 것으로, 더한 약재가 없는 것으로 읽힌다.
   * 소비자원 자료에서 처방 내용을 안 알려준다는 것이 불신의 큰 축이었는데,
   * 틀린 내용을 알려주는 것은 그보다 나쁘다.
   *
   * 용량은 여기서는 지운다 — 한의사가 적은 값이라 실제 조제량이다.
   * (카탈로그 유래일 때만 고전 표기라 감춘다.)
   */
  private async herbsFromPrescription(
    prescribed: VisitHerb[],
  ): Promise<GuideHerb[]> {
    const seen = new Set<string>();
    const cleaned = prescribed
      .map((h) => ({ ...h, name: (h.name ?? '').trim() }))
      .filter((h) => {
        if (!h.name || seen.has(h.name)) return false;
        seen.add(h.name);
        return true;
      });
    if (cleaned.length === 0) return [];

    // 효능 한 줄은 약재 사전에서 붙인다. 없으면 이름만 나간다.
    let efficacyByName = new Map<string, string>();
    try {
      const rows = await this.herbs.find({
        where: { standardName: In(cleaned.map((h) => h.name)) },
        select: ['standardName', 'efficacy'],
      });
      efficacyByName = new Map(
        rows
          .filter((r) => r.efficacy?.trim())
          .map((r) => [r.standardName, r.efficacy.split('.')[0].trim()]),
      );
    } catch (e) {
      this.logger.warn(`약재 효능 조회 실패: ${(e as Error).message}`);
    }

    return cleaned.map((h) => ({
      name: h.name,
      amount: h.amount?.trim() || null,
      effect: efficacyByName.get(h.name) ?? null,
    }));
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

    // 실제 조제 내용이 있으면 그것을, 없을 때만 카탈로그 표준 구성을 쓴다.
    let herbs = await this.herbsFromPrescription(visit.herbs ?? []);
    let herbSource: GuideHerbSource = herbs.length > 0 ? 'prescription' : 'none';
    if (herbs.length === 0) {
      herbs = await this.loadHerbs(formulaName);
      herbSource = herbs.length > 0 ? 'catalog' : 'none';
    }

    // null = 환자가 명부에 연결되지 않아 대조 자체를 못 함
    // 0    = 연결은 됐지만 복용 중인 양약을 받아 두지 않음
    let drugs: string[] = [];
    let reviewedDrugCount: number | null = null;
    if (visit.patientId) {
      const patient = await this.patients.findOne({
        where: { id: visit.patientId, practitionerId, deletedAt: IsNull() },
      });
      if (patient) {
        drugs = patient.medications ?? [];
        reviewedDrugCount = drugs.length;
      }
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

    // 원산지·규격은 한의원 단위로 거의 고정이다(공급처가 바뀌지 않는 한).
    // 처방할 때마다 다시 적게 하면 결국 아무도 안 적고, 그러면 "중국산 아니냐" 에
    // 대한 답이 영영 빈칸으로 남는다. 새로 만드는 안내서는 직전에 적어 둔 것을
    // 물려받는다. 이미 있는 안내서를 갱신할 때는 그 안내서의 값이 우선이다.
    const inheritedOrigin = existing
      ? null
      : ((
          await this.guides.findOne({
            where: { practitionerId, herbOrigin: Not(IsNull()) },
            order: { createdAt: 'DESC' },
            select: ['herbOrigin'],
          })
        )?.herbOrigin ?? null);
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
      herbSource,
      herbOrigin: input.herbOrigin ?? entity.herbOrigin ?? inheritedOrigin,
      // 변증은 진료 기록에서 자동으로 끌어오지 않는다. 자유 텍스트라 환자
      // 이름이나 다른 사람 이야기가 섞여 있을 수 있고, 이 문서는 링크만
      // 알면 열린다. 한의사가 발행 화면에서 확인해 넣은 것만 담는다.
      diagnosis: input.diagnosis ?? entity.diagnosis ?? null,
      evidence,
      interactions,
      reviewedDrugCount,
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
  ): Promise<{
    guide: GuideDto;
    reports: GuideReportDto[];
    dosing: DosingDto;
    delivery: DeliveryDto;
  } | null> {
    const guide = await this.guides.findOne({ where: { visitId, practitionerId } });
    if (!guide) return null;
    const reports = await this.reports.find({
      where: { guideId: guide.id },
      order: { reportedAt: 'DESC' },
      take: 50,
    });
    return {
      guide: this.toDto(guide),
      reports: reports.map((r) => this.toReportDto(r)),
      // 복약 순응도가 없으면 "효과가 없다" 는 호소를 미복용과 구분할 수 없다.
      dosing: await this.dosingOf(guide),
      delivery: await this.deliveryOf(guide),
    };
  }

  /** 이 안내서가 환자에게 실제로 전달됐는지 — 화면에서 '보냈다고 착각' 을 막는다. */
  private async deliveryOf(guide: MedicationGuide): Promise<DeliveryDto> {
    const patient = guide.patientId
      ? await this.patients.findOne({
          where: { id: guide.patientId, deletedAt: IsNull() },
        })
      : null;
    return {
      linkSentAt: guide.linkSentAt ? guide.linkSentAt.toISOString() : null,
      linkSentChannel: guide.linkSentChannel,
      hasPatient: Boolean(patient),
      hasPhone: Boolean(patient?.phoneEncrypted),
      consentAt: patient?.notifyConsentAt
        ? patient.notifyConsentAt.toISOString()
        : null,
      optedOut: Boolean(patient?.notifyOptOutAt),
      trackToken:
        patient?.trackToken && !patient.trackRevokedAt
          ? patient.trackToken
          : null,
    };
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
    const guide = await this.openGuideOr404(token);
    return {
      ...this.publicPayload(guide),
      dosing: await this.dosingOf(guide),
    };
  }

  /** 링크로 열 수 있는 안내서만 돌려준다. 닫혔거나 없으면 404. */
  private async openGuideOr404(token: string): Promise<MedicationGuide> {
    const guide = await this.guides.findOne({ where: { token } });
    if (!guide || guide.revokedAt) {
      throw new NotFoundException('안내서를 찾을 수 없습니다.');
    }
    return guide;
  }

  /** 공개 응답 본문 — 식별정보는 애초에 저장하지 않으므로 걸러 낼 것이 없다. */
  private publicPayload(guide: MedicationGuide) {
    return {
      token: guide.token,
      formulaName: guide.formulaName,
      herbs: guide.herbs ?? [],
      herbSource: guide.herbSource ?? 'none',
      herbOrigin: guide.herbOrigin,
      diagnosis: guide.diagnosis,
      evidence: guide.evidence,
      interactions: guide.interactions ?? [],
      reviewedDrugCount: guide.reviewedDrugCount,
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

  // ── 복용 체크 (공개) ─────────────────────────────────────────
  //
  // 예전에는 환자 기기의 localStorage 에 있었다. 기기를 바꾸거나 카톡 링크를
  // 다른 기기에서 열면 며칠째인지가 사라졌고, 한의사는 환자가 실제로 먹었는지
  // 알 수 없었다. "효과가 없다" 가 미복용 때문인지 처방 때문인지 구분되지
  // 않으면 다음 처방을 고칠 근거가 없다.

  /** 안내서 하나의 복용 현황. */
  private async dosingOf(guide: MedicationGuide): Promise<DosingDto> {
    const rows = await this.doses.find({
      where: { guideId: guide.id },
      order: { takenOn: 'ASC' },
    });
    const takenDates = rows.map((r) =>
      typeof r.takenOn === 'string'
        ? r.takenOn
        : seoulDay(r.takenOn as unknown as Date),
    );
    const today = seoulDay();
    const startedOn = guide.dosingStartedOn ?? null;
    const dayIndex = startedOn ? daysBetween(startedOn, today) + 1 : null;

    // 순응도의 분모는 '지금까지 지났어야 할 날' 이지 처방 총 일수가 아니다.
    // 20일분을 3일째 먹는 중인 사람의 순응도가 15% 로 보이면 아무 뜻이 없다.
    let adherence: number | null = null;
    if (dayIndex != null && dayIndex > 0) {
      const expected = guide.totalDays
        ? Math.min(dayIndex, guide.totalDays)
        : dayIndex;
      adherence =
        expected > 0 ? Math.round((takenDates.length / expected) * 100) : null;
    }

    return {
      startedOn,
      takenDates,
      takenToday: takenDates.includes(today),
      dayIndex: dayIndex != null && dayIndex > 0 ? dayIndex : null,
      adherence,
      today,
    };
  }

  /** 복용 시작 — 처방일이 아니라 환자가 실제로 먹기 시작한 날을 센다. */
  async startDosing(token: string): Promise<DosingDto> {
    const guide = await this.openGuideOr404(token);
    if (!guide.dosingStartedOn) {
      guide.dosingStartedOn = seoulDay();
      await this.guides.save(guide);
    }
    return this.dosingOf(guide);
  }

  /**
   * 오늘 복용 체크 토글.
   *
   * 날짜는 서버가 KST 로 정한다. 클라이언트가 보낸 날짜를 받으면 기기 시계로
   * 과거·미래를 채워 넣을 수 있고, 그러면 순응도가 증빙이 아니라 장식이 된다.
   */
  async toggleDoseToday(token: string): Promise<DosingDto> {
    const guide = await this.openGuideOr404(token);
    const today = seoulDay();

    const existing = await this.doses.findOne({
      where: { guideId: guide.id, takenOn: today },
    });
    if (existing) {
      await this.doses.delete({ id: existing.id });
    } else {
      // 시작을 안 눌렀는데 먼저 체크한 경우 — 오늘을 시작일로 본다.
      if (!guide.dosingStartedOn) {
        guide.dosingStartedOn = today;
        await this.guides.save(guide);
      }
      try {
        await this.doses.insert({ guideId: guide.id, takenOn: today });
      } catch {
        // 같은 날 두 번 눌러 유니크 제약에 걸린 것 — 이미 기록됐으니 무시한다.
      }
    }
    return this.dosingOf(guide);
  }

  /**
   * 기기에 남아 있던 복용 기록을 한 번만 서버로 옮긴다.
   *
   * 복용 체크가 localStorage 에 있던 시절의 기록이다. 서버로 옮기면서 그냥
   * 버리면 환자가 지금까지 눌러 온 것이 사라진다.
   *
   * 원칙은 여전히 '날짜는 서버가 정한다' 이므로, 이 경로만 예외로 두고 좁게 막는다.
   *   - 서버에 기록이 하나도 없을 때만 받는다(덮어쓰기·부풀리기 차단)
   *   - 미래 날짜와 시작일 이전은 버린다
   *   - 최대 60일
   */
  async importDoses(token: string, dates: string[]): Promise<DosingDto> {
    const guide = await this.openGuideOr404(token);

    const already = await this.doses.count({ where: { guideId: guide.id } });
    if (already > 0) return this.dosingOf(guide);

    const today = seoulDay();
    const valid = [
      ...new Set(
        (dates ?? []).filter(
          (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d),
        ),
      ),
    ]
      .filter((d) => d <= today)
      .sort()
      .slice(-60);
    if (valid.length === 0) return this.dosingOf(guide);

    const startedOn = guide.dosingStartedOn ?? valid[0];
    const rows = valid
      .filter((d) => d >= startedOn)
      .map((d) => ({ guideId: guide.id, takenOn: d }));

    if (rows.length > 0) {
      // 동시에 두 번 열려 유니크 제약에 걸릴 수 있다 — 그때는 이미 들어간 것이다.
      await this.doses
        .createQueryBuilder()
        .insert()
        .values(rows)
        .orIgnore()
        .execute();
    }
    if (!guide.dosingStartedOn) {
      guide.dosingStartedOn = startedOn;
      await this.guides.save(guide);
    }
    return this.dosingOf(guide);
  }

  // ── 환자 단위 추적 (공개) ────────────────────────────────────

  /**
   * 카톡으로 보낸 링크가 여는 화면.
   *
   * 안내서는 진료 단위라 처방이 바뀌면 토큰도 바뀐다. 환자에게 매번 새 링크를
   * 보내면 지난 경과와 이어지지 않고, 어느 링크를 열어야 하는지도 알 수 없다.
   * 그래서 환자 단위 토큰 하나로 지금 먹는 약과 지난 처방, 전체 증상 추이를
   * 한자리에서 연다.
   *
   * 이 링크는 그 환자의 처방 이력 전체를 여는 열쇠라 진료 단위 토큰보다 무겁다.
   * 그래도 담기는 것은 처방 내용뿐이다 — 이름·연락처·생년월일은 안내서 스냅샷에
   * 애초에 저장되지 않는다.
   */
  async getTrack(trackToken: string) {
    const patient = await this.patients.findOne({
      where: { trackToken, deletedAt: IsNull() },
    });
    if (!patient || patient.trackRevokedAt) {
      throw new NotFoundException('링크를 찾을 수 없습니다.');
    }

    const guides = await this.guides.find({
      where: { patientId: patient.id, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    const current = guides[0] ?? null;
    const past = guides.slice(1).map((g) => ({
      token: g.token,
      formulaName: g.formulaName,
      issuedAt: g.createdAt.toISOString(),
      totalDays: g.totalDays,
    }));

    // 증상 추이는 처방을 가로질러 이어져야 한다. 처방이 바뀌었다고 그래프가
    // 처음부터 다시 시작하면, 나아지고 있는지를 볼 수가 없다.
    const byId = new Map(guides.map((g) => [g.id, g] as const));
    const reports = guides.length
      ? await this.reports.find({
          where: { guideId: In(guides.map((g) => g.id)) },
          order: { reportedAt: 'ASC' },
          take: 300,
        })
      : [];

    return {
      clinicName: current?.clinicName ?? null,
      notifyOptedOut: Boolean(patient.notifyOptOutAt),
      current: current
        ? {
            ...this.publicPayload(current),
            dosing: await this.dosingOf(current),
          }
        : null,
      past,
      timeline: reports.map((r) => ({
        id: r.id,
        symptomScore: r.symptomScore,
        adverseFlags: r.adverseFlags ?? [],
        note: r.note,
        reportedAt: r.reportedAt.toISOString(),
        formulaName: byId.get(r.guideId)?.formulaName ?? null,
      })),
      adverseFlagOptions: [...ADVERSE_FLAGS],
    };
  }

  /**
   * 환자가 직접 누르는 수신 거부.
   *
   * 정보통신망법은 수신 거부 수단을 함께 제공하도록 요구한다. 한의사에게
   * 전화해서 빼 달라고 해야 하는 것은 수단이 아니다.
   */
  async optOutOfNotifications(trackToken: string): Promise<{ optedOut: true }> {
    const patient = await this.patients.findOne({
      where: { trackToken, deletedAt: IsNull() },
    });
    if (!patient) throw new NotFoundException('링크를 찾을 수 없습니다.');
    if (!patient.notifyOptOutAt) {
      patient.notifyOptOutAt = new Date();
      await this.patients.save(patient);
    }
    return { optedOut: true };
  }

  // ── 링크 전달 (한의사) ───────────────────────────────────────

  /** 환자 단위 토큰을 만들거나 이미 있는 것을 쓴다. 회수됐으면 새로 낸다. */
  private async ensureTrackToken(patient: PractitionerPatient): Promise<string> {
    if (patient.trackToken && !patient.trackRevokedAt) return patient.trackToken;
    patient.trackToken = this.newToken();
    patient.trackIssuedAt = new Date();
    patient.trackRevokedAt = null;
    await this.patients.save(patient);
    return patient.trackToken;
  }

  /**
   * 안내서 링크를 환자 카톡(실패 시 문자)으로 보낸다.
   *
   * 지금까지는 QR 을 인쇄하거나 링크를 복사해 직접 전달해야 했다. 약봉투를
   * 버리면 그것으로 끝이었고, 복용 중에 다시 열어 볼 길이 사실상 없었다.
   */
  async sendGuideLink(
    practitionerId: string,
    guideId: string,
  ): Promise<SendGuideLinkResult> {
    const guide = await this.guides.findOne({
      where: { id: guideId, practitionerId },
    });
    if (!guide) throw new NotFoundException('안내서를 찾을 수 없습니다.');
    if (guide.revokedAt) {
      throw new BadRequestException(
        '닫힌 안내서입니다. 다시 발행한 뒤에 보내 주세요.',
      );
    }
    if (!guide.patientId) {
      throw new BadRequestException(
        '환자 명부에 연결되지 않은 안내서는 보낼 수 없습니다.',
      );
    }

    const patient = await this.patients.findOne({
      where: { id: guide.patientId, practitionerId, deletedAt: IsNull() },
    });
    if (!patient) throw new NotFoundException('환자를 찾을 수 없습니다.');

    const trackToken = await this.ensureTrackToken(patient);
    const link = this.sender.trackLink(trackToken);

    const result = await this.sender.send({
      practitionerId,
      patientId: patient.id,
      guideId: guide.id,
      kind: 'guide_link',
      phone: this.safeDecrypt(patient.phoneEncrypted),
      patientName: this.safeDecrypt(patient.nameEncrypted) ?? '환자',
      clinicName: guide.clinicName ?? '',
      formulaName: guide.formulaName,
      link,
      consentAt: patient.notifyConsentAt,
      optOutAt: patient.notifyOptOutAt,
    });

    if (result.status === 'sent') {
      guide.linkSentAt = new Date();
      guide.linkSentChannel = result.channel;
      await this.guides.save(guide);
    }

    return { ...result, link, trackToken };
  }

  /** 복호화 실패가 발송 전체를 막지 않게 한다 — 키 교체 중일 수 있다. */
  private safeDecrypt(value: string | null): string | null {
    if (!value) return null;
    try {
      return this.encryption.decrypt(value);
    } catch {
      return null;
    }
  }
}

