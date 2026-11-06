'use client';

import { PASSWORD_RULES } from '@repo/shared';
import { Check, Circle } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { PasswordInput } from '@/components/forms/password-input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SignupFormInput } from '@/lib/validation/signup';

export function AccountStep({
  form,
}: {
  form: UseFormReturn<SignupFormInput>;
}) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const password = watch('password');

  return (
    <FieldGroup>
      <Field data-invalid={!!errors.firstName}>
        <FieldLabel htmlFor="firstName">Votre prénom</FieldLabel>
        <Input
          id="firstName"
          autoComplete="given-name"
          aria-invalid={!!errors.firstName}
          aria-describedby={errors.firstName && 'firstName-error'}
          {...register('firstName')}
        />
        <FieldError id="firstName-error" errors={[errors.firstName]} />
      </Field>

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email && 'email-error'}
          {...register('email')}
        />
        <FieldError id="email-error" errors={[errors.email]} />
      </Field>

      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={
            errors.password ? 'password-rules password-error' : 'password-rules'
          }
          {...register('password')}
        />
        <ul id="password-rules" className="grid gap-1.5 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password ?? '');
            const Icon = met ? Check : Circle;
            return (
              <li
                key={rule.id}
                className={cn(
                  'flex items-center gap-2 text-sm',
                  met ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn('size-4 shrink-0', met && 'text-primary')}
                />
                <span className="sr-only">
                  {met ? 'Fait : ' : 'À faire : '}
                </span>
                {rule.label}
              </li>
            );
          })}
        </ul>
        <FieldError id="password-error" errors={[errors.password]} />
      </Field>
    </FieldGroup>
  );
}
