import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, LeaseStatus } from '@prisma/client';

describe('PaymentController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let owner2Token: string;
  let tenantToken: string;

  const ownerEmail = `o_pay_e2e_${Date.now()}@test.com`;
  const owner2Email = `o2_pay_e2e_${Date.now()}@test.com`;
  const tenantEmail = `t_pay_e2e_${Date.now()}@test.com`;

  let propertyId: number;
  let unitId: number;
  let tenantId: number;
  let leaseId: number;
  let paymentId: number;

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
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { leaseId } });
    await prisma.lease.deleteMany({ where: { id: leaseId } });
    await prisma.unit.deleteMany({ where: { id: unitId } });
    await prisma.property.deleteMany({ where: { id: propertyId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, owner2Email, tenantEmail] } },
    });
    await app.close();
  });

  describe('POST /api/v1/payments', () => {
    it('should reject unauthenticated request', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .send({ leaseId, amount: 1000, method: 'CASH' });
      expect(res.status).toBe(401);
    });

    it('should reject TENANT request', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ leaseId, amount: 1000, method: 'CASH' });
      expect(res.status).toBe(403);
    });

    it('should reject cross-owner request', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({ leaseId, amount: 1000, method: 'CASH' });
      expect(res.status).toBe(403);
    });

    it('should reject negative amount', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ leaseId, amount: -1000, method: 'CASH' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid method', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ leaseId, amount: 1000, method: 'INVALID' });
      expect(res.status).toBe(400);
    });

    it('should allow OWNER to create valid payment', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ leaseId, amount: 1500000, method: 'UPI' });
      expect(res.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.status).toBe('PAID');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.paidAt).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      paymentId = res.body.id;
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('should deny cross-owner access', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentId}`)
        .set('Authorization', `Bearer ${owner2Token}`);
      expect(res.status).toBe(403);
    });

    it('should allow OWNER access', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.id).toBe(paymentId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.lease).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.lease.tenant.user.email).toBe(tenantEmail);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.lease.unit.property.name).toBe('P1');
    });

    it('should allow TENANT access to their own payment', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentId}`)
        .set('Authorization', `Bearer ${tenantToken}`);
      expect(res.status).toBe(200);
    });
  });
});
