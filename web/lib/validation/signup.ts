import {
  BOOKING_SETTING_CHOICES,
  BUSINESS_KINDS,
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_NAME_MIN_LENGTH,
  FIRST_NAME_MAX_LENGTH,
  FIRST_NAME_MIN_LENGTH,
  isValidPassword,
  messages,
  subdomainProblem,
  type BookingSettingKey,
} from '@repo/shared';
import { z } from 'zod';
import { emailSchema } from './login';
import { phoneSchema } from './phone';

const businessNameMessage = `Indiquez le nom de votre établissement (${BUSINESS_NAME_MIN_LENGTH} à ${BUSINESS_NAME_MAX_LENGTH} caractères).`;
const firstNameMessage = `Indiquez votre prénom (${FIRST_NAME_MAX_LENGTH} caractères au plus).`;

const setting = (key: BookingSettingKey) =>
  z
    .number()
    .refine((value) =>
      BOOKING_SETTING_CHOICES[key].choices.some(
        (choice) => choice.value === value,
      ),
    );

export const passwordSchema = z.string().refine(isValidPassword, {
  message: 'Le mot de passe ne respecte pas toutes les règles ci-dessous.',
});

export const subdomainSchema = z
  .string()
  .refine((value) => subdomainProblem(value) !== 'invalid', {
    message: messages.subdomain.invalid,
  })
  .refine((value) => subdomainProblem(value) !== 'reserved', {
    message: messages.subdomain.reserved,
  });

// Same rules as the API DTO (api/src/modules/signup/dto/signup.dto.ts).
export const signupSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(BUSINESS_NAME_MIN_LENGTH, businessNameMessage)
    .max(BUSINESS_NAME_MAX_LENGTH, businessNameMessage),
  kind: z.enum(BUSINESS_KINDS, {
    message: 'Choisissez le type de votre établissement.',
  }),
  subdomain: subdomainSchema,
  phone: phoneSchema,
  minNoticeMinutes: setting('minNoticeMinutes'),
  bookingWindowDays: setting('bookingWindowDays'),
  cancelNoticeHours: setting('cancelNoticeHours'),
  firstName: z
    .string()
    .trim()
    .min(FIRST_NAME_MIN_LENGTH, firstNameMessage)
    .max(FIRST_NAME_MAX_LENGTH, firstNameMessage),
  email: emailSchema,
  password: passwordSchema,
});

export type SignupFormInput = z.input<typeof signupSchema>;
export type SignupFormOutput = z.output<typeof signupSchema>;

export const STEP_ONE_FIELDS = [
  'businessName',
  'kind',
  'subdomain',
  'phone',
  'minNoticeMinutes',
  'bookingWindowDays',
  'cancelNoticeHours',
] as const satisfies ReadonlyArray<keyof SignupFormInput>;
