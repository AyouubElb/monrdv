import { assertTzData, isTzDataAtLeast, MIN_TZDATA_VERSION } from './tzdata.js';

function utcOffset(timeZone: string, at: Date): string {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(at)
    .find((part) => part.type === 'timeZoneName')?.value;
  return !name || name === 'GMT' ? '+00:00' : name.replace('GMT', '');
}

describe('time zone data', () => {
  it('is recent enough on this runtime', () => {
    expect(isTzDataAtLeast(process.versions.tz ?? '', MIN_TZDATA_VERSION)).toBe(
      true,
    );
  });

  it('puts Africa/Casablanca at +00:00 on 2026-10-01 (after the return to GMT)', () => {
    expect(
      utcOffset('Africa/Casablanca', new Date('2026-10-01T12:00:00Z')),
    ).toBe('+00:00');
  });
});

describe('isTzDataAtLeast', () => {
  it.each([
    ['2026c', '2026c', true],
    ['2026d', '2026c', true],
    ['2027a', '2026c', true],
    ['2026b', '2026c', false],
    ['2025z', '2026c', false],
    ['garbage', '2026c', false],
  ])('%s >= %s is %s', (version, minimum, expected) => {
    expect(isTzDataAtLeast(version, minimum)).toBe(expected);
  });
});

describe('assertTzData', () => {
  it('refuses to start on older tz data', () => {
    expect(() => assertTzData('2026a')).toThrow(/older than 2026c/);
  });

  it('accepts current tz data', () => {
    expect(() => assertTzData('2026c')).not.toThrow();
  });
});
