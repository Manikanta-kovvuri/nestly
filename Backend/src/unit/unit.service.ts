import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UnitService {
  constructor(private prisma: PrismaService) {}

  async create(
    propertyId: number,
    createUnitDto: CreateUnitDto,
    user: { id: number; role: string },
  ) {
    // Verify property exists and user has access
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    if (user.role !== Role.ADMIN && property.ownerId !== user.id) {
      throw new ForbiddenException('You do not own this property');
    }

    try {
      return await this.prisma.unit.create({
        data: {
          ...createUnitDto,
          propertyId,
        },
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A unit with this number already exists in this property',
        );
      }
      throw error;
    }
  }

  async findAllByProperty(
    propertyId: number,
    user: { id: number; role: string },
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    if (user.role !== Role.ADMIN && property.ownerId !== user.id) {
      throw new ForbiddenException('You do not own this property');
    }

    return this.prisma.unit.findMany({
      where: { propertyId },
    });
  }

  async findOne(id: number, user: { id: number; role: string }) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    if (user.role !== Role.ADMIN && unit.property.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this unit');
    }

    // Exclude the nested property object from the final output so we don't over-fetch
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { property: _, ...result } = unit;
    return result;
  }

  async update(
    id: number,
    updateUnitDto: UpdateUnitDto,
    user: { id: number; role: string },
  ) {
    await this.findOne(id, user); // verifies ownership and existence

    try {
      return await this.prisma.unit.update({
        where: { id },
        data: updateUnitDto,
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A unit with this number already exists in this property',
        );
      }
      throw error;
    }
  }

  async remove(id: number, user: { id: number; role: string }) {
    await this.findOne(id, user); // verifies ownership and existence

    try {
      return await this.prisma.unit.delete({
        where: { id },
      });
    } catch (error: any) {
      // Handle Prisma foreign key constraint error P2003
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete unit because dependent records (leases/maintenance) exist.',
        );
      }
      throw error;
    }
  }
}
