import type { NestExpressApplication } from '@nestjs/platform-express';
import request, { type Response } from 'supertest';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createBusiness } from './db.js';

/** Meets every password rule (spec 0005, AC-7). */
export const OWNER_PASSWORD = 'Salonatlas1!';

let lastIp = 0;

/** A new client IP per call, so one test's rate limit counts never reach the next. */
export function freshIp(): string {
  lastIp += 1;
  return `10.0.${Math.floor(lastIp / 250)}.${(lastIp % 250) + 1}`;
}

/** What the browser sends as `Origin` for a page on this host (`COOKIE_SECURE=false`). */
export function originOf(host: string): string {
  return `http://${host}`;
}

export interface Owner {
  businessId: string;
  userId: string;
  email: string;
  host: string;
}

/** A business with its owner user and staff row, written as app_migrator. */
export async function createOwner(
  migrator: PrismaClient,
  subdomain: string,
  firstName: string,
  passwordHash: string,
): Promise<Owner> {
  const businessId = await createBusiness(
    migrator,
    subdomain,
    `Business ${subdomain}`,
  );
  const email = `owner@${subdomain}.test`;
  const user = await migrator.user.create({
    data: { businessId, email, passwordHash, role: 'owner' },
    select: { id: true },
  });
  await migrator.staff.create({
    data: { businessId, name: firstName, userId: user.id },
  });
  return { businessId, userId: user.id, email, host: `${subdomain}.localhost` };
}

export function login(
  app: NestExpressApplication,
  host: string,
  email: string,
  password: string,
  ip: string = freshIp(),
) {
  return request(app.getHttpServer())
    .post('/api/auth/login')
    .set('Host', host)
    .set('Origin', originOf(host))
    .set('X-Forwarded-For', ip)
    .send({ email, password });
}

export function refresh(
  app: NestExpressApplication,
  host: string,
  refreshToken?: string,
  ip: string = freshIp(),
) {
  const req = request(app.getHttpServer())
    .post('/api/auth/refresh')
    .set('Host', host)
    .set('Origin', originOf(host))
    .set('X-Forwarded-For', ip);
  return refreshToken === undefined
    ? req
    : req.set('Cookie', `rt=${refreshToken}`);
}

/** The full `Set-Cookie` line for one cookie, or undefined when the response does not set it. */
export function setCookieLine(res: Response, name: string): string | undefined {
  const lines = res.headers['set-cookie'] as unknown as string[] | undefined;
  return lines?.find((line) => line.startsWith(`${name}=`));
}

/** The value a response sets for one cookie. */
export function cookieValue(res: Response, name: string): string | undefined {
  return setCookieLine(res, name)
    ?.slice(name.length + 1)
    .split(';')[0];
}
