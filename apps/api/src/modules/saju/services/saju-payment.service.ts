import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { SajuPurchase, SajuPurchaseStatus } from '../../../database/entities/saju-purchase.entity';
import { SajuReport, SajuReportTier, SajuReportStatus } from '../../../database/entities/saju-report.entity';
import { SAJU_PRICES, SAJU_PRODUCT_NAMES, CONSTITUTION_KO } from '../types/saju-report.types';
import { SajuCalculationService } from './saju-calculation.service';
import { CreateSajuOrderDto, ConfirmSajuPaymentDto } from '../dto';

interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  card?: {
    company: string;
    number: string;
    receiptUrl: string;
  };
  receipt?: {
    url: string;
  };
}

@Injectable()
export class SajuPaymentService {
  private readonly logger = new Logger(SajuPaymentService.name);
  private readonly apiUrl = 'https://api.tosspayments.com/v1';
  private readonly secretKey: string;
  private readonly clientKey: string;

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private calculationService: SajuCalculationService,
    @InjectRepository(SajuPurchase)
    private purchaseRepository: Repository<SajuPurchase>,
    @InjectRepository(SajuReport)
    private reportRepository: Repository<SajuReport>,
  ) {
    this.secretKey = this.configService.get('TOSS_SECRET_KEY') || '';
    this.clientKey = this.configService.get('TOSS_CLIENT_KEY') || '';
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`;
  }

  /** 상품 목록 조회 */
  getProducts() {
    return {
      products: [
        {
          tier: SajuReportTier.MINI,
          name: SAJU_PRODUCT_NAMES[SajuReportTier.MINI],
          price: SAJU_PRICES[SajuReportTier.MINI],
          sectionCount: 3,
          features: ['사주 개요 분석', '건강 체질 진단', '올해 운세'],
        },
        {
          tier: SajuReportTier.STANDARD,
          name: SAJU_PRODUCT_NAMES[SajuReportTier.STANDARD],
          price: SAJU_PRICES[SajuReportTier.STANDARD],
          sectionCount: 6,
          features: ['사주 개요', '성격 DNA', '건강 체질 정밀진단', '직업 & 재물운', '대인관계 & 궁합', '올해 운세'],
          badge: '인기',
        },
        {
          tier: SajuReportTier.PREMIUM,
          name: SAJU_PRODUCT_NAMES[SajuReportTier.PREMIUM],
          price: SAJU_PRICES[SajuReportTier.PREMIUM],
          sectionCount: 8,
          features: ['스탠다드 전체 포함', '12개월 월별운세', '종합 조언 & 개운법', 'AI 일러스트', 'PDF 리포트'],
          badge: '추천',
        },
      ],
    };
  }

  /** Toss 클라이언트키 */
  getClientKey() {
    return this.clientKey;
  }

  /** 주문 생성 */
  async createOrder(dto: CreateSajuOrderDto) {
    const price = SAJU_PRICES[dto.tier];
    if (!price) {
      throw new BadRequestException('유효하지 않은 상품 티어입니다.');
    }

    const orderId = `SAJU_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const orderName = SAJU_PRODUCT_NAMES[dto.tier];

    // 사주 계산
    const { saju, balance, health } = this.calculationService.analyzeProfile(
      dto.birthDate,
      dto.birthHour,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Purchase 생성
      const purchase = queryRunner.manager.create(SajuPurchase, {
        userId: dto.userId || null,
        orderId,
        orderName,
        amount: price,
        status: SajuPurchaseStatus.PENDING,
        customerEmail: dto.email || null,
        customerName: dto.name,
      });
      await queryRunner.manager.save(purchase);

      // Report 생성 (결제 대기 상태)
      const report = queryRunner.manager.create(SajuReport, {
        userId: dto.userId || null,
        purchaseId: purchase.id,
        name: dto.name,
        birthDate: dto.birthDate,
        birthHour: dto.birthHour ?? null,
        gender: dto.gender || null,
        sajuData: saju as any,
        elementBalance: balance as any,
        constitution: CONSTITUTION_KO[health.constitution] ?? health.constitution,
        dominantElement: health.dominantElement,
        weakElement: health.weakElement,
        tier: dto.tier,
        status: SajuReportStatus.PENDING_PAYMENT,
        completedSections: 0,
        totalSections: dto.tier === SajuReportTier.MINI ? 3 :
                        dto.tier === SajuReportTier.STANDARD ? 6 : 8,
        accessToken: uuidv4(),
      });
      await queryRunner.manager.save(report);

      await queryRunner.commitTransaction();

      return {
        orderId,
        orderName,
        amount: price,
        clientKey: this.clientKey,
        reportId: report.id,
        purchaseId: purchase.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('주문 생성 실패', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** 결제 승인 (Toss confirm API) */
  async confirmPayment(dto: ConfirmSajuPaymentDto) {
    // 주문 조회
    const purchase = await this.purchaseRepository.findOne({
      where: { orderId: dto.orderId },
    });

    if (!purchase) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    // 멱등성 체크
    if (purchase.status === SajuPurchaseStatus.PAID) {
      const report = await this.reportRepository.findOne({
        where: { purchaseId: purchase.id },
      });
      return {
        success: true,
        message: '이미 결제 완료된 주문입니다.',
        reportId: report?.id,
        accessToken: report?.accessToken,
      };
    }

    // 금액 검증
    if (purchase.amount !== dto.amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Toss API 호출
      const response = await axios.post<TossConfirmResponse>(
        `${this.apiUrl}/payments/confirm`,
        {
          paymentKey: dto.paymentKey,
          orderId: dto.orderId,
          amount: dto.amount,
        },
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        },
      );

      const tossResult = response.data;

      // Purchase 업데이트
      await queryRunner.manager.update(SajuPurchase, purchase.id, {
        paymentKey: tossResult.paymentKey,
        status: SajuPurchaseStatus.PAID,
        paidAt: new Date(),
        cardCompany: tossResult.card?.company || null,
        cardNumber: tossResult.card?.number || null,
        receiptUrl: tossResult.receipt?.url || tossResult.card?.receiptUrl || null,
      });

      // Report 상태를 generating으로 변경
      const report = await queryRunner.manager.findOne(SajuReport, {
        where: { purchaseId: purchase.id },
      });

      if (report) {
        await queryRunner.manager.update(SajuReport, report.id, {
          status: SajuReportStatus.GENERATING,
          generationStartedAt: new Date(),
        });
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: '결제가 완료되었습니다.',
        reportId: report?.id,
        accessToken: report?.accessToken,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Purchase 실패 기록
      if (axios.isAxiosError(error) && error.response?.data) {
        const tossError = error.response.data;
        await this.purchaseRepository.update(purchase.id, {
          status: SajuPurchaseStatus.FAILED,
          failureCode: tossError.code || 'UNKNOWN',
          failureMessage: tossError.message || '결제 처리 중 오류가 발생했습니다.',
        });
      }

      this.logger.error('결제 승인 실패', error);
      throw new BadRequestException('결제 처리 중 오류가 발생했습니다.');
    } finally {
      await queryRunner.release();
    }
  }
}
