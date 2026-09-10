import { Module } from '@nestjs/common';
import { PublicStatsController } from './public-stats.controller';
import { PublicStatsService } from './public-stats.service';

/**
 * 홈페이지 지표. CacheService 는 @Global 이라 따로 가져오지 않는다.
 * 집계는 COUNT(*) 뿐이라 엔티티를 등록할 필요 없이 DataSource 만 쓴다.
 */
@Module({
  controllers: [PublicStatsController],
  providers: [PublicStatsService],
  exports: [PublicStatsService],
})
export class StatsModule {}
