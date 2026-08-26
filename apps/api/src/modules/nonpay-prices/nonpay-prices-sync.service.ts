import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NonPayPrice } from '../../database/entities/nonpay-price.entity';
import { fetchAllItems, toRows } from './nonpay-sync';

/**
 * 심평원 비급여 가격 월 1회 갱신.
 *
 * 지금까지는 시드 스크립트를 사람이 직접 돌려야 했다. 원자료는 월 1회 바뀌는데
 * 우리 쪽은 아무도 돌리지 않으면 그대로 멈춰 있고, 화면에는 오래된 값이 아무
 * 표시 없이 계속 떠 있었다. "한약 값이 비싸서" 가 복용 의향이 없는 이유 1위인데
 * 그 답으로 내놓는 숫자가 언제 것인지 모르면 안 된다.
 *
 * 상류가 느리고(요청당 50초쯤) 자주 504 를 내서 한 번 도는 데 몇 분 걸린다.
 * 월 1회라 그 비용은 감당할 만하다. 키가 없으면 아무 일도 하지 않는다 —
 * 조용히 실패하는 대신 로그를 남긴다.
 */
@Injectable()
export class NonPayPricesSyncService {
  private readonly logger = new Logger(NonPayPricesSyncService.name);
  private running = false;

  constructor(
    @InjectRepository(NonPayPrice)
    private readonly prices: Repository<NonPayPrice>,
  ) {}

  private apiKey(): string | null {
    return (
      process.env.HIRA_NONPAY_API_KEY || process.env.PUBLIC_DATA_API_KEY || null
    );
  }

  /** 매월 5일 새벽 4시(KST). 심평원 갱신이 월 1회라 그 뒤에 한 번 받는다. */
  @Cron('0 0 4 5 * *', {
    name: 'nonpay-prices-sync',
    timeZone: 'Asia/Seoul',
  })
  async runMonthly(): Promise<void> {
    const key = this.apiKey();
    if (!key) {
      this.logger.warn(
        '심평원 비급여 가격 갱신을 건너뜁니다 — HIRA_NONPAY_API_KEY 미설정.',
      );
      return;
    }
    try {
      const saved = await this.sync(key);
      this.logger.log(`심평원 비급여 가격 ${saved}건 갱신`);
    } catch (e) {
      this.logger.error(`심평원 비급여 가격 갱신 실패: ${(e as Error).message}`);
    }
  }

  /** 받아서 코드 기준으로 upsert 한다. 값이 같으면 덮어써도 결과가 같다. */
  async sync(key: string): Promise<number> {
    // 몇 분씩 걸리는 작업이라 겹쳐 돌면 상류를 두 배로 두드린다.
    if (this.running) {
      this.logger.warn('이미 갱신이 돌고 있어 이번 실행은 건너뜁니다.');
      return 0;
    }
    this.running = true;
    try {
      const items = await fetchAllItems(key, (m) => this.logger.debug(m));
      const rows = toRows(items);
      this.logger.log(`수신 ${items.length}건 중 한방 항목 ${rows.length}건`);

      let saved = 0;
      for (const payload of rows) {
        const existing = await this.prices.findOne({
          where: { code: payload.code },
        });
        await this.prices.save(
          existing
            ? Object.assign(existing, payload)
            : this.prices.create(payload),
        );
        saved++;
      }
      return saved;
    } finally {
      this.running = false;
    }
  }
}
