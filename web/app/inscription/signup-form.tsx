'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  BOOKING_SETTING_CHOICES,
  messages,
  type SignupResponse,
  type SubdomainCheck,
} from '@repo/shared';
import { ArrowLeft, CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  STEP_ONE_FIELDS,
  signupSchema,
  type SignupFormInput,
  type SignupFormOutput,
} from '@/lib/validation/signup';
import { AccountStep } from './account-step';
import { BusinessStep } from './business-step';
import { SignupSuccess } from './signup-success';

const STEPS = {
  1: {
    title: 'Votre établissement',
    text: 'Ce que vos clients verront sur votre page.',
  },
  2: {
    title: 'Votre compte',
    text: 'Pour vous connecter à votre espace.',
  },
} as const;

export function SignupForm({ rootDomain }: { rootDomain: string }) {
  const form = useForm<SignupFormInput, unknown, SignupFormOutput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      businessName: '',
      subdomain: '',
      phone: '',
      minNoticeMinutes: BOOKING_SETTING_CHOICES.minNoticeMinutes.defaultValue,
      bookingWindowDays: BOOKING_SETTING_CHOICES.bookingWindowDays.defaultValue,
      cancelNoticeHours: BOOKING_SETTING_CHOICES.cancelNoticeHours.defaultValue,
      firstName: '',
      email: '',
      password: '',
    },
  });
  const [step, setStep] = useState<1 | 2>(1);
  const [followName, setFollowName] = useState(true);
  const [checkedStepOne, setCheckedStepOne] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    subdomain: string;
    email: string;
  } | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set before a step change; the effect moves focus once the new step rendered.
  const focusAfterStep = useRef<'heading' | 'subdomain' | null>(null);
  // A double tap sends one request, even before the button re-renders disabled.
  const inFlight = useRef(false);

  useEffect(() => {
    if (focusAfterStep.current === 'heading') headingRef.current?.focus();
    if (focusAfterStep.current === 'subdomain') form.setFocus('subdomain');
    focusAfterStep.current = null;
  }, [step, form]);

  // No check on blur: a message appearing under the cursor moves the button being clicked.
  // Once Continuer showed the errors, each field rechecks as it changes.
  useEffect(() => {
    if (!checkedStepOne) return;
    return form.subscribe({
      formState: { values: true },
      callback: ({ name }) => {
        if (name) void form.trigger(name as keyof SignupFormInput);
      },
    });
  }, [checkedStepOne, form]);

  function moveTo(next: 1 | 2) {
    setFormError(null);
    focusAfterStep.current = 'heading';
    setStep(next);
  }

  function onSubmit(event: FormEvent) {
    if (step === 1) {
      event.preventDefault();
      void continueToAccount();
    } else {
      void form.handleSubmit(createSpace)(event);
    }
  }

  async function continueToAccount() {
    if (inFlight.current) return;
    setCheckedStepOne(true);
    const valid = await form.trigger(STEP_ONE_FIELDS, { shouldFocus: true });
    if (!valid) return;

    // The format passed here; only the API knows whether the address is free.
    inFlight.current = true;
    setBusy(true);
    setFormError(null);
    const subdomain = form.getValues('subdomain');
    const result = await apiFetch<SubdomainCheck>(
      `/api/signup/subdomain?value=${encodeURIComponent(subdomain)}`,
    );
    inFlight.current = false;
    setBusy(false);

    if (!result.ok) {
      setFormError(result.error.message);
    } else if (result.data.status === 'available') {
      moveTo(2);
    } else {
      form.setError('subdomain', {
        message: messages.subdomain[result.data.status],
      });
      form.setFocus('subdomain');
    }
  }

  async function createSpace(values: SignupFormOutput) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFormError(null);

    const result = await apiFetch<SignupResponse>('/api/signup', {
      method: 'POST',
      body: JSON.stringify(values),
    });

    inFlight.current = false;
    setBusy(false);
    if (result.ok) {
      setCreated({ subdomain: result.data.subdomain, email: values.email });
    } else if (result.error.code === 'subdomain_taken') {
      form.setError('subdomain', { message: result.error.message });
      focusAfterStep.current = 'subdomain';
      setStep(1);
    } else {
      setFormError(result.error.message);
    }
  }

  if (created) {
    return (
      <SignupSuccess
        subdomain={created.subdomain}
        email={created.email}
        rootDomain={rootDomain}
      />
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <div aria-hidden="true" className="flex gap-1.5">
          {[1, 2].map((index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                index <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Étape {step} sur 2
          </p>
          {step === 2 && (
            <Button
              type="button"
              variant="ghost"
              className="-mr-3"
              onClick={() => moveTo(1)}
            >
              <ArrowLeft aria-hidden="true" />
              Retour
            </Button>
          )}
        </div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold outline-none"
        >
          {STEPS[step].title}
        </h2>
        <p className="text-muted-foreground">{STEPS[step].text}</p>
      </div>

      {step === 1 ? (
        <BusinessStep
          form={form}
          rootDomain={rootDomain}
          followName={followName}
          onSubdomainEdited={() => setFollowName(false)}
        />
      ) : (
        <AccountStep form={form} />
      )}

      {formError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Spinner />}
          {step === 1 ? 'Continuer' : 'Créer mon espace'}
        </Button>
        {step === 2 && (
          <p className="text-center text-sm text-muted-foreground">
            Vos données servent uniquement à gérer votre espace.
          </p>
        )}
      </div>
    </form>
  );
}
