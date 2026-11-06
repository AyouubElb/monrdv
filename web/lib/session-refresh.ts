// Both names: the web does not know COOKIE_SECURE, the API picks one.
const ACCESS_COOKIES = ['at', '__Host-at'];
const REFRESH_COOKIES = ['rt', '__Host-rt'];

function isSessionPage(pathname: string): boolean {
  return (
    pathname === '/connexion' ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/')
  );
}

// The access cookie lapsed (Max-Age 900) but the refresh cookie is still there.
export function needsSessionRefresh(
  pathname: string,
  cookieNames: readonly string[],
): boolean {
  return (
    isSessionPage(pathname) &&
    cookieNames.some((name) => REFRESH_COOKIES.includes(name)) &&
    !cookieNames.some((name) => ACCESS_COOKIES.includes(name))
  );
}

export function parseSetCookie(line: string): { name: string; value: string } {
  const [pair = ''] = line.split(';');
  const i = pair.indexOf('=');
  if (i === -1) return { name: pair.trim(), value: '' };
  return { name: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim() };
}
