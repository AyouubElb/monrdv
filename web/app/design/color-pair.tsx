'use client';

import { contrastRatio } from '@repo/shared';
import { useEffect, useRef, useState } from 'react';

/**
 * A token pair as a surface with "Aa" in its text color, and the contrast measured in the
 * browser from the real CSS. It measures again when the accent switcher changes `--primary`
 * (a `style` change on `<html>`), so the primary pair always shows the current business color.
 */
export function ColorPair({
  name,
  background,
  foreground,
  use,
}: {
  name: string;
  background: string;
  foreground: string;
  use: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<{ ratio: number; hex: string }>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      const bg = toHex(style.backgroundColor);
      const fg = toHex(style.color);
      setMeasured({ ratio: contrastRatio(bg, fg), hex: bg });
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const passes = measured ? measured.ratio >= 4.5 : true;

  return (
    <figure className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div
        ref={ref}
        style={{
          backgroundColor: `var(--${background})`,
          color: `var(--${foreground})`,
        }}
        className="flex h-24 items-end justify-between p-4"
      >
        <span className="text-2xl font-semibold">Aa</span>
        <span className="rounded-full border border-current/25 px-2 py-0.5 text-xs font-medium tabular-nums">
          {measured
            ? `${measured.ratio.toFixed(2)}:1 ${passes ? 'AA' : 'insuffisant'}`
            : '…'}
        </span>
      </div>
      <figcaption className="flex flex-col gap-0.5 p-3">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">{use}</span>
        <span className="font-mono text-xs text-muted-foreground">
          --{background} / --{foreground}
          {measured ? ` · ${measured.hex}` : ''}
        </span>
      </figcaption>
    </figure>
  );
}

// Every color here comes from `getComputedStyle`, which answers `rgb(r, g, b)` for the hex and
// `color-mix` values in `globals.css`. Painting one canvas pixel turns any form into sRGB.
function toHex(color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return '#000000';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
