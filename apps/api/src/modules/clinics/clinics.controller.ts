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
import { Public } from '../../common/decorators/public.decorator';
import { ClinicsService } from './clinics.service';
import { PatientAuthGuard } from '../patient-auth/guards/patient-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { SearchClinicsDto, GetAvailabilityDto, CreateClinicDto, UpdateClinicDto } from './dto';

@ApiTags('clinics')
@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '한의원 검색' })
  @ApiResponse({ status: 200, description: '검색 성공' })
  async search(@Query() dto: SearchClinicsDto) {
    return this.clinicsService.search(dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '한의원 상세 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '한의원을 찾을 수 없음' })
  async findById(@Param('id') id: string) {
    return this.clinicsService.findById(id);
  }

  @Public()
  @Get(':id/practitioners')
  @ApiOperation({ summary: '한의원 의료진 목록' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getPractitioners(@Param('id') id: string) {
    return this.clinicsService.getPractitioners(id);
  }

  @Public()
  @Get(':id/availability')
  @ApiOperation({ summary: '예약 가능 시간 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getAvailability(@Param('id') id: string, @Query() dto: GetAvailabilityDto) {
    return this.clinicsService.getAvailability(id, dto);
  }

  // 환자용 - 연결된 한의원 목록
  @Get('patient/my-clinics')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내가 연결된 한의원 목록 (환자용)' })
  async getPatientClinics(@Request() req: any) {
    return this.clinicsService.getPatientClinics(req.user.id);
  }

  // 환자용 - 한의원 연결
  @Post(':id/connect')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '한의원 연결 (환자용)' })
  async connectClinic(@Param('id') id: string, @Request() req: any) {
    return this.clinicsService.connectPatient(req.user.id, id);
  }

  // 의료진용 - 한의원 등록
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '한의원 등록 (의료진용)' })
  async create(@Request() req: any, @Body() dto: CreateClinicDto) {
    return this.clinicsService.create(req.user.id, dto);
  }

  // 의료진용 - 한의원 정보 수정
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '한의원 정보 수정 (의료진용)' })
  async update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.update(req.user.id, id, dto);
  }
}
