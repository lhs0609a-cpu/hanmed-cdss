import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import {
  PractitionerCasesService,
  UpsertMyCaseInput,
} from './practitioner-cases.service';

type AuthedRequest = Request & { user: { id: string } };

/** 한의사 본인 치험례. JWT 필수이며 서비스 계층에서 소유자로 스코프된다. */
@ApiTags('my-cases')
@Controller('my-cases')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PractitionerCasesController {
  constructor(private readonly service: PractitionerCasesService) {}

  @Get()
  @ApiOperation({ summary: '내 치험례 목록' })
  list(@Req() req: AuthedRequest) {
    return this.service.list(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: '치험례 작성' })
  create(@Req() req: AuthedRequest, @Body() body: UpsertMyCaseInput) {
    return this.service.create(req.user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '치험례 수정' })
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<UpsertMyCaseInput>,
  ) {
    return this.service.update(req.user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '치험례 삭제' })
  remove(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(req.user.id, id);
  }
}
