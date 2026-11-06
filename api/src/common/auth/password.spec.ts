import argon2 from 'argon2';
import { hashPassword, verifyPassword } from './password.js';

const PASSWORD = 'Salonatlas1!';

describe('hashPassword', () => {
  // covers: AC-4 (argon2id, 19456 KiB, 2 iterations, parallelism 1)
  it('hashes with argon2id and the spec 0001 parameters', async () => {
    const hash = await hashPassword(PASSWORD);

    expect(hash).toMatch(/^\$argon2id\$v=19\$/);
    expect(hash).toMatch(/m=19456/);
    expect(hash).toMatch(/t=2/);
    expect(hash).toMatch(/p=1/);
    expect(hash).not.toContain(PASSWORD);
  });

  it('salts every hash, so the same password never gives the same hash', async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD));
  });
});

describe('verifyPassword', () => {
  let hash: string;

  beforeAll(async () => {
    hash = await hashPassword(PASSWORD);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts the right password', async () => {
    await expect(verifyPassword(hash, PASSWORD)).resolves.toBe(true);
  });

  it.each([
    ['a wrong password', 'Salonatlas2!'],
    ['the password in another case', 'SALONATLAS1!'],
    ['an empty password', ''],
  ])('refuses %s', async (_, attempt) => {
    await expect(verifyPassword(hash, attempt)).resolves.toBe(false);
  });

  // covers: key invariant (login errors never reveal whether an email exists)
  it('refuses an unknown email (no hash) after the same argon2 work as a wrong password', async () => {
    const verify = vi.spyOn(argon2, 'verify');

    await expect(verifyPassword(null, PASSWORD)).resolves.toBe(false);

    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify.mock.calls[0][0]).toMatch(/^\$argon2id\$v=19\$m=19456/);
  });
});
