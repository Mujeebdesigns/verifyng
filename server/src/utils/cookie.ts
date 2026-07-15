import type { ServerResponse } from 'node:http';

const COOKIE_NAME = '__Host-token';

const COOKIE_OPTIONS: Readonly<Record<string, string>> = {
  httpOnly: 'HttpOnly',
  secure: 'Secure',
  // SameSite=None (not Lax) — the client (Vercel) and API (Render) are on
  // different sites by design, and Lax cookies are never sent on the
  // cross-site fetch() calls the SPA makes after the initial login redirect.
  // None requires Secure, which is already set; the strict CORS allowlist
  // in cors.middleware.ts is what actually guards against cross-site abuse.
  sameSiteNone: 'SameSite=None',
  path: 'Path=/',
};

/**
 * Set an httpOnly, Secure, SameSite=None session cookie on the response.
 * Uses __Host- prefix to enforce Secure + Path=/ at the browser level.
 * Call this BEFORE sendJson / writeHead to ensure the header is included.
 */
export function setTokenCookie(res: ServerResponse, token: string, maxAgeSeconds: number): void {
  const cookieValue = [
    `${COOKIE_NAME}=${token}`,
    COOKIE_OPTIONS.httpOnly,
    COOKIE_OPTIONS.secure,
    COOKIE_OPTIONS.sameSiteNone,
    COOKIE_OPTIONS.path,
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');

  res.setHeader('Set-Cookie', cookieValue);
}

/**
 * Clear the auth cookie (used on logout).
 */
export function clearTokenCookie(res: ServerResponse): void {
  res.setHeader(
    'Set-Cookie',
    [
      `${COOKIE_NAME}=`,
      COOKIE_OPTIONS.httpOnly,
      COOKIE_OPTIONS.secure,
      COOKIE_OPTIONS.sameSiteNone,
      COOKIE_OPTIONS.path,
      'Max-Age=0',
    ].join('; '),
  );
}

/**
 * Parse cookies from the Cookie header into a key-value map.
 */
export function parseCookies(req: { headers: Record<string, string | string[] | undefined> }): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  const raw = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;

  for (const pair of raw.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (key) cookies[key] = value;
  }

  return cookies;
}
