const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
] as const;

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// A weak JWT signing secret lets an attacker forge tokens for any user, which
// is a full auth bypass. Fail fast at boot rather than shipping a guessable
// secret silently. 32 chars is the practical floor for an HS256 secret.
const MIN_JWT_SECRET_LENGTH = 32;
if (process.env.JWT_SECRET!.length < MIN_JWT_SECRET_LENGTH) {
  throw new Error(
    `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (got ${process.env.JWT_SECRET!.length}). ` +
      'Generate a strong one with: openssl rand -hex 32',
  );
}

function int(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN!,
  PORT: int('PORT', 3001),
  CLIENT_URL: process.env.CLIENT_URL ?? process.env.VITE_API_BASE_URL ?? 'http://localhost:5173',

  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:5173', 'https://verifyng.vercel.app'],

  // SMTP timeouts (ms)
  SMTP_CONNECTION_TIMEOUT: int('SMTP_CONNECTION_TIMEOUT', 10000),
  SMTP_GREETING_TIMEOUT: int('SMTP_GREETING_TIMEOUT', 10000),
  SMTP_SOCKET_TIMEOUT: int('SMTP_SOCKET_TIMEOUT', 15000),

  // AI provider
  AI_API_KEY: process.env.AI_API_KEY,
  AI_API_URL: process.env.AI_API_URL,
  AI_MODEL: process.env.AI_MODEL ?? 'gpt-4o-mini',
  AI_TIMEOUT: int('AI_TIMEOUT', 15000),
  AI_TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE ?? '0.3'),

  // Email — Brevo preferred (works over HTTPS; SMTP ports are blocked on
  // Render's free tier), Resend once a verified sending domain exists,
  // SMTP as a last resort (fine locally, not reachable in production).
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_FROM: process.env.BREVO_FROM ?? 'qozeemmujeeb20@gmail.com',
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM ?? 'VerifyNG <verifyng@your-domain.com>',

  // Request limits
  MAX_BODY_SIZE: int('MAX_BODY_SIZE', 1048576), // 1 MB default

  // Rate limits (count / window-ms)
  RATE_LIMIT_REVIEW_MAX: int('RATE_LIMIT_REVIEW_MAX', 5),
  RATE_LIMIT_REVIEW_WINDOW: int('RATE_LIMIT_REVIEW_WINDOW', 3_600_000),
  RATE_LIMIT_SEARCH_MAX: int('RATE_LIMIT_SEARCH_MAX', 20),
  RATE_LIMIT_SEARCH_WINDOW: int('RATE_LIMIT_SEARCH_WINDOW', 60_000),
  RATE_LIMIT_LOGIN_MAX: int('RATE_LIMIT_LOGIN_MAX', 10),
  RATE_LIMIT_LOGIN_WINDOW: int('RATE_LIMIT_LOGIN_WINDOW', 900_000),
  RATE_LIMIT_ACTION_MAX: int('RATE_LIMIT_ACTION_MAX', 30),
  RATE_LIMIT_ACTION_WINDOW: int('RATE_LIMIT_ACTION_WINDOW', 60_000),
  RATE_LIMIT_CLAIM_MAX: int('RATE_LIMIT_CLAIM_MAX', 5),
  RATE_LIMIT_CLAIM_WINDOW: int('RATE_LIMIT_CLAIM_WINDOW', 3_600_000),
  RATE_LIMIT_REPORT_MAX: int('RATE_LIMIT_REPORT_MAX', 5),
  RATE_LIMIT_REPORT_WINDOW: int('RATE_LIMIT_REPORT_WINDOW', 3_600_000),
  RATE_LIMIT_CLEANUP_INTERVAL: int('RATE_LIMIT_CLEANUP_INTERVAL', 600_000),

  // Security
  BCRYPT_ROUNDS: int('BCRYPT_ROUNDS', 12),
  COOKIE_MAX_AGE_SECONDS: int('COOKIE_MAX_AGE_SECONDS', 604800), // 7 days default
  // Number of trusted reverse-proxy hops in front of the app. Render appends
  // (never strips) X-Forwarded-For, so the real client IP is this many entries
  // in from the RIGHT, not the spoofable leftmost. 1 = Render only; set to 2
  // if you later put another trusted proxy (e.g. Cloudflare) in front of it.
  TRUST_PROXY_HOPS: int('TRUST_PROXY_HOPS', 1),

  // Cloudflare Turnstile (bot/CAPTCHA). When TURNSTILE_SECRET_KEY is set, the
  // register and review endpoints require and verify a Turnstile token; when
  // unset (e.g. local dev), verification is skipped so those flows still work.
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,

  // Misc
  FEATURED_VENDOR_COUNT: int('FEATURED_VENDOR_COUNT', 3),
  ADMIN_IP_ALLOWLIST: process.env.ADMIN_IP_ALLOWLIST,
} as const;
