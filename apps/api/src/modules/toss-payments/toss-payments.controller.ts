import { Controller, Post, Get, Body, UseGuards, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TossPaymentsService } from './toss-payments.service';
import { User } from '../../database/entities/user.entity';
import {
  RegisterCardDto,
  SubscribeDto,
  RefundRequestDto,
  PaymentHistoryQueryDto,
} from './dto';

@ApiTags('subscription')
@Controller('subscription')
export class TossPaymentsController {
  constructor(private readonly tossPaymentsService: TossPaymentsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: '요금제 목록 조회' })
  getPlans() {
    return this.tossPaymentsService.getPlans();
  }

  @Public()
  @Get('client-key')
  @ApiOperation({ summary: '토스페이먼츠 클라이언트 키 조회' })
  getClientKey() {
    return { clientKey: this.tossPaymentsService.getClientKey() };
  }

  @Get('info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 구독 정보 조회' })
  async getSubscriptionInfo(@CurrentUser() user: User) {
    return this.tossPaymentsService.getSubscriptionInfo(user.id);
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '이번 달 사용량 조회' })
  async getUsage(@CurrentUser() user: User) {
    return this.tossPaymentsService.getUsage(user.id);
  }

  @Post('register-card')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '결제 카드 등록 (빌링키 발급)' })
  async registerCard(
    @CurrentUser() user: User,
    @Body() dto: RegisterCardDto,
  ) {
    const result = await this.tossPaymentsService.issueBillingKey(
      user.id,
      dto.cardNumber,
      dto.expirationYear,
      dto.expirationMonth,
      dto.cardPassword,
      dto.customerIdentityNumber,
    );

    return {
      success: true,
      message: '카드가 등록되었습니다.',
      cardNumber: result.cardNumber,
    };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '구독 결제 요청' })
  async subscribe(
    @CurrentUser() user: User,
    @Body() dto: SubscribeDto,
  ) {
    const result = await this.tossPaymentsService.payWithBillingKey(
      user.id,
      dto.tier,
      dto.interval,
    );

    return {
      success: result.success,
      message: '구독이 시작되었습니다.',
      paymentKey: result.paymentKey,
    };
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '구독 취소 (기간 종료 시 취소)' })
  async cancelSubscription(@CurrentUser() user: User) {
    await this.tossPaymentsService.cancelSubscription(user.id);
    return {
      success: true,
      message: '구독이 현재 기간 종료 시 취소됩니다.',
    };
  }

  @Delete('cancel-immediately')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '구독 즉시 취소' })
  async cancelSubscriptionImmediately(@CurrentUser() user: User) {
    await this.tossPaymentsService.cancelSubscriptionImmediately(user.id);
    return {
      success: true,
      message: '구독이 즉시 취소되었습니다.',
    };
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '결제 내역 조회' })
  async getPaymentHistory(
    @CurrentUser() user: User,
    @Query() query: PaymentHistoryQueryDto,
  ) {
    return this.tossPaymentsService.getPaymentHistory(
      user.id,
      query.page,
      query.limit,
    );
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '환불 요청' })
  async requestRefund(
    @CurrentUser() user: User,
    @Body() dto: RefundRequestDto,
  ) {
    return this.tossPaymentsService.requestRefund(
      user.id,
      dto.paymentId,
      dto.reason,
      dto.amount,
    );
  }

  @Get('refunds')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '환불 내역 조회' })
  async getRefundHistory(@CurrentUser() user: User) {
    return this.tossPaymentsService.getRefundHistory(user.id);
  }

  // ========== 무료 체험 관련 ==========

  @Post('trial/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '7일 무료 체험 시작',
    description: '카드 등록 없이 Professional 플랜을 7일간 무료로 체험할 수 있습니다. 1회만 사용 가능합니다.',
  })
  async startFreeTrial(@CurrentUser() user: User) {
    return this.tossPaymentsService.startFreeTrial(user.id);
  }

  @Get('trial/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '무료 체험 상태 조회',
    description: '현재 체험 중인지, 남은 기간, 체험 가능 여부를 확인합니다.',
  })
  async getTrialStatus(@CurrentUser() user: User) {
    return this.tossPaymentsService.getTrialStatus(user.id);
  }
}
