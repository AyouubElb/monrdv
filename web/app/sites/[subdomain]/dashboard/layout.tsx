import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentOwner } from '@/lib/api/session';

// Every dashboard page needs the owner first, so the whole segment blocks on it.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const owner = await getCurrentOwner();
  return {
    title: `Tableau de bord · ${owner?.business.name ?? 'MonRDV'}`,
    robots: { index: false },
  };
}

export default async function DashboardLayout({
  children,
}: LayoutProps<'/sites/[subdomain]/dashboard'>) {
  if (!(await getCurrentOwner())) redirect('/connexion');
  return children;
}
