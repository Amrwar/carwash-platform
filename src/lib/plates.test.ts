/**
 * Plate spelling.
 *
 * The rule that matters is round-tripping: a plate typed in Latin digits
 * has to find the same car as one typed in Arabic-Indic digits, or the
 * search silently returns nothing and the till waits.
 */

import { describe, expect, it } from 'vitest';

import {
  normalizeDigits,
  normalizePlate,
  plateSpellings,
  toArabicDigits,
} from './plates';

describe('normalizeDigits', () => {
  it('rewrites Arabic-Indic digits as Latin ones', () => {
    expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('leaves Latin digits alone', () => {
    expect(normalizeDigits('1234')).toBe('1234');
  });

  it('leaves letters alone', () => {
    expect(normalizeDigits('ABC')).toBe('ABC');
  });

  it('leaves Arabic letters alone', () => {
    expect(normalizeDigits('أ ب ج')).toBe('أ ب ج');
  });

  it('rewrites only the digits in a mixed plate', () => {
    expect(normalizeDigits('أ ب ج ١٢٣')).toBe('أ ب ج 123');
  });

  it('copes with an empty string', () => {
    expect(normalizeDigits('')).toBe('');
  });

  it('keeps the spacing a plate is written with', () => {
    expect(normalizeDigits('١٢ ٣٤')).toBe('12 34');
  });
});

describe('toArabicDigits', () => {
  it('rewrites Latin digits as Arabic-Indic ones', () => {
    expect(toArabicDigits('0123456789')).toBe('٠١٢٣٤٥٦٧٨٩');
  });

  it('leaves letters alone', () => {
    expect(toArabicDigits('ABC 123')).toBe('ABC ١٢٣');
  });

  it('is the inverse of normalizeDigits', () => {
    expect(normalizeDigits(toArabicDigits('4821'))).toBe('4821');
  });

  it('leaves an already-Arabic plate unchanged', () => {
    expect(toArabicDigits('٤٨٢١')).toBe('٤٨٢١');
  });
});

describe('normalizePlate', () => {
  it('stores Latin digits', () => {
    expect(normalizePlate('أ ب ج ١٢٣')).toBe('أ ب ج 123');
  });

  it('upper-cases Latin letters', () => {
    expect(normalizePlate('abc 123')).toBe('ABC 123');
  });

  it('trims the padding a barcode scanner leaves', () => {
    expect(normalizePlate('  abc 123  ')).toBe('ABC 123');
  });

  it('is stable when applied twice', () => {
    const once = normalizePlate(' ١٢٣ abc ');
    expect(normalizePlate(once)).toBe(once);
  });
});

describe('plateSpellings', () => {
  it('offers both spellings of a plate with digits', () => {
    expect(plateSpellings('abc 123')).toEqual(['ABC 123', 'ABC ١٢٣']);
  });

  it('finds the same pair whichever alphabet was typed', () => {
    expect(plateSpellings('abc ١٢٣')).toEqual(plateSpellings('abc 123'));
  });

  it('offers one spelling when there are no digits', () => {
    expect(plateSpellings('abc')).toEqual(['ABC']);
  });

  it('never offers the same spelling twice', () => {
    for (const plate of ['abc 123', 'abc', '١٢٣', '']) {
      const found = plateSpellings(plate);
      expect(new Set(found).size).toBe(found.length);
    }
  });

  it('always puts the stored spelling first', () => {
    expect(plateSpellings('١٢٣')[0]).toBe('123');
  });
});
