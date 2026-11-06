import type { NestExpressApplication } from '@nestjs/platform-express';
import argon2 from 'argon2';
import request from 'supertest';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestApp } from './create-app.js';
import { createBusiness, createMigratorClient, resetBusinesses } from './db.js';
import { freshIp, OWNER_PASSWORD, originOf } from './owners.js';

const ROOT = 'localhost';

function signupBody(overrides: Record<string, unknown> = {}) {
  return {
    businessName: '  Salon Test ',
    kind: 'salon',
    subdomain: 'salon-test',
    phone: '06 12 34 56 78',
    minNoticeMinutes: 120,
    bookingWindowDays: 30,
    cancelNoticeHours: 48,
    firstName: ' Samira ',
    email: ' Samira@Example.MA ',
    password: OWNER_PASSWORD,
    ...overrides,
  };
}

describe('POST /api/signup', () => {
  let app: NestExpressApplication;
  let migrator: PrismaClient;

  function signup(body: object, host = ROOT) {
    return request(app.getHttpServer())
      .post('/api/signup')
      .set('Host', host)
      .set('Origin', originOf(host))
      .set('X-Forwarded-For', freshIp())
      .send(body);
  }

  beforeAll(async () => {
    app = await createTestApp();
    migrator = createMigratorClient();
  });

  beforeEach(async () => {
    await resetBusinesses(migrator);
  });

  afterAll(async () => {
    await resetBusinesses(migrator);
    await migrator.$disconnect();
    await app.close();
  });

  // covers: AC-4
  it('answers 201 with the subdomain and sets no cookie', async () => {
    const res = await signup(signupBody()).expect(201);

    expect(res.body).toEqual({ subdomain: 'salon-test' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  // covers: AC-4
  it('writes the business, its owner, and the owner staff row with cleaned values', async () => {
    await signup(signupBody()).expect(201);

    const business = await migrator.business.findUniqueOrThrow({
      where: { subdomain: 'salon-test' },
      include: { users: true, staff: true },
    });
    expect(business).toMatchObject({
      name: 'Salon Test',
      kind: 'salon',
      phone: '+212612345678',
      minNoticeMinutes: 120,
      bookingWindowDays: 30,
      cancelNoticeHours: 48,
      timezone: 'Africa/Casablanca',
    });
    expect(business.users).toHaveLength(1);
    const [user] = business.users;
    expect(user).toMatchObject({ email: 'samira@example.ma', role: 'owner' });
    expect(business.staff).toEqual([
      expect.objectContaining({ name: 'Samira', userId: user.id }),
    ]);
  });

  // covers: AC-4 (argon2id, 19456 KiB, 2 iterations, parallelism 1; never the raw password)
  it('stores an argon2id hash with the spec parameters that verifies the password', async () => {
    await signup(signupBody()).expect(201);

    const user = await migrator.user.findFirstOrThrow({
      where: { email: 'samira@example.ma' },
    });
    expect(user.passwordHash).toMatch(/^\$argon2id\$v=19\$/);
    expect(user.passwordHash).toMatch(/m=19456/);
    expect(user.passwordHash).toMatch(/t=2/);
    expect(user.passwordHash).toMatch(/p=1/);
    expect(user.passwordHash).not.toContain(OWNER_PASSWORD);
    await expect(
      argon2.verify(user.passwordHash, OWNER_PASSWORD),
    ).resolves.toBe(true);
  });

  // covers: AC-5
  it('makes the new address answer right away', async () => {
    await signup(signupBody()).expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/tenant')
      .set('Host', 'salon-test.localhost')
      .expect(200);

    expect(res.body).toMatchObject({
      subdomain: 'salon-test',
      name: 'Salon Test',
    });
  });

  // covers: AC-6
  it('answers 409 subdomain_taken when the subdomain already exists', async () => {
    await signup(signupBody()).expect(201);

    const res = await signup(
      signupBody({ email: 'other@example.ma', businessName: 'Autre' }),
    ).expect(409);

    expect(res.body).toEqual({
      statusCode: 409,
      code: 'subdomain_taken',
      message: 'Cette adresse est déjà prise.',
    });
    expect(await migrator.business.count()).toBe(1);
  });

  // covers: AC-6 (the unique index settles the race between check and submit)
  it('lets only one of two parallel signups for the same subdomain through', async () => {
    const [first, second] = await Promise.all([
      signup(signupBody({ subdomain: 'salon-race' })),
      signup(signupBody({ subdomain: 'salon-race', email: 'b@example.ma' })),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(
      await migrator.business.count({ where: { subdomain: 'salon-race' } }),
    ).toBe(1);
    expect(await migrator.user.count()).toBe(1);
  });

  // covers: AC-6
  it.each([
    ['reserved', 'admin'],
    ['uppercase', 'Salon-Test'],
    ['too short', 'ab'],
    ['punycode', 'xn--salon'],
  ])(
    'refuses a %s subdomain with 400 and writes nothing',
    async (_, subdomain) => {
      const res = await signup(signupBody({ subdomain })).expect(400);

      expect(res.body).toEqual({
        statusCode: 400,
        code: 'validation_failed',
        message:
          'Certaines informations ne sont pas valides. Vérifiez le formulaire.',
      });
      expect(await migrator.business.count()).toBe(0);
    },
  );

  // covers: AC-7
  it.each([
    ['no uppercase', 'salonatlas1!'],
    ['no lowercase', 'SALONATLAS1!'],
    ['no digit', 'Salonatlas!!'],
    ['no special character', 'Salonatlas12'],
    ['too short', 'Sa1!'],
  ])(
    'refuses a password with %s with 400 validation_failed',
    async (_, password) => {
      const res = await signup(signupBody({ password })).expect(400);

      expect(res.body).toMatchObject({ code: 'validation_failed' });
      expect(await migrator.user.count()).toBe(0);
    },
  );

  // covers: AC-4 (settings accept only BOOKING_SETTING_CHOICES)
  it('refuses a booking setting that is not one of the choices', async () => {
    await signup(signupBody({ minNoticeMinutes: 45 })).expect(400);

    expect(await migrator.business.count()).toBe(0);
  });

  it('refuses a phone number that is not Moroccan', async () => {
    await signup(signupBody({ phone: '+33612345678' })).expect(400);

    expect(await migrator.business.count()).toBe(0);
  });

  it('refuses a body with a missing field', async () => {
    const body: Partial<ReturnType<typeof signupBody>> = signupBody();
    delete body.firstName;

    await signup(body).expect(400);

    expect(await migrator.business.count()).toBe(0);
  });

  // security model: signup is root domain only
  it('answers 404 on a business subdomain', async () => {
    await createBusiness(migrator, 'atlas', 'Salon Atlas');

    const res = await signup(signupBody(), 'atlas.localhost').expect(404);

    expect(res.body).toMatchObject({ code: 'not_found' });
    expect(
      await migrator.business.count({ where: { subdomain: 'salon-test' } }),
    ).toBe(0);
  });
});

// covers: AC-3
describe('GET /api/signup/subdomain', () => {
  let app: NestExpressApplication;
  let migrator: PrismaClient;

  function check(value: string, host = ROOT) {
    return request(app.getHttpServer())
      .get('/api/signup/subdomain')
      .query({ value })
      .set('Host', host)
      .set('X-Forwarded-For', freshIp());
  }

  beforeAll(async () => {
    app = await createTestApp();
    migrator = createMigratorClient();
    await resetBusinesses(migrator);
    await createBusiness(migrator, 'atlas', 'Salon Atlas');
  });

  afterAll(async () => {
    await resetBusinesses(migrator);
    await migrator.$disconnect();
    await app.close();
  });

  it.each([
    ['atlas', 'taken'],
    ['admin', 'reserved'],
    ['a', 'invalid'],
    ['Atlas', 'invalid'],
    ['salon-libre', 'available'],
  ])('reports %s as %s', async (value, status) => {
    const res = await check(value).expect(200);

    expect(res.body).toEqual({ status });
  });

  it('answers 404 on a business subdomain', async () => {
    const res = await check('salon-libre', 'atlas.localhost').expect(404);

    expect(res.body).toMatchObject({ code: 'not_found' });
  });
});
