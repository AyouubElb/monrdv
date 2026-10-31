import { afterEach, describe, expect, it, vi } from 'vitest';

// `env.ts` validates on import, so each case loads a fresh copy of the module.
async function loadEnv(rootDomain: string | undefined) {
  vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', rootDomain);
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
      await expect(loadEnv(rootDomain)).resolves.toEqual({
        NEXT_PUBLIC_ROOT_DOMAIN: rootDomain,
      });
    },
  );

  it('refuses to load without NEXT_PUBLIC_ROOT_DOMAIN', async () => {
    await expect(loadEnv(undefined)).rejects.toThrow(
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
    await expect(loadEnv(rootDomain)).rejects.toThrow(
      /NEXT_PUBLIC_ROOT_DOMAIN/,
    );
  });
});
