import { createHash } from 'node:crypto';

// Only the hash is stored: a database leak holds no usable token.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
