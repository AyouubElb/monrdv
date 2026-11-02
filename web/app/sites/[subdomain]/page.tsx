import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentBusiness } from '@/lib/api/tenant';

// Placeholder business page; the first booking loop (scope feature 6) replaces it.
// Reached only through the proxy rewrite. The `[subdomain]` segment is for routing only:
// the API decides the business from the host.
export default function BusinessPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-2 p-8">
      <p className="text-sm text-zinc-600">Réservation en ligne</p>
      <Suspense fallback={<h1 className="text-2xl font-semibold">…</h1>}>
        <BusinessName />
      </Suspense>
    </main>
  );
}

async function BusinessName() {
  const business = await getCurrentBusiness();
  // The proxy already checked the business; this only covers one deleted in between.
  if (!business) notFound();
  return (
    <h1 className="text-2xl font-semibold" data-testid="business-name">
      {business.name}
    </h1>
  );
}
