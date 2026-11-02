import { afterEach, describe, expect, it, vi } from 'vitest';

const API_INTERNAL_URL = 'http://localhost:3001';

// `env.ts` validates on import, so each case loads a fresh copy of the module.
async function loadEnv(
  rootDomain: string | undefined,
  apiInternalUrl: string | undefined,
) {
  vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', rootDomain);
  vi.stubEnv('API_INTERNAL_URL', apiInternalUrl);
  vi.resetModules();
  return (await import('./env')).env;
}

// The web app refuses to boot (dev server or build) with a missing or malformed variable.
describe('web env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(['localhost', 'example.ma', 'reservation-demo.ma'])(
    'accepts the root domain %s',
    async (rootDomain) => {
      await expect(loadEnv(rootDomain, API_INTERNAL_URL)).resolves.toEqual({
        NEXT_PUBLIC_ROOT_DOMAIN: rootDomain,
        API_INTERNAL_URL,
      });
    },
  );

  it('refuses to load without NEXT_PUBLIC_ROOT_DOMAIN', async () => {
    await expect(loadEnv(undefined, API_INTERNAL_URL)).rejects.toThrow(
      /Invalid environment for the web app[\s\S]*NEXT_PUBLIC_ROOT_DOMAIN/,
    );
  });

  it.each([
    ['empty', ''],
    ['with a scheme', 'https://example.ma'],
    ['with a port', 'localhost:3000'],
    ['in capitals', 'Example.MA'],
    ['with a path', 'example.ma/'],
  ])('refuses a root domain %s', async (_case, rootDomain) => {
    await expect(loadEnv(rootDomain, API_INTERNAL_URL)).rejects.toThrow(
      /NEXT_PUBLIC_ROOT_DOMAIN/,
    );
  });

  it('accepts the production API_INTERNAL_URL', async () => {
    await expect(loadEnv('example.ma', 'http://api:3001')).resolves.toEqual({
      NEXT_PUBLIC_ROOT_DOMAIN: 'example.ma',
      API_INTERNAL_URL: 'http://api:3001',
    });
  });

  it.each([
    ['missing', undefined],
    ['not a URL', 'api:3001'],
    ['with another scheme', 'ftp://api:3001'],
    ['with a trailing slash', 'http://api:3001/'],
  ])('refuses an API_INTERNAL_URL %s', async (_case, apiInternalUrl) => {
    await expect(loadEnv('localhost', apiInternalUrl)).rejects.toThrow(
      /API_INTERNAL_URL/,
    );
  });
});
