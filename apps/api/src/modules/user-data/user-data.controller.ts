import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserDataService } from './user-data.service';

@ApiTags('user-data')
@Controller('user-data')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UserDataController {
  constructor(private readonly userDataService: UserDataService) {}

  @Get(':key')
  @ApiOperation({
    summary: '클라우드 데이터 조회',
    description: '특정 키의 클라우드 저장 데이터를 조회합니다. Pro 플랜 이상 필요.',
  })
  @ApiParam({
    name: 'key',
    description: '데이터 키 (예: pulse_diagnosis_records)',
    example: 'pulse_diagnosis_records',
  })
  @ApiResponse({
    status: 200,
    description: '데이터 조회 성공',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          nullable: true,
          properties: {
            key: { type: 'string' },
            data: { type: 'object' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: '플랜 제한 (Pro 이상 필요)' })
  @ApiResponse({ status: 400, description: '유효하지 않은 데이터 키' })
  async getData(@Request() req: any, @Param('key') key: string) {
    const result = await this.userDataService.getData(req.user.id, key);

    return {
      data: result
        ? {
            key: result.dataKey,
            data: result.data,
            updatedAt: result.updatedAt.toISOString(),
          }
        : null,
    };
  }

  @Put(':key')
  @ApiOperation({
    summary: '클라우드 데이터 저장',
    description: '데이터를 클라우드에 저장합니다. Pro 플랜 이상 필요.',
  })
  @ApiParam({
    name: 'key',
    description: '데이터 키',
    example: 'pulse_diagnosis_records',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: '저장할 데이터 (JSON)',
        },
      },
      required: ['data'],
    },
  })
  @ApiResponse({ status: 200, description: '저장 성공' })
  @ApiResponse({ status: 400, description: '용량 초과 또는 유효하지 않은 키' })
  @ApiResponse({ status: 403, description: '플랜 제한' })
  async saveData(
    @Request() req: any,
    @Param('key') key: string,
    @Body() body: { data: unknown },
  ) {
    const result = await this.userDataService.saveData(
      req.user.id,
      key,
      body.data,
    );

    return {
      success: true,
      message: '데이터가 클라우드에 저장되었습니다.',
      updatedAt: result.updatedAt.toISOString(),
      dataSize: result.dataSize,
    };
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '클라우드 데이터 삭제',
    description: '특정 키의 클라우드 데이터를 삭제합니다.',
  })
  @ApiParam({ name: 'key', description: '데이터 키' })
  @ApiResponse({ status: 204, description: '삭제 성공' })
  async deleteData(@Request() req: any, @Param('key') key: string) {
    await this.userDataService.deleteData(req.user.id, key);
  }

  @Get()
  @ApiOperation({
    summary: '모든 클라우드 데이터 목록 조회',
    description: '사용자의 모든 클라우드 저장 데이터 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '목록 조회 성공',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              data: { type: 'object' },
              updatedAt: { type: 'string' },
              dataSize: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getAllData(@Request() req: any) {
    const results = await this.userDataService.getAllData(req.user.id);

    return {
      data: results.map((item) => ({
        key: item.dataKey,
        data: item.data,
        updatedAt: item.updatedAt,
        dataSize: item.dataSize,
      })),
    };
  }

  @Get('usage/summary')
  @ApiOperation({
    summary: '클라우드 사용량 요약',
    description: '클라우드 저장 용량 사용량을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용량 조회 성공',
    schema: {
      type: 'object',
      properties: {
        totalUsed: { type: 'number', description: '총 사용량 (bytes)' },
        limit: { type: 'number', description: '용량 한도 (bytes)' },
        percentage: { type: 'number', description: '사용률 (%)' },
        byKey: {
          type: 'object',
          description: '키별 사용량',
          additionalProperties: { type: 'number' },
        },
      },
    },
  })
  async getUsageSummary(@Request() req: any) {
    return this.userDataService.getUsageSummary(req.user.id);
  }
}
