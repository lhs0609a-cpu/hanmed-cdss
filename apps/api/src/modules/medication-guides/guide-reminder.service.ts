import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In } from 'typeorm';
import { MedicationGuide } from '../../database/entities/medication-guide.entity';
import { PractitionerPatient } from '../../database/entities/practitioner-patient.entity';
import {
  PatientNotifyLog,
  NotifyKind,
} from '../../database/entities/patient-notify-log.entity';
import { EncryptionService } from '../../common/services/encryption.service';
import { GuideLinkSenderService } from './guide-link-sender.service';
import { seoulDay, daysBetween } from '../../common/seoul-day';

/** 복용 며칠째에 무엇을 물을지. */
const CHECKPOINTS: Array<{
  kind: NotifyKind;
  /** 복용 시작 기준 며칠 뒤 */
  offset: number;
  label: string;
}> = [
  { kind: 'checkin_d3', offset: 3, label: '복용 3일째,' },
  { kind: 'checkin_d7', offset: 7, label: '복용 일주일째,' },
];

/** 한 번 돌 때 보낼 상한 — 사고가 나도 피해가 이 숫자를 넘지 않는다. */
const MAX_PER_RUN = 200;

/** 복용이 끝나고 이만큼 지나면 더 이상 묻지 않는다. */
const GRACE_DAYS = 3;

/**
 * 복용 기간 중 체크인 알림.
 *
 * 링크를 한 번 보내는 것만으로는 기록이 쌓이지 않는다. 환자는 약을 받은 날
 * 한 번 열어 보고 그것으로 끝이고, 그러면 "경과를 본다" 는 것이 화면에만 있는
 * 말이 된다. 실제로 물어봐야 답이 온다.
 *
 * 다만 알림은 쉽게 스팸이 된다. 그래서 세 번만 보낸다 — 3일째, 일주일째,
 * 그리고 다 드시기 이틀 전. 같은 안내서에 같은 종류를 두 번 보내지 않고,
 * 수신 거부·안내서 회수·환자 삭제 중 하나만 있어도 즉시 멈춘다.
 *
 * 발송 시각은 정보통신망법상 광고성이 아니어서 야간 금지 대상은 아니지만,
 * 밤에 오는 알림은 그 자체로 민원이 된다. GuideLinkSenderService 가
 * automatic=true 인 요청을 21~08시에 막는다.
 */
@Injectable()
export class GuideReminderService {
  private readonly logger = new Logger(GuideReminderService.name);

  constructor(
    @InjectRepository(MedicationGuide)
    private readonly guides: Repository<MedicationGuide>,
    @InjectRepository(PractitionerPatient)
    private readonly patients: Repository<PractitionerPatient>,
    @InjectRepository(PatientNotifyLog)
    private readonly logs: Repository<PatientNotifyLog>,
    private readonly encryption: EncryptionService,
    private readonly sender: GuideLinkSenderService,
  ) {}

  @Cron('0 10 * * * *', { name: 'medication-guide-checkin' })
  async runHourly(): Promise<void> {
    try {
      const sent = await this.dispatchDue();
      if (sent > 0) this.logger.log(`복약 체크인 ${sent}건 발송`);
    } catch (e) {
      this.logger.error(`복약 체크인 실패: ${(e as Error).message}`);
    }
  }

