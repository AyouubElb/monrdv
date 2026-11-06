import { messages, type ApiError } from '@repo/shared';

export type ApiResult<T> =
  { ok: true; status: number; data: T } | { ok: false; error: ApiError };

// Browser calls to the API on the same host; Nginx sends `/api/` to it.
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const first = await send<T>(path, init);
  if (first.ok || first.error.code !== 'token_expired') return first;

  // Once, then retry; a second failure means the session is over.
  if (!(await refreshSession())) {
    window.location.replace('/connexion');
    return first;
  }
  const retry = await send<T>(path, init);
  if (!retry.ok && retry.error.statusCode === 401) {
    window.location.replace('/connexion');
  }
  return retry;
}

let refreshing: Promise<boolean> | null = null;

// Calls that expire together share one refresh.
function refreshSession(): Promise<boolean> {
  refreshing ??= send<void>('/api/auth/refresh', { method: 'POST' })
    .then((result) => result.ok)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    return { ok: false, error: unavailable(0) };
  }

  if (res.ok) {
    const data = (res.status === 204 ? undefined : await res.json()) as T;
    return { ok: true, status: res.status, data };
  }
  return { ok: false, error: await readError(res) };
}

async function readError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as Partial<ApiError>;
    if (typeof body.code === 'string' && typeof body.message === 'string') {
      return { statusCode: res.status, code: body.code, message: body.message };
    }
  } catch {
    // Not JSON: Nginx or a proxy answered.
  }
  return unavailable(res.status);
}

function unavailable(statusCode: number): ApiError {
  return {
    statusCode,
    code: 'unavailable',
    message: messages.request.unavailable,
  };
}
