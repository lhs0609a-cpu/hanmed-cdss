import { Body, Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsArray, IsString } from 'class-validator';
import { SangamLearnerService } from './sangam-learner.service';

class EvaluateDraftDto {
  @IsString()
  clinicId: string;

  @IsArray()
  codes: string[];
}

@ApiTags('insurance')
@Controller('insurance/sangam')
export class SangamLearnerController {
  constructor(private readonly learner: SangamLearnerService) {}

  @Post('evaluate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: '청구 초안의 삭감 위험도 평가',
    description: '한의원의 과거 청구 이력 기반으로 위험도/사유/대응 제안을 반환',
  })
  @HttpCode(200)
  evaluate(@Request() req: any, @Body() dto: EvaluateDraftDto) {
    void req.user.id;
    return this.learner.evaluateDraft(dto);
  }
}
