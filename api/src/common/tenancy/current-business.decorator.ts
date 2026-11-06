import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TenantRequest } from './tenant-request.js';

/**
 * The id of the business named by the request host. The only place a controller gets a
 * business id from: never the body, query, path, or a token claim.
 */
export const CurrentBusiness = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const req = context.switchToHttp().getRequest<TenantRequest>();
    if (!req.business) {
      // A programming error: `HostGuard` sets the business on business routes only.
      throw new Error(
        '@CurrentBusiness() needs a business route (not @PlatformRoute or @AnyHost)',
      );
    }
    return req.business.id;
  },
);
