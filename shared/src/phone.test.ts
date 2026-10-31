import { describe, expect, it } from 'vitest';
import { isMoroccanPhone, normalizeMoroccanPhone } from './phone.js';
import { PHONE_INPUT_MAX_LENGTH } from './rules.js';
import { phoneSamples } from './testing/index.js';

describe('isMoroccanPhone', () => {
  it.each(phoneSamples)('$input → $valid', ({ input, valid }) => {
    expect(isMoroccanPhone(input)).toBe(valid);
  });
});

describe('normalizeMoroccanPhone', () => {
  it('returns E.164 for national and international forms', () => {
    expect(normalizeMoroccanPhone('06 12 34 56 78')).toBe('+212612345678');
    expect(normalizeMoroccanPhone('00212612345678')).toBe('+212612345678');
  });

  it('returns null for a number from another country', () => {
    expect(normalizeMoroccanPhone('+33612345678')).toBeNull();
  });

  it('returns null for an empty input', () => {
    expect(normalizeMoroccanPhone('')).toBeNull();
  });
});

// The length cap runs before parsing, so a huge input never reaches libphonenumber.
describe('PHONE_INPUT_MAX_LENGTH', () => {
  const valid = '+212 6 12 34 56 78';

  it('accepts a valid number padded to exactly the limit', () => {
    const input = valid.padEnd(PHONE_INPUT_MAX_LENGTH, ' ');

    expect(normalizeMoroccanPhone(input)).toBe('+212612345678');
  });

  it('refuses a valid number one character over the limit', () => {
    const input = valid.padEnd(PHONE_INPUT_MAX_LENGTH + 1, ' ');

    expect(normalizeMoroccanPhone(input)).toBeNull();
  });

  it('refuses a very long input quickly', () => {
    expect(isMoroccanPhone('0'.repeat(100_000))).toBe(false);
  });
});
