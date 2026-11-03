import type { Metadata } from 'next';
import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { AccentSwitcher } from './accent-switcher';
import { ComponentsGallery } from './components-gallery';
import { Foundations } from './foundations';
import { PatternsSection } from './patterns-section';

// The public design system gallery (spec 0004, AC-11). Root domain only: on a business
// subdomain the proxy rewrites to `/sites/<subdomain>/design`, which does not exist, so 404.
// Static, with sample data only.

export const metadata: Metadata = {
  title: 'Système de design · MonRDV',
  description:
    'Les couleurs, la typographie et les composants de MonRDV, avec la couleur de chaque établissement.',
};

const SECTIONS = [
  { id: 'fondations', label: 'Fondations' },
  { id: 'composants', label: 'Composants' },
  { id: 'reservation', label: 'Réservation' },
  { id: 'cadres', label: 'Cadres' },
];

export default function DesignPage() {
  return (
    <>
      {/* Sticky only on wide screens, so on a phone the header never covers a third of the page. */}
      <header
        data-gallery-header
        className="z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:sticky lg:top-0"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/" className="rounded-lg">
              <Wordmark />
              <span className="sr-only">, accueil</span>
            </Link>
            <nav
              aria-label="Sections"
              className="-mx-3 overflow-x-auto sm:mx-0"
            >
              <ul className="flex gap-1 text-sm">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="inline-flex h-9 items-center rounded-lg px-3 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <AccentSwitcher />
        </div>
      </header>

      <main id="contenu" className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="flex max-w-3xl flex-col gap-4 py-12 md:py-20">
          <p className="w-fit rounded-full bg-highlight px-3 py-1 text-sm font-medium text-highlight-foreground">
            Système de design
          </p>
          <h1 className="text-3xl md:text-4xl">
            Un cadre calme, la couleur de chaque établissement.
          </h1>
          <p className="text-lg text-muted-foreground">
            Tout ce qui compose les pages MonRDV : couleurs, typographie,
            composants et parcours de réservation sur téléphone. Choisissez une
            couleur en haut de page pour voir la page d’un salon, d’une clinique
            ou d’un coach.
          </p>
        </div>
        <Foundations />
        <ComponentsGallery />
        <PatternsSection />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-muted-foreground md:px-6">
          <Wordmark className="text-base text-foreground" />
          <p>
            Réservation en ligne pour les salons, cliniques et coachs au Maroc.
          </p>
        </div>
      </footer>
    </>
  );
}
