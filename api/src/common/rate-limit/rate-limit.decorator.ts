import { applyDecorators, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { RateLimitGuard } from './rate-limit.guard.js';

interface Limit {
  limit: number;
  ttlMs: number;
}

// Route guards run after HostGuard, so the account key can read the business.
export function RateLimit(limits: { ip: Limit; account?: Limit }) {
  const { ip, account } = limits;
  return applyDecorators(
    UseGuards(RateLimitGuard),
    Throttle({
      ip: { limit: ip.limit, ttl: ip.ttlMs },
      ...(account && { account: { limit: account.limit, ttl: account.ttlMs } }),
    }),
    SkipThrottle({ account: !account }),
  );
}
