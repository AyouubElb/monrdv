import type { ReactNode } from 'react';

/** A top level gallery section, reachable from the page's table of contents. */
export function GallerySection({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-40 flex-col gap-10 border-t py-12 md:py-16"
    >
      <header className="flex max-w-2xl flex-col gap-2">
        <h2 id={`${id}-title`} className="text-2xl md:text-3xl">
          {title}
        </h2>
        <p className="text-lg text-muted-foreground">{lead}</p>
      </header>
      {children}
    </section>
  );
}

/** A block inside a section: one component or one foundation. */
export function Subsection({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl">{title}</h3>
        {lead && <p className="text-muted-foreground">{lead}</p>}
      </div>
      {children}
    </div>
  );
}
