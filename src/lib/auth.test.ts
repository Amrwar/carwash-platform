/**
 * The password check the login route stands on.
 *
 * This is the only thing between the street and the shop's takings, so
 * the case that matters most is the one nobody thinks about: an
 * environment with no ADMIN_PASSWORD set at all. A check that compared
 * against undefined and let a missing password through would open the
 * whole app, and it is exactly the state a fresh deployment is in.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyPassword } from './auth';

const ORIGINAL_PASSWORD = process.env.ADMIN_PASSWORD;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_PASSWORD === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = ORIGINAL_PASSWORD;
});

describe('verifyPassword, with a password configured', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = 'correct horse battery staple';
  });

  it('lets the right password through', () => {
    expect(verifyPassword('correct horse battery staple')).toBe(true);
  });

  it('refuses a different password', () => {
    expect(verifyPassword('wrong horse battery staple')).toBe(false);
  });

  it('refuses a password in the wrong case', () => {
    expect(verifyPassword('CORRECT HORSE BATTERY STAPLE')).toBe(false);
  });

  it('refuses a password with padding, which is a different password', () => {
    expect(verifyPassword(' correct horse battery staple ')).toBe(false);
  });

  it('refuses a prefix of the password', () => {
    expect(verifyPassword('correct horse')).toBe(false);
  });

  it('refuses an empty password', () => {
    expect(verifyPassword('')).toBe(false);
  });
});

describe('verifyPassword, with no password configured', () => {
  beforeEach(() => {
    delete process.env.ADMIN_PASSWORD;
  });

  it('lets nobody in rather than everybody', () => {
    expect(verifyPassword('')).toBe(false);
    expect(verifyPassword('anything')).toBe(false);
    expect(verifyPassword('undefined')).toBe(false);
  });

  it('says so, so the deployment can be fixed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    verifyPassword('anything');
    expect(warn).toHaveBeenCalled();
  });
});

describe('verifyPassword, with an empty password configured', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = '';
  });

  it('treats a blank setting as no password at all', () => {
    expect(verifyPassword('')).toBe(false);
    expect(verifyPassword('anything')).toBe(false);
  });
});
