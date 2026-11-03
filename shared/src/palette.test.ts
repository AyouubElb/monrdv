import { describe, expect, it } from 'vitest';
import {
  BUSINESS_PALETTE,
  DEFAULT_ACCENT,
  contrastRatio,
  paletteColorOrDefault,
} from './palette.js';

// The fixed theme colors, copied from `web/app/globals.css` (spec 0004, Tokens). If you change
// one there, change it here so this test checks the real value.
const WHITE = '#ffffff';
const BACKGROUND = '#f4f1ea';
const INK = '#2b2a24';
const MUTED_TEXT = '#6b6358';
const SAND = '#ebe5d8';
const INPUT_BORDER = '#8c8374';
const HIGHLIGHT = '#dca487';

const STATUS_PAIRS = [
  { name: 'confirmed', text: '#1a6b43', tint: '#e4efea' },
  { name: 'done', text: '#3f4a5a', tint: '#e8e9eb' },
  { name: 'no show', text: '#8a4f00', tint: '#f4ebe0' },
  { name: 'cancelled', text: '#b42318', tint: '#f6e5e3' },
];

describe('contrastRatio', () => {
  it('gives 21 for black on white and 1 for a color on itself', () => {
    expect(contrastRatio('#000000', WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(INK, INK)).toBe(1);
  });
});

describe('BUSINESS_PALETTE', () => {
  it('has the 10 colors in the spec order, olive first', () => {
    expect(BUSINESS_PALETTE.map((color) => color.name)).toEqual([
      'Olive',
      'Majorelle',
      'Cobalt',
      'Pétrole',
      'Émeraude',
      'Terracotta',
      'Framboise',
      'Prune',
      'Ocre',
      'Encre',
    ]);
    expect(BUSINESS_PALETTE[0].hex).toBe(DEFAULT_ACCENT);
  });

  it.each(BUSINESS_PALETTE)(
    '$name reaches 4.5:1 against white and the page background',
    ({ hex }) => {
      expect(contrastRatio(hex, WHITE)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(hex, BACKGROUND)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('fixed theme pairs', () => {
  it.each(STATUS_PAIRS)(
    'status $name text reaches 4.5:1 on its tint',
    ({ text, tint }) => {
      expect(contrastRatio(text, tint)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('ink reaches 4.5:1 on the clay highlight', () => {
    expect(contrastRatio(INK, HIGHLIGHT)).toBeGreaterThanOrEqual(4.5);
  });

  it('ink and secondary text reach 4.5:1 on the sand surface', () => {
    expect(contrastRatio(INK, SAND)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(MUTED_TEXT, SAND)).toBeGreaterThanOrEqual(4.5);
  });

  it('the input border reaches 3:1 on white and the page background', () => {
    expect(contrastRatio(INPUT_BORDER, WHITE)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(INPUT_BORDER, BACKGROUND)).toBeGreaterThanOrEqual(3);
  });
});

describe('paletteColorOrDefault', () => {
  it('returns the palette hex for a palette color, whatever its case', () => {
    expect(paletteColorOrDefault('#ab4a28')).toBe('#ab4a28');
    expect(paletteColorOrDefault('#AB4A28')).toBe('#ab4a28');
  });

  it('returns the default olive for null or a color outside the palette', () => {
    expect(paletteColorOrDefault(null)).toBe(DEFAULT_ACCENT);
    expect(paletteColorOrDefault('#ffff00')).toBe(DEFAULT_ACCENT);
    expect(paletteColorOrDefault('red;}body{display:none')).toBe(
      DEFAULT_ACCENT,
    );
  });
});
