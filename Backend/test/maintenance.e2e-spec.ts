import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, LeaseStatus } from '@prisma/client';

describe('MaintenanceController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let owner2Token: string;
  let tenantToken: string;
  let tenantNoLeaseToken: string;

  const ownerEmail = `o_maint_e2e_${Date.now()}@test.com`;
  const owner2Email = `o2_maint_e2e_${Date.now()}@test.com`;
  const tenantEmail = `t_maint_e2e_${Date.now()}@test.com`;
  const tenantNoLeaseEmail = `t_nl_maint_e2e_${Date.now()}@test.com`;

  let propertyId: number;
  let unitId: number;
  let tenantId: number;
  let tenantNoLeaseId: number;
  let leaseId: number;
  let maintenanceId: number;

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

    const tUserNoLease = await prisma.user.create({
      data: {
        email: tenantNoLeaseEmail,
        name: 'T2',
        role: Role.TENANT,
        passwordHash: pwdHash,
        tenantProfile: { create: { ownerId: owner.id } },
      },
      include: { tenantProfile: true },
    });
    tenantNoLeaseId = tUserNoLease.tenantProfile!.id;

    const prop = await prisma.property.create({
      data: { name: 'P1', address: '123', ownerId: owner.id },
    });
    propertyId = prop.id;

    const unit = await prisma.unit.create({
      data: { unitNo: 101, floor: '1', status: 'OCCUPIED', propertyId },
    });
    unitId = unit.id;

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
  });

  afterAll(async () => {
    await prisma.maintenance.deleteMany({ where: { unitId } });
    await prisma.lease.deleteMany({ where: { id: leaseId } });
    await prisma.unit.deleteMany({ where: { id: unitId } });
    await prisma.property.deleteMany({ where: { id: propertyId } });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantId, tenantNoLeaseId] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ownerEmail, owner2Email, tenantEmail, tenantNoLeaseEmail],
        },
      },
    });
    await app.close();
  });

  describe('POST /api/v1/maintenance', () => {
    it('should reject unauthenticated request', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/maintenance')
        .send({ title: 'Leaking Pipe', description: 'Under sink' });
      expect(res.status).toBe(401);
    });

    it('should reject OWNER request', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/maintenance')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Leaking Pipe', description: 'Under sink' });
      expect(res.status).toBe(403);
    });

    it('should reject TENANT without active lease', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/maintenance')
        .set('Authorization', `Bearer ${tenantNoLeaseToken}`)
        .send({ title: 'Leaking Pipe', description: 'Under sink' });
      expect(res.status).toBe(403);
    });

    it('should allow TENANT with active lease to create request', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          title: 'Leaking Pipe',
          description: 'Under sink',
          category: 'Plumbing',
        });
      expect(res.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.status).toBe('OPEN');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.unitId).toBe(unitId); // automatically inferred
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      maintenanceId = res.body.id;
    });
  });

  describe('GET /api/v1/maintenance/:id', () => {
    it('should deny cross-owner access', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/maintenance/${maintenanceId}`)
        .set('Authorization', `Bearer ${owner2Token}`);
      expect(res.status).toBe(403);
    });

    it('should allow OWNER access', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/maintenance/${maintenanceId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.id).toBe(maintenanceId);

      expect(Array.isArray(res.body)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.unit).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.unit.property).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.unit.property.name).toBe('P1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.unit.unitNo).toBe(101);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.reportedBy).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.reportedBy.name).toBe('T1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.reportedBy.email).toBe(tenantEmail);
    });

    it('should allow TENANT access to their own request', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/maintenance/${maintenanceId}`)
        .set('Authorization', `Bearer ${tenantToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/v1/maintenance/:id/status', () => {
    it('should reject TENANT status update', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/maintenance/${maintenanceId}/status`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ status: 'IN_PROGRESS' });
      expect(res.status).toBe(403);
    });

    it('should reject invalid status transition (OPEN -> CLOSED)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/maintenance/${maintenanceId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'CLOSED' });
      expect(res.status).toBe(400);
    });

    it('should allow OWNER to update status to IN_PROGRESS', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/maintenance/${maintenanceId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'IN_PROGRESS' });
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('should allow OWNER to update status to RESOLVED', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/maintenance/${maintenanceId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'RESOLVED' });
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.status).toBe('RESOLVED');
    });
  });
});
