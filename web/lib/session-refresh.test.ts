import { describe, expect, it } from 'vitest';
import { needsSessionRefresh, parseSetCookie } from './session-refresh';

describe('needsSessionRefresh', () => {
  it('refreshes a session page that has only the refresh cookie', () => {
    expect(needsSessionRefresh('/dashboard', ['rt'])).toBe(true);
    expect(needsSessionRefresh('/dashboard/services', ['__Host-rt'])).toBe(
      true,
    );
    expect(needsSessionRefresh('/connexion', ['rt', 'theme'])).toBe(true);
  });

  it('does not call the API when the access cookie is still there', () => {
    expect(needsSessionRefresh('/dashboard', ['rt', 'at'])).toBe(false);
    expect(needsSessionRefresh('/dashboard', ['__Host-rt', '__Host-at'])).toBe(
      false,
    );
  });

  it('does not refresh without a refresh cookie or off the session pages', () => {
    expect(needsSessionRefresh('/dashboard', [])).toBe(false);
    expect(needsSessionRefresh('/', ['rt'])).toBe(false);
    expect(needsSessionRefresh('/dashboards', ['rt'])).toBe(false);
  });
});

describe('parseSetCookie', () => {
  it('reads the name and value before the attributes', () => {
    expect(
      parseSetCookie('rt=abc_-1; Max-Age=604800; Path=/; HttpOnly'),
    ).toEqual({ name: 'rt', value: 'abc_-1' });
  });

  it('reads a cleared cookie as an empty value', () => {
    expect(
      parseSetCookie('at=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'),
    ).toEqual({ name: 'at', value: '' });
  });
});
