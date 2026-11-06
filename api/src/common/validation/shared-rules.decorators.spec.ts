import { passwordSamples } from '@repo/shared/testing';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  IsAvailableSubdomainFormat,
  IsValidPassword,
} from './shared-rules.decorators.js';

class PasswordDto {
  @IsValidPassword()
  password: string;
}

class SubdomainDto {
  @IsAvailableSubdomainFormat()
  subdomain: string;
}

const isValid = <T extends object>(dto: new () => T, value: object) =>
  validateSync(plainToInstance(dto, value)).length === 0;

// Parity with web/lib/validation/signup.test.ts: same shared samples.
describe('IsValidPassword (parity with web)', () => {
  it.each(passwordSamples)('$input → $valid', ({ input, valid }) => {
    expect(isValid(PasswordDto, { password: input })).toBe(valid);
  });
});

describe('IsAvailableSubdomainFormat', () => {
  it.each([
    ['salon-atlas', true],
    ['ab', false],
    ['xn--atlas', false],
    ['admin', false],
    [42, false],
  ])('%s → %s', (subdomain, valid) => {
    expect(isValid(SubdomainDto, { subdomain })).toBe(valid);
  });
});
