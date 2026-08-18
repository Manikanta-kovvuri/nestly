import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('LeaseController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;

  const ownerEmail = `o_lease_e2e_${Date.now()}@test.com`;
  const tenantEmail = `t_lease_e2e_${Date.now()}@test.com`;
  const tenantEmail2 = `t2_lease_e2e_${Date.now()}@test.com`;

  let propertyId: number;
  let unitId: number;
  let tenantId: number;
  let tenantId2: number;
  let leaseId: number;

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

    const tUser = await prisma.user.create({
      data: {
        email: tenantEmail,
        name: 'T1',
        role: Role.TENANT,
        passwordHash: pwdHash,
        tenantProfile: { create: {} },
      },
      include: { tenantProfile: true },
    });
    tenantId = tUser.tenantProfile!.id;

    const tUser2 = await prisma.user.create({
      data: {
        email: tenantEmail2,
        name: 'T2',
        role: Role.TENANT,
        passwordHash: pwdHash,
        tenantProfile: { create: {} },
      },
      include: { tenantProfile: true },
    });
    tenantId2 = tUser2.tenantProfile!.id;

    const prop = await prisma.property.create({
      data: { name: 'P1', address: '123', ownerId: owner.id },
    });
    propertyId = prop.id;

    const unit = await prisma.unit.create({
      data: { unitNo: 101, floor: '1', status: 'VACANT', propertyId },
    });
    unitId = unit.id;

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
  });

  afterAll(async () => {
    await prisma.lease.deleteMany({ where: { unitId } });
    await prisma.unit.deleteMany({ where: { id: unitId } });
    await prisma.property.deleteMany({ where: { id: propertyId } });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantId, tenantId2] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, tenantEmail, tenantEmail2] } },
    });
    await app.close();
  });

  describe('POST /api/v1/leases', () => {
    it('should reject invalid dates', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/leases')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tenantId,
          unitId,
          startDate: '2025-01-01',
          endDate: '2024-01-01', // Before start
          rentAmount: 1500000,
        });
      expect(res.status).toBe(400);
    });

    it('should create an ACTIVE lease if startDate is today/past', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/leases')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tenantId,
          unitId,
          startDate: new Date(Date.now() - 86400000).toISOString(), // yesterday
          endDate: new Date(Date.now() + 31536000000).toISOString(), // +1 year
          rentAmount: 1500000,
        });

      expect(res.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.status).toBe('ACTIVE');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      leaseId = res.body.id;

      // Verify unit status was automatically updated
      const dbUnit = await prisma.unit.findUnique({ where: { id: unitId } });
      expect(dbUnit!.status).toBe('OCCUPIED');
    });

    it('should reject creating another active lease for the same unit', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/leases')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tenantId: tenantId2,
          unitId,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 31536000000).toISOString(),
          rentAmount: 2000000,
        });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/leases/:id/terminate', () => {
    it('should terminate lease and set unit to VACANT', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post(`/api/v1/leases/${leaseId}/terminate`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.status).toBe('TERMINATED');

      const dbUnit = await prisma.unit.findUnique({ where: { id: unitId } });
      expect(dbUnit!.status).toBe('VACANT');
    });
  });

  describe('POST /api/v1/leases (PENDING)', () => {
    it('should create a PENDING lease for future start dates', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/leases')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          tenantId,
          unitId,
          startDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          endDate: new Date(Date.now() + 31536000000).toISOString(),
          rentAmount: 1500000,
        });

      expect(res.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.status).toBe('PENDING');

      // Unit should still be VACANT
      const dbUnit = await prisma.unit.findUnique({ where: { id: unitId } });
      expect(dbUnit!.status).toBe('VACANT');
    });
  });
});
