import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EdiBuilderService } from './edi-builder.service';
import { EdiSubmissionService } from './edi-submission.service';
import { EdiClaimUnit } from './edi-types';
import { SangamLearnerService } from '../sangam-learner.service';

@ApiTags('insurance')
@Controller('insurance/edi')
export class EdiController {
  private readonly logger = new Logger(EdiController.name);

  constructor(
    private readonly builder: EdiBuilderService,
    private readonly submission: EdiSubmissionService,
    private readonly learner: SangamLearnerService,
  ) {}

  @Post('preflight')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '청구 직전 사전 검증 + 삭감 위험 평가' })
  @HttpCode(200)
  preflight(@Body() unit: EdiClaimUnit) {
    const validation = this.builder.validate(unit);
    const codes = unit.treatments.map((t) => t.code);
    const sangamRisk = this.learner.evaluateDraft({
      clinicId: unit.clinicYoyangCode,
      codes,
    });
    return { validation, sangamRisk };
  }

  @Post('submit')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '심평원 EDI 제출 (VAN 또는 직접)',
    description: 'EDI_PROVIDER 환경변수에 따라 VAN/직접/mock 분기. 응답은 ACK 위주이며 심사 결정은 별도 webhook 으로 수신.',
  })
  @HttpCode(202)
  async submit(@Body() unit: EdiClaimUnit) {
    const result = await this.submission.submit(unit);
    return result;
  }

  /** HIRA/VAN 의 심사 결정 webhook — 인증 토큰은 별도 시그니처 검증이 필요. */
  @Post('webhooks/review-decision')
  @ApiOperation({ summary: '심사 결정 webhook 수신 — 청구 결과를 학습 모델에 자동 적재' })
  @HttpCode(200)
  receiveReviewDecision(@Body() payload: unknown) {
    const decision = this.submission.parseReviewDecision(payload);
    this.logger.log(
      `[edi] review decision serial=${decision.claimSerialNumber} outcome=${decision.outcome}`,
    );
    // 학습 모델 적재 — 한의원 별 삭감 패턴 갱신
    if (decision.itemAdjustments?.length) {
      this.learner.ingest([
        {
          clinicId: '',  // 호출자 컨텍스트에서 채워짐 — 운영에서는 webhook 메타로 전달
          codes: decision.itemAdjustments.map((a) => a.treatmentCode),
          submittedAt: new Date(decision.reviewedAt),
          outcome:
            decision.outcome === 'approved'
              ? 'approved'
              : decision.outcome === 'partial'
                ? 'partial'
                : 'rejected',
          rejectionReasons: decision.itemAdjustments.map((a) => a.reasonText).filter(Boolean),
        },
      ]);
    }
    return { ok: true };
  }
}
