import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface SentryClient {
  captureException: (error: Error, options?: any) => string;
  setUser: (user: { id: string; email?: string } | null) => void;
  setContext: (name: string, context: Record<string, any>) => void;
}

// Dynamic import for Sentry (optional dependency)
let Sentry: SentryClient | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sentry = require('@sentry/node');
} catch {
  // Sentry not installed - will use fallback logging
}

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Only report 5xx errors to Sentry
    if (status >= 500) {
      this.reportToSentry(exception, request);
    }

    // Log all errors
    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }

  private reportToSentry(exception: unknown, request: Request) {
    if (!Sentry) {
      return;
    }

    const error = exception instanceof Error ? exception : new Error(String(exception));

    // Set user context if available
    const user = (request as any).user;
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
      });
    }

    // Set request context
    Sentry.setContext('request', {
      method: request.method,
      url: request.url,
      headers: {
        'user-agent': request.headers['user-agent'],
        'content-type': request.headers['content-type'],
      },
      query: request.query,
      body: this.sanitizeBody(request.body),
    });

    // Capture the exception
    Sentry.captureException(error, {
      tags: {
        environment: process.env.NODE_ENV || 'development',
        service: 'hanmed-api',
      },
    });
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    // Remove sensitive fields
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
