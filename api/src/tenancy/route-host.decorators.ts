import { SetMetadata } from '@nestjs/common';

/**
 * Which hosts a route answers on. Unmarked routes are business routes: they need a known
 * business subdomain, and `HostGuard` resolves it.
 */
export type RouteHostKind = 'business' | 'platform' | 'any';

export const ROUTE_HOST_KIND = 'routeHostKind';

/** Answers only on the root domain (signup, the platform's own API). 404 elsewhere. */
export const PlatformRoute = () =>
  SetMetadata(ROUTE_HOST_KIND, 'platform' satisfies RouteHostKind);

/** Answers on every platform host, with no business lookup (`/api/health`). */
export const AnyHost = () =>
  SetMetadata(ROUTE_HOST_KIND, 'any' satisfies RouteHostKind);
