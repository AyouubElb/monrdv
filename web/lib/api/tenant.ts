import type { TenantInfo } from '@repo/shared';
import { headers } from 'next/headers';
import { cache } from 'react';
import { env } from '@/env';

/**
 * The business of the current request, or `null` when the API knows none. Once per request
 * (`cache`). The API decides the business from the host forwarded here, never from the URL.
 * Never put its result in `'use cache'` unless the subdomain is part of the cache key.
 */
export const getCurrentBusiness = cache(
  async (): Promise<TenantInfo | null> => {
    const host = (await headers()).get('host') ?? '';
    const res = await fetch(`${env.API_INTERNAL_URL}/api/tenant`, {
      headers: { 'X-Forwarded-Host': host },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET /api/tenant answered ${res.status}`);
    return (await res.json()) as TenantInfo;
  },
);
