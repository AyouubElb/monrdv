import type { Metadata } from 'next';

// The tab title lives here, not in `not-found.tsx`: Next.js reads `metadata` from a nested
// `not-found.tsx` only on the server render, so the browser swapped back to the root title.
export const metadata: Metadata = {
  title: 'Établissement introuvable · MonRDV',
};

export default function SiteIntrouvableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
