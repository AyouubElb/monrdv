import { messages } from '@repo/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './client';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const EXPIRED = {
  statusCode: 401,
  code: 'token_expired',
  message: messages.auth.tokenExpired,
};
const UNAUTHENTICATED = {
  statusCode: 401,
  code: 'unauthenticated',
  message: messages.auth.unauthenticated,
};
const ME = { user: { firstName: 'Samira' } };

describe('apiFetch', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let replace: ReturnType<typeof vi.fn<(url: string) => void>>;

  /** Paths in the order they were fetched. */
  function calledPaths(): string[] {
    return fetchMock.mock.calls.map(([path]) => path as string);
  }

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    replace = vi.fn<(url: string) => void>();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location: { replace } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed body of a successful call', async () => {
    fetchMock.mockResolvedValueOnce(json(200, ME));

    await expect(apiFetch('/api/auth/me')).resolves.toEqual({
      ok: true,
      status: 200,
      data: ME,
    });
  });

  it('returns no data for a 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(
      apiFetch('/api/auth/logout', { method: 'POST' }),
    ).resolves.toEqual({ ok: true, status: 204, data: undefined });
  });

  it('sends same origin JSON requests and keeps the caller headers', async () => {
    fetchMock.mockResolvedValueOnce(json(200, ME));

    await apiFetch('/api/x', { method: 'POST', headers: { 'X-Test': '1' } });

    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Test': '1' },
    });
  });

  it('returns an API error as is, without refreshing, when it is not token_expired', async () => {
    fetchMock.mockResolvedValueOnce(json(401, UNAUTHENTICATED));

    await expect(apiFetch('/api/auth/me')).resolves.toEqual({
      ok: false,
      error: UNAUTHENTICATED,
    });
    expect(calledPaths()).toEqual(['/api/auth/me']);
    expect(replace).not.toHaveBeenCalled();
  });

  // covers: AC-12
  it('refreshes once on token_expired, then retries the call', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, EXPIRED))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(200, ME));

    const result = await apiFetch('/api/auth/me');

    expect(result).toEqual({ ok: true, status: 200, data: ME });
    expect(calledPaths()).toEqual([
      '/api/auth/me',
      '/api/auth/refresh',
      '/api/auth/me',
    ]);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
    expect(replace).not.toHaveBeenCalled();
  });

  // covers: AC-12
  it('sends the owner to /connexion when the refresh fails, without retrying', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, EXPIRED))
      .mockResolvedValueOnce(json(401, UNAUTHENTICATED));

    const result = await apiFetch('/api/auth/me');

    expect(result).toEqual({ ok: false, error: EXPIRED });
    expect(calledPaths()).toEqual(['/api/auth/me', '/api/auth/refresh']);
    expect(replace).toHaveBeenCalledWith('/connexion');
  });

  // covers: AC-12
  it('sends the owner to /connexion when the retry is refused again', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, EXPIRED))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(401, UNAUTHENTICATED));

    const result = await apiFetch('/api/auth/me');

    expect(result).toEqual({ ok: false, error: UNAUTHENTICATED });
    expect(replace).toHaveBeenCalledWith('/connexion');
  });

  it('returns a retry that fails with another error without leaving the page', async () => {
    const conflict = { statusCode: 409, code: 'conflict', message: 'x' };
    fetchMock
      .mockResolvedValueOnce(json(401, EXPIRED))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(409, conflict));

    await expect(apiFetch('/api/x')).resolves.toEqual({
      ok: false,
      error: conflict,
    });
    expect(replace).not.toHaveBeenCalled();
  });

  // covers: AC-12 (calls that expire together share one refresh)
  it('sends a single refresh for two calls that expire at the same time', async () => {
    let finishRefresh!: (res: Response) => void;
    const firstTries = new Set<string>();
    fetchMock.mockImplementation((input) => {
      const path = input as string;
      if (path === '/api/auth/refresh') {
        return new Promise((resolve) => {
          finishRefresh = resolve;
        });
      }
      if (!firstTries.has(path)) {
        firstTries.add(path);
        return Promise.resolve(json(401, EXPIRED));
      }
      return Promise.resolve(json(200, { path }));
    });

    const both = Promise.all([apiFetch('/api/a'), apiFetch('/api/b')]);
    await vi.waitFor(() => {
      expect(calledPaths()).toContain('/api/auth/refresh');
    });
    finishRefresh(new Response(null, { status: 204 }));
    const [a, b] = await both;

    expect(a).toEqual({ ok: true, status: 200, data: { path: '/api/a' } });
    expect(b).toEqual({ ok: true, status: 200, data: { path: '/api/b' } });
    expect(calledPaths().filter((p) => p === '/api/auth/refresh')).toHaveLength(
      1,
    );
  });

  it('refreshes again for a later expiry once the shared refresh is over', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, EXPIRED))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(200, ME))
      .mockResolvedValueOnce(json(401, EXPIRED))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(200, ME));

    await apiFetch('/api/auth/me');
    await apiFetch('/api/auth/me');

    expect(calledPaths().filter((p) => p === '/api/auth/refresh')).toHaveLength(
      2,
    );
  });

  it.each([
    [
      'an HTML error page from Nginx',
      new Response('<html>502</html>', { status: 502 }),
      502,
    ],
    ['JSON without code and message', json(500, { error: 'boom' }), 500],
  ])(
    'answers %s with the generic unavailable error',
    async (_, response, status) => {
      fetchMock.mockResolvedValueOnce(response);

      await expect(apiFetch('/api/x')).resolves.toEqual({
        ok: false,
        error: {
          statusCode: status,
          code: 'unavailable',
          message: messages.request.unavailable,
        },
      });
    },
  );

  it('answers a network failure with the unavailable error and status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiFetch('/api/x')).resolves.toEqual({
      ok: false,
      error: {
        statusCode: 0,
        code: 'unavailable',
        message: messages.request.unavailable,
      },
    });
  });
});
