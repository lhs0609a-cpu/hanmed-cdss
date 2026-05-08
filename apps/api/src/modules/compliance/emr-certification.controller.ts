import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { EmrCertificationService } from './emr-certification.service';

@ApiTags('compliance')
@Controller('compliance/emr-certification')
export class EmrCertificationController {
  constructor(private readonly service: EmrCertificationService) {}

  @Get('readiness')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '전자의무기록 인증 자가 진단 — 코드 베이스 자동 점검',
    description: '관리자만 접근. 12개 영역의 충족도와 미흡 사유, 다음 액션 목록을 반환.',
  })
  async readiness() {
    return this.service.run();
  }
}
