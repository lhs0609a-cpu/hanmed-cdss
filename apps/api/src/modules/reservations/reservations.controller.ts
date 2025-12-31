import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { PatientAuthGuard } from '../patient-auth/guards/patient-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import {
  CreateReservationDto,
  UpdateReservationDto,
  CancelReservationDto,
  ClinicUpdateReservationDto,
  GetReservationsDto,
} from './dto';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // ===== 환자용 엔드포인트 =====

  @Post()
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약 생성 (환자용)' })
  @ApiResponse({ status: 201, description: '예약 생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async create(@Request() req: any, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 예약 목록 (환자용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async findMyReservations(@Request() req: any, @Query() dto: GetReservationsDto) {
    return this.reservationsService.findByPatient(req.user.id, dto);
  }

  @Get('upcoming')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '다가오는 예약 조회 (환자용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getUpcoming(@Request() req: any) {
    return this.reservationsService.getUpcoming(req.user.id);
  }

  @Get(':id')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약 상세 조회 (환자용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '예약을 찾을 수 없음' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.reservationsService.findById(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약 변경 (환자용)' })
  @ApiResponse({ status: 200, description: '변경 성공' })
  @ApiResponse({ status: 400, description: '변경 불가' })
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(PatientAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약 취소 (환자용)' })
  @ApiResponse({ status: 200, description: '취소 성공' })
  async cancel(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CancelReservationDto,
  ) {
    return this.reservationsService.cancel(id, req.user.id, dto);
  }

  // ===== 한의원용 엔드포인트 =====

  @Get('clinic/:clinicId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '한의원 예약 목록 (의료진용)' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async findByClinic(
    @Param('clinicId') clinicId: string,
    @Query() dto: GetReservationsDto,
  ) {
    return this.reservationsService.findByClinic(clinicId, dto);
  }

  @Patch('clinic/:clinicId/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '예약 상태 변경 (의료진용)' })
  @ApiResponse({ status: 200, description: '변경 성공' })
  async clinicUpdate(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Body() dto: ClinicUpdateReservationDto,
  ) {
    return this.reservationsService.clinicUpdate(id, clinicId, dto);
  }
}
