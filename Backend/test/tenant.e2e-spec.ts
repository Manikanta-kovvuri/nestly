import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('TenantController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerBToken: string;
  let tenantToken: string;

  let tenantId: number;

  const ownerEmail = `o_tenant_e2e_${Date.now()}@test.com`;
  const ownerBEmail = `ob_tenant_e2e_${Date.now()}@test.com`;
  const tenantEmail = `t_tenant_e2e_${Date.now()}@test.com`;

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
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: 'O1',
        role: Role.OWNER,
        passwordHash: pwdHash,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ownerB = await prisma.user.create({
      data: {
        email: ownerBEmail,
        name: 'O2',
        role: Role.OWNER,
        passwordHash: pwdHash,
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
    ownerBToken = await login(ownerBEmail);
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { user: { email: tenantEmail } } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, ownerBEmail, tenantEmail] } },
    });
    await app.close();
  });

  describe('POST /api/v1/tenants', () => {
    it('should allow OWNER to create a tenant', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Test Tenant',
          email: tenantEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.email).toBe(tenantEmail);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.role).toBe('TENANT');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.passwordHash).toBeUndefined();

      // Ensure tenant profile was created
      const dbTenant = await prisma.tenant.findUnique({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        where: { userId: res.body.id },
      });
      expect(dbTenant).toBeDefined();
      tenantId = dbTenant!.id;
    });

    it('should reject duplicate email', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Test Tenant',
          email: tenantEmail,
          password: 'Password123!',
        });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/tenants', () => {
    it('should allow tenant to fetch own profile after logging in', async () => {
      // Login as the newly created tenant
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: tenantEmail, password: 'Password123!' });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      tenantToken = loginRes.body.accessToken;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.length).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const fetchedId: number = res.body[0].id;
      expect(fetchedId).toBe(tenantId);
    });

    it('should allow OWNER A to see the tenant they created', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.length).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const fetchedId: number = res.body[0].id;
      expect(fetchedId).toBe(tenantId);
    });

    it('should NOT allow OWNER B to see OWNER A’s tenant', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${ownerBToken}`);

      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/tenants/:id', () => {
    it('should allow OWNER A to access the tenant they created', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body.id).toBe(tenantId);
    });

    it('should NOT allow OWNER B to access OWNER A’s tenant', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${ownerBToken}`);

      expect(res.status).toBe(403);
    });
  });
});
