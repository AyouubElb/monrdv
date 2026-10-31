import { messages } from '@repo/shared';
import { phoneSamples } from '@repo/shared/testing';
import { describe, expect, it } from 'vitest';
import { phoneSchema } from './phone';

// Parity with the API DTO: both run the same shared samples (api/src/common/validation/is-moroccan-phone.decorator.spec.ts).
describe('phoneSchema (parity with API)', () => {
  it.each(phoneSamples)('$input → $valid', ({ input, valid }) => {
    expect(phoneSchema.safeParse(input).success).toBe(valid);
  });

  it('uses the shared French message', () => {
    const result = phoneSchema.safeParse('bonjour');
    expect(result.error?.issues[0]?.message).toBe(messages.phone.invalid);
  });
});
