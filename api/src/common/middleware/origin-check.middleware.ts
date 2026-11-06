import { messages, type ApiError } from '@repo/shared';
import type { RequestHandler } from 'express';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// SameSite=Lax lets sibling subdomains post with cookies, so unsafe calls must come from their own host.
export function originCheck(cookieSecure: boolean): RequestHandler {
  const scheme = cookieSecure ? 'https' : 'http';
  return (req, res, next) => {
    if (!UNSAFE_METHODS.has(req.method)) return next();
    // `hostname` honors X-Forwarded-Host only from TRUSTED_PROXY addresses.
    if (req.headers.origin === `${scheme}://${req.hostname}`) return next();

    const body: ApiError = {
      statusCode: 403,
      code: 'bad_origin',
      message: messages.request.badOrigin,
    };
    res.status(403).json(body);
  };
}
