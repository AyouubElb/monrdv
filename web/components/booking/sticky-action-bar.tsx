'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * The one main action of a booking step, fixed to the bottom of the screen where the thumb is.
 * `BookingShell` leaves room for it. An optional summary sits above the button.
 */
export function StickyActionBar({
  label,
  disabled,
  onAction,
  summary,
}: {
  label: string;
  disabled?: boolean;
  onAction: () => void;
  summary?: ReactNode;
}) {
  return (
    <div
      data-sticky-action-bar
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85"
    >
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {summary && (
          <div aria-live="polite" className="text-sm text-muted-foreground">
            {summary}
          </div>
        )}
        <Button
          size="lg"
          className="w-full"
          disabled={disabled}
          onClick={onAction}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
