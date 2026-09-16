import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
  Patch,
  Param,
  Request,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Throttle } from '@nestjs/throttler';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from '../../database/entities/analytics-event.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminOnly } from '../../common/decorators/roles.decorator';
import { parseGrowthEvents } from './growth-events';
import { GrowthService } from './growth.service';
import { GrowthLiveService } from './growth-live.service';

@Controller('analytics/growth')
export class GrowthEventsController {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly events: Repository<AnalyticsEvent>,
  ) {}

  @Post('events')
  @HttpCode(200)
  @Throttle({
    short: { limit: 10, ttl: 1000 },
    long: { limit: 120, ttl: 60000 },
  })
  async collect(@Body() body: unknown) {
    const rows = parseGrowthEvents(body);
    // Stable client UUIDs make retry/pagehide delivery idempotent.
    await this.events
      .createQueryBuilder()
      .insert()
      .values(rows)
      .orIgnore()
      .execute();
    return { accepted: rows.length };
  }
}

@Controller('admin/growth')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
export class AdminGrowthController {
  constructor(private readonly growth: GrowthService, private readonly liveGrowth: GrowthLiveService) {}
  @Get('live')
  live() { return this.liveGrowth.live(); }

  @Get('insights')
  insights(@Query('status') status = '') { return this.liveGrowth.insights(status); }

  @Patch('insights/:id')
  update(@Param('id') id: string, @Body() body: unknown, @Request() req: any) {
    return this.liveGrowth.update(id, body, req.user.id);
  }

  @Get('insights/:id/audit')
  audit(@Param('id') id: string) { return this.liveGrowth.audit(id); }

  @Get()
  report(
    @Query('days') days = '7',
    @Query('source') source = '',
    @Query('device') device = '',
  ) {
    return this.growth.report(days, source, device);
  }
}
