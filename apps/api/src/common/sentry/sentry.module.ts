import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({})
export class SentryModule implements OnModuleInit {
  private readonly logger = new Logger(SentryModule.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');

    if (!dsn) {
      this.logger.warn('SENTRY_DSN not configured. Error tracking disabled.');
      return;
    }

    try {
      // Dynamic import to avoid errors if Sentry is not installed
      const Sentry = await import('@sentry/node');

      Sentry.init({
        dsn,
        environment: this.configService.get<string>('NODE_ENV') || 'development',
        release: `hanmed-api@${process.env.npm_package_version || '1.0.0'}`,

        // Performance monitoring
        tracesSampleRate: this.configService.get<string>('NODE_ENV') === 'production' ? 0.1 : 1.0,

        // Filtering
        beforeSend(event, hint) {
          // Filter out non-critical errors in development
          if (process.env.NODE_ENV === 'development') {
            const error = hint.originalException;
            if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
              return null; // Don't send connection errors in dev
            }
          }
          return event;
        },

        // Integrations
        integrations: [
          Sentry.httpIntegration({ tracing: true }),
        ],

        // Ignore common non-critical errors
        ignoreErrors: [
          'ECONNREFUSED',
          'ECONNRESET',
          'ETIMEDOUT',
          'NotFoundException',
          'UnauthorizedException',
          'ForbiddenException',
        ],
      });

      this.logger.log('Sentry initialized successfully');
    } catch (error) {
      this.logger.warn('Failed to initialize Sentry:', error);
    }
  }
}
