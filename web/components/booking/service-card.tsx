'use client';

import { formatDuration, formatPrice } from '@repo/shared';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A service to choose: name, duration, price. The whole card is one button. */
export function ServiceCard({
  name,
  description,
  durationMinutes,
  priceCentimes,
  selected,
  onSelect,
}: {
  name: string;
  description?: string;
  durationMinutes: number;
  priceCentimes: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:border-input',
        selected && 'border-primary bg-primary-soft hover:border-primary',
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-lg font-semibold">{name}</span>
        {description && (
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock aria-hidden="true" className="size-4" />
          {formatDuration(durationMinutes)}
        </span>
      </span>
      <span className="flex flex-col items-end gap-2">
        <span className="text-lg font-semibold whitespace-nowrap tabular-nums">
          {formatPrice(priceCentimes)}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'flex size-6 items-center justify-center rounded-full border border-input text-primary-foreground transition-colors',
            selected && 'border-primary bg-primary',
          )}
        >
          {selected && <Check className="size-4" />}
        </span>
      </span>
    </button>
  );
}
