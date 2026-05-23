import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { PatientsService } from './patients.service';

type AuthedRequest = Request & { user: { id: string } };

@ApiTags('patients')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('session')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '환자 진료 세션 생성' })
  createSession(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      age?: number;
      gender?: string;
      constitution?: string;
      chiefComplaint?: string;
      currentMedications?: string[];
    },
  ) {
    return this.patientsService.createSession(body, req.user.id);
  }

  @Get('session/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '진료 세션 조회' })
  getSession(@Req() req: AuthedRequest, @Param('sessionId') sessionId: string) {
    return this.patientsService.getSession(sessionId, req.user.id);
  }

  @Put('session/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '진료 세션 업데이트' })
  updateSession(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: any,
  ) {
    return this.patientsService.updateSession(sessionId, body, req.user.id);
  }

  @Delete('session/:sessionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '진료 세션 삭제' })
  async deleteSession(@Req() req: AuthedRequest, @Param('sessionId') sessionId: string) {
    return { deleted: await this.patientsService.deleteSession(sessionId, req.user.id) };
  }
}
