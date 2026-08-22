/**
 * The two locales.
 *
 * The app switches between Arabic and English at runtime, so a key present
 * in one file and missing from the other shows the raw key to whoever
 * switched - and it is always the Arabic side a customer is looking at.
 */

import { describe, expect, it } from 'vitest';

import ar from './locales/ar.json';
import en from './locales/en.json';

const arKeys = Object.keys(ar as Record<string, string>);
const enKeys = Object.keys(en as Record<string, string>);

describe('the locale files', () => {
  it('carry keys at all, so the check is not vacuous', () => {
    expect(enKeys.length).toBeGreaterThan(50);
  });

  it('carry the same number of keys', () => {
    expect(arKeys.length).toBe(enKeys.length);
  });

  it('translate every English key into Arabic', () => {
    const missing = enKeys.filter((k) => !(k in (ar as Record<string, string>)));
    expect(missing).toEqual([]);
  });

  it('carry no Arabic key the English file has forgotten', () => {
    const extra = arKeys.filter((k) => !(k in (en as Record<string, string>)));
    expect(extra).toEqual([]);
  });

  it('leaves no value blank', () => {
    for (const [name, table] of [['en', en], ['ar', ar]] as const) {
      for (const [key, value] of Object.entries(table as Record<string, string>)) {
        expect(String(value).trim(), `${name}: ${key}`).not.toBe('');
      }
    }
  });

  it('gives every value as a string, not a nested object', () => {
    for (const value of Object.values(en as Record<string, unknown>)) {
      expect(typeof value).toBe('string');
    }
  });

  it('writes the Arabic side in Arabic script, bar the odd shared token', () => {
    const values = Object.values(ar as Record<string, string>);
    const arabic = values.filter((v) => /[\u0600-\u06FF]/.test(v));
    expect(arabic.length).toBeGreaterThan(values.length / 2);
  });

  it('namespaces its keys with a dot', () => {
    expect(enKeys.filter((k) => k.includes('.')).length).toBeGreaterThan(
      enKeys.length / 2,
    );
  });
});
