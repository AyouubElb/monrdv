import { headers } from 'next/headers';
import { Suspense } from 'react';
import { env } from '@/env';
import { subdomainFromHost } from '@/lib/host';

// Scaffold placeholder: proves a subdomain reaches Next.js through Nginx.
// The landing page (root domain) and booking pages (subdomains) replace it.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-2 p-8">
      <p className="text-sm text-zinc-600">Plateforme de réservation</p>
      <Suspense fallback={<h1 className="text-2xl font-semibold">…</h1>}>
        <ResolvedHost />
      </Suspense>
    </main>
  );
}

async function ResolvedHost() {
  const host = (await headers()).get('host') ?? '';
  const subdomain = subdomainFromHost(host, env.NEXT_PUBLIC_ROOT_DOMAIN);

  if (!subdomain) {
    return <h1 className="text-2xl font-semibold">Domaine principal</h1>;
  }
  return (
    <h1 className="text-2xl font-semibold">
      Sous-domaine : <span data-testid="subdomain">{subdomain}</span>
    </h1>
  );
}
