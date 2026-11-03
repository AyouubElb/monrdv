import { NotFoundContent } from '@/components/shells/not-found-content';
import { PlatformShell } from '@/components/shells/platform-shell';
import { env } from '@/env';
import { rootUrl } from '@/lib/root-url';

// The tab title is set in `layout.tsx` beside this file.
export default function BusinessNotFound() {
  return (
    <PlatformShell>
      <NotFoundContent
        title="Cette adresse ne correspond à aucun établissement"
        text="Vérifiez l’adresse saisie, ou créez la page de votre établissement."
        signupHref={rootUrl('/inscription', env.NEXT_PUBLIC_ROOT_DOMAIN)}
        homeHref={rootUrl('/', env.NEXT_PUBLIC_ROOT_DOMAIN)}
      />
    </PlatformShell>
  );
}
