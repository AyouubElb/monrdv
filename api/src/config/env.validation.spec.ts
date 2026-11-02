// Nest loads this before any decorator runs; a plain unit test has to load it itself.
import 'reflect-metadata';
import { validateEnv } from './env.validation.js';

const DATABASE_URL = 'postgresql://app_user:secret@localhost:5432/booking';
/** The variables with no default, so each case can change one at a time. */
const REQUIRED = {
  DATABASE_URL,
  ROOT_DOMAIN: 'localhost',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  COOKIE_SECURE: 'false',
};

// The API refuses to boot with a missing or malformed variable (spec 0001, Configuration).
describe('validateEnv', () => {
  it('applies the defaults when only the required variables are given', () => {
    const env = validateEnv(REQUIRED);

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      API_PORT: 3001,
      DATABASE_URL,
      TRUSTED_PROXY: 'loopback',
      LOG_LEVEL: 'info',
      ROOT_DOMAIN: 'localhost',
      COOKIE_SECURE: false,
    });
  });

  it('converts a string port from the environment to a number', () => {
    const env = validateEnv({ ...REQUIRED, API_PORT: '4000' });

    expect(env.API_PORT).toBe(4000);
  });

  it('accepts the postgres:// scheme as well as postgresql://', () => {
    const url = 'postgres://app_user:secret@db:5432/booking';

    expect(validateEnv({ ...REQUIRED, DATABASE_URL: url }).DATABASE_URL).toBe(
      url,
    );
  });

  it('refuses to boot without DATABASE_URL', () => {
    expect(() => validateEnv({ ...REQUIRED, DATABASE_URL: undefined })).toThrow(
      /DATABASE_URL must be a postgresql:\/\/ URL/,
    );
  });

  it('refuses a DATABASE_URL for another database engine', () => {
    expect(() =>
      validateEnv({
        ...REQUIRED,
        DATABASE_URL: 'mysql://root@localhost/booking',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it.each(['0', '65536', 'abc', '30.5'])('refuses API_PORT %s', (API_PORT) => {
    expect(() => validateEnv({ ...REQUIRED, API_PORT })).toThrow(/API_PORT/);
  });

  it.each([
    ['NODE_ENV', 'staging'],
    ['LOG_LEVEL', 'verbose'],
    ['TRUSTED_PROXY', ''],
    ['ROOT_DOMAIN', 'https://example.ma'],
    ['ROOT_DOMAIN', 'localhost:3000'],
    ['JWT_ACCESS_SECRET', 'x'.repeat(31)],
    ['COOKIE_SECURE', 'yes'],
    ['COOKIE_SECURE', ''],
  ])('refuses %s=%j', (name, value) => {
    expect(() => validateEnv({ ...REQUIRED, [name]: value })).toThrow(
      new RegExp(name),
    );
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('reads COOKIE_SECURE=%s as %s', (value, expected) => {
    expect(
      validateEnv({ ...REQUIRED, COOKIE_SECURE: value }).COOKIE_SECURE,
    ).toBe(expected);
  });

  it('refuses to boot in production with COOKIE_SECURE=false', () => {
    expect(() =>
      validateEnv({
        ...REQUIRED,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(/COOKIE_SECURE must be true when NODE_ENV is production/);
  });

  it('lists every invalid variable in one error, so one restart fixes them all', () => {
    expect(() => validateEnv({ API_PORT: 'abc', LOG_LEVEL: 'loud' })).toThrow(
      /Invalid environment:[\s\S]*API_PORT[\s\S]*DATABASE_URL[\s\S]*LOG_LEVEL/,
    );
  });
});