  /** 지금 보내야 할 체크인을 찾아 보낸다. 보낸 건수를 돌려준다. */
  async dispatchDue(): Promise<number> {
    const today = seoulDay();

    // 링크를 보낸 적 있는, 아직 열려 있는 안내서만 대상이다.
    // 링크를 못 받은 환자에게 "기록을 남겨 달라" 고 보내면 열 곳이 없다.
    const candidates = await this.guides.find({
      where: {
        revokedAt: IsNull(),
        linkSentAt: Not(IsNull()),
        patientId: Not(IsNull()),
      },
      order: { linkSentAt: 'DESC' },
      take: 2000,
    });
    if (candidates.length === 0) return 0;

    const patientIds = [
      ...new Set(candidates.map((g) => g.patientId).filter(Boolean)),
    ] as string[];
    const patients = await this.patients.find({
      where: { id: In(patientIds), deletedAt: IsNull() },
    });
    const patientById = new Map(patients.map((p) => [p.id, p] as const));

    const guideIds = candidates.map((g) => g.id);
    const priorLogs = await this.logs.find({
      where: { guideId: In(guideIds) },
      select: ['guideId', 'kind', 'status'],
    });
    // 실패한 시도도 '보낸 것' 으로 친다. 재시도 루프가 도는 것보다
    // 한 번 놓치는 편이 낫다 — 알림은 쌓이면 그 자체로 해가 된다.
    //
    // 야간에 막힌 것만 예외다. 그건 보낼 시각이 아니었다는 뜻이지 보냈다는
    // 뜻이 아니므로, 낮이 되면 다시 시도해야 한다.
    const alreadySent = new Set(
      priorLogs
        .filter((l) => l.status !== 'quiet_hours')
        .map((l) => `${l.guideId}:${l.kind}`),
    );

    let sent = 0;
    for (const guide of candidates) {
      if (sent >= MAX_PER_RUN) break;

      const patient = guide.patientId
        ? patientById.get(guide.patientId)
        : undefined;
      if (!patient) continue;
      if (!patient.notifyConsentAt || patient.notifyOptOutAt) continue;
      if (!patient.trackToken || patient.trackRevokedAt) continue;

      const anchor =
        guide.dosingStartedOn ?? seoulDay(guide.linkSentAt as Date);
      const elapsed = daysBetween(anchor, today);
      if (elapsed < 0) continue;

      // 복용이 끝난 지 한참인 안내서는 대상에서 뺀다.
      const span = guide.totalDays ?? 30;
      if (elapsed > span + GRACE_DAYS) continue;

      const due = this.dueCheckpoint(guide, elapsed, alreadySent);
      if (!due) continue;

      const result = await this.sender.send({
        practitionerId: guide.practitionerId,
        patientId: patient.id,
        guideId: guide.id,
        kind: due.kind,
        phone: this.safeDecrypt(patient.phoneEncrypted),
        patientName: this.safeDecrypt(patient.nameEncrypted) ?? '환자',
        clinicName: guide.clinicName ?? '',
        formulaName: guide.formulaName,
        link: this.sender.trackLink(patient.trackToken),
        dayLabel: due.label,
        consentAt: patient.notifyConsentAt,
        optOutAt: patient.notifyOptOutAt,
        automatic: true,
      });

      // 야간이라 막힌 것은 다음 시간에 다시 시도해야 한다 — 보낸 것으로 치지 않는다.
      // (기록은 남긴다. 왜 안 갔는지 나중에 설명할 수 있어야 한다.)
      if (result.status === 'quiet_hours') continue;

      alreadySent.add(`${guide.id}:${due.kind}`);
      if (result.status === 'sent') sent += 1;
    }

    return sent;
  }

  /** 오늘 보내야 할 체크인 하나. 없으면 null. */
  private dueCheckpoint(
    guide: MedicationGuide,
    elapsed: number,
    alreadySent: Set<string>,
  ): { kind: NotifyKind; label: string } | null {
    // 복용 종료 2일 전이 가장 급하다 — 남은 약을 못 받은 채로 끝나는 일이
    // 환불 분쟁의 대부분이다.
    if (guide.totalDays && guide.totalDays > 2) {
      const offset = guide.totalDays - 2;
      if (elapsed >= offset && !alreadySent.has(`${guide.id}:ending_d2`)) {
        return { kind: 'ending_d2', label: '이제 곧 다 드시는데,' };
      }
    }
    for (const cp of CHECKPOINTS) {
      if (elapsed >= cp.offset && !alreadySent.has(`${guide.id}:${cp.kind}`)) {
        return { kind: cp.kind, label: cp.label };
      }
    }
    return null;
  }

  private safeDecrypt(value: string | null): string | null {
    if (!value) return null;
    try {
      return this.encryption.decrypt(value);
    } catch {
      return null;
    }
  }
}
