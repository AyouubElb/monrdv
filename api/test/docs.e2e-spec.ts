import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './create-app.js';

describe('API docs', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves Swagger UI at /api/docs', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('documents the controllers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const document = res.body as { paths: Record<string, unknown> };
    expect(Object.keys(document.paths)).toContain('/api/health');
  });
});
