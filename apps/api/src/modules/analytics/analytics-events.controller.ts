import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';

interface IncomingEvent {
  type: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
  sessionId?: string;
  userTier?: string;
  userAgent?: string;
  screenSize?: string;
  locale?: string;
}

/**
 * 사용 이벤트 수집.
 *
 * 왜 컨트롤러를 따로 뒀나. 원래 이 경로는 AnalyticsController 안에 있었고,
 * 그 컨트롤러 전체에 `@RequireFeature(STATS_BASIC)` 이 걸려 있었다. 진료
 * 통계를 유료 기능으로 두는 것은 맞지만, 그 게이트가 사용 이벤트 수집까지
 * 막고 있었다 — 무료 사용자의 화면 이동은 한 건도 기록되지 않았다는 뜻이다.
 * 리텐션을 재려면 떠난 사람의 흔적이 있어야 하는데, 그 사람들은 대개 무료
 * 사용자다. 가장 필요한 데이터가 가장 확실하게 빠져 있었다.
 *
 * userId 를 클라이언트에서 받지 않는다.
 *
 * 예전에는 화면이 사용자 id 를 해시해서 보냈다(PII 를 줄이려는 의도). 그런데
 * analytics_events.userId 는 uuid 컬럼이라 해시 문자열이 들어오면 INSERT 가
 * 통째로 실패했고, 실패는 "비크리티컬" 이라며 조용히 삼켜졌다. 표가 비어 있던
 * 진짜 이유가 이것이다.
 *
 * 토큰이 이미 누구인지 알려 주므로 서버가 채운다. 해시는 어차피 우리 DB
 * 안에서 우리 사용자를 가리키는 값이라 가명처리로서 얻는 것도 없었다.
 */
@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsEventsController {
  private readonly logger = new Logger(AnalyticsEventsController.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly eventRepository: Repository<AnalyticsEvent>,
  ) {}

  @Post('events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '사용 이벤트 수집 (요금제 무관)' })
  async collect(@Request() req, @Body() body: { events: IncomingEvent[] }) {
    const events = body?.events;
    if (!events || !Array.isArray(events)) {
      return { success: false, message: 'Invalid events format' };
    }

    // 한 번에 받는 양을 막는다. 버퍼가 밀려 수천 건이 한 번에 올 수 있다.
    const capped = events.slice(0, 200);

    try {
      const rows = capped.map((e) =>
        this.eventRepository.create({
          type: String(e.type ?? 'unknown').slice(0, 60),
          properties: (e.properties as Record<string, unknown>) || {},
          userId: req.user?.id ?? null,
          userTier: req.user?.subscriptionTier ?? e.userTier ?? null,
          sessionId: e.sessionId ?? null,
          userAgent: e.userAgent ? String(e.userAgent).slice(0, 500) : null,
          screenSize: e.screenSize ?? null,
          locale: e.locale ?? null,
          occurredAt: e.timestamp ? new Date(e.timestamp) : new Date(),
        }),
      );
      await this.eventRepository.save(rows, { chunk: 100 });
    } catch (error) {
      // 분석 이벤트 하나가 화면을 멈추게 하지 않는다. 다만 조용히 넘기지는
      // 않는다 — 예전에 그렇게 삼킨 것 때문에 표가 몇 달 비어 있었다.
      this.logger.error(
        `이벤트 저장 실패 (${capped.length}건): ${(error as Error).message}`,
      );
    }

    return { success: true, received: capped.length };
  }
}
