'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { MeResponse } from '@repo/shared';
import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { PasswordInput } from '@/components/forms/password-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { apiFetch } from '@/lib/api/client';
import {
  loginSchema,
  type LoginFormInput,
  type LoginFormOutput,
} from '@/lib/validation/login';

export function LoginForm({ initialEmail }: { initialEmail: string }) {
  const form = useForm<LoginFormInput, unknown, LoginFormOutput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail, password: '' },
  });
  const {
    register,
    formState: { errors },
  } = form;
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const router = useRouter();

  function onSubmit(event: FormEvent) {
    void form.handleSubmit(signIn)(event);
  }

  async function signIn(values: LoginFormOutput) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFormError(null);

    const result = await apiFetch<MeResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(values),
    });

    if (result.ok) {
      router.replace('/dashboard');
      return;
    }
    inFlight.current = false;
    setBusy(false);
    setFormError(result.error.message);
    form.setFocus('password');
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
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
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password && 'password-error'}
            {...register('password')}
          />
          <FieldError id="password-error" errors={[errors.password]} />
        </Field>
      </FieldGroup>

      {formError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy && <Spinner />}
        Se connecter
      </Button>
    </form>
  );
}
