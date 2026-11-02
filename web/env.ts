import { z } from 'zod';

const schema = z.object({
  /** The platform's root domain: `localhost` locally, the real domain in production. */
  NEXT_PUBLIC_ROOT_DOMAIN: z
    .string()
    .min(1)
    .regex(/^[a-z0-9.-]+$/, 'lowercase host name, without scheme or port'),
  /** Server only: the API over the private network (`http://localhost:3001` locally). */
  API_INTERNAL_URL: z
    .url({ protocol: /^https?$/ })
    .regex(/[^/]$/, 'no trailing slash'),
});

// Each variable is listed by name so Next.js can inline NEXT_PUBLIC_ values at build time.
const parsed = schema.safeParse({
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  API_INTERNAL_URL: process.env.API_INTERNAL_URL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment for the web app:\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
