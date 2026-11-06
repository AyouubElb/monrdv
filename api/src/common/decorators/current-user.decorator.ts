import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TenantRequest } from '../tenancy/tenant-request.js';

/** The signed in user, from the access token claims `sub`, `bid`, `role`, `sid`. */
export interface CurrentUserClaims {
  userId: string;
  businessId: string;
  role: string;
  sid: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserClaims => {
    const req = context.switchToHttp().getRequest<TenantRequest>();
    if (!req.user) {
      // A programming error: `AuthGuard` sets the user on protected routes only.
      throw new Error('@CurrentUser() needs a protected route (not @Public)');
    }
    return req.user;
  },
);
