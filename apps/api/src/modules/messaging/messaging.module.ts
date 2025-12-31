import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { SmsService } from './services/sms.service';
import { KakaoService } from './services/kakao.service';
import { PushService } from './services/push.service';

@Global()
@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [
    MessagingService,
    SmsService,
    KakaoService,
    PushService,
  ],
  exports: [MessagingService, SmsService, KakaoService, PushService],
})
export class MessagingModule {}
