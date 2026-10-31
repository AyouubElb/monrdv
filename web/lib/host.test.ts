import { describe, expect, it } from 'vitest';
import { subdomainFromHost } from './host';

describe('subdomainFromHost', () => {
  it.each([
    ['atlas.localhost', 'localhost', 'atlas'],
    ['atlas.localhost:3000', 'localhost', 'atlas'],
    ['ATLAS.LOCALHOST', 'localhost', 'atlas'],
    ['anfa.example.ma', 'example.ma', 'anfa'],
    ['localhost', 'localhost', null],
    ['localhost:80', 'localhost', null],
    ['a.b.localhost', 'localhost', null],
    ['atlas.other.ma', 'example.ma', null],
    ['my-salon.localhost', 'localhost', 'my-salon'],
    // A look alike host must not pass as a subdomain of the root.
    ['evillocalhost', 'localhost', null],
    ['atlasexample.ma', 'example.ma', null],
    ['.localhost', 'localhost', null],
    ['atlas_x.localhost', 'localhost', null],
    ['', 'localhost', null],
  ])('%s on %s → %s', (host, root, expected) => {
    expect(subdomainFromHost(host, root)).toBe(expected);
  });
});
