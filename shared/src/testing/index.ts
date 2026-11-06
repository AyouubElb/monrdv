/**
 * Samples every phone validator must agree on. The web Zod schema and the API
 * DTO each run these in their own test, so the two sides cannot drift apart.
 */
export const phoneSamples: ReadonlyArray<{ input: string; valid: boolean }> = [
  { input: '0612345678', valid: true },
  { input: '06 12 34 56 78', valid: true },
  { input: '06-12-34-56-78', valid: true },
  { input: '0712345678', valid: true },
  { input: '0522123456', valid: true },
  { input: '+212612345678', valid: true },
  { input: '+212 6 12 34 56 78', valid: true },
  { input: '00212612345678', valid: true },
  { input: '', valid: false },
  { input: 'bonjour', valid: false },
  { input: '061234567', valid: false },
  { input: '06123456789', valid: false },
  { input: '+33612345678', valid: false },
  { input: '+212 6 12 34 56 78 00 00 00 00', valid: false },
];

// Every password validator must agree on these (AC-7).
export const passwordSamples: ReadonlyArray<{
  input: string;
  valid: boolean;
}> = [
  { input: 'Salonatlas1!', valid: true },
  { input: 'Dev-Owner-2026!', valid: true },
  { input: 'Éé1 aaaa', valid: true },
  { input: 'salonatlas1!', valid: false },
  { input: 'SALONATLAS1!', valid: false },
  { input: 'Salonatlas!!', valid: false },
  { input: 'Salonatlas12', valid: false },
  { input: 'Sa1!', valid: false },
  { input: `Aa1!${'a'.repeat(124)}`, valid: true },
  { input: `Aa1!${'a'.repeat(125)}`, valid: false },
  { input: '', valid: false },
];
