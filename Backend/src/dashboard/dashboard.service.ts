import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UnitStatus, LeaseStatus, MaintenanceStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private getMonthBounds(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }

  async getOwnerDashboard(ownerId: number) {
    const { start: startOfMonth, end: endOfMonth } = this.getMonthBounds();

    const [
      totalProperties,
      unitGroup,
      tenantCount,
      leaseGroup,
      totalCollectedAgg,
      thisMonthCollectedAgg,
      maintenanceGroup,
    ] = await Promise.all([
      // Properties
      this.prisma.property.count({ where: { ownerId } }),

      // Units by status
      this.prisma.unit.groupBy({
        by: ['status'],
        where: { property: { ownerId } },
        _count: true,
      }),

      // Tenants (distinct count of active leases essentially)
      this.prisma.lease.count({
        where: {
          unit: { property: { ownerId } },
          status: LeaseStatus.ACTIVE,
        },
      }),

      // Leases by status
      this.prisma.lease.groupBy({
        by: ['status'],
        where: { unit: { property: { ownerId } } },
        _count: true,
      }),

      // Payments Total
      this.prisma.payment.aggregate({
        where: { lease: { unit: { property: { ownerId } } }, status: 'PAID' },
        _sum: { amount: true },
      }),

      // Payments This Month
      this.prisma.payment.aggregate({
        where: {
          lease: { unit: { property: { ownerId } } },
          status: 'PAID',
          paidAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),

      // Maintenance by status
      this.prisma.maintenance.groupBy({
        by: ['status'],
        where: { unit: { property: { ownerId } } },
        _count: true,
      }),
    ]);

    // Format Units
    let totalUnits = 0;
    let occupiedUnits = 0;
    let vacantUnits = 0;
    let maintenanceUnits = 0;

    unitGroup.forEach((g) => {
      totalUnits += g._count;
      if (g.status === UnitStatus.OCCUPIED) occupiedUnits += g._count;
      else if (g.status === UnitStatus.VACANT) vacantUnits += g._count;
      else if (g.status === UnitStatus.MAINTENANCE)
        maintenanceUnits += g._count;
    });

    const occupancyRate =
      totalUnits > 0
        ? Number(((occupiedUnits / totalUnits) * 100).toFixed(2))
        : 0;

    // Format Leases
    const leases = { active: 0, pending: 0, expired: 0, terminated: 0 };
    leaseGroup.forEach((g) => {
      if (g.status === LeaseStatus.ACTIVE) leases.active = g._count;
      else if (g.status === LeaseStatus.PENDING) leases.pending = g._count;
      else if (g.status === LeaseStatus.EXPIRED) leases.expired = g._count;
      else if (g.status === LeaseStatus.TERMINATED)
        leases.terminated = g._count;
    });

    // Format Maintenance
    const maintenance = { open: 0, inProgress: 0, resolved: 0, closed: 0 };
    maintenanceGroup.forEach((g) => {
      if (g.status === MaintenanceStatus.OPEN) maintenance.open = g._count;
      else if (g.status === MaintenanceStatus.IN_PROGRESS)
        maintenance.inProgress = g._count;
      else if (g.status === MaintenanceStatus.RESOLVED)
        maintenance.resolved = g._count;
      else if (g.status === MaintenanceStatus.CLOSED)
        maintenance.closed = g._count;
    });

    return {
      properties: { total: totalProperties },
      units: {
        total: totalUnits,
        occupied: occupiedUnits,
        vacant: vacantUnits,
        maintenance: maintenanceUnits,
      },
      occupancyRate,
      tenants: { total: tenantCount },
      leases,
      payments: {
        totalCollected: totalCollectedAgg._sum.amount || 0,
        thisMonth: thisMonthCollectedAgg._sum.amount || 0,
      },
      maintenance,
    };
  }

  async getTenantDashboard(userId: number) {
    const tenantProfile = await this.prisma.tenant.findUnique({
      where: { userId },
      include: {
        leases: {
          where: { status: LeaseStatus.ACTIVE },
          include: {
            unit: { include: { property: true } },
          },
        },
      },
    });

    if (!tenantProfile || tenantProfile.leases.length === 0) {
      return {
        home: null,
        lease: null,
        payments: { totalPaid: 0, recent: [] },
        maintenance: { open: 0, inProgress: 0, resolved: 0, recent: [] },
      };
    }

    const activeLease = tenantProfile.leases[0];

    const [paymentsAgg, recentPayments, maintenanceGroup, recentMaintenance] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: { leaseId: activeLease.id, status: 'PAID' },
          _sum: { amount: true },
        }),
        this.prisma.payment.findMany({
          where: { leaseId: activeLease.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.prisma.maintenance.groupBy({
          by: ['status'],
          where: { reportedByUserId: userId },
          _count: true,
        }),
        this.prisma.maintenance.findMany({
          where: { reportedByUserId: userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    const maintenance = {
      open: 0,
      inProgress: 0,
      resolved: 0,
      recent: recentMaintenance,
    };
    maintenanceGroup.forEach((g) => {
      if (g.status === MaintenanceStatus.OPEN) maintenance.open = g._count;
      else if (g.status === MaintenanceStatus.IN_PROGRESS)
        maintenance.inProgress = g._count;
      else if (g.status === MaintenanceStatus.RESOLVED)
        maintenance.resolved = g._count;
    });

    return {
      home: {
        propertyName: activeLease.unit.property.name,
        unitNumber: activeLease.unit.unitNo,
        floor: activeLease.unit.floor,
        address: activeLease.unit.property.address,
      },
      lease: {
        active: true,
        startDate: activeLease.startDate,
        endDate: activeLease.endDate,
        rentAmount: activeLease.rentAmount,
        status: activeLease.status,
      },
      payments: {
        totalPaid: paymentsAgg._sum.amount || 0,
        recent: recentPayments,
      },
      maintenance,
    };
  }

  async getAdminDashboard() {
    const [
      userGroup,
      totalProperties,
      unitGroup,
      leaseGroup,
      paymentsAgg,
      maintenanceGroup,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.property.count(),
      this.prisma.unit.groupBy({ by: ['status'], _count: true }),
      this.prisma.lease.groupBy({ by: ['status'], _count: true }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.maintenance.groupBy({ by: ['status'], _count: true }),
    ]);

    const users = { total: 0, admin: 0, owner: 0, tenant: 0 };
    userGroup.forEach((g) => {
      users.total += g._count;
      if (g.role === 'ADMIN') users.admin = g._count;
      else if (g.role === 'OWNER') users.owner = g._count;
      else if (g.role === 'TENANT') users.tenant = g._count;
    });

    let totalUnits = 0;
    let occupiedUnits = 0;
    let vacantUnits = 0;
    unitGroup.forEach((g) => {
      totalUnits += g._count;
      if (g.status === UnitStatus.OCCUPIED) occupiedUnits += g._count;
      else if (g.status === UnitStatus.VACANT) vacantUnits += g._count;
    });

    const leases = { active: 0, pending: 0 };
    leaseGroup.forEach((g) => {
      if (g.status === LeaseStatus.ACTIVE) leases.active = g._count;
      else if (g.status === LeaseStatus.PENDING) leases.pending = g._count;
    });

    const maintenance = { open: 0, inProgress: 0, resolved: 0, closed: 0 };
    maintenanceGroup.forEach((g) => {
      if (g.status === MaintenanceStatus.OPEN) maintenance.open = g._count;
      else if (g.status === MaintenanceStatus.IN_PROGRESS)
        maintenance.inProgress = g._count;
      else if (g.status === MaintenanceStatus.RESOLVED)
        maintenance.resolved = g._count;
      else if (g.status === MaintenanceStatus.CLOSED)
        maintenance.closed = g._count;
    });

    return {
      users,
      properties: { total: totalProperties },
      units: {
        total: totalUnits,
        occupied: occupiedUnits,
        vacant: vacantUnits,
      },
      leases,
      payments: {
        totalAmount: paymentsAgg._sum.amount || 0,
        totalCount: paymentsAgg._count,
      },
      maintenance,
    };
  }
}
