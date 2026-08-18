import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps PrismaClient and ties its lifecycle to the NestJS
 * module lifecycle. The $connect / $disconnect calls ensure the connection
 * pool is managed correctly in both dev and production environments.
 *
 * This is a shared, global singleton — never instantiate PrismaClient
 * directly in feature services.
 *
 * Connection handling:
 *   - In development/test without a database: $connect() will fail gracefully
 *     and log a warning. The app will still start so non-DB routes (e.g. /health)
 *     remain accessible.
 *   - In production: if DATABASE_URL is incorrect, the error is re-thrown to
 *     fail the deployment early.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL via Prisma');
    } catch (error) {
      // In development without a database configured, log a warning and
      // continue — non-database routes (e.g. GET /health) will still work.
      // In production, DATABASE_URL must be correctly set, so fail the app.
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          `Database connection failed: ${(error as Error).message}`,
        );
        throw error;
      }
      this.logger.warn(
        `Database connection failed: ${(error as Error).message}. ` +
          'Non-database routes will still function. ' +
          'Set DATABASE_URL in .env to enable database features.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
