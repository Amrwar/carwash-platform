/**
 * Who is let through.
 *
 * This is the only thing standing between the street and the day's
 * takings, and it fails quietly in both directions: guard too much and the
 * login screen redirects to itself forever, guard too little and anyone
 * can read the till. So the cases here are mostly the paths that look like
 * they should be waved through but must not be.
 */

import { describe, expect, it } from 'vitest';

import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN,
  isApiPath,
  isAssetPath,
  isAuthenticatedValue,
  isPublicPath,
  PUBLIC_ROUTES,
  requiresAuth,
} from './auth-policy';

describe('isAuthenticatedValue', () => {
  it('accepts the session token', () => {
    expect(isAuthenticatedValue(AUTH_TOKEN)).toBe(true);
  });

  it('rejects a missing cookie', () => {
    expect(isAuthenticatedValue(undefined)).toBe(false);
  });

  it('rejects a cookie with no value', () => {
    expect(isAuthenticatedValue('')).toBe(false);
  });

  it('rejects a null cookie', () => {
    expect(isAuthenticatedValue(null)).toBe(false);
  });

  it('rejects a token in the wrong case', () => {
    expect(isAuthenticatedValue('AUTHENTICATED')).toBe(false);
  });

  it('rejects a token with whitespace around it', () => {
    expect(isAuthenticatedValue(' authenticated ')).toBe(false);
  });

  it('rejects a value that merely contains the token', () => {
    expect(isAuthenticatedValue('not-authenticated')).toBe(false);
    expect(isAuthenticatedValue('authenticated-elsewhere')).toBe(false);
  });

  it('rejects the truthy strings a sloppy check would let through', () => {
    for (const value of ['true', '1', 'yes', AUTH_COOKIE_NAME]) {
      expect(isAuthenticatedValue(value)).toBe(false);
    }
  });
});

describe('isApiPath', () => {
  it('recognises an endpoint', () => {
    expect(isApiPath('/api/wash-records')).toBe(true);
  });

  it('recognises a nested endpoint', () => {
    expect(isApiPath('/api/wash-records/abc/payment')).toBe(true);
  });

  it('recognises the bare prefix', () => {
    expect(isApiPath('/api')).toBe(true);
  });

  it('does not mistake a screen whose name starts the same way', () => {
    expect(isApiPath('/apidocs')).toBe(false);
  });

  it('does not treat a screen as an endpoint', () => {
    expect(isApiPath('/dashboard')).toBe(false);
  });
});

describe('isPublicPath', () => {
  it('lets the login screen through', () => {
    expect(isPublicPath('/login')).toBe(true);
  });

  it('lets the sign-in and sign-out calls through', () => {
    expect(isPublicPath('/api/auth/login')).toBe(true);
    expect(isPublicPath('/api/auth/logout')).toBe(true);
  });

  it('does not open the rest of the app', () => {
    expect(isPublicPath('/dashboard')).toBe(false);
    expect(isPublicPath('/api/wash-records')).toBe(false);
  });

  it('lists every public route as public', () => {
    for (const route of PUBLIC_ROUTES) {
      expect(isPublicPath(route)).toBe(true);
    }
  });
});

describe('isAssetPath', () => {
  it('recognises Next build output', () => {
    expect(isAssetPath('/_next/static/chunks/main.js')).toBe(true);
  });

  it('recognises the favicon', () => {
    expect(isAssetPath('/favicon.ico')).toBe(true);
  });

  it('recognises a file by its extension', () => {
    expect(isAssetPath('/logo.png')).toBe(true);
  });

  it('does not treat a screen as a file', () => {
    expect(isAssetPath('/dashboard')).toBe(false);
  });

  it('never treats an endpoint as a file, however it is spelled', () => {
    // A record id with a dot in it must not read as a static asset.
    expect(isAssetPath('/api/wash-records/some.id')).toBe(false);
    expect(isAssetPath('/api/export/daily.xlsx')).toBe(false);
  });
});

describe('requiresAuth', () => {
  it('lets the landing page through, which redirects on its own', () => {
    expect(requiresAuth('/')).toBe(false);
  });

  it('lets the login screen through, or it would redirect to itself', () => {
    expect(requiresAuth('/login')).toBe(false);
  });

  it('lets the sign-in call through, or nobody could ever sign in', () => {
    expect(requiresAuth('/api/auth/login')).toBe(false);
  });

  it('lets the sign-out call through', () => {
    expect(requiresAuth('/api/auth/logout')).toBe(false);
  });

  it('lets assets through', () => {
    expect(requiresAuth('/_next/static/chunks/main.js')).toBe(false);
    expect(requiresAuth('/favicon.ico')).toBe(false);
  });

  it('guards every screen', () => {
    for (const path of [
      '/dashboard',
      '/reports',
      '/workers',
      '/worker-stats',
      '/mechanic',
    ]) {
      expect(requiresAuth(path)).toBe(true);
    }
  });

  it('guards every endpoint that is not the sign-in pair', () => {
    for (const path of [
      '/api/wash-records',
      '/api/wash-records/abc/payment',
      '/api/worker-stats',
      '/api/workers',
      '/api/mechanic',
      '/api/customers/search',
      '/api/export/daily',
      '/api/export/monthly',
    ]) {
      expect(requiresAuth(path)).toBe(true);
    }
  });

  it('guards an endpoint whose id contains a dot', () => {
    // This one used to slip through as a static asset.
    expect(requiresAuth('/api/wash-records/some.id/payment')).toBe(true);
  });

  it('guards the export endpoints, which are the whole month of takings', () => {
    expect(requiresAuth('/api/export/monthly.xlsx')).toBe(true);
  });

  it('does not open a screen just because it starts like a public one', () => {
    expect(requiresAuth('/logindetails')).toBe(true);
    expect(requiresAuth('/api/auth/login-as-someone-else')).toBe(true);
    expect(requiresAuth('/dashboard/login')).toBe(true);
  });
});
