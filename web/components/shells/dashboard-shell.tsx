import type { ReactNode } from 'react';
import { Main } from './main';
import { BusinessMark } from '@/components/brand/business-mark';
import { Wordmark } from '@/components/brand/wordmark';
import { readyNavItems, type DashboardNavItem } from '@/lib/dashboard-nav';
import { DashboardMenuButton } from './dashboard-menu-button';
import { DashboardNavList } from './dashboard-nav-list';

/**
 * The frame of the owner dashboard: a sidebar from 1024px wide; below that, a top bar whose
 * menu button opens the same menu in a Sheet. The menu shows only the ready items of
 * `lib/dashboard-nav.ts`, unless `items` is given (the `/design` gallery shows them all).
 */
export function DashboardShell({
  businessName,
  currentHref,
  items = readyNavItems(),
  children,
  footer,
  preview = false,
}: {
  businessName: string;
  /** The current page's path, marked in the menu with `aria-current`. */
  currentHref: string;
  items?: DashboardNavItem[];
  children: ReactNode;
  /** Under the menu, in the sidebar and the Sheet (the logout button). */
  footer?: ReactNode;
  /** In the `/design` gallery: the main region becomes a plain `div`, since the page has its own. */
  preview?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r bg-card p-4 lg:flex">
        <BusinessHeading name={businessName} />
        <nav aria-label="Menu principal">
          <DashboardNavList items={items} currentHref={currentHref} />
        </nav>
        <div className="mt-auto flex flex-col gap-4">
          {footer}
          <Wordmark className="px-3 text-base text-muted-foreground" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-2 lg:hidden">
          <DashboardMenuButton businessName={businessName} footer={footer}>
            <DashboardNavList items={items} currentHref={currentHref} />
          </DashboardMenuButton>
          <BusinessHeading name={businessName} />
        </header>
        <Main
          preview={preview}
          className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8"
        >
          {children}
        </Main>
      </div>
    </div>
  );
}

function BusinessHeading({ name }: { name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BusinessMark name={name} className="size-9 text-sm" />
      <p translate="no" className="truncate font-semibold">
        {name}
      </p>
    </div>
  );
}
