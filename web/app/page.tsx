import { CalendarCheck, MessageCircle, Palette } from 'lucide-react';
import { PlatformShell } from '@/components/shells/platform-shell';
import { Button } from '@/components/ui/button';

// Platform home placeholder on the root domain (the proxy sends business subdomains to
// `app/sites/`). The landing page (scope feature 13) replaces it.

const POINTS = [
  {
    icon: CalendarCheck,
    title: 'Votre page de réservation',
    text: 'Une adresse à votre nom, ouverte jour et nuit.',
  },
  {
    icon: MessageCircle,
    title: 'Confirmations sur WhatsApp',
    text: 'Vos clients reçoivent l’heure et l’adresse en un message.',
  },
  {
    icon: Palette,
    title: 'À vos couleurs',
    text: 'Votre nom et votre couleur, pas ceux d’une plateforme.',
  },
];

export default function Home() {
  return (
    <PlatformShell>
      <div className="flex max-w-2xl flex-col gap-5 py-16 md:py-24">
        <p className="w-fit rounded-full bg-highlight px-3 py-1 text-sm font-medium text-highlight-foreground">
          Plateforme de réservation
        </p>
        <h1 className="text-3xl md:text-4xl">
          La prise de rendez-vous en ligne pour les salons, cliniques et coachs.
        </h1>
        <p className="text-lg text-muted-foreground">
          Vos clients réservent depuis leur téléphone en moins d’une minute.
          Vous gardez la main sur votre agenda.
        </p>
        <Button size="lg" asChild className="w-fit">
          <a href="/inscription">Créer mon espace</a>
        </Button>
      </div>
      <ul className="grid gap-4 pb-16 md:grid-cols-3 md:pb-24">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            className="flex flex-col gap-2 rounded-xl border bg-card p-5"
          >
            <Icon aria-hidden="true" className="size-6 text-primary" />
            <h2 className="text-lg">{title}</h2>
            <p className="text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </PlatformShell>
  );
}
