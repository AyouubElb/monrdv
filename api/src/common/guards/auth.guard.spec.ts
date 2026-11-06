import { randomUUID } from 'node:crypto';
import { type ExecutionContext, HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { signAccessToken, TEST_ACCESS_SECRET } from '../../../test/tokens.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { SessionBlockList } from '../auth/session-block-list.service.js';
import { Public } from '../decorators/public.decorator.js';
import type { TenantRequest } from '../tenancy/tenant-request.js';
import { AuthGuard } from './auth.guard.js';

class Routes {
  @Public()
  open(this: void): void {}

  closed(this: void): void {}
}

const ATLAS = { id: randomUUID(), subdomain: 'atlas' };
const ANFA = { id: randomUUID(), subdomain: 'anfa' };

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('AuthGuard', () => {
  let blockList: SessionBlockList;
  let guard: AuthGuard;

  function requestWith(
    token: string | undefined,
    business: TenantRequest['business'] | null = ATLAS,
  ): TenantRequest {
    return {
      cookies: token === undefined ? {} : { at: token },
      business: business ?? undefined,
    } as unknown as TenantRequest;
  }

  function contextFor(
    req: TenantRequest,
    handler: () => void = Routes.prototype.closed,
  ): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => Routes,
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  }

  /** The status and code the guard refuses with. */
  function refusal(req: TenantRequest): { status: number; code: string } {
    try {
      guard.canActivate(contextFor(req));
    } catch (error) {
      if (error instanceof HttpException) {
        const body = error.getResponse() as { code: string };
        return { status: error.getStatus(), code: body.code };
      }
      throw error;
    }
    throw new Error('the guard let the request through');
  }

  const UNAUTHENTICATED = { status: 401, code: 'unauthenticated' };

  beforeEach(() => {
    blockList = new SessionBlockList();
    const values = {
      COOKIE_SECURE: false,
      JWT_ACCESS_SECRET: TEST_ACCESS_SECRET,
    };
    const config = {
      get: (key: keyof typeof values) => values[key],
    } as unknown as ConfigService<EnvironmentVariables, true>;
    guard = new AuthGuard(new Reflector(), new JwtService(), blockList, config);
  });

  it('lets a valid token for the host business through and attaches the owner', () => {
    const userId = randomUUID();
    const sid = randomUUID();
    const req = requestWith(
      signAccessToken({ businessId: ATLAS.id, userId, sid }),
    );

    expect(guard.canActivate(contextFor(req))).toBe(true);
    expect(req.user).toEqual({
      userId,
      businessId: ATLAS.id,
      role: 'owner',
      sid,
    });
  });

  it('lets a public route through with no token', () => {
    const req = requestWith(undefined);

    expect(guard.canActivate(contextFor(req, Routes.prototype.open))).toBe(
      true,
    );
    expect(req.user).toBeUndefined();
  });

  it.each([
    ['no access cookie', undefined],
    ['an empty access cookie', ''],
  ])('refuses %s', (_, token) => {
    expect(refusal(requestWith(token))).toEqual(UNAUTHENTICATED);
  });

  // covers: AC-12 (the browser refreshes only on token_expired)
  it('answers token_expired, not unauthenticated, to an expired token', () => {
    const expired = signAccessToken({
      businessId: ATLAS.id,
      expiresInSeconds: -1,
    });

    expect(refusal(requestWith(expired))).toEqual({
      status: 401,
      code: 'token_expired',
    });
  });

  it('refuses a token signed with another secret', () => {
    const forged = signAccessToken({
      businessId: ATLAS.id,
      secret: 'another-secret-that-is-at-least-32-bytes',
    });

    expect(refusal(requestWith(forged))).toEqual(UNAUTHENTICATED);
  });

  it('refuses a token signed with another algorithm', () => {
    const hs512 = new JwtService().sign(
      { sub: randomUUID(), bid: ATLAS.id, role: 'owner', sid: randomUUID() },
      { secret: TEST_ACCESS_SECRET, algorithm: 'HS512', expiresIn: 900 },
    );

    expect(refusal(requestWith(hs512))).toEqual(UNAUTHENTICATED);
  });

  it('refuses an unsigned token (alg none)', () => {
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
      sub: randomUUID(),
      bid: ATLAS.id,
      role: 'owner',
      sid: randomUUID(),
      exp: now + 900,
    })}.`;

    expect(refusal(requestWith(unsigned))).toEqual(UNAUTHENTICATED);
  });

  it.each(['sub', 'bid', 'role', 'sid'])(
    'refuses a validly signed token with no %s claim',
    (claim) => {
      const claims: Record<string, string> = {
        sub: randomUUID(),
        bid: ATLAS.id,
        role: 'owner',
        sid: randomUUID(),
      };
      delete claims[claim];
      const token = new JwtService().sign(claims, {
        secret: TEST_ACCESS_SECRET,
        algorithm: 'HS256',
        expiresIn: 900,
      });

      expect(refusal(requestWith(token))).toEqual(UNAUTHENTICATED);
    },
  );

  // covers: AC-10
  it('refuses a token of another business with the same answer as a bad token', () => {
    const atlasToken = signAccessToken({ businessId: ATLAS.id });

    expect(refusal(requestWith(atlasToken, ANFA))).toEqual(UNAUTHENTICATED);
  });

  it('refuses a protected route with no business on the request', () => {
    const token = signAccessToken({ businessId: ATLAS.id });

    expect(refusal(requestWith(token, null))).toEqual(UNAUTHENTICATED);
  });

  // covers: AC-13, AC-14
  it('refuses a token whose session was blocked, and only that session', () => {
    const blockedSid = randomUUID();
    blockList.block(blockedSid);

    expect(
      refusal(
        requestWith(signAccessToken({ businessId: ATLAS.id, sid: blockedSid })),
      ),
    ).toEqual(UNAUTHENTICATED);
    expect(
      guard.canActivate(
        contextFor(requestWith(signAccessToken({ businessId: ATLAS.id }))),
      ),
    ).toBe(true);
  });
});
