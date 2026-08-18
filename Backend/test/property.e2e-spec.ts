import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('PropertyController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let owner1Token: string;
  let owner2Token: string;
  let tenantToken: string;

  const owner1 = {
    email: `owner1_${Date.now()}@test.com`,
    name: 'Owner 1',
    password: 'Password123!',
    role: Role.OWNER,
  };
  const owner2 = {
    email: `owner2_${Date.now()}@test.com`,
    name: 'Owner 2',
    password: 'Password123!',
    role: Role.OWNER,
  };
  const tenant = {
    email: `tenant_${Date.now()}@test.com`,
    name: 'Tenant 1',
    password: 'Password123!',
    role: Role.TENANT,
  };

  let property1Id: number;

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

    // Setup DB
    const pwdHash = await bcrypt.hash('Password123!', 10);
    await prisma.user.createMany({
      data: [
        {
          email: owner1.email,
          name: owner1.name,
          passwordHash: pwdHash,
          role: owner1.role,
        },
        {
          email: owner2.email,
          name: owner2.name,
          passwordHash: pwdHash,
          role: owner2.role,
        },
        {
          email: tenant.email,
          name: tenant.name,
          passwordHash: pwdHash,
          role: tenant.role,
        },
      ],
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
    owner1Token = await login(owner1.email);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    owner2Token = await login(owner2.email);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    tenantToken = await login(tenant.email);
  });

  afterAll(async () => {
    // Delete properties first
    await prisma.property.deleteMany({
      where: { owner: { email: { in: [owner1.email, owner2.email] } } },
    });
    // Delete users
    await prisma.user.deleteMany({
      where: { email: { in: [owner1.email, owner2.email, tenant.email] } },
    });
    await app.close();
  });

  describe('POST /api/v1/properties', () => {
    it('should reject unauthenticated requests', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties')
        .send({ name: 'Prop', address: '123 St' });
      expect(res.status).toBe(401);
    });

    it('should reject TENANT requests', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ name: 'Prop', address: '123 St' });
      expect(res.status).toBe(403);
    });

    it('should allow OWNER to create property', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ name: 'Owner1 Prop', address: '123 St' });

      expect(res.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.name).toBe('Owner1 Prop');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      property1Id = res.body.id;
    });
  });

  describe('GET /api/v1/properties', () => {
    it('should only return properties belonging to the authenticated owner', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res1 = await request(app.getHttpServer())
        .get('/api/v1/properties')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res1.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res1.body.length).toBe(1);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res2 = await request(app.getHttpServer())
        .get('/api/v1/properties')
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res2.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res2.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/properties/:id', () => {
    it('should deny OWNER access to another owner property', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/properties/${property1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`);
      expect(res.status).toBe(403);
    });

    it('should allow OWNER to access their own property', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/properties/${property1Id}`)
        .set('Authorization', `Bearer ${owner1Token}`);
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.id).toBe(property1Id);
    });
  });

  describe('PATCH /api/v1/properties/:id', () => {
    it('should deny OWNER update of another owner property', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/properties/${property1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({ name: 'Hack' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/properties/:id', () => {
    it('should deny OWNER deletion of another owner property', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/properties/${property1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`);
      expect(res.status).toBe(403);
    });

    it('should allow OWNER to delete their property', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/properties/${property1Id}`)
        .set('Authorization', `Bearer ${owner1Token}`);
      expect(res.status).toBe(200);
    });
  });
});
