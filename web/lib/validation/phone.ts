import { isMoroccanPhone, messages } from '@repo/shared';
import { z } from 'zod';

/** Form rule backed by the same `isMoroccanPhone` the API DTOs use. */
export const phoneSchema = z
  .string()
  .refine(isMoroccanPhone, { message: messages.phone.invalid });
