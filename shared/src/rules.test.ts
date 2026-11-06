import { describe, expect, it } from 'vitest';
import {
  BOOKING_SETTING_CHOICES,
  PASSWORD_RULES,
  isValidPassword,
} from './rules.js';
import { passwordSamples } from './testing/index.js';

// covers: spec 0005 AC-7
describe('isValidPassword', () => {
  it.each(passwordSamples)('$input → $valid', ({ input, valid }) => {
    expect(isValidPassword(input)).toBe(valid);
  });
});

describe('PASSWORD_RULES', () => {
  it('names the rule each sample breaks', () => {
    const failing = (password: string) =>
      PASSWORD_RULES.filter((rule) => !rule.test(password)).map((r) => r.id);

    expect(failing('salonatlas1!')).toEqual(['upper']);
    expect(failing('SALONATLAS1!')).toEqual(['lower']);
    expect(failing('Salonatlas!!')).toEqual(['digit']);
    expect(failing('Salonatlas12')).toEqual(['special']);
    expect(failing('Sa1!')).toEqual(['length']);
  });
});

// covers: spec 0005 AC-1 (prefilled "1 h", "2 mois", "Jusqu’à 24 h avant")
describe('BOOKING_SETTING_CHOICES', () => {
  it.each(Object.entries(BOOKING_SETTING_CHOICES))(
    '%s offers its default as a choice',
    (_key, setting) => {
      const values = setting.choices.map((choice) => choice.value);

      expect(values).toContain(setting.defaultValue);
    },
  );

  it('defaults to the spec 0003 column defaults', () => {
    expect(BOOKING_SETTING_CHOICES.minNoticeMinutes.defaultValue).toBe(60);
    expect(BOOKING_SETTING_CHOICES.bookingWindowDays.defaultValue).toBe(60);
    expect(BOOKING_SETTING_CHOICES.cancelNoticeHours.defaultValue).toBe(24);
  });
});
