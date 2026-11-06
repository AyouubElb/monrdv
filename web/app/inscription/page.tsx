import { Banknote, CalendarClock, Globe } from 'lucide-react';
import type { Metadata } from 'next';
import { PlatformShell } from '@/components/shells/platform-shell';
import { env } from '@/env';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Créer mon espace · MonRDV',
  description:
    'Créez la page de réservation de votre salon, clinique ou cabinet de coaching en deux minutes.',
};

export default function SignupPage() {
  const rootDomain = env.NEXT_PUBLIC_ROOT_DOMAIN;
  const points = [
    {
      icon: Globe,
      title: 'Une adresse à votre nom',
      text: `votre-nom.${rootDomain}, ouverte jour et nuit, prête dès la fin de l’inscription.`,
    },
    {
      icon: CalendarClock,
      title: 'Vos règles de réservation',
      text: 'Délai minimum, horizon de réservation et annulation en ligne, choisis par vous.',
    },
    {
      icon: Banknote,
      title: 'Paiement sur place',
      text: 'Vos clients paient chez vous, en espèces. Pas de prépaiement imposé.',
    },
  ];

  return (
    <PlatformShell>
      <div className="grid items-start gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16 lg:py-16">
        <section className="flex flex-col gap-5 lg:sticky lg:top-16">
          <p className="w-fit rounded-full bg-highlight px-3 py-1 text-sm font-medium text-highlight-foreground">
            Inscription
          </p>
          <h1 className="text-3xl text-balance md:text-4xl">
            Créez votre page de réservation
          </h1>
          <p className="text-lg text-muted-foreground">
            Deux étapes, environ deux minutes. Votre adresse fonctionne dès que
            vous avez terminé.
          </p>
          <ul className="mt-4 hidden flex-col gap-5 lg:flex">
            {points.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-card text-primary ring-1 ring-border">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg">{title}</h2>
                  <p className="text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <div className="rounded-xl border bg-card p-5 md:p-8">
          <SignupForm rootDomain={rootDomain} />
        </div>
      </div>
    </PlatformShell>
  );
}
