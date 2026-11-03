import { describe, expect, it } from 'vitest';
import {
  formatDay,
  formatDuration,
  formatPrice,
  formatTime,
} from './format.js';
import { parseWallClock } from './wall-clock.js';

// U+00A0, written by code so it stays visible here.
const NBSP = String.fromCharCode(0xa0);

describe('formatPrice', () => {
  it('shows whole dirhams without decimals', () => {
    expect(formatPrice(15000)).toBe(`150${NBSP}DH`);
    expect(formatPrice(0)).toBe(`0${NBSP}DH`);
  });

  it('shows centimes with a comma when there are some', () => {
    expect(formatPrice(8550)).toBe(`85,50${NBSP}DH`);
    expect(formatPrice(8505)).toBe(`85,05${NBSP}DH`);
  });

  it('groups thousands with a narrow space', () => {
    const NARROW_NBSP = String.fromCharCode(0x202f);
    expect(formatPrice(150000)).toBe(`1${NARROW_NBSP}500${NBSP}DH`);
  });

  it('puts a real no break space before DH', () => {
    expect(formatPrice(15000).charCodeAt(3)).toBe(0xa0);
  });
});

describe('formatDuration', () => {
  it.each([
    [45, `45${NBSP}min`],
    [60, `1${NBSP}h`],
    [90, `1${NBSP}h${NBSP}30`],
    [125, `2${NBSP}h${NBSP}05`],
  ])('%i → %s', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });
});

describe('formatTime and formatDay', () => {
  // Tuesday 3 November 2026, 14:30 on the business's clock.
  const wall = parseWallClock('2026-11-03T14:30');

  it('formats the time in 24 hours', () => {
    expect(formatTime(wall)).toBe('14:30');
    expect(formatTime(parseWallClock('2026-11-03T09:05'))).toBe('09:05');
  });

  it('formats the day in French, short and long', () => {
    expect(formatDay(wall, 'short')).toBe('mar. 3 nov.');
    expect(formatDay(wall, 'long')).toBe('mardi 3 novembre');
  });

  it('keeps the wall clock day late in the evening', () => {
    // 23:30 must stay Tuesday whatever the time zone of the machine.
    expect(formatDay(parseWallClock('2026-11-03T23:30'), 'long')).toBe(
      'mardi 3 novembre',
    );
  });
});
