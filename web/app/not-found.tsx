import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/shells/not-found-content';
import { PlatformShell } from '@/components/shells/platform-shell';
import { env } from '@/env';
import { rootUrl } from '@/lib/root-url';

// Any path that matches no page, on the root domain or a business subdomain (for example
// `atlas.localhost/design`). An unknown business host gets `site-introuvable` instead.

export const metadata: Metadata = {
  title: 'Page introuvable · MonRDV',
};

export default function NotFound() {
  return (
    <PlatformShell>
      <NotFoundContent
        title="Cette page n’existe pas"
        text="Le lien est peut-être incomplet, ou la page a été déplacée."
        homeHref={rootUrl('/', env.NEXT_PUBLIC_ROOT_DOMAIN)}
        signupHref={rootUrl('/inscription', env.NEXT_PUBLIC_ROOT_DOMAIN)}
      />
    </PlatformShell>
  );
}
