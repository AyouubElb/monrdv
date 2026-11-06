import { messages } from '@repo/shared';
import { passwordSamples } from '@repo/shared/testing';
import { describe, expect, it } from 'vitest';
import { passwordSchema, subdomainSchema } from './signup';

describe('passwordSchema (parity with API)', () => {
  it.each(passwordSamples)('$input → $valid', ({ input, valid }) => {
    expect(passwordSchema.safeParse(input).success).toBe(valid);
  });
});

describe('subdomainSchema', () => {
  it.each([
    ['salon-atlas', null],
    ['ab', messages.subdomain.invalid],
    ['Salon', messages.subdomain.invalid],
    ['admin', messages.subdomain.reserved],
  ])('%s → %s', (input, message) => {
    const result = subdomainSchema.safeParse(input);
    expect(result.error?.issues[0]?.message ?? null).toBe(message);
  });
});
