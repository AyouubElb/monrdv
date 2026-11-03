import { paletteColorOrDefault } from '@repo/shared';
import { getCurrentBusiness } from '@/lib/api/tenant';

// Every business page gets the business color as `--primary` (spec 0004, Applying the accent).
// The page depends on the business entirely, so it blocks on it instead of streaming: the color
// and the content arrive in the first HTML, right on first paint, even without JavaScript.
export const instant = false;

export default async function BusinessLayout({
  children,
}: LayoutProps<'/sites/[subdomain]'>) {
  const business = await getCurrentBusiness();
  // Only a palette constant is ever written here, never the stored string (AC-5). A missing
  // business gets the default; the page itself still answers 404.
  const accent = paletteColorOrDefault(business?.accentColor ?? null);
  return (
    <>
      {/* On `:root`, not a wrapper, so Dialogs, Sheets, and toasts (portaled to the end of
          `<body>`) get the color too. `--ring` and `--primary-soft` follow `--primary`. */}
      <style>{`:root{--primary:${accent}}`}</style>
      {children}
    </>
  );
}
