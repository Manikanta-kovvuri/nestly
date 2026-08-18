import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('UnitController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let owner1Token: string;
  let owner2Token: string;

  const owner1 = {
    email: `u_owner1_${Date.now()}@test.com`,
    name: 'Owner 1',
    password: 'Password123!',
    role: Role.OWNER,
  };
  const owner2 = {
    email: `u_owner2_${Date.now()}@test.com`,
    name: 'Owner 2',
    password: 'Password123!',
    role: Role.OWNER,
  };

  let property1Id: number;
  let unit1Id: number;

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p1, ...owner1Data } = owner1;

    const u1 = await prisma.user.create({
      data: { ...owner1Data, passwordHash: pwdHash },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p2, ...owner2Data } = owner2;
    await prisma.user.create({
      data: { ...owner2Data, passwordHash: pwdHash },
    });

    const p1 = await prisma.property.create({
      data: { name: 'P1', address: '123', ownerId: u1.id },
    });

    property1Id = p1.id;

    const login = async (email: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return res.body.accessToken;
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    owner1Token = await login(owner1.email);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    owner2Token = await login(owner2.email);
  });

  afterAll(async () => {
    await prisma.unit.deleteMany({ where: { propertyId: property1Id } });
    await prisma.property.deleteMany({ where: { id: property1Id } });
    await prisma.user.deleteMany({
      where: { email: { in: [owner1.email, owner2.email] } },
    });
    await app.close();
  });

  describe('POST /api/v1/properties/:id/units', () => {
    it('should deny OWNER creating unit in another owners property', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post(`/api/v1/properties/${property1Id}/units`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({ unitNo: 101, floor: '1', status: 'VACANT' });
      expect(res.status).toBe(403);
    });

    it('should allow OWNER to create unit in their property', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post(`/api/v1/properties/${property1Id}/units`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ unitNo: 101, floor: '1', status: 'VACANT' });
      expect(res.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      unit1Id = res.body.id;
    });

    it('should reject duplicate unit numbers in the same property', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post(`/api/v1/properties/${property1Id}/units`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ unitNo: 101, floor: '1', status: 'VACANT' });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/units/:id', () => {
    it('should deny access to another owners unit', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/units/${unit1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`);
      expect(res.status).toBe(403);
    });

    it('should allow access to own unit', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/units/${unit1Id}`)
        .set('Authorization', `Bearer ${owner1Token}`);
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.id).toBe(unit1Id);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.property).toBeUndefined(); // Should not overfetch nested property
    });
  });

  describe('PATCH /api/v1/units/:id', () => {
    it('should deny update of another owners unit', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/units/${unit1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({ status: 'OCCUPIED' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/units/:id', () => {
    it('should deny deletion of another owners unit', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/units/${unit1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`);
      expect(res.status).toBe(403);
    });

    it('should allow deletion of own unit', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/units/${unit1Id}`)
        .set('Authorization', `Bearer ${owner1Token}`);
      expect(res.status).toBe(200);
    });
  });
});
