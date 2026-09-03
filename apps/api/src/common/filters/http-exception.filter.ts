import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorLogService } from '../services/error-log.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * 오류를 표에도 남긴다.
   *
   * 지금까지는 fly 로그에만 찍혔다. 로그는 흘러가고 원장은 볼 수 없어서
   * "어제 결제가 몇 건 실패했나" 에 아무도 답할 수 없었다.
   *
   * 없이도 돌아가야 한다. main.ts 에서 컨테이너가 준비되기 전에 필터를
   * 세우거나, 테스트에서 이 필터만 따로 만들 수 있기 때문이다.
   */
  constructor(private readonly errorLogs?: ErrorLogService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || 'Error';
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message: Array.isArray(message) ? message : [message],
    };

    // 표에 남긴다. 응답을 막지 않도록 기다리지 않는다.
    if (this.errorLogs?.shouldRecord(status, request.url)) {
      void this.errorLogs.record({
        statusCode: status,
        method: request.method,
        path: request.url,
        message: Array.isArray(message) ? message.join(' ') : String(message),
        stack: exception instanceof Error ? exception.stack : null,
        userId: (request as any).user?.id ?? null,
      });
    }

    // 개발 환경에서는 스택 트레이스 포함
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      (errorResponse as any).stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
