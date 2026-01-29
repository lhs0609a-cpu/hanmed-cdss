import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../database/entities/enums';
import { AdminClinicsService } from '../services/admin-clinics.service';
import {
  GetClinicsQueryDto,
  UpdateClinicDto,
  VerifyClinicDto,
  RejectClinicDto,
} from '../dto/admin-clinic.dto';

@Controller('admin/clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminClinicsController {
  constructor(private readonly clinicsService: AdminClinicsService) {}

  @Get()
  async findAll(@Query() query: GetClinicsQueryDto) {
    return this.clinicsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.clinicsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClinicDto,
    @Request() req: any,
  ) {
    return this.clinicsService.update(id, dto, req.user.id);
  }

  @Post(':id/verify')
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyClinicDto,
    @Request() req: any,
  ) {
    return this.clinicsService.verify(id, req.user.id, dto.notes);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectClinicDto,
    @Request() req: any,
  ) {
    return this.clinicsService.reject(id, req.user.id, dto.reason);
  }
}
