import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Role } from '@prisma/client';

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  async create(
    createPropertyDto: CreatePropertyDto,
    user: { id: number; role: string },
  ) {
    // If ADMIN, user.id is still used as the owner.
    // Based on requirements, a sensible behavior for ADMIN is they either own it themselves
    // or we'd need an admin endpoint to assign ownership. For now, ADMIN creates it as their own.
    return this.prisma.property.create({
      data: {
        ...createPropertyDto,
        ownerId: user.id,
      },
    });
  }

  async findAll(user: { id: number; role: string }) {
    if (user.role === Role.ADMIN) {
      return this.prisma.property.findMany();
    }
    return this.prisma.property.findMany({
      where: { ownerId: user.id },
    });
  }

  async findOne(id: number, user: { id: number; role: string }) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    if (user.role !== Role.ADMIN && property.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this property');
    }

    return property;
  }

  async update(
    id: number,
    updatePropertyDto: UpdatePropertyDto,
    user: { id: number; role: string },
  ) {
    await this.findOne(id, user); // verifies ownership and existence

    return this.prisma.property.update({
      where: { id },
      data: updatePropertyDto,
    });
  }

  async remove(id: number, user: { id: number; role: string }) {
    await this.findOne(id, user); // verifies ownership and existence

    try {
      return await this.prisma.property.delete({
        where: { id },
      });
    } catch (error: any) {
      // Handle Prisma foreign key constraint error P2003
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete property because dependent units exist.',
        );
      }
      throw error;
    }
  }
}
