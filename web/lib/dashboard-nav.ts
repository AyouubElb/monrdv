import {
  CalendarDays,
  ExternalLink,
  LayoutList,
  ListChecks,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown in the menu only once the feature behind it is built. */
  ready: boolean;
}

/**
 * The owner dashboard menu, in order. Set `ready: true` when a feature ships its page. The
 * dashboard lives on the business subdomain (spec 0002); the paths are provisional until
 * feature 5 mounts it, and nothing links to them while `ready` is false.
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    label: 'Agenda',
    href: '/dashboard',
    icon: CalendarDays,
    ready: false,
  },
  {
    label: 'Réservations',
    href: '/dashboard/reservations',
    icon: ListChecks,
    ready: false,
  },
  {
    label: 'Prestations',
    href: '/dashboard/prestations',
    icon: LayoutList,
    ready: false,
  },
  {
    label: 'Équipe',
    href: '/dashboard/equipe',
    icon: Users,
    ready: false,
  },
  {
    label: 'Caisse',
    href: '/dashboard/caisse',
    icon: Wallet,
    ready: false,
  },
  {
    label: 'Ma page',
    href: '/dashboard/ma-page',
    icon: ExternalLink,
    ready: false,
  },
];

/** The items the menu shows: only the ready ones. */
export function readyNavItems(): DashboardNavItem[] {
  return DASHBOARD_NAV.filter((item) => item.ready);
}
