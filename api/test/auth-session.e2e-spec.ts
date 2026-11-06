import { randomBytes, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { hashPassword } from '../src/common/auth/password.js';
import { hashToken } from '../src/common/auth/token-hash.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestApp } from './create-app.js';
import { createMigratorClient, resetBusinesses } from './db.js';
import {
  cookieValue,
  createOwner,
  freshIp,
  login,
  originOf,
  OWNER_PASSWORD,
  type Owner,
  refresh,
  setCookieLine,
} from './owners.js';
import { accessCookie, signAccessToken } from './tokens.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CLEARED = /Expires=Thu, 01 Jan 1970 00:00:00 GMT/;

// Each login runs argon2 on purpose, so a test with a few logins needs more than 5 seconds.
describe('owner session', { timeout: 20_000 }, () => {
  let app: NestExpressApplication;
  let migrator: PrismaClient;
  let passwordHash: string;
  let atlas: Owner;
  let anfa: Owner;

  function me(host: string, accessToken: string) {
    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', host)
      .set('Cookie', accessCookie(accessToken));
  }

  function logout(host: string, accessToken?: string) {
    const req = request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Host', host)
      .set('Origin', originOf(host))
      .set('X-Forwarded-For', freshIp());
    return accessToken === undefined
      ? req
      : req.set('Cookie', accessCookie(accessToken));
  }

  /** Signs in as the Atlas owner and returns the cookie values. */
  async function signIn(owner: Owner = atlas) {
    const res = await login(
      app,
      owner.host,
      owner.email,
      OWNER_PASSWORD,
    ).expect(200);
    return { at: cookieValue(res, 'at')!, rt: cookieValue(res, 'rt')! };
  }

  function rowOf(refreshToken: string) {
    return migrator.refreshToken.findFirstOrThrow({
      where: { tokenHash: hashToken(refreshToken) },
    });
  }

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

  describe('POST /api/auth/login', () => {
    // covers: AC-9
    it('signs in with a padded, uppercase email and returns only the public owner fields', async () => {
      const res = await login(
        app,
        atlas.host,
        '  OWNER@Atlas.TEST ',
        OWNER_PASSWORD,
      ).expect(200);

      expect(res.body).toEqual({
        user: { id: atlas.userId, email: atlas.email, firstName: 'Samira' },
        business: { subdomain: 'atlas', name: 'Business atlas' },
      });
    });

    // covers: AC-9
    it('sets host only, HttpOnly, Lax access and refresh cookies with their lifetimes', async () => {
      const res = await login(
        app,
        atlas.host,
        atlas.email,
        OWNER_PASSWORD,
      ).expect(200);

      const at = setCookieLine(res, 'at');
      const rt = setCookieLine(res, 'rt');
      expect(at).toMatch(/Max-Age=900;/);
      expect(rt).toMatch(/Max-Age=604800;/);
      for (const line of [at, rt]) {
        expect(line).toMatch(/Path=\/;/);
        expect(line).toMatch(/HttpOnly/);
        expect(line).toMatch(/SameSite=Lax/);
        expect(line).not.toMatch(/Domain=/i);
        expect(line).not.toMatch(/Secure/);
      }
    });

    // covers: key invariant (raw refresh tokens are never stored)
    it('stores one refresh row holding the SHA 256 of the token, valid for 7 days', async () => {
      const { rt } = await signIn();

      const rows = await migrator.refreshToken.findMany({
        where: { userId: atlas.userId },
      });
      expect(rows).toHaveLength(1);
      const [row] = rows;
      expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(row.tokenHash).toBe(hashToken(rt));
      expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBeGreaterThan(
        7 * DAY_MS - 60_000,
      );
      expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBeLessThan(
        7 * DAY_MS + 60_000,
      );
    });

    // covers: AC-10 (login errors never reveal whether an email exists in a business)
    it.each([
      [
        'the right credentials on another business',
        'anfa.localhost',
        'owner@atlas.test',
        OWNER_PASSWORD,
      ],
      [
        'a wrong password',
        'atlas.localhost',
        'owner@atlas.test',
        'Wrongpass1!',
      ],
      [
        'an unknown email',
        'atlas.localhost',
        'nobody@atlas.test',
        OWNER_PASSWORD,
      ],
    ])(
      'answers the same 401 to %s and sets no cookie',
      async (_, host, email, password) => {
        const res = await login(app, host, email, password).expect(401);

        expect(res.body).toEqual({
          statusCode: 401,
          code: 'invalid_credentials',
          message: 'Email ou mot de passe incorrect.',
        });
        expect(res.headers['set-cookie']).toBeUndefined();
      },
    );

    it('answers 404 business_not_found on a subdomain with no business', async () => {
      const res = await login(
        app,
        'ghost.localhost',
        atlas.email,
        OWNER_PASSWORD,
      ).expect(404);

      expect(res.body).toMatchObject({ code: 'business_not_found' });
    });
  });

  describe('GET /api/auth/me', () => {
    // covers: AC-9, AC-11
    it('returns the first name and business of the signed in owner', async () => {
      const { at } = await signIn();

      const res = await me(atlas.host, at).expect(200);

      expect(res.body).toEqual({
        user: { id: atlas.userId, email: atlas.email, firstName: 'Samira' },
        business: { subdomain: 'atlas', name: 'Business atlas' },
      });
    });

    // covers: AC-10
    it('refuses the Atlas access cookie on another business', async () => {
      const { at } = await signIn();

      const res = await me(anfa.host, at).expect(401);

      expect(res.body).toMatchObject({ code: 'unauthenticated' });
    });

    it('answers token_expired to an expired access token', async () => {
      const expired = signAccessToken({
        businessId: atlas.businessId,
        userId: atlas.userId,
        expiresInSeconds: -60,
      });

      const res = await me(atlas.host, expired).expect(401);

      expect(res.body).toMatchObject({ code: 'token_expired' });
    });
  });

  describe('POST /api/auth/refresh', () => {
    // covers: AC-13
    it('rotates the token: a new pair, the old row marked rotated, the new row in the same family', async () => {
      const first = await signIn();

      const res = await refresh(app, atlas.host, first.rt).expect(204);

      const at = cookieValue(res, 'at');
      const rt = cookieValue(res, 'rt');
      expect(at).toBeTruthy();
      expect(rt).toBeTruthy();
      expect(rt).not.toBe(first.rt);
      const oldRow = await rowOf(first.rt);
      const newRow = await rowOf(rt!);
      expect(oldRow.rotatedAt).not.toBeNull();
      expect(newRow.familyId).toBe(oldRow.familyId);
      expect(newRow.rotatedAt).toBeNull();
      await me(atlas.host, at!).expect(200);
    });

    // covers: AC-13 (two tabs refreshing at once)
    it('gives a fresh pair in the same family to the old token presented again within 20 seconds', async () => {
      const first = await signIn();
      await refresh(app, atlas.host, first.rt).expect(204);

      const res = await refresh(app, atlas.host, first.rt).expect(204);

      expect(cookieValue(res, 'rt')).toBeTruthy();
      const { familyId } = await rowOf(first.rt);
      expect(await migrator.refreshToken.count({ where: { familyId } })).toBe(
        3,
      );
    });

    // covers: AC-13 (theft: the old token comes back after the grace)
    it('revokes the whole family when the old token comes back after 20 seconds', async () => {
      const first = await signIn();
      const rotated = await refresh(app, atlas.host, first.rt).expect(204);
      const newestRt = cookieValue(rotated, 'rt')!;
      const newestAt = cookieValue(rotated, 'at')!;
      // Moves the rotation 30 seconds into the past instead of waiting.
      const oldRow = await rowOf(first.rt);
      await migrator.refreshToken.update({
        where: { id: oldRow.id },
        data: { rotatedAt: new Date(Date.now() - 30_000) },
      });

      const res = await refresh(app, atlas.host, first.rt).expect(401);

      expect(res.body).toMatchObject({ code: 'unauthenticated' });
      expect(setCookieLine(res, 'at')).toMatch(CLEARED);
      expect(setCookieLine(res, 'rt')).toMatch(CLEARED);
      const family = await migrator.refreshToken.findMany({
        where: { familyId: oldRow.familyId },
      });
      expect(family.every((row) => row.revokedAt !== null)).toBe(true);
      await refresh(app, atlas.host, newestRt).expect(401);
      await me(atlas.host, newestAt).expect(401);
    });

    // covers: AC-13 (exactly one request rotates a row; the other takes the grace)
    it('answers 204 to both of two parallel refreshes with one token', async () => {
      const { rt } = await signIn();

      const results = await Promise.all([
        refresh(app, atlas.host, rt),
        refresh(app, atlas.host, rt),
      ]);

      expect(results.map((res) => res.status)).toEqual([204, 204]);
    });

    // covers: AC-10
    it('refuses the Atlas refresh cookie on another business and keeps it working on Atlas', async () => {
      const { rt } = await signIn();

      const res = await refresh(app, anfa.host, rt).expect(401);

      expect(res.body).toMatchObject({ code: 'unauthenticated' });
      await refresh(app, atlas.host, rt).expect(204);
    });

    it.each([
      ['no refresh cookie', undefined],
      ['an unknown refresh token', 'bogus-token'],
    ])('answers 401 and clears both cookies with %s', async (_, token) => {
      const res = await refresh(app, atlas.host, token).expect(401);

      expect(res.body).toMatchObject({ code: 'unauthenticated' });
      expect(setCookieLine(res, 'at')).toMatch(CLEARED);
      expect(setCookieLine(res, 'rt')).toMatch(CLEARED);
    });

    it('refuses an expired refresh token', async () => {
      const { rt } = await signIn();
      const row = await rowOf(rt);
      await migrator.refreshToken.update({
        where: { id: row.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await refresh(app, atlas.host, rt).expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    // covers: AC-14
    it('revokes the family, clears both cookies, and refuses the old tokens afterwards', async () => {
      const { at, rt } = await signIn();

      const res = await logout(atlas.host, at).expect(204);

      expect(setCookieLine(res, 'at')).toMatch(CLEARED);
      expect(setCookieLine(res, 'rt')).toMatch(CLEARED);
      const row = await rowOf(rt);
      expect(row.revokedAt).not.toBeNull();
      await me(atlas.host, at).expect(401);
      await refresh(app, atlas.host, rt).expect(401);
    });

    it('answers 401 with no access cookie', async () => {
      const res = await logout(atlas.host).expect(401);

      expect(res.body).toMatchObject({ code: 'unauthenticated' });
    });

    // covers: AC-12 (the browser refreshes on token_expired, then retries the logout)
    it('answers token_expired to an expired access token', async () => {
      const expired = signAccessToken({
        businessId: atlas.businessId,
        userId: atlas.userId,
        expiresInSeconds: -60,
      });

      const res = await logout(atlas.host, expired).expect(401);

      expect(res.body).toMatchObject({ code: 'token_expired' });
    });

    it('leaves another session of the same owner signed in', async () => {
      const phone = await signIn();
      const laptop = await signIn();

      await logout(atlas.host, phone.at).expect(204);

      await me(atlas.host, laptop.at).expect(200);
      await refresh(app, atlas.host, laptop.rt).expect(204);
    });
  });

  // covers: AC-15
  describe('clean as you go', () => {
    async function addRow(
      owner: Pick<Owner, 'businessId' | 'userId'>,
      dates: { expiresAt?: Date; revokedAt?: Date },
    ): Promise<string> {
      const row = await migrator.refreshToken.create({
        data: {
          businessId: owner.businessId,
          userId: owner.userId,
          familyId: randomUUID(),
          tokenHash: randomBytes(32).toString('hex'),
          expiresAt: dates.expiresAt ?? new Date(Date.now() + DAY_MS),
          revokedAt: dates.revokedAt ?? null,
        },
        select: { id: true },
      });
      return row.id;
    }

    async function remaining(ids: string[]): Promise<string[]> {
      const rows = await migrator.refreshToken.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });
      return rows.map((row) => row.id).sort();
    }

    it('deletes only the signed in owner dead rows on login', async () => {
      const colleague = await migrator.user.create({
        data: {
          businessId: atlas.businessId,
          email: 'karim@atlas.test',
          passwordHash,
          role: 'owner',
        },
        select: { id: true },
      });
      const now = Date.now();
      const expired = await addRow(atlas, { expiresAt: new Date(now - 1000) });
      const revokedLongAgo = await addRow(atlas, {
        revokedAt: new Date(now - 2 * DAY_MS),
      });
      const revokedRecently = await addRow(atlas, {
        revokedAt: new Date(now - 60 * 60_000),
      });
      const active = await addRow(atlas, {});
      const others = [
        await addRow(
          { businessId: atlas.businessId, userId: colleague.id },
          { expiresAt: new Date(now - 1000) },
        ),
        await addRow(anfa, { expiresAt: new Date(now - 1000) }),
        await addRow(anfa, { revokedAt: new Date(now - 2 * DAY_MS) }),
      ];

      await signIn();

      expect(await remaining([expired, revokedLongAgo])).toEqual([]);
      expect(await remaining([revokedRecently, active, ...others])).toEqual(
        [revokedRecently, active, ...others].sort(),
      );
    });

    it('deletes the owner dead rows on refresh too', async () => {
      const { rt } = await signIn();
      const expired = await addRow(atlas, {
        expiresAt: new Date(Date.now() - 1000),
      });
      const otherBusiness = await addRow(anfa, {
        expiresAt: new Date(Date.now() - 1000),
      });

      await refresh(app, atlas.host, rt).expect(204);

      expect(await remaining([expired])).toEqual([]);
      expect(await remaining([otherBusiness])).toEqual([otherBusiness]);
    });
  });
});
