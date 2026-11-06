import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { accessCookieName } from '../src/common/auth/access-token.js';

/** Same value as `JWT_ACCESS_SECRET` in vitest.config.ts. */
export const TEST_ACCESS_SECRET = 'test-only-access-secret-at-least-32-bytes';

/** The access cookie name in tests (`COOKIE_SECURE=false` in vitest.config.ts). */
export const ACCESS_COOKIE = accessCookieName(false);

/**
 * Signs an access token the way login will (feature 5): HS256 with `sub`, `bid`, `role`,
 * `sid`, `exp`. `expiresInSeconds` may be negative to make an expired token. `secret`
 * lets a test sign with the wrong key.
 */
export function signAccessToken(options: {
  businessId: string;
  userId?: string;
  role?: string;
  sid?: string;
  expiresInSeconds?: number;
  secret?: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: options.userId ?? randomUUID(),
    bid: options.businessId,
    role: options.role ?? 'owner',
    sid: options.sid ?? randomUUID(),
    iat: now,
    exp: now + (options.expiresInSeconds ?? 15 * 60),
  };
  return new JwtService().sign(payload, {
    secret: options.secret ?? TEST_ACCESS_SECRET,
    algorithm: 'HS256',
  });
}

/** A `Cookie` header value carrying the access token. */
export function accessCookie(token: string): string {
  return `${ACCESS_COOKIE}=${token}`;
}
