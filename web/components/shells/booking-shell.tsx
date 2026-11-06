import type { ReactNode } from 'react';
import { Main } from './main';
import { BusinessMark } from '@/components/brand/business-mark';
import { cn } from '@/lib/utils';

/**
 * The frame of every public business page, phones first: the business on top, one centered
 * column at most 480px wide, and room at the bottom for `StickyActionBar` when a step has one.
 */
export function BookingShell({
  businessName,
  children,
  actionBar,
  preview = false,
}: {
  businessName: string;
  children: ReactNode;
  /** In the `/design` gallery: the main region becomes a plain `div`, since the page has its own. */
  preview?: boolean;
  /** A `StickyActionBar`, rendered after the content. */
  actionBar?: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-[480px] items-center gap-3 px-4 py-3">
          <BusinessMark name={businessName} />
          <p
            translate="no"
            className="line-clamp-2 min-w-0 text-lg leading-snug font-semibold break-words"
          >
            {businessName}
          </p>
        </div>
      </header>
      <Main
        preview={preview}
        className={cn(
          'mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-4 pt-6 pb-10',
          // Room for the fixed action bar, so the last item is never hidden under it.
          actionBar && 'pb-40',
        )}
      >
        {children}
      </Main>
      <footer
        className={cn(
          'mx-auto flex w-full max-w-[480px] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 pb-6 text-xs text-muted-foreground',
          actionBar && 'pb-36',
        )}
      >
        <p>
          Réservation en ligne par <span className="font-semibold">MonRDV</span>
        </p>
        <span aria-hidden="true">·</span>
        <a
          href="/connexion"
          className="rounded-sm underline-offset-4 hover:text-foreground hover:underline"
        >
          Espace pro
        </a>
      </footer>
      {actionBar}
    </div>
  );
}
