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
