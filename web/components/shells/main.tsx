import type { ReactNode } from 'react';

/**
 * A shell's main region: `<main id="contenu">` on a real page, a plain `div` when the shell is
 * shown inside the `/design` gallery (a page has one `<main>` only).
 */
export function Main({
  preview,
  className,
  children,
}: {
  preview: boolean;
  className: string;
  children: ReactNode;
}) {
  if (preview) return <div className={className}>{children}</div>;
  return (
    <main id="contenu" className={className}>
      {children}
    </main>
  );
}
