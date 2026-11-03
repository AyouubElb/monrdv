import { describe, expect, it } from 'vitest';
import { businessInitials } from './business-mark';

describe('businessInitials', () => {
  it.each([
    ['Salon Atlas', 'SA'],
    ['Coach Karim', 'CK'],
    ['Zen', 'Z'],
    ['clinique anfa centre', 'CA'],
    ['  Salon   Atlas  ', 'SA'],
    ['Éclat Beauté', 'ÉB'],
  ])('%s → %s', (name, initials) => {
    expect(businessInitials(name)).toBe(initials);
  });
});
