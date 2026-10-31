import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-app.js';

// covers: AC-2
describe('GET /api/health', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports the database as up and echoes the host', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Host', 'atlas.localhost')
      .expect(200);

    expect(res.body).toEqual({
      status: 'ok',
      database: 'up',
      host: 'atlas.localhost',
    });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('uses X-Forwarded-Host from a trusted proxy (the web app calling over the private network)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Host', 'api:3001')
      .set('X-Forwarded-Host', 'atlas.localhost')
      .expect(200);

    expect(res.body).toMatchObject({ host: 'atlas.localhost' });
  });
});

// covers: AC-2 (the deploy health check must see a broken database as a failure)
describe('GET /api/health with the database unreachable', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const unreachable = {
      $queryRaw: vi
        .fn()
        .mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5433')),
      $disconnect: vi.fn().mockResolvedValue(undefined),
      onModuleDestroy: vi.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(unreachable)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bufferLogs: true,
    });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 503 with the database down and still echoes the host', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Host', 'atlas.localhost')
      .expect(503);

    expect(res.body).toEqual({
      status: 'degraded',
      database: 'down',
      host: 'atlas.localhost',
    });
  });

  it('does not leak the connection error to the caller', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Host', 'atlas.localhost');

    expect(res.text).not.toMatch(/ECONNREFUSED|5433/);
  });
});
