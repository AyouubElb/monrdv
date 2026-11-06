/** Longest phone input we accept before parsing, spaces and separators included. */
export const PHONE_INPUT_MAX_LENGTH = 20;

// Signup field limits; the database checks the same ranges.
export const BUSINESS_NAME_MIN_LENGTH = 2;
export const BUSINESS_NAME_MAX_LENGTH = 80;
export const FIRST_NAME_MIN_LENGTH = 1;
export const FIRST_NAME_MAX_LENGTH = 60;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordRule {
  id: 'length' | 'upper' | 'lower' | 'digit' | 'special';
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: '8 caractères minimum',
    test: (password) =>
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH,
  },
  { id: 'upper', label: 'Une majuscule', test: (p) => /\p{Lu}/u.test(p) },
  { id: 'lower', label: 'Une minuscule', test: (p) => /\p{Ll}/u.test(p) },
  { id: 'digit', label: 'Un chiffre', test: (p) => /\p{Nd}/u.test(p) },
  {
    id: 'special',
    label: 'Un caractère spécial',
    test: (p) => /[^\p{L}\p{N}]/u.test(p),
  },
];

export function isValidPassword(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export interface SettingChoice {
  label: string;
  value: number;
}

// The signup DTO accepts only these values; defaults match the spec 0003 columns.
export const BOOKING_SETTING_CHOICES = {
  minNoticeMinutes: {
    label: 'Délai minimum',
    defaultValue: 60,
    choices: [
      { label: 'Aucun', value: 0 },
      { label: '30 min', value: 30 },
      { label: '1 h', value: 60 },
      { label: '2 h', value: 120 },
      { label: '24 h', value: 1440 },
    ],
  },
  bookingWindowDays: {
    label: 'Réservation jusqu’à',
    defaultValue: 60,
    choices: [
      { label: '2 semaines', value: 14 },
      { label: '1 mois', value: 30 },
      { label: '2 mois', value: 60 },
      { label: '3 mois', value: 90 },
    ],
  },
  cancelNoticeHours: {
    label: 'Annulation en ligne',
    defaultValue: 24,
    choices: [
      { label: 'Jusqu’à 2 h avant', value: 2 },
      { label: 'Jusqu’à 12 h avant', value: 12 },
      { label: 'Jusqu’à 24 h avant', value: 24 },
      { label: 'Jusqu’à 48 h avant', value: 48 },
    ],
  },
} as const satisfies Record<
  string,
  { label: string; defaultValue: number; choices: readonly SettingChoice[] }
>;

export type BookingSettingKey = keyof typeof BOOKING_SETTING_CHOICES;

export const BUSINESS_KINDS = ['salon', 'clinic', 'coach', 'other'] as const;
export type BusinessKind = (typeof BUSINESS_KINDS)[number];
