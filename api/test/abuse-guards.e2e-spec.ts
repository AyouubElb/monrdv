import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { hashPassword } from '../src/common/auth/password.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestApp } from './create-app.js';
import { createMigratorClient, resetBusinesses } from './db.js';
import {
  createOwner,
  freshIp,
  login,
  originOf,
  OWNER_PASSWORD,
  type Owner,
  refresh,
} from './owners.js';

const TOO_MANY = {
  statusCode: 429,
  code: 'too_many_requests',
  message: 'Trop de tentatives. Réessayez dans quelques minutes.',
};

function signupBody(subdomain: string) {
  return {
    businessName: 'Salon Test',
    kind: 'salon',
    subdomain,
    phone: '0612345678',
    minNoticeMinutes: 60,
    bookingWindowDays: 60,
    cancelNoticeHours: 24,
    firstName: 'Samira',
    email: `owner@${subdomain}.test`,
    password: OWNER_PASSWORD,
  };
}

// A few tests send 30 requests, some running argon2.
describe('abuse guards', { timeout: 30_000 }, () => {
  let app: NestExpressApplication;
  let migrator: PrismaClient;
  let passwordHash: string;
  let atlas: Owner;
  let anfa: Owner;

  beforeAll(async () => {
    app = await createTestApp();
    migrator = createMigratorClient();
    passwordHash = await hashPassword(OWNER_PASSWORD);
  });

  beforeEach(async () => {
    await resetBusinesses(migrator);
    atlas = await createOwner(migrator, 'atlas', 'Samira', passwordHash);
    anfa = await createOwner(migrator, 'anfa', 'Amina', passwordHash);
  });

  afterAll(async () => {
    await resetBusinesses(migrator);
    await migrator.$disconnect();
    await app.close();
  });

  // covers: AC-16
  describe('Origin check', () => {
    function signup(origin?: string) {
      const req = request(app.getHttpServer())
        .post('/api/signup')
        .set('Host', 'localhost')
        .set('X-Forwarded-For', freshIp());
      return (origin ? req.set('Origin', origin) : req).send(
        signupBody('salon-origin'),
      );
    }

    it('refuses a POST from a sibling business with 403 bad_origin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Host', atlas.host)
        .set('Origin', originOf(anfa.host))
        .expect(403);

      expect(res.body).toEqual({
        statusCode: 403,
        code: 'bad_origin',
        message: 'Requête refusée. Rechargez la page puis réessayez.',
      });
    });

    it.each([
      ['no Origin', undefined],
      ['a sibling Origin', 'http://atlas.localhost'],
      ['the https scheme while COOKIE_SECURE is false', 'https://localhost'],
    ])('refuses a signup with %s and writes nothing', async (_, origin) => {
      await signup(origin).expect(403);

      expect(
        await migrator.business.count({ where: { subdomain: 'salon-origin' } }),
      ).toBe(0);
    });

    it.each(['put', 'patch', 'delete'] as const)(
      'refuses %s with no Origin, even on a route that does not exist',
      async (method) => {
        const res = await request(app.getHttpServer())
          [method]('/api/nope')
          .set('Host', atlas.host)
          .expect(403);

        expect(res.body).toMatchObject({ code: 'bad_origin' });
      },
    );

    it('lets a request with its own Origin through', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Host', atlas.host)
        .set('Origin', originOf(atlas.host))
        .expect(401);

      expect(res.body).toMatchObject({ code: 'unauthenticated' });
    });

    it('does not ask a GET for an Origin', async () => {
      await request(app.getHttpServer())
        .get('/api/tenant')
        .set('Host', atlas.host)
        .expect(200);
    });
  });

  // covers: AC-8
  describe('rate limits', () => {
    it('blocks the 6th signup from one IP for about an hour, and serves another IP', async () => {
      const ip = freshIp();
      const signup = (subdomain: string, from: string) =>
        request(app.getHttpServer())
          .post('/api/signup')
          .set('Host', 'localhost')
          .set('Origin', 'http://localhost')
          .set('X-Forwarded-For', from)
          .send(signupBody(subdomain));
      for (let i = 1; i <= 5; i += 1) {
        await signup(`salon-limit-${i}`, ip).expect(201);
      }

      const res = await signup('salon-limit-6', ip).expect(429);

      expect(res.body).toEqual(TOO_MANY);
      const retryAfter = Number(res.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(3500);
      expect(retryAfter).toBeLessThanOrEqual(3600);
      expect(res.headers['retry-after-ip']).toBeUndefined();
      expect(
        await migrator.business.count({
          where: { subdomain: 'salon-limit-6' },
        }),
      ).toBe(0);
      await signup('salon-limit-6', freshIp()).expect(201);
    });

    it('blocks the 31st subdomain check from one IP, and serves another IP', async () => {
      const ip = freshIp();
      const check = (from: string) =>
        request(app.getHttpServer())
          .get('/api/signup/subdomain')
          .query({ value: 'salon-libre' })
          .set('Host', 'localhost')
          .set('X-Forwarded-For', from);
      for (let i = 1; i <= 30; i += 1) {
        await check(ip).expect(200);
      }

      const res = await check(ip).expect(429);

      expect(res.body).toEqual(TOO_MANY);
      expect(res.headers['retry-after']).toBeDefined();
      await check(freshIp()).expect(200);
    });

    it('blocks the 6th login for one account from any IP, matching the email trimmed and in any case', async () => {
      for (let i = 1; i <= 5; i += 1) {
        await login(app, atlas.host, atlas.email, 'Wrongpass1!').expect(401);
      }

      const res = await login(
        app,
        atlas.host,
        '  OWNER@Atlas.test ',
        OWNER_PASSWORD,
      ).expect(429);

      expect(res.body).toEqual(TOO_MANY);
      expect(res.headers['retry-after']).toBeDefined();
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('counts the same email on another business on its own', async () => {
      for (let i = 1; i <= 5; i += 1) {
        await login(app, atlas.host, 'same@mail.test', 'Wrongpass1!').expect(
          401,
        );
      }

      await login(app, anfa.host, 'same@mail.test', 'Wrongpass1!').expect(401);
    });

    it('blocks the 6th login from one IP with different emails', async () => {
      const ip = freshIp();
      for (let i = 1; i <= 5; i += 1) {
        await login(
          app,
          atlas.host,
          `guess${i}@atlas.test`,
          'Wrongpass1!',
          ip,
        ).expect(401);
      }

      const res = await login(
        app,
        atlas.host,
        atlas.email,
        OWNER_PASSWORD,
        ip,
      ).expect(429);

      expect(res.body).toEqual(TOO_MANY);
    });

    it('blocks the 31st refresh from one IP and leaves the cookies alone', async () => {
      const ip = freshIp();
      for (let i = 1; i <= 30; i += 1) {
        await refresh(app, atlas.host, 'bogus-token', ip).expect(401);
      }

      const res = await refresh(app, atlas.host, 'bogus-token', ip).expect(429);

      expect(res.body).toEqual(TOO_MANY);
      expect(res.headers['retry-after']).toBeDefined();
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });
});
