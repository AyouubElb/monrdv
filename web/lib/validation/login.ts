import { EMAIL_MAX_LENGTH } from '@repo/shared';
import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH)
  .pipe(z.email({ message: 'Adresse email invalide.' }));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Indiquez votre mot de passe.'),
});

export type LoginFormInput = z.input<typeof loginSchema>;
export type LoginFormOutput = z.output<typeof loginSchema>;
