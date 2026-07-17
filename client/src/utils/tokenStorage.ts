const TOKEN_KEY = 'verifyng_token';

/**
 * iOS WebKit (Safari and every other iOS browser, which is required to use
 * WebKit under the hood) blocks third-party cookie storage outright, which
 * breaks cookie-based auth across the split Vercel/Render domains. Storing
 * the JWT here and sending it as an Authorization header sidesteps that
 * restriction entirely; the server checks the header before falling back
 * to the cookie, so this takes precedence wherever both are present.
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
