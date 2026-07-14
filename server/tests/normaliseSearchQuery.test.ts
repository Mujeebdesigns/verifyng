import { describe, it, expect } from 'vitest';
import { normaliseSearchQuery } from '../src/utils/normaliseSearchQuery.js';

describe('normaliseSearchQuery', () => {
  it('lowercases and trims', () => {
    expect(normaliseSearchQuery('  Abuja Gadgets ')).toBe('abuja gadgets');
  });

  it('strips leading @ from Instagram handles', () => {
    expect(normaliseSearchQuery('@AbujaGadgets')).toBe('abujagadgets');
  });

  it('converts +234 prefix to local 0 prefix', () => {
    expect(normaliseSearchQuery('+2348031234567')).toBe('08031234567');
  });

  it('removes separators from phone numbers', () => {
    expect(normaliseSearchQuery('0803-123-4567')).toBe('08031234567');
    expect(normaliseSearchQuery('0803 123 4567')).toBe('08031234567');
    expect(normaliseSearchQuery('0803.123.4567')).toBe('08031234567');
  });

  it('leaves business names with digits-and-letters untouched', () => {
    expect(normaliseSearchQuery('Store 24-7')).toBe('store 24-7');
  });
});
