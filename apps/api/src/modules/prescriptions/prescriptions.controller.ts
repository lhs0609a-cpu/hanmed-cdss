import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrescriptionsService } from './prescriptions.service';

@ApiTags('prescriptions')
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post('recommend')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 처방 추천 요청' })
  async getRecommendation(
    @Body()
    body: {
      patientAge?: number;
      patientGender?: string;
      constitution?: string;
      chiefComplaint: string;
      symptoms: Array<{ name: string; severity?: number }>;
      currentMedications?: string[];
    },
  ) {
    return this.prescriptionsService.getRecommendation(body);
  }

  @Post('check-interactions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '약물 상호작용 검사' })
  async checkInteractions(
    @Body()
    body: {
      herbs: string[];
      medications: string[];
    },
  ) {
    return this.prescriptionsService.checkInteractions(body.herbs, body.medications);
  }
}
