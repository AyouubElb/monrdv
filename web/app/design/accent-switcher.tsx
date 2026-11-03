'use client';

import { BUSINESS_PALETTE, DEFAULT_ACCENT } from '@repo/shared';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Lets a reviewer repaint the whole gallery in any business color. Writes `--primary` on
 * `<html>`, like the business layout does on `:root`, so Dialogs and toasts follow too.
 * Gallery only; business pages get their color from the server.
 */
export function AccentSwitcher() {
  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', accent);
    return () => {
      root.style.removeProperty('--primary');
    };
  }, [accent]);

  const current = BUSINESS_PALETTE.find((color) => color.hex === accent);

  return (
    <div
      role="group"
      aria-labelledby="accent-switcher-label"
      className="flex flex-col gap-2"
    >
      <p id="accent-switcher-label" className="text-sm text-muted-foreground">
        Couleur de l’établissement :{' '}
        <span className="font-medium text-foreground">{current?.name}</span>
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {BUSINESS_PALETTE.map((color) => {
          const selected = color.hex === accent;
          return (
            <li key={color.hex}>
              <button
                type="button"
                aria-pressed={selected}
                title={color.name}
                onClick={() => setAccent(color.hex)}
                // The swatch color is a palette constant, the one place a hex goes inline.
                style={{ backgroundColor: color.hex }}
                className="flex size-11 items-center justify-center rounded-full border-2 border-card text-white ring-1 ring-border transition-colors hover:ring-2 hover:ring-input aria-pressed:ring-2 aria-pressed:ring-foreground"
              >
                {selected && <Check aria-hidden="true" className="size-5" />}
                <span className="sr-only">{color.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
