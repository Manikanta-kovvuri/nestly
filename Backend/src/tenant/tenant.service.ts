import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async create(createTenantDto: CreateTenantDto) {
    const { name, email, password } = createTenantDto;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user and tenant profile within a transaction
    const user = await this.prisma.$transaction(async (prisma) => {
      const newUser = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: Role.TENANT,
          tenantProfile: {
            create: {}, // Creates the empty Tenant record pointing back to userId
          },
        },
        include: {
          tenantProfile: true,
        },
      });
      return newUser;
    });

    // Exclude passwordHash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findAll(user: { id: number; role: string }) {
    if (user.role === Role.ADMIN) {
      return this.prisma.tenant.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }

    if (user.role === Role.TENANT) {
      return this.prisma.tenant.findMany({
        where: { userId: user.id },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }

    // For OWNER: return only tenants who have leases associated with units belonging to that owner.
    return this.prisma.tenant.findMany({
      where: {
        leases: {
          some: {
            unit: {
              property: {
                ownerId: user.id,
              },
            },
          },
        },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async findOne(id: number, user: { id: number; role: string }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        leases: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    if (user.role === Role.TENANT && tenant.userId !== user.id) {
      throw new ForbiddenException('You can only access your own profile');
    }

    if (user.role === Role.OWNER) {
      // Owner must have a lease associated with this tenant
      const isAssociated = tenant.leases.some(
        (lease) => lease.unit.property.ownerId === user.id,
      );
      if (!isAssociated) {
        throw new ForbiddenException('You do not have access to this tenant');
      }
    }

    // Do not over-fetch leases internally used for auth checks
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { leases: _, ...result } = tenant;
    return result;
  }

  async update(
    id: number,
    updateTenantDto: UpdateTenantDto,
    user: { id: number; role: string },
  ) {
    const tenant = await this.findOne(id, user);

    if (updateTenantDto.email) {
      updateTenantDto.email = updateTenantDto.email.trim().toLowerCase();
      // Check duplicate
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateTenantDto.email },
      });
      if (existingUser && existingUser.id !== tenant.userId) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: tenant.userId },
      data: {
        name: updateTenantDto.name,
        email: updateTenantDto.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return {
      ...tenant,
      user: updatedUser,
    };
  }
}
