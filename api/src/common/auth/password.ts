import argon2 from 'argon2';

// Spec 0001 parameters (OWASP Password Storage cheat sheet).
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

// Hash of a random secret: an unknown email takes as long as a wrong password.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$YnO5kEOZ/RViEbHXO0BDag$7tm/x7ZWNEOSf4je/RqVMMiB6ZdMxpmdQDEdM4fsw4U';

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, HASH_OPTIONS);
}

export async function verifyPassword(
  hash: string | null,
  password: string,
): Promise<boolean> {
  const matches = await argon2.verify(hash ?? DUMMY_HASH, password);
  return hash !== null && matches;
}
