import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

// `next/font` downloads the font at build time and serves it from this app, so the browser
// never calls Google. `globals.css` reads it through `--font-plex`.
const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MonRDV, réservation en ligne',
  description:
    'Prenez rendez-vous en ligne avec votre salon, votre clinique ou votre coach.',
};

// The browser bar matches the page background (`--background` in `globals.css`).
export const viewport: Viewport = {
  themeColor: '#f4f1ea',
  colorScheme: 'light',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`${plex.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Every page has `<main id="contenu">`, given by its shell. */}
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-medium focus:shadow-lg"
        >
          Aller au contenu
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
