'use client';

import { formatTime, formatWallClock } from '@repo/shared';
import { CalendarX2 } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

/**
 * The free start times of one day, as buttons. `selected` and the value given to `onSelect`
 * are wall clock strings ("YYYY-MM-DDTHH:mm").
 */
export function SlotGrid({
  slots,
  selected,
  onSelect,
}: {
  /** Wall clock start times (spec 0003). */
  slots: Date[];
  selected: string | null;
  onSelect: (slot: string) => void;
}) {
  if (slots.length === 0) {
    return (
      <Empty className="border bg-card p-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX2 />
          </EmptyMedia>
          <EmptyTitle>Plus de créneau ce jour-là</EmptyTitle>
          <EmptyDescription>Choisissez un autre jour.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div role="group" aria-label="Heure">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot) => {
          const value = formatWallClock(slot);
          const isSelected = value === selected;
          return (
            <li key={value}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(value)}
                className={cn(
                  'h-12 w-full rounded-lg border bg-card text-base font-semibold tabular-nums transition-colors hover:border-input',
                  isSelected &&
                    'border-primary bg-primary text-primary-foreground hover:border-primary',
                )}
              >
                {formatTime(slot)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
