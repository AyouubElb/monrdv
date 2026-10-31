import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './create-app.js';

// Trust only an address the test client is not, so its forwarded headers count as spoofed.
// Runs before the imports, so the app reads it when its config module loads.
vi.hoisted(() => {
  vi.stubEnv('TRUSTED_PROXY', '10.255.255.254');
});

// covers: AC-2 (value sourcing: the host comes from X-Forwarded-Host only via a trusted proxy).
// The host decides the business in tenant isolation, so a spoofed header must never win.
describe('GET /api/health from an untrusted address', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('ignores X-Forwarded-Host and reports the real Host', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Host', 'atlas.localhost')
      .set('X-Forwarded-Host', 'anfa.localhost')
      .expect(200);

    expect(res.body).toMatchObject({ host: 'atlas.localhost' });
  });
});
