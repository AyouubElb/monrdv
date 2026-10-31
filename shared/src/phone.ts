import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { PHONE_INPUT_MAX_LENGTH } from './rules.js';

/**
 * Returns the number in E.164 form (`+212612345678`) when the input is a valid
 * Moroccan number, written nationally (`06 12 34 56 78`) or internationally
 * (`+212 6 12 34 56 78`, `00212…`). Returns `null` otherwise, including for
 * valid numbers from other countries.
 */
export function normalizeMoroccanPhone(input: string): string | null {
  if (input.length > PHONE_INPUT_MAX_LENGTH) return null;
  const phone = parsePhoneNumberFromString(input, 'MA');
  if (!phone || phone.country !== 'MA' || !phone.isValid()) return null;
  return phone.number;
}

export function isMoroccanPhone(input: string): boolean {
  return normalizeMoroccanPhone(input) !== null;
}
