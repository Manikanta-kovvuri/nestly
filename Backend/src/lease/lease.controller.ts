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
import { LeaseService } from './lease.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leases')
export class LeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  create(
    @Body() createLeaseDto: CreateLeaseDto,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.leaseService.create(createLeaseDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: { id: number; role: string }) {
    return this.leaseService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.leaseService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLeaseDto: UpdateLeaseDto,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.leaseService.update(id, updateLeaseDto, user);
  }

  @Post(':id/activate')
  @Roles(Role.OWNER, Role.ADMIN)
  activate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.leaseService.activate(id, user);
  }

  @Post(':id/terminate')
  @Roles(Role.OWNER, Role.ADMIN)
  terminate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.leaseService.terminate(id, user);
  }
}
