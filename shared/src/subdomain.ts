/** Subdomain rules shared by the web app, the API, and signup (spec 0002, Host rules). */
export const SUBDOMAIN_MIN_LENGTH = 3;
export const SUBDOMAIN_MAX_LENGTH = 30;
/** 3 to 30 characters of `a-z`, `0-9`, `-`, with no hyphen at either end. */
export const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** Names no business may take: infrastructure, platform pages, and the brand. */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = Object.freeze(
  new Set([
    // Infrastructure
    'www',
    'api',
    'admin',
    'app',
    'mail',
    'email',
    'webmail',
    'smtp',
    'imap',
    'pop',
    'ftp',
    'ns1',
    'ns2',
    'dns',
    'cdn',
    'static',
    'assets',
    'media',
    'img',
    'files',
    'uploads',
    'status',
    'staging',
    'dev',
    'test',
    'localhost',
    'autodiscover',
    'autoconfig',
    // Platform pages
    'connexion',
    'inscription',
    'login',
    'signup',
    'register',
    'auth',
    'sso',
    'compte',
    'account',
    'aide',
    'help',
    'support',
    'contact',
    'blog',
    'docs',
    'faq',
    'tarifs',
    'pricing',
    'legal',
    'cgu',
    'cgv',
    'confidentialite',
    'privacy',
    'dashboard',
    'tableau-de-bord',
    'facturation',
    'billing',
    // Brand
    'monrdv',
    'mon-rdv',
    'rdv',
  ]),
);

/** True when a business may use this label: right format, no punycode prefix, not reserved. */
export function isValidSubdomain(label: string): boolean {
  return (
    SUBDOMAIN_PATTERN.test(label) &&
    !label.startsWith('xn--') &&
    !RESERVED_SUBDOMAINS.has(label)
  );
}

export type ParsedHost =
  | { kind: 'root' }
  | { kind: 'www' }
  | { kind: 'business'; subdomain: string }
  | { kind: 'unknown' };

/**
 * Sorts a request host into root domain, `www.`, one business subdomain, or unknown.
 * Ignores letter case, a `:port`, and one trailing dot. Anything that is not exactly
 * one valid label before the root domain is `unknown` (other domains, IP addresses,
 * two labels, bad format, reserved names).
 */
export function parseHost(host: string, rootDomain: string): ParsedHost {
  const hostname = host.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');

  if (hostname === rootDomain) return { kind: 'root' };
  if (hostname === `www.${rootDomain}`) return { kind: 'www' };

  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) return { kind: 'unknown' };
  const label = hostname.slice(0, -suffix.length);
  return isValidSubdomain(label)
    ? { kind: 'business', subdomain: label }
    : { kind: 'unknown' };
}
