import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
  IsInt,
  IsUUID,
  IsIn,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { PartnerPlacement } from '../../database/entities/partner.entity';
import { PartnersService } from './partners.service';

class MatchPartnersDto {
  @IsEnum(PartnerPlacement)
  placement: PartnerPlacement;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  herbIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formulaIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

class LogEventDto {
  @IsUUID()
  partnerId: string;

  @IsEnum(PartnerPlacement)
  placement: PartnerPlacement;

  @IsOptional()
  @IsIn(['impression', 'click'])
  eventType?: 'impression' | 'click';

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

@ApiTags('partners')
@Controller('partners')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post('match')
  @ApiOperation({ summary: '특정 placement·매칭 기준에 해당하는 파트너 후보 조회' })
  async match(@CurrentUser() _user: User, @Body() dto: MatchPartnersDto) {
    const partners = await this.partnersService.findCandidates(dto);
    return {
      partners: partners.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        logoUrl: p.logoUrl,
        landingUrl: p.landingUrl,
        headline: p.headline,
        description: p.description,
      })),
    };
  }

  @Post('event')
  @ApiOperation({ summary: '파트너 노출/클릭 이벤트 로깅' })
  async logEvent(@CurrentUser() user: User, @Body() dto: LogEventDto) {
    await this.partnersService.logImpression({
      partnerId: dto.partnerId,
      userId: user.id,
      placement: dto.placement,
      eventType: dto.eventType,
      context: dto.context,
    });
    return { success: true };
  }

  @Get('stats')
  @ApiOperation({ summary: '카테고리별 활성 파트너 수 (운영용)' })
  async stats() {
    return this.partnersService.statsByCategory();
  }
}
