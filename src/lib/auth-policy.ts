/**
 * Who is let through, and where they land when they are not.
 *
 * The cookie name, the value that counts as signed in, and the check that
 * compares them were written out twice - once in the middleware that
 * guards every request and once in the auth helper the login and logout
 * routes call. Two copies of a security check is one copy too many: rename
 * the cookie in one file and the app lets everybody in.
 *
 * The path rules live here too, away from NextRequest, so they can be read
 * and tested as the plain decision they are.
 */

export const AUTH_COOKIE_NAME = 'carwash_auth';

/** The only cookie value that counts as signed in. */
export const AUTH_TOKEN = 'authenticated';

/** Reachable without signing in - the login screen and the two auth calls. */
export const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/logout'] as const;

/** Whether a cookie value is a valid session. Missing counts as signed out. */
export function isAuthenticatedValue(value: string | null | undefined): boolean {
  return value === AUTH_TOKEN;
}

/** Whether a path is one of the API endpoints, which answer rather than redirect. */
export function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

/**
 * Whether a path is reachable signed out. The match is on whole path
 * segments: /login is public, /logindetails is a different path and is not.
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Whether a path is served as a file rather than as a screen: Next's own
 * build output, the favicon, and anything with an extension. An API path
 * is never one of these, however it is spelled - a record id with a dot in
 * it must not read as a static asset and skip the guard.
 */
export function isAssetPath(pathname: string): boolean {
  if (isApiPath(pathname)) return false;
  return (
    pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')
  );
}

/** Whether a request for this path has to be signed in. */
export function requiresAuth(pathname: string): boolean {
  if (pathname === '/') return false;
  if (isPublicPath(pathname)) return false;
  if (isAssetPath(pathname)) return false;
  return true;
}
