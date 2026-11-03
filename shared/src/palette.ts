// The business colors (spec 0004, Business palette). A business picks one; it becomes the page's
// `--primary`. Each passes 4.5:1 with white text and as text on the page background, which
// `palette.test.ts` proves. Adding a color means it must pass that test too.

export const BUSINESS_PALETTE = [
  { name: 'Olive', hex: '#5c6a24' },
  { name: 'Majorelle', hex: '#6050dc' },
  { name: 'Cobalt', hex: '#1f3fa7' },
  { name: 'Pétrole', hex: '#0f6e6e' },
  { name: 'Émeraude', hex: '#2a7550' },
  { name: 'Terracotta', hex: '#ab4a28' },
  { name: 'Framboise', hex: '#b8336a' },
  { name: 'Prune', hex: '#7a3e8e' },
  { name: 'Ocre', hex: '#9a5b0a' },
  { name: 'Encre', hex: '#2f2a24' },
] as const;

export type PaletteColor = (typeof BUSINESS_PALETTE)[number];

/** The platform olive, used when a business has no color or an unknown one. */
export const DEFAULT_ACCENT = '#5c6a24';

/**
 * The palette's own hex for a stored color, or `DEFAULT_ACCENT`. Always returns a palette
 * constant, never the input string, so a value set by hand can never reach the page's CSS.
 */
export function paletteColorOrDefault(value: string | null): string {
  if (value === null) return DEFAULT_ACCENT;
  const wanted = value.toLowerCase();
  const match = BUSINESS_PALETTE.find((color) => color.hex === wanted);
  return match ? match.hex : DEFAULT_ACCENT;
}

/** WCAG contrast ratio between two `#rrggbb` colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
