import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { Role, LeaseStatus, UnitStatus } from '@prisma/client';

@Injectable()
export class LeaseService {
  constructor(private prisma: PrismaService) {}

  async create(
    createLeaseDto: CreateLeaseDto,
    user: { id: number; role: string },
  ) {
    const { tenantId, unitId, startDate, endDate, rentAmount } = createLeaseDto;

    if (new Date(startDate) >= new Date(endDate)) {
      throw new BadRequestException('startDate must be before endDate');
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Verify unit and property ownership
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: { property: true },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (user.role !== Role.ADMIN && unit.property.ownerId !== user.id) {
      throw new ForbiddenException(
        'You do not own the property containing this unit',
      );
    }

    // Check for conflicting ACTIVE lease on the unit
    const activeUnitLease = await this.prisma.lease.findFirst({
      where: {
        unitId,
        status: LeaseStatus.ACTIVE,
      },
    });

    if (activeUnitLease) {
      throw new ConflictException('This unit already has an active lease');
    }

    // Check for conflicting ACTIVE lease for the tenant
    const activeTenantLease = await this.prisma.lease.findFirst({
      where: {
        tenantId,
        status: LeaseStatus.ACTIVE,
      },
    });

    if (activeTenantLease) {
      throw new ConflictException('This tenant already has an active lease');
    }

    // Determine initial status based on startDate vs today
    const now = new Date();
    const isPastOrPresent = new Date(startDate) <= now;
    const initialStatus = isPastOrPresent
      ? LeaseStatus.ACTIVE
      : LeaseStatus.PENDING;

    return this.prisma.$transaction(async (prisma) => {
      const lease = await prisma.lease.create({
        data: {
          tenantId,
          unitId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          rentAmount,
          status: initialStatus,
        },
      });

      // If active, update unit occupancy
      if (initialStatus === LeaseStatus.ACTIVE) {
        await prisma.unit.update({
          where: { id: unitId },
          data: { status: UnitStatus.OCCUPIED },
        });
      }

      return lease;
    });
  }

  async findAll(user: { id: number; role: string }) {
    if (user.role === Role.ADMIN) {
      return this.prisma.lease.findMany();
    }

    if (user.role === Role.TENANT) {
      return this.prisma.lease.findMany({
        where: { tenant: { userId: user.id } },
      });
    }

    // OWNER
    return this.prisma.lease.findMany({
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
    const lease = await this.prisma.lease.findUnique({
      where: { id },
      include: {
        unit: { include: { property: true } },
        tenant: true,
      },
    });

    if (!lease) {
      throw new NotFoundException(`Lease with ID ${id} not found`);
    }

    if (user.role === Role.TENANT && lease.tenant.userId !== user.id) {
      throw new ForbiddenException('You can only access your own leases');
    }

    if (user.role === Role.OWNER && lease.unit.property.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this lease');
    }

    return lease;
  }

  async update(
    id: number,
    updateLeaseDto: UpdateLeaseDto,
    user: { id: number; role: string },
  ) {
    const lease = await this.findOne(id, user);

    const updatedStartDate = updateLeaseDto.startDate
      ? new Date(updateLeaseDto.startDate)
      : lease.startDate;
    const updatedEndDate = updateLeaseDto.endDate
      ? new Date(updateLeaseDto.endDate)
      : lease.endDate;

    if (updatedStartDate >= updatedEndDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    return this.prisma.lease.update({
      where: { id },
      data: {
        startDate: updateLeaseDto.startDate
          ? new Date(updateLeaseDto.startDate)
          : undefined,
        endDate: updateLeaseDto.endDate
          ? new Date(updateLeaseDto.endDate)
          : undefined,
        rentAmount: updateLeaseDto.rentAmount,
      },
    });
  }

  async activate(id: number, user: { id: number; role: string }) {
    const lease = await this.findOne(id, user); // verifies ownership

    if (lease.status !== LeaseStatus.PENDING) {
      throw new BadRequestException('Only PENDING leases can be activated');
    }

    // Check conflict again
    const activeUnitLease = await this.prisma.lease.findFirst({
      where: {
        unitId: lease.unitId,
        status: LeaseStatus.ACTIVE,
      },
    });

    if (activeUnitLease) {
      throw new ConflictException('This unit already has an active lease');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.lease.update({
        where: { id },
        data: { status: LeaseStatus.ACTIVE },
      });

      await prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: UnitStatus.OCCUPIED },
      });

      return updated;
    });
  }

  async terminate(id: number, user: { id: number; role: string }) {
    const lease = await this.findOne(id, user); // verifies ownership

    if (lease.status !== LeaseStatus.ACTIVE) {
      throw new BadRequestException('Only ACTIVE leases can be terminated');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.lease.update({
        where: { id },
        data: { status: LeaseStatus.TERMINATED },
      });

      await prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: UnitStatus.VACANT },
      });

      return updated;
    });
  }
}
