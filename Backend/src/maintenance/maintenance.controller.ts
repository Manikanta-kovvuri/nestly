import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles(Role.TENANT)
  create(
    @Body() createIssueDto: CreateIssueDto,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.maintenanceService.create(createIssueDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: { id: number; role: string }) {
    return this.maintenanceService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.maintenanceService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.OWNER, Role.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.maintenanceService.updateStatus(id, updateStatusDto, user);
  }
}
