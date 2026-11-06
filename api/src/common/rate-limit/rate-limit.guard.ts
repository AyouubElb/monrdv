import {
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import {
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { messages } from '@repo/shared';
import type { Response } from 'express';
import type { TenantRequest } from '../tenancy/tenant-request.js';

// Each route sets its own numbers with `@RateLimit`; these are only the names.
export const THROTTLERS: ThrottlerModuleOptions = {
  setHeaders: false,
  throttlers: [
    { name: 'ip', limit: 30, ttl: 15 * 60_000 },
    {
      name: 'account',
      limit: 5,
      ttl: 15 * 60_000,
      // Trimmed and lowercased like LoginDto, so spaces or capitals do not reset the count.
      getTracker: (raw) => {
        const req = raw as TenantRequest;
        const body = req.body as { email?: unknown } | undefined;
        const email = typeof body?.email === 'string' ? body.email : '';
        return `${req.business?.id ?? ''}:${email.trim().toLowerCase()}`;
      },
    },
  ],
};

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  // A plain `Retry-After` (named limits would send `Retry-After-ip`) and our error code.
  protected override throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Retry-After', String(detail.timeToBlockExpire));
    throw new HttpException(
      { code: 'too_many_requests', message: messages.request.tooManyRequests },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
