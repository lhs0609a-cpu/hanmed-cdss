import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('서버 초기화 중... (v1.1.0 - Admin Seeder 포함)');

  // 프로덕션 필수 환경변수 검증
  if (process.env.NODE_ENV === 'production') {
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'REFRESH_TOKEN_SECRET',
      'ENCRYPTION_KEY',
      'TOSS_SECRET_KEY',
    ];
    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      logger.error(`필수 환경변수 누락: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // 웹훅을 위한 raw body 파싱 활성화
  });

  // CORS 설정
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = [
    // localhost는 개발 환경에서만 허용
    ...(isProduction ? [] : ['http://localhost:3000', 'http://localhost:5173']),
    'https://hanmed-cdss.vercel.app',
    'https://ongojisin.co.kr',
    'https://www.ongojisin.co.kr',
    process.env.CORS_ORIGIN,
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 전역 prefix
  app.setGlobalPrefix('api/v1');

  // 전역 필터 및 인터셉터
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('온고지신 AI API')
    .setDescription('한의학 임상 의사결정 지원 시스템 API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', '인증')
    .addTag('users', '사용자 관리')
    .addTag('patients', '환자 관리')
    .addTag('cases', '치험례')
    .addTag('prescriptions', '처방')
    .addTag('interactions', '상호작용 검증')
    .addTag('subscription', '구독 관리')
    .addTag('webhook', '웹훅')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`온고지신 AI API 서버가 포트 ${port}에서 실행 중입니다.`);
  logger.log(`API 문서: http://localhost:${port}/api/docs`);
}

bootstrap();
