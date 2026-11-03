import { notFound } from 'next/navigation';
import { BookingShell } from '@/components/shells/booking-shell';
import { Button } from '@/components/ui/button';
import { getCurrentBusiness } from '@/lib/api/tenant';

// Placeholder business page; the first booking loop (scope feature 6) replaces it.
// Reached only through the proxy rewrite. The `[subdomain]` segment is for routing only:
// the API decides the business from the host. The layout already read it (`cache` makes this
// the same request), and blocks on it, so this await does too.
// Blocking on purpose, like the layout (see there).
export const instant = false;

export default async function BusinessPage() {
  const business = await getCurrentBusiness();
  // The proxy already checked the business; this only covers one deleted in between.
  if (!business) notFound();
  return (
    <BookingShell businessName={business.name}>
      <div className="flex flex-col gap-3 pt-6">
        <p className="text-sm font-medium text-muted-foreground">
          Réservation en ligne
        </p>
        <h1 className="text-3xl md:text-4xl" data-testid="business-name">
          {business.name}
        </h1>
        <p className="text-lg text-muted-foreground">
          Choisissez une prestation, un jour et une heure. La confirmation
          arrive sur WhatsApp.
        </p>
      </div>
      <Button size="lg" className="w-full" data-testid="book-button">
        Prendre rendez-vous
      </Button>
    </BookingShell>
  );
}
