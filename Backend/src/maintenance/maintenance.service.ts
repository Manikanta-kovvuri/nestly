import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Role, MaintenanceStatus, LeaseStatus } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async create(
    createIssueDto: CreateIssueDto,
    user: { id: number; role: string },
  ) {
    if (user.role !== Role.TENANT) {
      throw new ForbiddenException(
        'Only tenants can create maintenance requests',
      );
    }

    const tenantProfile = await this.prisma.tenant.findUnique({
      where: { userId: user.id },
      include: {
        leases: {
          where: { status: LeaseStatus.ACTIVE },
          include: { unit: true },
        },
      },
    });

    if (!tenantProfile) {
      throw new NotFoundException('Tenant profile not found');
    }

    if (tenantProfile.leases.length === 0) {
      throw new ForbiddenException(
        'You do not have an active lease to report maintenance for',
      );
    }

    // A tenant should only have one ACTIVE lease due to M5 constraints
    const activeLease = tenantProfile.leases[0];

    return this.prisma.maintenance.create({
      data: {
        title: createIssueDto.title,
        category: createIssueDto.category || '',
        description: createIssueDto.description,
        unitId: activeLease.unitId,
        reportedByUserId: user.id,
        status: MaintenanceStatus.OPEN,
      },
    });
  }

  async findAll(user: { id: number; role: string }) {
    if (user.role === Role.ADMIN) {
      return this.prisma.maintenance.findMany();
    }

    if (user.role === Role.TENANT) {
      return this.prisma.maintenance.findMany({
        where: { reportedByUserId: user.id },
      });
    }

    // OWNER
    return this.prisma.maintenance.findMany({
      where: {
        unit: {
          property: {
            ownerId: user.id,
          },
        },
      },
    });
  }

  async findOne(id: number, user: { id: number; role: string }) {
    const maintenance = await this.prisma.maintenance.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!maintenance) {
      throw new NotFoundException(
        `Maintenance request with ID ${id} not found`,
      );
    }

    if (user.role === Role.TENANT && maintenance.reportedByUserId !== user.id) {
      throw new ForbiddenException(
        'You can only access your own maintenance requests',
      );
    }

    if (
      user.role === Role.OWNER &&
      maintenance.unit.property.ownerId !== user.id
    ) {
      throw new ForbiddenException(
        'You do not have access to this maintenance request',
      );
    }

    // Avoid returning deeply nested unit structures unnecessarily
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { unit: _, ...result } = maintenance;
    return result;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateStatusDto,
    user: { id: number; role: string },
  ) {
    if (user.role === Role.TENANT) {
      throw new ForbiddenException('Tenants cannot update maintenance status');
    }

    // findOne verifies existence and ownership bounds for OWNER/ADMIN
    const maintenance = await this.findOne(id, user);

    const validTransitions: Record<string, string[]> = {
      [MaintenanceStatus.OPEN]: [MaintenanceStatus.IN_PROGRESS],
      [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.RESOLVED],
      [MaintenanceStatus.RESOLVED]: [MaintenanceStatus.CLOSED],
      [MaintenanceStatus.CLOSED]: [], // terminal state
    };

    const allowedNextStates = validTransitions[maintenance.status];

    if (
      !allowedNextStates.includes(updateStatusDto.status) &&
      maintenance.status !== updateStatusDto.status
    ) {
      throw new BadRequestException(
        `Invalid status transition from ${maintenance.status} to ${updateStatusDto.status}`,
      );
    }

    return this.prisma.maintenance.update({
      where: { id },
      data: { status: updateStatusDto.status },
    });
  }
}
