'use client';

import { CircleCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { businessUrl } from '@/lib/root-url';

export function SignupSuccess({
  subdomain,
  email,
  rootDomain,
}: {
  subdomain: string;
  email: string;
  rootDomain: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const loginHref = businessUrl(
    subdomain,
    `/connexion?email=${encodeURIComponent(email)}`,
    rootDomain,
  );

  return (
    <div className="flex flex-col gap-5">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <CircleCheck aria-hidden="true" className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold outline-none"
        >
          Votre espace est prêt
        </h2>
        <p className="text-muted-foreground">
          Votre page de réservation est en ligne à cette adresse :
        </p>
      </div>
      <p
        translate="no"
        className="rounded-lg border bg-background px-4 py-3 text-lg font-semibold break-all"
      >
        {subdomain}.{rootDomain}
      </p>
      <p className="text-muted-foreground">
        Connectez-vous sur votre adresse pour ouvrir votre tableau de bord.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" asChild>
          <a href={loginHref}>Me connecter</a>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href={businessUrl(subdomain, '/', rootDomain)} target="_blank">
            Voir ma page
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
