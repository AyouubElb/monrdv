/** An absolute link to a page on the platform's root domain (`http://` only for `localhost`). */
export function rootUrl(path: string, rootDomain: string): string {
  const scheme = rootDomain === 'localhost' ? 'http' : 'https';
  return `${scheme}://${rootDomain}${path}`;
}

// What the browser sends as `Origin` on that host; server calls send the same.
export function hostOrigin(host: string, rootDomain: string): string {
  const scheme = rootDomain === 'localhost' ? 'http' : 'https';
  return `${scheme}://${host}`;
}

export function businessUrl(
  subdomain: string,
  path: string,
  rootDomain: string,
): string {
  const scheme = rootDomain === 'localhost' ? 'http' : 'https';
  return `${scheme}://${subdomain}.${rootDomain}${path}`;
}
