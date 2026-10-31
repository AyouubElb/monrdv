// Nest loads this before any decorator runs; a plain unit test has to load it itself.
import 'reflect-metadata';
import { validateEnv } from './env.validation.js';

const DATABASE_URL = 'postgresql://app_user:secret@localhost:5432/booking';

// The API refuses to boot with a missing or malformed variable (spec 0001, Configuration).
describe('validateEnv', () => {
  it('applies the defaults when only DATABASE_URL is given', () => {
    const env = validateEnv({ DATABASE_URL });

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      API_PORT: 3001,
      DATABASE_URL,
      TRUSTED_PROXY: 'loopback',
      LOG_LEVEL: 'info',
    });
  });

  it('converts a string port from the environment to a number', () => {
    const env = validateEnv({ DATABASE_URL, API_PORT: '4000' });

    expect(env.API_PORT).toBe(4000);
  });

  it('accepts the postgres:// scheme as well as postgresql://', () => {
    const url = 'postgres://app_user:secret@db:5432/booking';

    expect(validateEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it('refuses to boot without DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(
      /DATABASE_URL must be a postgresql:\/\/ URL/,
    );
  });

  it('refuses a DATABASE_URL for another database engine', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'mysql://root@localhost/booking' }),
    ).toThrow(/DATABASE_URL/);
  });

  it.each(['0', '65536', 'abc', '30.5'])('refuses API_PORT %s', (API_PORT) => {
    expect(() => validateEnv({ DATABASE_URL, API_PORT })).toThrow(/API_PORT/);
  });

  it.each([
    ['NODE_ENV', 'staging'],
    ['LOG_LEVEL', 'verbose'],
    ['TRUSTED_PROXY', ''],
  ])('refuses %s=%j', (name, value) => {
    expect(() => validateEnv({ DATABASE_URL, [name]: value })).toThrow(
      new RegExp(name),
    );
  });

  it('lists every invalid variable in one error, so one restart fixes them all', () => {
    expect(() => validateEnv({ API_PORT: 'abc', LOG_LEVEL: 'loud' })).toThrow(
      /Invalid environment:[\s\S]*API_PORT[\s\S]*DATABASE_URL[\s\S]*LOG_LEVEL/,
    );
  });
});
