import { Module } from '@nestjs/common';
import { KakaoBizService } from './kakao-biz.service';
import { KakaoBizController } from './kakao-biz.controller';

@Module({
  providers: [KakaoBizService],
  controllers: [KakaoBizController],
  exports: [KakaoBizService],
})
export class NotificationsModule {}
