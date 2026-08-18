import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    name: 'Test Owner',
    email: `test_owner_${Date.now()}@example.com`,
    password: 'Password123!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable ValidationPipe to test DTOs
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
  });

  afterAll(async () => {
    // Cleanup the test user
    await prisma.user.deleteMany({
      where: { email: { contains: 'test_owner_' } },
    });
    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should reject registration if role is supplied', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: testUser.name,
          email: `role_${testUser.email}`,
          password: testUser.password,
          role: 'ADMIN', // Should be rejected by forbidNonWhitelisted
        });

      expect(response.status).toBe(400);
    });

    it('should register a new user with OWNER role', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: testUser.name,
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.email).toBe(testUser.email);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.role).toBe('OWNER');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should reject registration if email is already in use', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(409);
    });

    it('should reject registration with invalid email', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'not-an-email',
        });

      expect(response.status).toBe(400);
    });

    it('should reject registration with weak password', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: `another_${Date.now()}@example.com`,
          password: 'short',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should login successfully and return JWT', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.accessToken).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.user.email).toBe(testUser.email);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('should reject login with wrong password', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('/api/v1/auth/me (GET)', () => {
    let token = '';

    beforeAll(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      token = response.body.accessToken;
    });

    it('should return user info when authenticated', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.email).toBe(testUser.email);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should reject unauthenticated requests', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer()).get(
        '/api/v1/auth/me',
      );

      expect(response.status).toBe(401);
    });
  });
});
