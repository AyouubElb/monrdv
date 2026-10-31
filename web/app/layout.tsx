import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MonRDV, réservation en ligne',
  description:
    'Prenez rendez-vous en ligne avec votre salon, votre clinique ou votre coach.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
