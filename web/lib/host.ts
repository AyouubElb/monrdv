/**
 * The subdomain label of a request host, or `null` on the root domain.
 * Display only: resolving a host to a business (reserved names, unknown
 * subdomains) belongs to the tenant isolation feature, decided in the API.
 */
export function subdomainFromHost(
  host: string,
  rootDomain: string,
): string | null {
  const hostname = host.toLowerCase().replace(/:\d+$/, '');
  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const label = hostname.slice(0, -suffix.length);
  return /^[a-z0-9-]+$/.test(label) ? label : null;
}
