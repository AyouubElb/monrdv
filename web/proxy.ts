import { messages } from '@repo/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
import { hostOrigin } from '@/lib/root-url';
import { needsSessionRefresh, parseSetCookie } from '@/lib/session-refresh';
import {
  decideAfterLookup,
  decideRoute,
  NOT_FOUND_PATH,
  type LookupResult,
} from '@/lib/tenant-routing';

const LOOKUP_TIMEOUT_MS = 2_000;

/**
 * Routes by host (spec 0002, Web routing): the root domain reaches the platform pages, a
 * known business subdomain is rewritten to `/sites/<subdomain>/...`, anything else gets the
 * 404 page. The decisions live in `lib/tenant-routing.ts`; this file only carries them out.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;

  const decision = decideRoute(host, pathname, env.NEXT_PUBLIC_ROOT_DOMAIN);
  if (decision.kind === 'pass') return NextResponse.next();
  if (decision.kind === 'not-found') return rewriteTo(request, NOT_FOUND_PATH);

  const result = await lookupBusiness(host);
  const next = decideAfterLookup(result, decision.subdomain, pathname);
  if (next.kind === 'rewrite') {
    const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);
    if (needsSessionRefresh(pathname, cookieNames)) {
      return refreshThenRewrite(request, host, next.pathname);
    }
    return rewriteTo(request, next.pathname);
  }
  if (next.kind === 'not-found') return rewriteTo(request, NOT_FOUND_PATH);
  return new NextResponse(messages.tenant.unavailable, {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Retry-After': '30',
    },
  });
}

/** Asks the API whether the host names a business. The API decides; the proxy only routes. */
async function lookupBusiness(host: string): Promise<LookupResult> {
  try {
    const res = await fetch(`${env.API_INTERNAL_URL}/api/tenant`, {
      headers: { 'X-Forwarded-Host': host },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (res.status === 200) return 'found';
    if (res.status === 404) return 'missing';
    return 'unavailable';
  } catch {
    // Down, refused, or no answer within the timeout.
    return 'unavailable';
  }
}

// Refreshes before the page renders, so a lapsed access cookie never shows a signed out page.
async function refreshThenRewrite(
  request: NextRequest,
  host: string,
  pathname: string,
) {
  const headers: Record<string, string> = {
    Cookie: request.headers.get('cookie') ?? '',
    'X-Forwarded-Host': host,
    Origin: hostOrigin(host, env.NEXT_PUBLIC_ROOT_DOMAIN),
  };
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;

  let res: Response;
  try {
    res = await fetch(`${env.API_INTERNAL_URL}/api/auth/refresh`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
  } catch {
    return rewriteTo(request, pathname);
  }
  // 204 brings a new pair; 401 clears the dead one, so the next load does not try again.
  if (res.status !== 204 && res.status !== 401) {
    return rewriteTo(request, pathname);
  }

  const setCookies = res.headers.getSetCookie();
  for (const line of setCookies) {
    const { name, value } = parseSetCookie(line);
    if (value) request.cookies.set(name, value);
    else request.cookies.delete(name);
  }
  const response = rewriteTo(request, pathname, request.headers);
  for (const line of setCookies) response.headers.append('Set-Cookie', line);
  return response;
}

function rewriteTo(
  request: NextRequest,
  pathname: string,
  requestHeaders?: Headers,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(
    url,
    requestHeaders ? { request: { headers: requestHeaders } } : undefined,
  );
}

export const config = {
  // Skip build assets, images, the favicon, and any path with a file extension.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.[^/]+$).*)'],
};
