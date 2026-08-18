import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('owner')
  @Roles(Role.OWNER)
  getOwnerDashboard(@CurrentUser() user: { id: number; role: string }) {
    return this.dashboardService.getOwnerDashboard(user.id);
  }

  @Get('tenant')
  @Roles(Role.TENANT)
  getTenantDashboard(@CurrentUser() user: { id: number; role: string }) {
    return this.dashboardService.getTenantDashboard(user.id);
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }
}
