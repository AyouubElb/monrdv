import { isMoroccanPhone, messages } from '@repo/shared';
import { ValidateBy, type ValidationOptions } from 'class-validator';

/** DTO rule backed by the same `isMoroccanPhone` the web forms use. */
export function IsMoroccanPhone(
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isMoroccanPhone',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isMoroccanPhone(value),
        defaultMessage: () => messages.phone.invalid,
      },
    },
    options,
  );
}
