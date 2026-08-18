import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { validate } from './config/env.validation';

import { AuthModule } from './auth/auth.module';
import { PropertyModule } from './property/property.module';
import { UnitModule } from './unit/unit.module';
import { TenantModule } from './tenant/tenant.module';
import { LeaseModule } from './lease/lease.module';
import { PaymentModule } from './payment/payment.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { DashboardModule } from './dashboard/dashboard.module';

/**
 * AppModule — root module of the Nestly backend.
 *
 * ConfigModule is loaded globally so every feature module can inject
 * ConfigService without importing ConfigModule again.
 *
 * PrismaModule is declared @Global in its own definition, so it is also
 * available to all feature modules through this single import.
 *
 * Feature modules (auth, property, unit, tenant, lease, payment,
 * maintenance, invoice, notification, dashboard) will be added here
 * as they are implemented in subsequent milestones.
 */
@Module({
  imports: [
    // ─── Configuration ───────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    // ─── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),

    // ─── Database ─────────────────────────────────────────────────────────────
    PrismaModule,

    // ─── Feature modules (added per milestone) ────────────────────────────────
    AuthModule,
    // UserModule,
    PropertyModule,
    UnitModule,
    TenantModule,
    LeaseModule,
    PaymentModule,
    MaintenanceModule,
    // InvoiceModule,
    // NotificationModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
