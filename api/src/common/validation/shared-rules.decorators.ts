import { isValidPassword, messages, subdomainProblem } from '@repo/shared';
import { ValidateBy, type ValidationOptions } from 'class-validator';

export function IsValidPassword(
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isValidPassword',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidPassword(value),
        defaultMessage: () => 'password does not meet the rules',
      },
    },
    options,
  );
}

export function IsAvailableSubdomainFormat(
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isAvailableSubdomainFormat',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && subdomainProblem(value) === null,
        defaultMessage: () => messages.subdomain.invalid,
      },
    },
    options,
  );
}
