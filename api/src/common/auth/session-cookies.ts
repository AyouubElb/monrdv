import type { CookieOptions, Response } from 'express';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  accessCookieName,
  refreshCookieName,
} from './access-token.js';

// No `domain`: host only, so an `atlas.` session is never sent to `anfa.`.
function baseOptions(cookieSecure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', path: '/', secure: cookieSecure };
}

export function setSessionCookies(
  res: Response,
  cookieSecure: boolean,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(accessCookieName(cookieSecure), tokens.accessToken, {
    ...baseOptions(cookieSecure),
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(refreshCookieName(cookieSecure), tokens.refreshToken, {
    ...baseOptions(cookieSecure),
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookies(
  res: Response,
  cookieSecure: boolean,
): void {
  res.clearCookie(accessCookieName(cookieSecure), baseOptions(cookieSecure));
  res.clearCookie(refreshCookieName(cookieSecure), baseOptions(cookieSecure));
}
