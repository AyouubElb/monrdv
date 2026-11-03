import { cn } from '@/lib/utils';

/** The MonRDV wordmark: "Mon" in ink, "RDV" in the page's primary color. Text only. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      translate="no"
      className={cn('text-xl font-semibold tracking-tight', className)}
    >
      Mon<span className="text-primary">RDV</span>
    </span>
  );
}
