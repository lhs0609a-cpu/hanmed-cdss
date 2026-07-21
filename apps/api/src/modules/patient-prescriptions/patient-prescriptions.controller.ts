import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PatientPrescriptionsService } from './patient-prescriptions.service';
import { PatientAuthGuard } from '../patient-auth/guards/patient-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { PractitionerRolesGuard } from '../auth/guards/practitioner-role.guard';
import { RequirePermission } from '../auth/guards/require-role.decorator';
import { Permission } from '../auth/permissions';
import {
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  GetPrescriptionsDto,
} from './dto';

@ApiTags('patient-prescriptions')
@Controller('patient-prescriptions')
export class PatientPrescriptionsController {
  constructor(
    private readonly prescriptionsService: PatientPrescriptionsService,
  ) {}

  // ===== 환자용 엔드포인트 =====

  @Get()
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 처방 목록 (환자용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async findMyPrescriptions(
    @Request() req: any,
    @Query() dto: GetPrescriptionsDto,
  ) {
    return this.prescriptionsService.findByPatient(req.user.id, dto);
  }

  @Get('active')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 복용 중인 처방 (환자용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async findActivePrescriptions(@Request() req: any) {
    return this.prescriptionsService.findActivePrescriptions(req.user.id);
  }

  @Get(':id')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '처방 상세 (환자용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '처방을 찾을 수 없음' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.prescriptionsService.findByIdForPatient(id, req.user.id);
  }

  @Get(':id/herbs/:herbName')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '약재 상세 정보 (환자용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getHerbDetail(
    @Param('id') id: string,
    @Param('herbName') herbName: string,
    @Request() req: any,
  ) {
    return this.prescriptionsService.getHerbDetail(id, herbName, req.user.id);
  }

  // ===== 의료진용 엔드포인트 =====

  @Post('clinic/:clinicId')
  @UseGuards(AuthGuard('jwt'), PractitionerRolesGuard)
  @RequirePermission(Permission.PRESCRIPTION_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '처방 생성 (의료진용)' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  async create(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(clinicId, dto);
  }

  // 라우트를 clinic 스코프로 변경 — PractitionerRolesGuard 가 URL 의 clinicId 로
  // 소속을 검증하고, 서비스가 clinicId 로 처방을 필터해 타 한의원 처방 수정을 차단(IDOR).
  @Patch('clinic/:clinicId/:id')
  @UseGuards(AuthGuard('jwt'), PractitionerRolesGuard)
  @RequirePermission(Permission.PRESCRIPTION_WRITE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '처방 수정 (의료진용)' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  async update(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionsService.update(id, clinicId, dto);
  }
}
