import type { MeResponse } from '@repo/shared';
import { headers } from 'next/headers';
import { cache } from 'react';
import { env } from '@/env';

// The signed in owner of this host's business, or `null`. Once per request.
export const getCurrentOwner = cache(async (): Promise<MeResponse | null> => {
  const requestHeaders = await headers();
  const forwarded: Record<string, string> = {
    'X-Forwarded-Host': requestHeaders.get('host') ?? '',
    Cookie: requestHeaders.get('cookie') ?? '',
  };
  // A GET needs no Origin; the IP lets the API see the visitor, not this server.
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  if (forwardedFor) forwarded['X-Forwarded-For'] = forwardedFor;

  const res = await fetch(`${env.API_INTERNAL_URL}/api/auth/me`, {
    headers: forwarded,
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`GET /api/auth/me answered ${res.status}`);
  return (await res.json()) as MeResponse;
});
