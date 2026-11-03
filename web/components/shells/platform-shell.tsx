import type { ReactNode } from 'react';
import { Main } from './main';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { env } from '@/env';
import { rootUrl } from '@/lib/root-url';

/**
 * The frame of the root domain pages (platform home, signup, the 404 page): the MonRDV header
 * with "Créer mon espace", and a footer. Links are absolute to the root domain, because the
 * 404 page also shows on business subdomains.
 */
export function PlatformShell({
  children,
  preview = false,
}: {
  children: ReactNode;
  /** In the `/design` gallery: the main region becomes a plain `div`, since the page has its own. */
  preview?: boolean;
}) {
  const rootDomain = env.NEXT_PUBLIC_ROOT_DOMAIN;
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <a href={rootUrl('/', rootDomain)} className="rounded-lg">
            <Wordmark />
            <span className="sr-only">, accueil</span>
          </a>
          <Button asChild>
            <a href={rootUrl('/inscription', rootDomain)}>Créer mon espace</a>
          </Button>
        </div>
      </header>
      <Main
        preview={preview}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 md:px-6"
      >
        {children}
      </Main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <p>
            <Wordmark className="text-base text-foreground" /> · Réservation en
            ligne pour les salons, cliniques et coachs au Maroc.
          </p>
          <a
            href={rootUrl('/design', rootDomain)}
            className="w-fit rounded-sm underline-offset-4 hover:text-foreground hover:underline"
          >
            Système de design
          </a>
        </div>
      </footer>
    </div>
  );
}
