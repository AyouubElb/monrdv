import { CalendarClock, ExternalLink, LayoutList } from 'lucide-react';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/shells/dashboard-shell';
import { LogoutButton } from '@/components/shells/logout-button';
import { Badge } from '@/components/ui/badge';
import { getCurrentOwner } from '@/lib/api/session';

export const instant = false;

const NEXT_STEPS = [
  {
    icon: LayoutList,
    title: 'Ajoutez vos prestations',
    text: 'Nom, durée et prix de ce que vous proposez.',
  },
  {
    icon: CalendarClock,
    title: 'Fixez vos horaires',
    text: 'Les jours et heures où vos clients peuvent réserver.',
  },
];

export default async function DashboardPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect('/connexion');

  return (
    <DashboardShell
      businessName={owner.business.name}
      currentHref="/dashboard"
      footer={<LogoutButton />}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl">Bonjour {owner.user.firstName}</h1>
        <p className="text-lg text-muted-foreground">
          Votre page de réservation est en ligne. Voici les prochaines étapes
          pour recevoir vos premiers rendez-vous.
        </p>
      </div>

      <section
        aria-labelledby="next-steps"
        className="flex max-w-2xl flex-col gap-4 rounded-xl border bg-card p-5 md:p-6"
      >
        <h2 id="next-steps" className="text-xl">
          Pour bien démarrer
        </h2>
        <ul className="flex flex-col divide-y">
          {NEXT_STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-4 py-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
              <Badge variant="secondary">Bientôt</Badge>
            </li>
          ))}
          <li className="py-4">
            <a
              href="/"
              target="_blank"
              className="group flex items-center gap-4 rounded-lg"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <ExternalLink aria-hidden="true" className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold text-primary group-hover:underline">
                  Voir ma page
                </span>
                <span className="text-sm text-muted-foreground">
                  Ce que vos clients voient, dans un nouvel onglet.
                </span>
              </span>
            </a>
          </li>
        </ul>
      </section>
    </DashboardShell>
  );
}
