import { describe, expect, it } from 'vitest';
import {
  isValidSubdomain,
  parseHost,
  subdomainProblem,
  suggestSubdomain,
} from './subdomain.js';

// covers: spec 0005 AC-2
describe('suggestSubdomain', () => {
  it.each([
    ['Salon Atlas', 'salon-atlas'],
    ['Café Él Hamra !', 'cafe-el-hamra'],
    ['Clinique Dr. Anfa & Co', 'clinique-dr-anfa-co'],
    ['  --Zen--  ', 'zen'],
    ['Ça', 'ca'],
    ['مرحبا', ''],
    // Cut to 30, then the hyphen left at the cut is trimmed.
    ['Institut de beauté des Oudayas Rabat', 'institut-de-beaute-des-oudayas'],
    ['abcdefghij abcdefghij abcdefgh xyz', 'abcdefghij-abcdefghij-abcdefgh'],
    ['abcdefghij abcdefghij abcdefg xyz', 'abcdefghij-abcdefghij-abcdefg'],
  ])('%s → %s', (name, expected) => {
    expect(suggestSubdomain(name)).toBe(expected);
  });
});

describe('subdomainProblem', () => {
  it.each([
    ['salon-atlas', null],
    ['a', 'invalid'],
    ['-atlas', 'invalid'],
    ['Atlas', 'invalid'],
    ['xn--atlas', 'invalid'],
    ['a'.repeat(31), 'invalid'],
    ['admin', 'reserved'],
    ['inscription', 'reserved'],
  ])('%s → %s', (label, expected) => {
    expect(subdomainProblem(label)).toBe(expected);
  });
});

describe('parseHost', () => {
  it.each([
    ['localhost', 'localhost', { kind: 'root' }],
    ['localhost:80', 'localhost', { kind: 'root' }],
    ['www.localhost', 'localhost', { kind: 'www' }],
    ['atlas.localhost', 'localhost', { kind: 'business', subdomain: 'atlas' }],
    [
      'atlas.localhost:3000',
      'localhost',
      { kind: 'business', subdomain: 'atlas' },
    ],
    [
      'ATLAS.localhost:80',
      'localhost',
      { kind: 'business', subdomain: 'atlas' },
    ],
    ['atlas.localhost.', 'localhost', { kind: 'business', subdomain: 'atlas' }],
    ['anfa.example.ma', 'example.ma', { kind: 'business', subdomain: 'anfa' }],
    [
      'my-salon.localhost',
      'localhost',
      { kind: 'business', subdomain: 'my-salon' },
    ],
    ['www.atlas.localhost', 'localhost', { kind: 'unknown' }],
    ['a.b.localhost', 'localhost', { kind: 'unknown' }],
    ['admin.localhost', 'localhost', { kind: 'unknown' }],
    ['-atlas.localhost', 'localhost', { kind: 'unknown' }],
    ['atlas.other.ma', 'example.ma', { kind: 'unknown' }],
    ['evil.com', 'localhost', { kind: 'unknown' }],
    ['127.0.0.1', 'localhost', { kind: 'unknown' }],
    // A look alike host must not pass as a subdomain of the root.
    ['evillocalhost', 'localhost', { kind: 'unknown' }],
    ['atlasexample.ma', 'example.ma', { kind: 'unknown' }],
    ['.localhost', 'localhost', { kind: 'unknown' }],
    ['atlas_x.localhost', 'localhost', { kind: 'unknown' }],
    ['', 'localhost', { kind: 'unknown' }],
  ])('%s on %s → %j', (host, root, expected) => {
    expect(parseHost(host, root)).toEqual(expected);
  });
});

describe('isValidSubdomain', () => {
  it.each([
    ['abc', true],
    ['a'.repeat(30), true],
    ['ab', false],
    ['a'.repeat(31), false],
    ['-atlas', false],
    ['atlas-', false],
    ['xn--atlas', false],
    ['www', false],
    ['inscription', false],
    ['monrdv', false],
  ])('%s → %s', (label, valid) => {
    expect(isValidSubdomain(label)).toBe(valid);
  });
});
