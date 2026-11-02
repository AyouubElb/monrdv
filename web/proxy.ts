import { messages } from '@repo/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
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
  if (next.kind === 'rewrite') return rewriteTo(request, next.pathname);
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

function rewriteTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip build assets, images, the favicon, and any path with a file extension.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.[^/]+$).*)'],
};
