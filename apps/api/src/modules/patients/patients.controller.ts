import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('session')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '환자 진료 세션 생성' })
  createSession(
    @Body()
    body: {
      age?: number;
      gender?: string;
      constitution?: string;
      chiefComplaint?: string;
      currentMedications?: string[];
    },
  ) {
    return this.patientsService.createSession(body);
  }

  @Get('session/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '진료 세션 조회' })
  getSession(@Param('sessionId') sessionId: string) {
    return this.patientsService.getSession(sessionId);
  }

  @Put('session/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '진료 세션 업데이트' })
  updateSession(
    @Param('sessionId') sessionId: string,
    @Body() body: any,
  ) {
    return this.patientsService.updateSession(sessionId, body);
  }

  @Delete('session/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '진료 세션 삭제' })
  deleteSession(@Param('sessionId') sessionId: string) {
    return { deleted: this.patientsService.deleteSession(sessionId) };
  }
}
