import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UnitService } from './unit.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller()
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post('properties/:propertyId/units')
  create(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() createUnitDto: CreateUnitDto,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.unitService.create(propertyId, createUnitDto, user);
  }

  @Get('properties/:propertyId/units')
  findAllByProperty(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.unitService.findAllByProperty(propertyId, user);
  }

  @Get('units/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.unitService.findOne(id, user);
  }

  @Patch('units/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUnitDto: UpdateUnitDto,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.unitService.update(id, updateUnitDto, user);
  }

  @Delete('units/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: string },
  ) {
    return this.unitService.remove(id, user);
  }
}
