import { describe, expect, it } from 'vitest';
import { emailSchema, loginSchema } from './login';

// covers: AC-9 (/connexion prefills ?email= only when it passes this check)
describe('emailSchema', () => {
  it('trims and lowercases the email', () => {
    expect(emailSchema.parse('  Samira@Demo.MA ')).toBe('samira@demo.ma');
  });

  it.each([
    ['text with no @', 'samira'],
    ['an empty value', ''],
    ['only spaces', '   '],
    ['a missing domain', 'samira@'],
  ])('refuses %s with the French message', (_, value) => {
    const result = emailSchema.safeParse(value);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Adresse email invalide.');
  });

  it('refuses an email longer than 254 characters', () => {
    const tooLong = `${'a'.repeat(64)}@${'b'.repeat(186)}.com`;
    expect(tooLong).toHaveLength(255);

    expect(emailSchema.safeParse(tooLong).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts an email and any non empty password, cleaning the email', () => {
    expect(
      loginSchema.parse({ email: ' A@X.MA ', password: 'anything' }),
    ).toEqual({ email: 'a@x.ma', password: 'anything' });
  });

  it('asks for the password when it is empty', () => {
    const result = loginSchema.safeParse({ email: 'a@x.ma', password: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Indiquez votre mot de passe.',
    );
  });

  // The login form does not check the password rules: a wrong one gets the API's 401.
  it('does not apply the signup password rules', () => {
    expect(
      loginSchema.safeParse({ email: 'a@x.ma', password: 'short' }).success,
    ).toBe(true);
  });
});
