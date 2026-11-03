import type { DashboardNavItem } from '@/lib/dashboard-nav';
import { cn } from '@/lib/utils';

/** The menu links, shared by the sidebar and the phone Sheet. */
export function DashboardNavList({
  items,
  currentHref,
}: {
  items: DashboardNavItem[];
  currentHref: string;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ label, href, icon: Icon }) => {
        const current = href === currentHref;
        return (
          <li key={href}>
            <a
              href={href}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center gap-3 rounded-lg px-3 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                current &&
                  'bg-primary-soft text-foreground hover:bg-primary-soft',
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn('size-5', current && 'text-primary')}
              />
              {label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
