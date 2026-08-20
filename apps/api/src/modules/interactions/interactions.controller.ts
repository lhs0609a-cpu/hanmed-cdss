import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InteractionsService } from './interactions.service';

@ApiTags('interactions')
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post('check')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '약물-한약 상호작용 검사' })
  async checkInteractions(
    @Body()
    body: {
      herbs: string[];
      drugs: string[];
      /** 임신 여부. 넘기지 않으면 임신금기 판정을 하지 않는다. */
      pregnant?: boolean;
    },
  ) {
    return this.interactionsService.checkInteractions(
      body.herbs,
      body.drugs,
      body.pregnant === true,
    );
  }

  @Get('drug/:drugName')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 양약의 상호작용 목록 조회' })
  async findByDrug(@Param('drugName') drugName: string) {
    return this.interactionsService.findByDrug(drugName);
  }
}
