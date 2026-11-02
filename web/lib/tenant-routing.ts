import { parseHost } from '@repo/shared';

/** The internal route that answers a real 404 with the French "no business here" page. */
export const NOT_FOUND_PATH = '/site-introuvable';

/** What `proxy.ts` does with a request, before asking the API (spec 0002, Web routing). */
export type RouteDecision =
  /** Root domain: the platform routes in `app/`. */
  | { kind: 'pass' }
  /** Rewrite to `NOT_FOUND_PATH`. */
  | { kind: 'not-found' }
  /** A business subdomain: ask the API whether it exists. */
  | { kind: 'lookup'; subdomain: string };

export function decideRoute(
  host: string,
  pathname: string,
  rootDomain: string,
): RouteDecision {
  // Business pages live under `/sites/<subdomain>` only as a rewrite target.
  if (isSitesPath(pathname)) return { kind: 'not-found' };

  const parsed = parseHost(host, rootDomain);
  if (parsed.kind === 'root') return { kind: 'pass' };
  if (parsed.kind === 'business') {
    return { kind: 'lookup', subdomain: parsed.subdomain };
  }
  return { kind: 'not-found' };
}

/** The API's answer to `GET /api/tenant`: 200, 404, or anything else (down, timeout, 5xx). */
export type LookupResult = 'found' | 'missing' | 'unavailable';

export type LookupDecision =
  | { kind: 'rewrite'; pathname: string }
  | { kind: 'not-found' }
  /** 503 with `Retry-After`: never a 404 for a business that could not be checked. */
  | { kind: 'unavailable' };

export function decideAfterLookup(
  result: LookupResult,
  subdomain: string,
  pathname: string,
): LookupDecision {
  if (result === 'found') {
    return {
      kind: 'rewrite',
      pathname:
        pathname === '/'
          ? `/sites/${subdomain}`
          : `/sites/${subdomain}${pathname}`,
    };
  }
  if (result === 'missing') return { kind: 'not-found' };
  return { kind: 'unavailable' };
}

/** Checks the decoded path too, so `/%73ites/...` cannot reach the internal routes. */
function isSitesPath(pathname: string): boolean {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Malformed encoding: keep the raw path.
  }
  return [pathname, decoded].some(
    (path) => path === '/sites' || path.startsWith('/sites/'),
  );
}
