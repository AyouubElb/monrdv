'use client';

import {
  BOOKING_SETTING_CHOICES,
  suggestSubdomain,
  type BookingSettingKey,
  type BusinessKind,
} from '@repo/shared';
import {
  Dumbbell,
  Scissors,
  Stethoscope,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SignupFormInput } from '@/lib/validation/signup';

const KINDS: { value: BusinessKind; label: string; icon: LucideIcon }[] = [
  { value: 'salon', label: 'Salon de beauté', icon: Scissors },
  { value: 'clinic', label: 'Clinique ou cabinet', icon: Stethoscope },
  { value: 'coach', label: 'Coach', icon: Dumbbell },
  { value: 'other', label: 'Autre', icon: Store },
];

const SETTINGS: { key: BookingSettingKey; hint: string }[] = [
  {
    key: 'minNoticeMinutes',
    hint: 'Le temps minimum entre la réservation et le rendez-vous.',
  },
  {
    key: 'bookingWindowDays',
    hint: 'Jusqu’où vos clients voient votre agenda.',
  },
  {
    key: 'cancelNoticeHours',
    hint: 'Jusqu’à quand vos clients peuvent annuler eux-mêmes.',
  },
];

export function BusinessStep({
  form,
  rootDomain,
  followName,
  onSubdomainEdited,
}: {
  form: UseFormReturn<SignupFormInput>;
  rootDomain: string;
  /** The subdomain follows the name until the owner edits it (AC-2). */
  followName: boolean;
  onSubdomainEdited: () => void;
}) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form;

  return (
    <FieldGroup>
      <Field data-invalid={!!errors.businessName}>
        <FieldLabel htmlFor="businessName">Nom de l’établissement</FieldLabel>
        <Input
          id="businessName"
          autoComplete="organization"
          aria-invalid={!!errors.businessName}
          aria-describedby={errors.businessName && 'businessName-error'}
          {...register('businessName', {
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              if (followName) {
                setValue('subdomain', suggestSubdomain(event.target.value));
              }
            },
          })}
        />
        <FieldError id="businessName-error" errors={[errors.businessName]} />
      </Field>

      <Controller
        control={control}
        name="kind"
        render={({ field, fieldState }) => (
          <FieldSet data-invalid={fieldState.invalid}>
            <FieldLegend variant="label">Type d’établissement</FieldLegend>
            <RadioGroup
              value={field.value ?? ''}
              onValueChange={field.onChange}
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.error && 'kind-error'}
              className="sm:grid-cols-2"
            >
              {KINDS.map(({ value, label, icon: Icon }, index) => (
                <FieldLabel
                  key={value}
                  htmlFor={`kind-${value}`}
                  className="has-data-checked:border-primary has-data-checked:bg-primary-soft"
                >
                  <Field orientation="horizontal" className="min-h-11">
                    <Icon
                      aria-hidden="true"
                      className="size-5 shrink-0 text-primary"
                    />
                    <FieldContent>
                      <FieldTitle className="text-base">{label}</FieldTitle>
                    </FieldContent>
                    <RadioGroupItem
                      id={`kind-${value}`}
                      value={value}
                      ref={index === 0 ? field.ref : undefined}
                      onBlur={field.onBlur}
                    />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
            <FieldError id="kind-error" errors={[fieldState.error]} />
          </FieldSet>
        )}
      />

      <Field data-invalid={!!errors.subdomain}>
        <FieldLabel htmlFor="subdomain">Adresse de votre page</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="subdomain"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!errors.subdomain}
            aria-describedby={
              errors.subdomain
                ? 'subdomain-hint subdomain-error'
                : 'subdomain-hint'
            }
            {...register('subdomain', {
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                onSubdomainEdited();
                setValue('subdomain', event.target.value.toLowerCase());
              },
            })}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText translate="no">.{rootDomain}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription id="subdomain-hint">
          Vos clients réservent à cette adresse. Elle ne pourra plus changer.
        </FieldDescription>
        <FieldError id="subdomain-error" errors={[errors.subdomain]} />
      </Field>

      <Field data-invalid={!!errors.phone}>
        <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          aria-invalid={!!errors.phone}
          aria-describedby={
            errors.phone ? 'phone-hint phone-error' : 'phone-hint'
          }
          {...register('phone')}
        />
        <FieldDescription id="phone-hint">
          Affiché à vos clients quand il est trop tard pour annuler en ligne.
        </FieldDescription>
        <FieldError id="phone-error" errors={[errors.phone]} />
      </Field>

      <FieldSet className="rounded-xl border bg-background p-4 md:p-5">
        <FieldLegend>Vos règles de réservation</FieldLegend>
        <FieldGroup className="gap-5">
          {SETTINGS.map(({ key, hint }) => {
            const setting = BOOKING_SETTING_CHOICES[key];
            return (
              <Controller
                key={key}
                control={control}
                name={key}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={key}>{setting.label}</FieldLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger
                        id={key}
                        ref={field.ref}
                        aria-describedby={`${key}-hint`}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {setting.choices.map((choice) => (
                          <SelectItem
                            key={choice.value}
                            value={String(choice.value)}
                          >
                            {choice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription id={`${key}-hint`}>
                      {hint}
                    </FieldDescription>
                  </Field>
                )}
              />
            );
          })}
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  );
}
