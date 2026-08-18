import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  Role,
  LeaseStatus,
  MaintenanceStatus,
  UnitStatus,
} from '@prisma/client';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let owner2Token: string;
  let tenantToken: string;
  let tenantNoLeaseToken: string;
  let adminToken: string;

  const ownerEmail = `o_dash_e2e_${Date.now()}@test.com`;
  const owner2Email = `o2_dash_e2e_${Date.now()}@test.com`;
  const tenantEmail = `t_dash_e2e_${Date.now()}@test.com`;
  const tenantNoLeaseEmail = `tnl_dash_e2e_${Date.now()}@test.com`;
  const adminEmail = `a_dash_e2e_${Date.now()}@test.com`;

  let propertyId: number;
  let unitId: number;
  let leaseId: number;
  let tenantId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    const pwdHash = await bcrypt.hash('Password123!', 10);

    // Seed users
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: 'O1',
        role: Role.OWNER,
        passwordHash: pwdHash,
      },
    });
    await prisma.user.create({
      data: {
        email: owner2Email,
        name: 'O2',
        role: Role.OWNER,
        passwordHash: pwdHash,
      },
    });
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'A1',
        role: Role.ADMIN,
        passwordHash: pwdHash,
      },
    });

    const tUser = await prisma.user.create({
      data: {
        email: tenantEmail,
        name: 'T1',
        role: Role.TENANT,
        passwordHash: pwdHash,
        tenantProfile: { create: { ownerId: owner.id } },
      },
      include: { tenantProfile: true },
    });
    tenantId = tUser.tenantProfile!.id;

    await prisma.user.create({
      data: {
        email: tenantNoLeaseEmail,
        name: 'T2',
        role: Role.TENANT,
        passwordHash: pwdHash,
        tenantProfile: { create: { ownerId: owner.id } },
      },
    });

    // Seed Owner 1 resources
    const prop = await prisma.property.create({
      data: { name: 'P1 Dashboard', address: '123 D', ownerId: owner.id },
    });
    propertyId = prop.id;

    const unit = await prisma.unit.create({
      data: {
        unitNo: 101,
        floor: '1',
        status: UnitStatus.OCCUPIED,
        propertyId,
      },
    });
    unitId = unit.id;
    await prisma.unit.create({
      data: { unitNo: 102, floor: '1', status: UnitStatus.VACANT, propertyId },
    });

    const lease = await prisma.lease.create({
      data: {
        tenantId,
        unitId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 31536000000),
        rentAmount: 1500000,
        status: LeaseStatus.ACTIVE,
      },
    });
    leaseId = lease.id;

    await prisma.payment.create({
      data: {
        leaseId,
        amount: 1500000,
        method: 'UPI',
        status: 'PAID',
        paidAt: new Date(),
      },
    });
    await prisma.maintenance.create({
      data: {
        unitId,
        reportedByUserId: tUser.id,
        title: 'Issue 1',
        description: 'Desc 1',
        status: MaintenanceStatus.OPEN,
      },
    });

    const login = async (email: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return res.body.accessToken;
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ownerToken = await login(ownerEmail);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    owner2Token = await login(owner2Email);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tenantToken = await login(tenantEmail);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tenantNoLeaseToken = await login(tenantNoLeaseEmail);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    adminToken = await login(adminEmail);
  });

  afterAll(async () => {
    await prisma.maintenance.deleteMany({ where: { unitId } });
    await prisma.payment.deleteMany({ where: { leaseId } });
    await prisma.lease.deleteMany({ where: { id: leaseId } });
    await prisma.unit.deleteMany({ where: { propertyId } });
    await prisma.property.deleteMany({ where: { id: propertyId } });
    await prisma.tenant.deleteMany({
      where: { user: { email: { in: [tenantEmail, tenantNoLeaseEmail] } } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            ownerEmail,
            owner2Email,
            adminEmail,
            tenantEmail,
            tenantNoLeaseEmail,
          ],
        },
      },
    });
    await app.close();
  });

  describe('GET /api/v1/dashboard/owner', () => {
    it('should reject non-owner roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/owner')
        .set('Authorization', `Bearer ${tenantToken}`);
      expect(res.status).toBe(403);
    });

    it('should return aggregated data for owner', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/owner')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.properties.total).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.units.total).toBe(2);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.units.occupied).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.occupancyRate).toBe(50);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.payments.totalCollected).toBe(1500000);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.maintenance.open).toBe(1);
    });

    it('should return zeros for an owner with no properties', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/owner')
        .set('Authorization', `Bearer ${owner2Token}`);
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.properties.total).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.units.total).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.occupancyRate).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.payments.totalCollected).toBe(0);
    });
  });

  describe('GET /api/v1/dashboard/tenant', () => {
    it('should reject non-tenant roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/tenant')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(403);
    });

    it('should return data for tenant with active lease', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/tenant')
        .set('Authorization', `Bearer ${tenantToken}`);
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.home.propertyName).toBe('P1 Dashboard');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.lease.active).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.payments.totalPaid).toBe(1500000);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.maintenance.open).toBe(1);
    });

    it('should return safe fallback for tenant with no lease', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/tenant')
        .set('Authorization', `Bearer ${tenantNoLeaseToken}`);
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.home).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.lease).toBeNull();
    });
  });

  describe('GET /api/v1/dashboard/admin', () => {
    it('should reject non-admin roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/admin')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(403);
    });

    it('should return global aggregates for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/admin')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.users.total).toBeGreaterThan(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.properties.total).toBeGreaterThan(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.payments.totalAmount).toBeGreaterThan(0);
    });
  });
});
