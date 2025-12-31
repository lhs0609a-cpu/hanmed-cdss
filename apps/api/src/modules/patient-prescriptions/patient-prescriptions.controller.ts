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
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '처방 생성 (의료진용)' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  async create(
    @Param('clinicId') clinicId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(clinicId, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '처방 수정 (의료진용)' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  async update(@Param('id') id: string, @Body() dto: UpdatePrescriptionDto) {
    return this.prescriptionsService.update(id, dto);
  }
}
