import type { Request } from 'express';
import type { CurrentUserClaims } from '../auth/current-user.decorator.js';

/** The business `HostGuard` resolved from the request host. */
export interface RequestBusiness {
  id: string;
  subdomain: string;
}

/** An Express request after the global guards ran. */
export interface TenantRequest extends Request {
  /** Set by `HostGuard` on business routes only. */
  business?: RequestBusiness;
  /** Set by `AuthGuard` on protected routes only. */
  user?: CurrentUserClaims;
}
