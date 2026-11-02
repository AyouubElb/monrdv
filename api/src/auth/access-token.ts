/** Claims inside an access token (spec 0001, Auth design). */
export interface AccessTokenPayload {
  sub: string;
  bid: string;
  role: string;
  sid: string;
  exp: number;
}

/**
 * Name of the access token cookie. `__Host-` makes the browser keep it host only (no
 * `Domain`, Path=/, Secure), but it needs https, so local http uses the plain name.
 */
export function accessCookieName(cookieSecure: boolean): string {
  return cookieSecure ? '__Host-at' : 'at';
}
