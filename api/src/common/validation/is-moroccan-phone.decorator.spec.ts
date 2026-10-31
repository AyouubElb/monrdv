import { messages } from '@repo/shared';
import { phoneSamples } from '@repo/shared/testing';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { IsMoroccanPhone } from './is-moroccan-phone.decorator.js';

class PhoneDto {
  @IsMoroccanPhone()
  phone: string;
}

function errorsFor(phone: unknown) {
  return validateSync(plainToInstance(PhoneDto, { phone }));
}

// Parity with the web Zod schema: both run the same shared samples (web/lib/validation/phone.test.ts).
describe('IsMoroccanPhone (parity with web)', () => {
  it.each(phoneSamples)('$input → $valid', ({ input, valid }) => {
    expect(errorsFor(input).length === 0).toBe(valid);
  });

  it('rejects non strings with the shared French message', () => {
    const [error] = errorsFor(612345678);
    expect(error?.constraints?.isMoroccanPhone).toBe(messages.phone.invalid);
  });
});
