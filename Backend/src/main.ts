import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:5173',
  );

  // ─── Security Headers & Payload Limits ──────────────────────────────────────
  app.use(helmet());
  app.use(express.json({ limit: '10mb' }));

  // Enable trust proxy so rate limiting accurately tracks client IPs behind PaaS/Reverse proxies
  const expressInstance = app
    .getHttpAdapter()
    .getInstance() as express.Application;
  expressInstance.set('trust proxy', 1);

  // ─── CORS ───────────────────────────────────────────────────────────────────
  // Restrict to the configured frontend origin — do not use wildcard in production.
  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── Global Validation ──────────────────────────────────────────────────────
  // - whitelist: strips unknown properties from incoming DTOs
  // - forbidNonWhitelisted: throws 400 if unknown properties are present
  // - transform: auto-coerces query/body params to their DTO types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Prefix ──────────────────────────────────────────────────────────
  // All API routes are prefixed with /api/v1 except the health endpoint.
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // ─── Global Filters ─────────────────────────────────────────────────────────
  app.useGlobalFilters(new PrismaClientExceptionFilter());

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Nestly API running on: http://localhost:${port}`);
  logger.log(`📡 CORS allowed origin: ${frontendUrl}`);
  logger.log(`🔍 Health check: http://localhost:${port}/health`);
}

void bootstrap();
