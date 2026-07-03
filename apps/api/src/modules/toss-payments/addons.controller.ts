import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { AddonKey } from '../../database/entities/subscription-addon.entity';
import { BillingInterval } from '../../database/entities/subscription.entity';
import { AddonsService } from './addons.service';

class SubscribeAddonDto {
  @IsEnum(AddonKey)
  addonKey: AddonKey;

  @IsEnum(BillingInterval)
  interval: BillingInterval;
}

@ApiTags('subscription-addons')
@Controller('subscription/addons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddonsController {
  constructor(private readonly addonsService: AddonsService) {}

  @Get()
  @ApiOperation({ summary: '현재 사용자의 부가서비스 목록' })
  async list(@CurrentUser() user: User) {
    const addons = await this.addonsService.listForUser(user.id);
    return { addons };
  }

  @Post()
  @ApiOperation({ summary: '부가서비스 구독 (보험청구 등)' })
  async subscribe(@CurrentUser() user: User, @Body() dto: SubscribeAddonDto) {
    const addon = await this.addonsService.subscribe(user.id, dto.addonKey, dto.interval);
    return { success: true, addon };
  }

  @Delete(':addonKey')
  @ApiOperation({ summary: '부가서비스 해지 (기간 종료 시)' })
  async cancel(
    @CurrentUser() user: User,
    @Param('addonKey') addonKey: AddonKey,
    @Query('immediate') immediate?: string,
  ) {
    const addon = await this.addonsService.cancel(
      user.id,
      addonKey,
      immediate === 'true',
    );
    return { success: true, addon };
  }
}
