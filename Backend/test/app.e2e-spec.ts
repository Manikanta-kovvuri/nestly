import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

/**
 * E2E smoke test suite.
 *
 * NOTE: This suite requires a real database connection (DATABASE_URL env var).
 * In CI, set DATABASE_URL to point to a test database.
 *
 * The /health endpoint is tested without database interaction since it
 * performs no Prisma queries.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          expect(res.body.status).toBe('ok');
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          expect(res.body.service).toBe('nestly-api');
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });
});
