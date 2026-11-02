/** An absolute link to a page on the platform's root domain (`http://` only for `localhost`). */
export function rootUrl(path: string, rootDomain: string): string {
  const scheme = rootDomain === 'localhost' ? 'http' : 'https';
  return `${scheme}://${rootDomain}${path}`;
}
