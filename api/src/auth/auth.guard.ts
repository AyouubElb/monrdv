import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { messages, type ApiError } from '@repo/shared';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { TenantRequest } from '../tenancy/tenant-request.js';
import { accessCookieName, type AccessTokenPayload } from './access-token.js';
import { IS_PUBLIC } from './public.decorator.js';

/**
 * Second global guard, after `HostGuard`: denies by default. A protected route needs a valid
 * access token whose business (`bid`) is the business of the host, so a session from one
 * subdomain never works on another. Feature 5 adds login, refresh, and the `sid` block list.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly cookieName: string;
  private readonly secret: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.cookieName = accessCookieName(
      config.get('COOKIE_SECURE', { infer: true }),
    );
    this.secret = config.get('JWT_ACCESS_SECRET', { infer: true });
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<TenantRequest>();
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[this.cookieName];
    if (typeof token !== 'string' || token === '') throw unauthenticated();

    let claims: Partial<AccessTokenPayload>;
    try {
      claims = this.jwt.verify<Partial<AccessTokenPayload>>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
      });
    } catch (error) {
      if (error instanceof TokenExpiredError) throw tokenExpired();
      throw unauthenticated();
    }

    const { sub, bid, role, sid, exp } = claims;
    if (
      typeof sub !== 'string' ||
      typeof bid !== 'string' ||
      typeof role !== 'string' ||
      typeof sid !== 'string' ||
      typeof exp !== 'number'
    ) {
      throw unauthenticated();
    }
    // Same answer as a bad token: nothing reveals that the token is valid elsewhere.
    // A protected route that is not a business route has no business to match: refused.
    if (!req.business || bid !== req.business.id) throw unauthenticated();

    req.user = { userId: sub, businessId: bid, role, sid };
    return true;
  }
}

function unauthenticated(): UnauthorizedException {
  return unauthorized('unauthenticated', messages.auth.unauthenticated);
}

function tokenExpired(): UnauthorizedException {
  return unauthorized('token_expired', messages.auth.tokenExpired);
}

function unauthorized(code: string, message: string): UnauthorizedException {
  const body: ApiError = { statusCode: HttpStatus.UNAUTHORIZED, code, message };
  return new UnauthorizedException(body);
}
