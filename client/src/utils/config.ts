export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '';
export const API_PREFIX = '/api';

// Cloudflare Turnstile public site key. When empty (e.g. local dev without a
// key configured), the widget is not rendered and forms submit without a token
// — the server only enforces verification when its own secret key is set.
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || '';
