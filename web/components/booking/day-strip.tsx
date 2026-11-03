'use client';

import { formatDay, formatWallClock } from '@repo/shared';
import { cn } from '@/lib/utils';

export interface StripDay {
  /** Wall clock midnight of the day (spec 0003). */
  day: Date;
  /** False when nothing is free that day: shown, but cannot be picked. */
  available: boolean;
}

/** Day key used for selection: "YYYY-MM-DD" of a wall clock date. */
export function dayKey(day: Date): string {
  return formatWallClock(day).slice(0, 10);
}

/**
 * The days to pick from, in one row that scrolls sideways inside itself, so the page never
 * scrolls sideways on a phone.
 */
export function DayStrip({
  days,
  selectedKey,
  onSelect,
}: {
  days: StripDay[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Jour"
      className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6"
    >
      <ul className="flex snap-x gap-2 py-1">
        {days.map(({ day, available }) => {
          const key = dayKey(day);
          const selected = key === selectedKey;
          const [weekday, date, month] = formatDay(day, 'short').split(' ');
          return (
            <li key={key} className="snap-start">
              <button
                type="button"
                aria-pressed={selected}
                disabled={!available}
                onClick={() => onSelect(key)}
                // The name is the visible text ("mar. 3 nov."), so voice control users can say
                // what they see.
                className={cn(
                  'flex h-20 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border bg-card transition-colors hover:border-input disabled:cursor-not-allowed disabled:bg-transparent disabled:text-muted-foreground disabled:line-through',
                  selected &&
                    'border-primary bg-primary-soft ring-1 ring-primary hover:border-primary',
                )}
              >
                <span className="text-xs font-medium capitalize">
                  {weekday}
                </span>
                <span className="text-xl font-semibold tabular-nums">
                  {date}
                </span>
                <span className="text-xs">{month}</span>
                {!available && <span className="sr-only">, complet</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
