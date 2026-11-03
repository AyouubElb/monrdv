import {
  formatDay,
  formatDuration,
  formatPrice,
  formatTime,
  parseWallClock,
} from '@repo/shared';
import { CalendarCheck, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/booking/status-badge';
import { BusinessMark } from '@/components/brand/business-mark';
import { Wordmark } from '@/components/brand/wordmark';
import { DashboardShell } from '@/components/shells/dashboard-shell';
import { PlatformShell } from '@/components/shells/platform-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DASHBOARD_NAV } from '@/lib/dashboard-nav';
import { BookingMock } from './booking-mock';
import { GallerySection, Subsection } from './gallery-section';
import { SAMPLE_BUSINESS } from './sample-data';

const SAMPLE_WALL = parseWallClock('2026-11-03T14:30');

const FORMATS = [
  { label: 'Prix', value: formatPrice(15000), source: '15000 centimes' },
  {
    label: 'Prix avec centimes',
    value: formatPrice(8550),
    source: '8550 centimes',
  },
  { label: 'Durée', value: formatDuration(90), source: '90 minutes' },
  {
    label: 'Heure',
    value: formatTime(SAMPLE_WALL),
    source: '2026-11-03T14:30',
  },
  {
    label: 'Jour, court',
    value: formatDay(SAMPLE_WALL, 'short'),
    source: '2026-11-03',
  },
  {
    label: 'Jour, long',
    value: formatDay(SAMPLE_WALL, 'long'),
    source: '2026-11-03',
  },
];

const MARKS = [
  'Salon Atlas',
  'Coach Karim',
  'Zen',
  'Clinique dentaire et orthodontie du Boulevard Anfa',
];

export function PatternsSection() {
  return (
    <>
      <GallerySection
        id="reservation"
        title="Réservation sur téléphone"
        lead="Une question par écran, le bouton principal sous le pouce. Les deux étapes ci-dessous fonctionnent : choisissez une prestation, un jour, une heure."
      >
        <BookingMock />
        <div className="grid gap-12 md:grid-cols-2">
          <Subsection
            title="Marque de l’établissement"
            lead="Sans logo, les initiales en blanc sur la couleur. Un nom trop long passe sur deux lignes puis s’arrête."
          >
            <ul className="flex flex-col gap-3">
              {MARKS.map((name) => (
                <li
                  key={name}
                  className="flex max-w-80 items-center gap-3 rounded-xl border bg-card p-3"
                >
                  <BusinessMark name={name} />
                  <span className="line-clamp-2 min-w-0 text-lg leading-snug font-semibold break-words">
                    {name}
                  </span>
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-3 text-muted-foreground">
              Logotype de la plateforme : <Wordmark />
            </p>
          </Subsection>
          <Subsection
            title="Formats d’affichage"
            lead="Toujours depuis l’heure murale de l’établissement, jamais celle du téléphone."
          >
            <dl className="divide-y rounded-xl border bg-card">
              {FORMATS.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 p-3"
                >
                  <dt className="flex flex-col">
                    <span className="text-sm font-medium">{row.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.source}
                    </span>
                  </dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Subsection>
        </div>
      </GallerySection>

      <GallerySection
        id="cadres"
        title="Cadres de page"
        lead="Trois cadres vides que chaque fonctionnalité remplit : la page de réservation (ci-dessus), l’espace du professionnel et les pages de la plateforme."
      >
        <Subsection
          title="Espace du professionnel"
          lead="Menu latéral dès 1024 px, bouton menu en dessous. Seules les pages prêtes apparaissent ; ici, toutes pour l’aperçu."
        >
          <PreviewFrame>
            <DashboardShell
              preview
              businessName={SAMPLE_BUSINESS}
              currentHref={DASHBOARD_NAV[0].href}
              items={DASHBOARD_NAV}
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl">Aujourd’hui</h3>
                <p className="text-muted-foreground">
                  {formatDay(SAMPLE_WALL, 'long')}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarCheck
                        aria-hidden="true"
                        className="size-4 text-primary"
                      />
                      Rendez-vous
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold tabular-nums">
                    8
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wallet
                        aria-hidden="true"
                        className="size-4 text-primary"
                      />
                      Encaissé
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold tabular-nums">
                    {formatPrice(96000)}
                  </CardContent>
                </Card>
              </div>
              <ul className="flex flex-col divide-y rounded-xl border bg-card">
                {[
                  {
                    time: '09:00',
                    name: 'Amina Benali',
                    service: 'Coupe femme',
                    status: 'paid' as const,
                  },
                  {
                    time: '14:30',
                    name: 'Youssef Chraibi',
                    service: 'Coupe homme',
                    status: 'confirmed' as const,
                  },
                  {
                    time: '16:00',
                    name: 'Salma Idrissi',
                    service: 'Brushing',
                    status: 'cancelled' as const,
                  },
                ].map((row) => (
                  <li key={row.time} className="flex items-center gap-4 p-3">
                    <span className="w-12 font-semibold tabular-nums">
                      {row.time}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{row.name}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {row.service}
                      </span>
                    </span>
                    <StatusBadge status={row.status} />
                  </li>
                ))}
              </ul>
            </DashboardShell>
          </PreviewFrame>
        </Subsection>

        <Subsection
          title="Pages de la plateforme"
          lead="En-tête MonRDV avec « Créer mon espace », pied de page. La mise en avant argile n’apparaît que sur ces pages."
        >
          <PreviewFrame>
            <PlatformShell preview>
              <div className="flex max-w-xl flex-col gap-4 py-12">
                <p className="w-fit rounded-full bg-highlight px-3 py-1 text-sm font-medium text-highlight-foreground">
                  Plateforme de réservation
                </p>
                <h3 className="text-3xl">
                  Vos clients réservent en moins d’une minute.
                </h3>
                <Button size="lg" className="w-fit">
                  Créer mon espace
                </Button>
              </div>
            </PlatformShell>
          </PreviewFrame>
        </Subsection>
      </GallerySection>
    </>
  );
}

/** A framed, non scrolling preview of a whole page. */
function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border bg-background shadow-lg transform-gpu">
      {children}
    </div>
  );
}
