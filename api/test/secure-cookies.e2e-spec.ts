import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { hashPassword } from '../src/common/auth/password.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestApp } from './create-app.js';
import { createMigratorClient, resetBusinesses } from './db.js';
import {
  createOwner,
  freshIp,
  OWNER_PASSWORD,
  type Owner,
  setCookieLine,
} from './owners.js';

// Runs before the imports, so the app reads it when its config module loads.
vi.hoisted(() => {
  vi.stubEnv('COOKIE_SECURE', 'true');
});

describe('with COOKIE_SECURE=true', () => {
  let app: NestExpressApplication;
  let migrator: PrismaClient;
  let atlas: Owner;

  beforeAll(async () => {
    app = await createTestApp();
    migrator = createMigratorClient();
    await resetBusinesses(migrator);
    atlas = await createOwner(
      migrator,
      'atlas',
      'Samira',
      await hashPassword(OWNER_PASSWORD),
    );
  });

  afterAll(async () => {
    await resetBusinesses(migrator);
    await migrator.$disconnect();
    await app.close();
    vi.unstubAllEnvs();
  });

  // covers: AC-16
  it('refuses an http Origin with 403 bad_origin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Host', atlas.host)
      .set('Origin', 'http://atlas.localhost')
      .expect(403);

    expect(res.body).toMatchObject({ code: 'bad_origin' });
  });

  // covers: AC-16
  it('lets the https Origin of the host through', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Host', atlas.host)
      .set('Origin', 'https://atlas.localhost')
      .expect(401);

    expect(res.body).toMatchObject({ code: 'unauthenticated' });
  });

  // covers: AC-9
  it('signs in with Secure __Host- cookies', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Host', atlas.host)
      .set('Origin', 'https://atlas.localhost')
      .set('X-Forwarded-For', freshIp())
      .send({ email: atlas.email, password: OWNER_PASSWORD })
      .expect(200);

    const at = setCookieLine(res, '__Host-at');
    const rt = setCookieLine(res, '__Host-rt');
    expect(at).toMatch(/Max-Age=900;/);
    expect(rt).toMatch(/Max-Age=604800;/);
    for (const line of [at, rt]) {
      expect(line).toMatch(/Secure/);
      expect(line).toMatch(/Path=\/;/);
      expect(line).not.toMatch(/Domain=/i);
    }
    expect(setCookieLine(res, 'at')).toBeUndefined();
  });
});
